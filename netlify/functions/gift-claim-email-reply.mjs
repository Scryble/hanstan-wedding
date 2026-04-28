// HW-REGISTRY-COMMS-WIRING (2026-04-28) — gift-claim-email-reply
//
// Helper module exporting processNote(state, note, store) used by zoho-inbound-pull.mjs.
//
// On every newly-pulled inbound note, scans the note body + subject for the magic claim token
// pattern and, if found, joins the reply back to the matching claim, flipping it to Claimed.
//
// Matching patterns (most permissive last so brackets-stripped clients still work):
//   /\[claim:([a-z0-9]{10,16})\]/      // bracketed (preferred — emitted by prompts-tick)
//   /(?:^|\s|\b)claim:([a-z0-9]{10,16})\b/  // unbracketed fallback
//
// The function MUTATES the state object passed in (does not save) and returns an array of
// audit entries the caller should append. The caller (zoho-inbound-pull) saves state once
// at the end of its own tick.
//
// Direct-call mode: this file also exports a default Netlify Function handler for ad-hoc
// invocation (master-only) so an admin can paste a body into a UI and re-process it.

import { getStore } from "@netlify/blobs";
import { validateToken } from "./_planner_lib/auth.mjs";

const PLANNER_STORE_NAME = "hanstan-wedding-data";
const STATE_KEY = "planner/state-current.json";
const AUDIT_KEY = "planner/audit-log.json";
const MAX_AUDIT_ENTRIES = 5000;

const TOKEN_RE_BRACKETED = /\[claim:([a-z0-9]{10,16})\]/i;
const TOKEN_RE_UNBRACKETED = /(?:^|\s|\b)claim:([a-z0-9]{10,16})\b/i;

function extractToken(text) {
  if (!text) return null;
  const m1 = TOKEN_RE_BRACKETED.exec(text);
  if (m1) return m1[1].toLowerCase();
  const m2 = TOKEN_RE_UNBRACKETED.exec(text);
  if (m2) return m2[1].toLowerCase();
  return null;
}

/**
 * Process a single newly-appended note. Mutates `state` in place if the note matches a claim.
 * Returns an array of audit entries the caller should append. Never throws.
 *
 * @param {object} state - the live planner state object (mutated in place)
 * @param {object} note - the note just appended; expected to have { id, text, by, ts, channel, ... }
 * @returns {Array<object>} audit entries
 */
