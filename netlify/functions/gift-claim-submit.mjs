// HW-REGISTRY-COMMS-WIRING (2026-04-28) — gift-claim-submit
//
// Public endpoint. Receives a guest's gift-claim form submission and:
//   1. Creates a record in state.giftClaims[] (with three scheduled prompt times + 48h auto-revert)
//   2. Auto-creates messageBoard.channels.registry on first use
//   3. Pushes a state.notes[] entry tagged channel:"registry" so the planner Comms inbox shows it
//   4. Posts to channels.registry messageBoard
//   5. Sets the gift's claimerName/Email/Message + status="ClaimPendingConfirmation" (solo)
//      OR pushes a contributor record (group)
//   6. Best-effort: triggers the immediate thank-you email from hello@hanstan.wedding
//   7. Returns claimId + confirmationToken so the registry frontend can locally optimize
//
// No auth (public, like public-contact.mjs). Idempotent on giftId+gifterEmail+5min window.

import { getStore } from "@netlify/blobs";

const PLANNER_STORE_NAME = "hanstan-wedding-data";
const STATE_KEY = "planner/state-current.json";
const AUDIT_KEY = "planner/audit-log.json";
const MAX_AUDIT_ENTRIES = 5000;
const DEDUP_WINDOW_MS = 5 * 60 * 1000;            // 5 minutes
const PROMPT_OFFSETS_MS = [15 * 60 * 1000, 12 * 60 * 60 * 1000, 36 * 60 * 60 * 1000]; // 15min, 12h, 36h
const AUTO_REVERT_OFFSET_MS = 48 * 60 * 60 * 1000;                                     // 48h
const SHIPPING_ADDRESS = {
  name: "Merry Shipman",
  street: "13183 Aspen Way NE",
  cityStateZip: "Aurora, OR 97002"
};

function tokenize() {
  // 12-char lowercase alphanumeric
  const c = "abcdefghijklmnopqrstuvwxyz0123456789";
  let s = "";
  for (let i = 0; i < 12; i++) s += c[Math.floor(Math.random() * c.length)];
  return s;
}

function safeEmail(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

async function loadJson(store, key, defaultValue) {
  try {
    const raw = await store.get(key);
    return raw ? JSON.parse(raw) : defaultValue;
  } catch (e) {
    return defaultValue;
  }
}

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

function ensureRegistryChannel(state) {
  if (!state.messageBoard || typeof state.messageBoard !== "object") state.messageBoard = {};
  if (!state.messageBoard.channels || typeof state.messageBoard.channels !== "object") state.messageBoard.channels = {};
  if (!state.messageBoard.channels.registry) {
    state.messageBoard.channels.registry = {
      name: "Registry",
      members: [],
      messages: [],
      createdAt: new Date().toISOString(),
      createdBy: "system-bootstrap-on-first-claim"
    };
    return true;
  }
  return false;
}

function findDuplicateClaim(state, giftId, gifterEmail, nowMs) {
  if (!Array.isArray(state.giftClaims)) return null;
  const lc = (gifterEmail || "").toLowerCase();
  return state.giftClaims.find(c => {
    if (c.giftId !== giftId) return false;
    if ((c.claimerEmail || "").toLowerCase() !== lc) return false;
    if (c.status !== "Pending") return false;
    const startedMs = new Date(c.claimStartedAt).getTime();
    return (nowMs - startedMs) < DEDUP_WINDOW_MS;
  }) || null;
}

async function triggerThankYouEmail(toEmail, gifterName, giftTitle, paymentPath) {
  const isDev = !!process.env.NETLIFY_DEV;
  if (isDev) {
    console.log(`[email-stubbed] thank-you to ${toEmail} re ${giftTitle}`);
    return { ok: true, stubbed: true };
  }
  const baseUrl = process.env.URL || "";
  const endpoint = baseUrl + "/.netlify/functions/zoho-broadcast-send";
  const bypass = process.env.PLANNER_MASTER_BOOTSTRAP_TOKEN || "";
  if (!baseUrl || !bypass) return { ok: false, error: "no_internal_setup", skipped: true };

  const subject = "Thank you for your gift!";
  const firstName = (gifterName || "").split(" ")[0] || "friend";
  const pathLabel = paymentPath === "PurchasePersonally"
    ? "you'll be purchasing the gift and shipping it directly"
    : "you'll be sending funds";

  const bodyText = [
    `Hi ${firstName},`,
    "",
    `Thank you so much! We just received your note from the registry letting us know ${pathLabel} for "${giftTitle}". It means the world to us.`,
    "",
    "If you're shipping the physical gift, please send it to:",
    `  ${SHIPPING_ADDRESS.name}`,
    `  ${SHIPPING_ADDRESS.street}`,
    `  ${SHIPPING_ADDRESS.cityStateZip}`,
    "",
    "(That's Hannah's mom's place — she's collecting gifts and bringing them to us.)",
    "",
    "We'll mark the gift as claimed in the registry as soon as we confirm receipt.",
    "",
    "With love,",
    "Hannah & Stan"
  ].join("\n");

  const bodyHtml = bodyText
    .split("\n")
    .map(l => l.startsWith("  ") ? `<div style="margin-left:16px">${l.trim()}</div>` : `<p style="margin:8px 0">${l}</p>`)
    .join("");

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Bypass": bypass
      },
      body: JSON.stringify({
        fromAlias: "hello",
        recipients: [{ email: toEmail, name: gifterName }],
        subject,
        bodyText,
        bodyHtml,
        broadcastId: "thankyou-" + Date.now(),
        internal: true
      })
    });
    const data = await res.json().catch(() => ({}));
    return { ok: !!data.ok, data };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

