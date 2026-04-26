// HW-PLANNER-001 | Stage 3 Phase A — Zoho Mail inbound sync endpoint
// Pulls new messages from stan@, hannah@, hello@ via Zoho REST and converts each
// into a state.notes[] entry with channel: "zoho-<alias>" so they show up in the
// Communications inbox alongside other notes.
//
// On-demand only (per OQ-2: Scrybal "Only on demand"). No cron / Netlify Scheduled.
// The Communications-tab Sync Inbox button POSTs to this endpoint to trigger pull.
//
// Tracking: maintains a per-alias high-water mark in the blob store so each pull
// only fetches messages newer than the last-pulled timestamp. Format:
//   "zoho/inbound-watermark.json": {
//     "stan": "<ISO ts>",
//     "hannah": "<ISO ts>",
//     "hello": "<ISO ts>"
//   }
//
// Auth: master coordinator only.

import { getStore } from "@netlify/blobs";
import { validateToken } from "./_planner_lib/auth.mjs";

const PLANNER_STORE_NAME = "hanstan-wedding-data";
const STATE_KEY = "planner/state-current.json";
const AUDIT_KEY = "planner/audit-log.json";
const WATERMARK_KEY = "zoho/inbound-watermark.json";
const ZOHO_ACCOUNT_CACHE_KEY = "zoho/account-cache.json";
const ZOHO_API_BASE = "https://mail.zoho.com/api";
const MAX_AUDIT_ENTRIES = 5000;
const ALIASES_TO_PULL = ["stan", "hannah", "hello"];
const MAX_MESSAGES_PER_ALIAS = 50;

async function getZohoAccountId(store, password) {
  try {
    const raw = await store.get(ZOHO_ACCOUNT_CACHE_KEY);
    if (raw) {
      const cached = JSON.parse(raw);
      if (cached.accountId) return { ok: true, accountId: cached.accountId };
    }
  } catch (e) { /* fall through */ }
  // No cache — fall through to fresh fetch (mirrors zoho-broadcast-send logic but lighter)
  for (const authScheme of ["Zoho-oauthtoken ", "Bearer "]) {
    try {
      const res = await fetch(ZOHO_API_BASE + "/accounts", {
        method: "GET",
        headers: { "Authorization": authScheme + password, "Accept": "application/json" }
      });
      if (res.ok) {
        const data = await res.json();
        const accounts = (data && data.data) || [];
        if (accounts.length) {
          const accountId = accounts[0].accountId || accounts[0].id;
          await store.set(ZOHO_ACCOUNT_CACHE_KEY, JSON.stringify({ accountId, fetchedAt: Date.now() }));
          return { ok: true, accountId };
        }
      }
    } catch (e) { /* try next */ }
  }
  return { ok: false, error: "zoho_account_unresolvable" };
}

async function fetchInboxForAlias(accountId, password, alias, sinceTs) {
  // Zoho API: /api/accounts/{accountId}/messages/view?folder=Inbox&limit=N&start=1
  // Filtering by sender-alias requires the account's underlying alias address; we
  // assume <alias>@hanstan.wedding as the toAddress filter. Zoho returns RFC822-ish
  // metadata + message id; we then fetch each message body separately.
  const fullAddress = alias + "@hanstan.wedding";
  const messages = [];
  for (const authScheme of ["Zoho-oauthtoken ", "Bearer "]) {
    try {
      // List messages addressed to this alias (search by toAddress)
      const listUrl = ZOHO_API_BASE + "/accounts/" + accountId + "/messages/view?limit=" + MAX_MESSAGES_PER_ALIAS + "&start=1&folder=Inbox&searchKey=toAddress&searchValue=" + encodeURIComponent(fullAddress);
      const listRes = await fetch(listUrl, {
        method: "GET",
        headers: { "Authorization": authScheme + password, "Accept": "application/json" }
      });
      if (!listRes.ok) continue;
      const listData = await listRes.json();
      const list = (listData && listData.data) || [];
      for (const msg of list) {
        const msgTs = msg.receivedTime ? new Date(parseInt(msg.receivedTime, 10)).toISOString() : (msg.sentDateInGMT || "");
        if (sinceTs && msgTs && msgTs <= sinceTs) continue;
        // Fetch message content
        try {
          const detailUrl = ZOHO_API_BASE + "/accounts/" + accountId + "/folders/" + (msg.folderId || "Inbox") + "/messages/" + msg.messageId + "/content";
          const detailRes = await fetch(detailUrl, {
            method: "GET",
            headers: { "Authorization": authScheme + password, "Accept": "application/json" }
          });
          let bodyText = msg.summary || "(no body)";
          if (detailRes.ok) {
            const detailData = await detailRes.json();
            const content = detailData && detailData.data && (detailData.data.content || detailData.data.bodyContent);
            if (content) bodyText = content.slice(0, 4000);
          }
          messages.push({
            messageId: msg.messageId,
            fromAddress: msg.fromAddress || msg.sender || "(unknown)",
            fromName: msg.senderName || "",
            subject: msg.subject || "(no subject)",
            ts: msgTs,
            bodyText
          });
        } catch (e) { /* skip individual message fetch errors */ }
      }
      // Successful list call — return what we have
      return { ok: true, messages, alias };
    } catch (e) { /* try next auth scheme */ }
  }
  return { ok: false, error: "alias_pull_failed", alias };
}