export function processNote(state, note) {
  const auditEntries = [];
  try {
    if (!note || typeof note !== "object") return auditEntries;
    if (!Array.isArray(state.giftClaims)) return auditEntries;

    const blob = `${note.text || ""}\n${(note.zohoMeta && note.zohoMeta.subject) || ""}`;
    const token = extractToken(blob);
    if (!token) return auditEntries;

    const claim = state.giftClaims.find(c => (c.confirmationToken || "").toLowerCase() === token);
    if (!claim) return auditEntries;

    const now = new Date().toISOString();

    // Idempotent: if already Claimed/AutoReverted, this is a no-op (just annotate the note)
    if (claim.status === "Claimed") {
      auditEntries.push({
        ts: now, by: "gift-claim-email-reply",
        entity: "note", action: "note.tag",
        target: note.id,
        summary: `Note matched claim ${claim.claimId} but claim already Claimed; no status change.`,
        giftId: claim.giftId, claimId: claim.claimId
      });
      // Tag the note for visibility in the registry channel
      note.giftId = note.giftId || claim.giftId;
      note.claimId = note.claimId || claim.claimId;
      note.kind = note.kind || "claim-confirmed-via-email-duplicate";
      note.channel = "registry";  // re-route to registry thread for visibility
      return auditEntries;
    }
    if (claim.status === "AutoReverted") {
      auditEntries.push({
        ts: now, by: "gift-claim-email-reply",
        entity: "note", action: "note.tag",
        target: note.id,
        summary: `Late confirmation: claim ${claim.claimId} was auto-reverted before reply arrived. Note tagged for manual review.`,
        giftId: claim.giftId, claimId: claim.claimId
      });
      note.giftId = note.giftId || claim.giftId;
      note.claimId = note.claimId || claim.claimId;
      note.kind = "claim-late-confirmation-after-revert";
      note.channel = "registry";
      return auditEntries;
    }

    // Status === "Pending" — flip to Claimed
    claim.status = "Claimed";
    claim.claimedAt = now;
    claim.claimedVia = "email-reply";
    claim.transactionDetail = (claim.transactionDetail || "") + (claim.transactionDetail ? "\n\n--- via email reply ---\n" : "[via email reply]\n") + (note.text || "").slice(0, 1000);

    // Cancel remaining prompts (mark sentAt so the tick skips them)
    if (Array.isArray(claim.promptsScheduled)) {
      for (const p of claim.promptsScheduled) {
        if (!p.sentAt) p.sentAt = "skipped-confirmed-via-email";
      }
    }

    // Re-route the inbound note to the registry channel
    note.channel = "registry";
    note.giftId = claim.giftId;
    note.claimId = claim.claimId;
    note.kind = "claim-confirmed-via-email";

    // Post a follow-up channel message
    if (!state.messageBoard) state.messageBoard = {};
    if (!state.messageBoard.channels) state.messageBoard.channels = {};
    if (!state.messageBoard.channels.registry) {
      state.messageBoard.channels.registry = { name: "Registry", members: [], messages: [], createdAt: now, createdBy: "system-bootstrap-on-email-reply" };
    }
    if (!Array.isArray(state.messageBoard.channels.registry.messages)) state.messageBoard.channels.registry.messages = [];
    state.messageBoard.channels.registry.messages.push({
      id: `msg-registry-claimed-email-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
      by: "registry-system",
      ts: now,
      text: `✅ Claimed via email reply: "${claim.giftTitle || claim.giftId}" by ${claim.claimerName} <${claim.claimerEmail}>.`,
      reactions: {},
      giftId: claim.giftId,
      claimId: claim.claimId,
      kind: "claim-confirmed-via-email"
    });

    auditEntries.push({
      ts: now, by: "gift-claim-email-reply",
      entity: "giftClaim", action: "giftClaim.confirmed.email",
      target: claim.claimId,
      summary: `Email reply confirmed claim: ${claim.giftTitle || claim.giftId} by ${claim.claimerName}`,
      giftId: claim.giftId,
      claimId: claim.claimId
    });
  } catch (e) {
    // Never throw out of this helper — the inbound-pull caller MUST keep working
    auditEntries.push({
      ts: new Date().toISOString(), by: "gift-claim-email-reply",
      entity: "system", action: "processNote.error",
      target: (note && note.id) || "unknown",
      summary: `processNote crashed: ${e.message}`,
      detail: e.stack ? e.stack.slice(0, 500) : null
    });
  }
  return auditEntries;
}

// === Direct-call mode (rare; for ad-hoc admin re-processing) ===

async function appendAudit(store, entries) {
  if (!entries.length) return;
  let log;
  try {
    const raw = await store.get(AUDIT_KEY);
    log = raw ? JSON.parse(raw) : { entries: [] };
  } catch (e) { log = { entries: [] }; }
  log.entries = [...entries.reverse(), ...log.entries];
  if (log.entries.length > MAX_AUDIT_ENTRIES) log.entries = log.entries.slice(0, MAX_AUDIT_ENTRIES);
  await store.set(AUDIT_KEY, JSON.stringify(log));
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

  let body;
  try { body = await request.json(); } catch (e) {
    return new Response(JSON.stringify({ error: "invalid_json" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  const noteId = (body.noteId || "").trim();
  if (!noteId) {
    return new Response(JSON.stringify({ error: "noteId_required" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  const store = getStore(PLANNER_STORE_NAME);
  let state;
  try {
    const raw = await store.get(STATE_KEY);
    if (!raw) return new Response(JSON.stringify({ error: "state_not_found" }), { status: 500, headers: { "Content-Type": "application/json" } });
    state = JSON.parse(raw);
  } catch (e) {
    return new Response(JSON.stringify({ error: "state_read_failed", detail: e.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }

  if (!Array.isArray(state.notes)) state.notes = [];
  const note = state.notes.find(n => n.id === noteId);
  if (!note) {
    return new Response(JSON.stringify({ error: "note_not_found" }), { status: 404, headers: { "Content-Type": "application/json" } });
  }

  const auditEntries = processNote(state, note);
  state.lastModified = new Date().toISOString();
  state.lastModifiedBy = "gift-claim-email-reply-direct";

  try {
    await store.set(STATE_KEY, JSON.stringify(state));
  } catch (e) {
    return new Response(JSON.stringify({ error: "state_write_failed", detail: e.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }

  if (auditEntries.length) await appendAudit(store, auditEntries);

  return new Response(JSON.stringify({
    ok: true,
    matched: auditEntries.some(e => e.action === "giftClaim.confirmed.email"),
    auditEntries: auditEntries.length
  }), { status: 200, headers: { "Content-Type": "application/json" } });
}

export const config = { path: "/.netlify/functions/gift-claim-email-reply" };
