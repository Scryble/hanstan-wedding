// HW-PLANNER-001 | Stage 3 Phase A — Zoho Mail outbound broadcast endpoint
// Sends emails via Zoho Mail's REST API using app-specific password auth.
//
// Auth strategy: this endpoint is called from two contexts —
//   (a) Master-authenticated planner UI broadcast composer (Bearer master coordinator token)
//   (b) Internal calls from public-contact.mjs / digest-emit.mjs (X-Internal-Bypass header
//       set to PLANNER_MASTER_BOOTSTRAP_TOKEN env var so internal flows can send without
//       presenting a coordinator token)
//
// Per-recipient send loop:
//   - Iterates recipient list
//   - Sends 1 message per recipient (NOT BCC — looks spammy + breaks per-recipient
//     personalization)
//   - Rate-limits to 1/sec to stay well under Zoho paid-tier outbound caps
//   - Emits per-recipient audit-log entry to planner audit log
//   - Continues on individual failures; tracks failedRecipients[]
//
// The Zoho REST API requires a numeric account ID for the from-address. We resolve
// the account ID at first call via the /api/accounts endpoint and cache it in the
// blob store under "zoho/account-cache.json".
//
// Email body: caller provides bodyText + bodyHtml; both are sent as multipart so the
// recipient client picks the appropriate render.
//
// Failure modes documented per spec §Stage 3 §S3-UX-5 broadcast composer states.

import { getStore } from "@netlify/blobs";
import { validateToken } from "./_planner_lib/auth.mjs";

const PLANNER_STORE_NAME = "hanstan-wedding-data";
const AUDIT_KEY = "planner/audit-log.json";
const ZOHO_ACCOUNT_CACHE_KEY = "zoho/account-cache.json";
const MAX_AUDIT_ENTRIES = 5000;
const PER_RECIPIENT_DELAY_MS = 1000; // 1 send/sec
const ZOHO_API_BASE = "https://mail.zoho.com/api";

async function appendAudit(store, entries) {
  if (!entries.length) return;
  let log;
  try {
    const raw = await store.get(AUDIT_KEY);
    log = raw ? JSON.parse(raw) : { entries: [] };
  } catch (e) {
    log = { entries: [] };
  }
  log.entries = [...entries.reverse(), ...log.entries];
  if (log.entries.length > MAX_AUDIT_ENTRIES) log.entries = log.entries.slice(0, MAX_AUDIT_ENTRIES);
  await store.set(AUDIT_KEY, JSON.stringify(log));
}

async function resolveZohoAccountId(store, password) {
  // Cache lookup
  try {
    const raw = await store.get(ZOHO_ACCOUNT_CACHE_KEY);
    if (raw) {
      const cached = JSON.parse(raw);
      if (cached.accountId && cached.fetchedAt && (Date.now() - cached.fetchedAt < 7 * 24 * 60 * 60 * 1000)) {
        return { ok: true, accountId: cached.accountId, fromCache: true };
      }
    }
  } catch (e) { /* fall through */ }

  // Fresh fetch — Zoho /api/accounts returns the user's account list
  try {
    const res = await fetch(ZOHO_API_BASE + "/accounts", {
      method: "GET",
      headers: {
        "Authorization": "Zoho-oauthtoken " + password,
        "Accept": "application/json"
      }
    });
    if (!res.ok) {
      // App-passwords may need different auth header — try IMAP-style
      const res2 = await fetch(ZOHO_API_BASE + "/accounts", {
        method: "GET",
        headers: {
          "Authorization": "Bearer " + password,
          "Accept": "application/json"
        }
      });
      if (!res2.ok) {
        return { ok: false, error: "zoho_auth_failed", status: res2.status };
      }
      const data = await res2.json();
      const accounts = (data && data.data) || [];
      if (!accounts.length) return { ok: false, error: "no_zoho_accounts" };
      const accountId = accounts[0].accountId || accounts[0].id;
      await store.set(ZOHO_ACCOUNT_CACHE_KEY, JSON.stringify({ accountId, fetchedAt: Date.now() }));
      return { ok: true, accountId };
    }
    const data = await res.json();
    const accounts = (data && data.data) || [];
    if (!accounts.length) return { ok: false, error: "no_zoho_accounts" };
    const accountId = accounts[0].accountId || accounts[0].id;
    await store.set(ZOHO_ACCOUNT_CACHE_KEY, JSON.stringify({ accountId, fetchedAt: Date.now() }));
    return { ok: true, accountId };
  } catch (e) {
    return { ok: false, error: "zoho_unreachable", detail: e.message };
  }
}