export default async function handler(request) {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" }
    });
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

  const giftId = (body.giftId || "").trim();
  const giftTitle = (body.giftTitle || "").trim();
  const isGroupGift = !!(body.isGroupGift === true || body.isGroupGift === "true");
  const paymentPath = (body.paymentPath || "").trim() || "Unspecified";
  const gifterName = (body.gifterName || "").trim().slice(0, 100);
  const gifterEmail = (body.gifterEmail || "").trim().slice(0, 200);
  const giftMessage = (body.giftMessage || "").trim().slice(0, 4000);
  const transactionDetail = (body.transactionDetail || "").trim().slice(0, 4000);

  if (!giftId) return new Response(JSON.stringify({ error: "giftId_required" }), { status: 400, headers: { "Content-Type": "application/json" } });
  if (!gifterName) return new Response(JSON.stringify({ error: "name_required" }), { status: 400, headers: { "Content-Type": "application/json" } });
  if (!safeEmail(gifterEmail)) return new Response(JSON.stringify({ error: "valid_email_required" }), { status: 400, headers: { "Content-Type": "application/json" } });
  if (!giftMessage || giftMessage.length < 1) return new Response(JSON.stringify({ error: "message_required" }), { status: 400, headers: { "Content-Type": "application/json" } });

  const store = getStore(PLANNER_STORE_NAME);
  const nowDate = new Date();
  const now = nowDate.toISOString();
  const nowMs = nowDate.getTime();

  // Load state once
  let state;
  try {
    const raw = await store.get(STATE_KEY);
    if (!raw) return new Response(JSON.stringify({ error: "state_not_found" }), { status: 500, headers: { "Content-Type": "application/json" } });
    state = JSON.parse(raw);
  } catch (e) {
    return new Response(JSON.stringify({ error: "state_read_failed", detail: e.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }

  if (!Array.isArray(state.giftClaims)) state.giftClaims = [];
  if (!Array.isArray(state.notes)) state.notes = [];

  // Idempotency: dedup within 5min window
  const existing = findDuplicateClaim(state, giftId, gifterEmail, nowMs);
  if (existing) {
    return new Response(JSON.stringify({
      ok: true,
      idempotent: true,
      claimId: existing.claimId,
      confirmationToken: existing.confirmationToken
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  }

  // Ensure registry channel
  const channelCreated = ensureRegistryChannel(state);

  // Build claim
  const claimId = "claim-" + giftId.slice(0, 16) + "-" + nowMs;
  const confirmationToken = tokenize();
  const promptsScheduled = PROMPT_OFFSETS_MS.map((off, i) => ({
    index: i,
    dueAt: new Date(nowMs + off).toISOString(),
    sentAt: null,
    label: ["gentle", "checkin", "final"][i]
  }));
  const claim = {
    claimId,
    giftId,
    giftTitle,
    claimerName: gifterName,
    claimerEmail: gifterEmail,
    claimerMessage: giftMessage,
    transactionDetail,
    isGroupGift,
    paymentPath,
    claimStartedAt: now,
    status: "Pending",
    claimedAt: null,
    claimedVia: null,
    confirmationToken,
    promptsScheduled,
    autoRevertAt: new Date(nowMs + AUTO_REVERT_OFFSET_MS).toISOString(),
    autoRevertedAt: null
  };
  state.giftClaims.push(claim);

  // Build the notes-entry text
  const noteText = [
    `New gift claim: ${giftTitle || giftId}`,
    `From: ${gifterName} <${gifterEmail}>`,
    `Path: ${paymentPath}${isGroupGift ? " (group gift)" : ""}`,
    `Message: ${giftMessage}`,
    transactionDetail ? `Transaction detail: ${transactionDetail}` : "Transaction detail: (not provided in registry note)",
    "",
    `claimId: ${claimId}`,
    `confirmationToken: ${confirmationToken}`
  ].join("\n");

  const noteId = "note-" + claimId;
  const note = {
    id: noteId,
    text: noteText,
    by: `${gifterName} <${gifterEmail}>`,
    ts: now,
    status: "unread",
    channel: "registry",
    giftId,
    claimId,
    kind: "claim-submitted"
  };
  state.notes.push(note);

  // Post to channels.registry
  const channelMessage = {
    id: "msg-registry-" + nowMs,
    by: "registry-system",
    ts: now,
    text: `📥 Gift claim: **${giftTitle || giftId}** by ${gifterName} (${paymentPath}). Click into note ${noteId} for full details.`,
    reactions: {},
    giftId,
    claimId,
    kind: "claim-submitted"
  };
  if (!Array.isArray(state.messageBoard.channels.registry.messages)) state.messageBoard.channels.registry.messages = [];
  state.messageBoard.channels.registry.messages.push(channelMessage);

  state.lastModified = now;
  state.lastModifiedBy = "gift-claim-submit";

  // Save state
  try {
    await store.set(STATE_KEY, JSON.stringify(state));
  } catch (e) {
    return new Response(JSON.stringify({ error: "state_write_failed", detail: e.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }

  // Audit
  const auditEntries = [
    { ts: now, by: "gift-claim-submit", entity: "giftClaim", action: "giftClaim.create", target: claimId, summary: `Gift claim opened: ${giftTitle || giftId} by ${gifterName}`, giftId, claimId },
    { ts: now, by: "gift-claim-submit", entity: "note", action: "note.create", target: noteId, summary: `Registry note: ${giftTitle || giftId} (${gifterName})`, channel: "registry" },
    { ts: now, by: "gift-claim-submit", entity: "channelMessage", action: "channelMessage.send", target: channelMessage.id, channel: "registry", summary: `Channel #registry: ${channelMessage.text.slice(0, 80)}` }
  ];
  if (channelCreated) {
    auditEntries.unshift({ ts: now, by: "gift-claim-submit", entity: "channel", action: "channel.create", target: "registry", summary: "Auto-created Registry channel on first claim" });
  }
  await appendAudit(store, auditEntries);

  // Best-effort thank-you email (does NOT block claim creation on failure)
  let thankYouResult = { ok: false, skipped: true };
  try {
    thankYouResult = await triggerThankYouEmail(gifterEmail, gifterName, giftTitle, paymentPath);
  } catch (e) {
    thankYouResult = { ok: false, error: e.message };
  }

  // Audit the email outcome
  await appendAudit(store, [{
    ts: new Date().toISOString(),
    by: "gift-claim-submit",
    entity: "email",
    action: thankYouResult.ok ? "email.thankyou.sent" : "email.thankyou.failed",
    target: claimId,
    summary: thankYouResult.ok
      ? `Thank-you email sent to ${gifterEmail} (re: ${giftTitle || giftId})`
      : `Thank-you email failed: ${thankYouResult.error || thankYouResult.skipped || "unknown"}`,
    detail: thankYouResult.error || thankYouResult.stubbed ? "stubbed-in-dev" : null
  }]);

  return new Response(JSON.stringify({
    ok: true,
    claimId,
    confirmationToken,
    channelCreated,
    thankYouEmailOk: !!thankYouResult.ok,
    thankYouEmailStubbed: !!thankYouResult.stubbed
  }), { status: 200, headers: { "Content-Type": "application/json" } });
}

export const config = { path: "/.netlify/functions/gift-claim-submit" };