async function appendNotesAndAudit(store, alias, messages, byName) {
  const stateRaw = await store.get(STATE_KEY);
  if (!stateRaw) return { ok: false, error: "state_not_found" };
  const state = JSON.parse(stateRaw);
  if (!Array.isArray(state.notes)) state.notes = [];

  const now = new Date().toISOString();
  const noteIds = [];
  const auditEntries = [];

  for (const msg of messages) {
    const note = {
      id: "note-zoho-" + msg.messageId,
      text: "From: " + (msg.fromName || msg.fromAddress) + " <" + msg.fromAddress + ">\nSubject: " + msg.subject + "\n\n" + msg.bodyText,
      by: msg.fromName || msg.fromAddress,
      ts: msg.ts || now,
      status: "unread",
      channel: "zoho-" + alias,
      zohoMeta: {
        messageId: msg.messageId,
        fromAddress: msg.fromAddress,
        subject: msg.subject,
        toAlias: alias
      }
    };
    state.notes.push(note);
    noteIds.push(note.id);
    auditEntries.push({
      ts: now,
      by: byName,
      entity: "note",
      action: "note.create",
      target: note.id,
      summary: "Inbound Zoho mail (zoho-" + alias + "): " + (msg.subject || "").slice(0, 80) + " from " + msg.fromAddress,
      channel: "zoho-" + alias
    });
  }

  state.lastModified = now;
  state.lastModifiedBy = byName;
  await store.set(STATE_KEY, JSON.stringify(state));

  // Append audit
  if (auditEntries.length) {
    let log;
    try {
      const raw = await store.get(AUDIT_KEY);
      log = raw ? JSON.parse(raw) : { entries: [] };
    } catch (e) { log = { entries: [] }; }
    log.entries = [...auditEntries.reverse(), ...log.entries];
    if (log.entries.length > MAX_AUDIT_ENTRIES) log.entries = log.entries.slice(0, MAX_AUDIT_ENTRIES);
    await store.set(AUDIT_KEY, JSON.stringify(log));
  }

  return { ok: true, noteCount: noteIds.length, noteIds };
}

export default async function handler(request) {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" }
    });
  }

  const auth = await validateToken(request);
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

  const password = process.env.ZOHO_APP_PASSWORD;
  if (!password) {
    return new Response(JSON.stringify({
      error: "zoho_not_configured",
      detail: "ZOHO_APP_PASSWORD env-var is not set. M52 prerequisite."
    }), {
      status: 503,
      headers: { "Content-Type": "application/json" }
    });
  }

  const accountResult = await getZohoAccountId(auth.store, password);
  if (!accountResult.ok) {
    return new Response(JSON.stringify({
      error: "zoho_account_resolution_failed",
      detail: accountResult.error
    }), {
      status: 502,
      headers: { "Content-Type": "application/json" }
    });
  }

  // Load watermarks
  let watermarks = {};
  try {
    const raw = await auth.store.get(WATERMARK_KEY);
    if (raw) watermarks = JSON.parse(raw);
  } catch (e) { /* default empty */ }

  const summaryByAlias = {};
  let totalNew = 0;

  for (const alias of ALIASES_TO_PULL) {
    const since = watermarks[alias] || null;
    const result = await fetchInboxForAlias(accountResult.accountId, password, alias, since);
    if (!result.ok) {
      summaryByAlias[alias] = { ok: false, error: result.error };
      continue;
    }
    if (result.messages.length === 0) {
      summaryByAlias[alias] = { ok: true, newCount: 0 };
      continue;
    }
    const writeResult = await appendNotesAndAudit(auth.store, alias, result.messages, auth.name);
    if (!writeResult.ok) {
      summaryByAlias[alias] = { ok: false, error: writeResult.error };
      continue;
    }
    // Update watermark to the newest message ts in this batch
    const newestTs = result.messages.map(m => m.ts).filter(Boolean).sort().slice(-1)[0];
    if (newestTs) watermarks[alias] = newestTs;
    summaryByAlias[alias] = { ok: true, newCount: writeResult.noteCount };
    totalNew += writeResult.noteCount;
  }

  await auth.store.set(WATERMARK_KEY, JSON.stringify(watermarks));

  return new Response(JSON.stringify({
    ok: true,
    totalNew,
    summaryByAlias,
    pulledAt: new Date().toISOString()
  }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
}

export const config = { path: "/.netlify/functions/zoho-inbound-pull" };