async function sendOneMessage(accountId, password, fromAddress, toEmail, subject, bodyText, bodyHtml) {
  const payload = {
    fromAddress,
    toAddress: toEmail,
    subject,
    content: bodyHtml || bodyText,
    mailFormat: bodyHtml ? "html" : "plaintext",
    askReceipt: "no"
  };
  if (bodyText && bodyHtml) {
    // Send html with a plain text alternative if both provided.
    payload.content = bodyHtml;
    payload.mailFormat = "html";
  }
  try {
    const res = await fetch(ZOHO_API_BASE + "/accounts/" + accountId + "/messages", {
      method: "POST",
      headers: {
        "Authorization": "Zoho-oauthtoken " + password,
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      // Try alternative auth (Bearer)
      const res2 = await fetch(ZOHO_API_BASE + "/accounts/" + accountId + "/messages", {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + password,
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(payload)
      });
      if (!res2.ok) {
        const text = await res2.text().catch(() => "");
        return { ok: false, status: res2.status, error: "zoho_send_failed", detail: text.slice(0, 300) };
      }
      const data = await res2.json();
      return { ok: true, data, messageId: data && data.data && data.data.messageId };
    }
    const data = await res.json();
    return { ok: true, data, messageId: data && data.data && data.data.messageId };
  } catch (e) {
    return { ok: false, error: "fetch_failed", detail: e.message };
  }
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export default async function handler(request) {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" }
    });
  }

  // Auth: master coordinator OR internal-bypass header
  let auth;
  let isInternal = false;
  const internalHeader = request.headers.get("X-Internal-Bypass");
  if (internalHeader && process.env.PLANNER_MASTER_BOOTSTRAP_TOKEN && internalHeader === process.env.PLANNER_MASTER_BOOTSTRAP_TOKEN) {
    isInternal = true;
    auth = { ok: true, name: "internal-flow", isMaster: true, token: "internal", store: getStore(PLANNER_STORE_NAME) };
  } else {
    auth = await validateToken(request);
    if (!auth.ok) {
      return new Response(JSON.stringify({ error: auth.error || "unauthorized" }), {
        status: auth.status || 401,
        headers: { "Content-Type": "application/json" }
      });
    }
    if (!auth.isMaster) {
      return new Response(JSON.stringify({ error: "master_only" }), {
        status: 403,
        headers: { "Content-Type": "application/json" }
      });
    }
  }

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return new Response(JSON.stringify({ error: "invalid_json" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  const fromAlias = (body.fromAlias || "hello").trim();
  const subject = (body.subject || "").trim();
  const bodyText = (body.bodyText || "").trim();
  const bodyHtml = (body.bodyHtml || "").trim();
  const recipients = Array.isArray(body.recipients) ? body.recipients : [];
  const broadcastId = (body.broadcastId || ("bc-" + Date.now())).trim();

  if (!subject) return new Response(JSON.stringify({ error: "subject_required" }), { status: 400, headers: { "Content-Type": "application/json" } });
  if (!bodyText && !bodyHtml) return new Response(JSON.stringify({ error: "body_required" }), { status: 400, headers: { "Content-Type": "application/json" } });
  if (!recipients.length) return new Response(JSON.stringify({ error: "no_recipients" }), { status: 400, headers: { "Content-Type": "application/json" } });

  const password = process.env.ZOHO_APP_PASSWORD;
  if (!password) {
    return new Response(JSON.stringify({
      error: "zoho_not_configured",
      detail: "ZOHO_APP_PASSWORD env-var is not set on this Netlify deploy. M52 prerequisite. See spec §Stage 3 entry tasks."
    }), {
      status: 503,
      headers: { "Content-Type": "application/json" }
    });
  }

  const fromAddress = fromAlias.includes("@") ? fromAlias : (fromAlias + "@hanstan.wedding");

  // Resolve account ID (cached)
  const accountResult = await resolveZohoAccountId(auth.store, password);
  if (!accountResult.ok) {
    return new Response(JSON.stringify({
      error: "zoho_account_resolution_failed",
      detail: accountResult.error,
      hint: "If this is the first send after upgrading to Mail Lite, the app-password may need a few minutes to propagate. Otherwise verify ZOHO_APP_PASSWORD matches a current app-specific password in Zoho Mail Admin."
    }), {
      status: 502,
      headers: { "Content-Type": "application/json" }
    });
  }

  const accountId = accountResult.accountId;
  const sentRecipients = [];
  const failedRecipients = [];

  for (let i = 0; i < recipients.length; i++) {
    const r = recipients[i];
    const toEmail = (r.email || "").trim();
    if (!toEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(toEmail)) {
      failedRecipients.push({ ...r, error: "invalid_email" });
      continue;
    }
    // Per-recipient personalization: replace {{name}} + {{firstName}} placeholders if present
    const personalizedText = bodyText.replace(/\{\{name\}\}/g, r.name || "").replace(/\{\{firstName\}\}/g, (r.name || "").split(" ")[0] || "");
    const personalizedHtml = bodyHtml.replace(/\{\{name\}\}/g, r.name || "").replace(/\{\{firstName\}\}/g, (r.name || "").split(" ")[0] || "");

    const sendResult = await sendOneMessage(accountId, password, fromAddress, toEmail, subject, personalizedText, personalizedHtml);

    if (sendResult.ok) {
      sentRecipients.push({ email: toEmail, name: r.name, contactId: r.contactId, messageId: sendResult.messageId });
    } else {
      failedRecipients.push({ ...r, error: sendResult.error, status: sendResult.status, detail: sendResult.detail });
    }

    // Rate-limit: don't slam Zoho. Skip delay on the last iteration.
    if (i < recipients.length - 1) {
      await delay(PER_RECIPIENT_DELAY_MS);
    }
  }

  // Audit-log entries: one per recipient (success or failure)
  const auditEntries = [];
  const ts = new Date().toISOString();
  const auditBy = auth.name;
  for (const s of sentRecipients) {
    auditEntries.push({
      ts,
      by: auditBy,
      entity: "broadcast",
      action: "broadcast.send",
      target: broadcastId,
      field: "recipient",
      to: s.email,
      summary: "Broadcast sent: " + (s.email || "(unknown)") + " (subject: " + subject.slice(0, 60) + ")",
      broadcastId,
      messageId: s.messageId
    });
  }
  for (const f of failedRecipients) {
    auditEntries.push({
      ts,
      by: auditBy,
      entity: "broadcast",
      action: "broadcast.fail",
      target: broadcastId,
      field: "recipient",
      to: f.email,
      summary: "Broadcast FAILED: " + (f.email || "(unknown)") + " (" + (f.error || "unknown error") + ")",
      broadcastId,
      error: f.error,
      detail: f.detail
    });
  }
  // Plus a summary entry
  auditEntries.push({
    ts,
    by: auditBy,
    entity: "broadcast",
    action: "broadcast.complete",
    target: broadcastId,
    summary: "Broadcast " + broadcastId + ": " + sentRecipients.length + "/" + recipients.length + " delivered (" + failedRecipients.length + " failed)",
    broadcastId,
    sentCount: sentRecipients.length,
    failedCount: failedRecipients.length
  });
  await appendAudit(auth.store, auditEntries);

  return new Response(JSON.stringify({
    ok: failedRecipients.length === 0,
    broadcastId,
    sentCount: sentRecipients.length,
    failedCount: failedRecipients.length,
    sentRecipients,
    failedRecipients,
    fromAddress,
    accountIdResolvedFromCache: !!accountResult.fromCache,
    isInternal
  }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
}

export const config = { path: "/.netlify/functions/zoho-broadcast-send" };
