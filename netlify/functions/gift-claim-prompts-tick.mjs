// HW-REGISTRY-COMMS-WIRING (2026-04-28) — gift-claim-prompts-tick
//
// Runs every 5 minutes via Netlify Scheduled Functions. Also callable via:
//   POST with X-Internal-Bypass header (used by gift-claims-public fire-and-forget fallback)
//   POST with master Bearer token (manual sweep from admin)
//
// Per tick:
//   1. Load state.giftClaims[] where status === "Pending"
//   2. For each claim, for each promptsScheduled[i] with dueAt <= now AND sentAt is null:
//        - Send the prompt email via zoho-broadcast-send (X-Internal-Bypass)
//        - On success, set sentAt = now, append channel message + audit
//        - On failure, do NOT set sentAt (will retry next tick)
//   3. For each claim with autoRevertAt <= now:
//        - Set claim.status = "AutoReverted", autoRevertedAt = now
//        - Post note + channel message to channels.registry
//        - Do NOT write to gifts blob (the gift-claims-public overlay just stops showing it)
//
// All writes go through a single state save at the end of the tick to keep things atomic.

import { getStore } from "@netlify/blobs";
import { validateToken } from "./_planner_lib/auth.mjs";

const PLANNER_STORE_NAME = "hanstan-wedding-data";
const STATE_KEY = "planner/state-current.json";
const AUDIT_KEY = "planner/audit-log.json";
const MAX_AUDIT_ENTRIES = 5000;

const PROMPT_TEMPLATES = [
  {
    label: "gentle",
    subject: "Quick check — your gift from hanstan.wedding",
    body: (gifterName, giftTitle, token) => [
      `Hi ${(gifterName || "").split(" ")[0] || "friend"},`,
      "",
      `We saw you started a gift claim for "${giftTitle}" on our registry — thank you so much!`,
      "",
      "If you've completed your gift (sent funds, made a purchase, etc.), would you mind",
      "replying to this email to confirm? A quick line about how you sent it (Venmo / PayPal / Zelle / store)",
      "and the approximate amount or transaction reference is plenty.",
      "",
      "If you haven't yet, no worries — we'll check in again later.",
      "",
      "If you're shipping a physical gift, please send it to:",
      "  Merry Shipman",
      "  13183 Aspen Way NE",
      "  Aurora, OR 97002",
      "",
      "(That's Hannah's mom — she's collecting gifts and bringing them to us.)",
      "",
      "With love,",
      "Hannah & Stan",
      "",
      `[claim:${token}]`
    ].join("\n")
  },
  {
    label: "checkin",
    subject: "Following up on your gift from hanstan.wedding",
    body: (gifterName, giftTitle, token) => [
      `Hi ${(gifterName || "").split(" ")[0] || "friend"},`,
      "",
      `Just a friendly check-in on your "${giftTitle}" claim — we don't have a confirmation yet.`,
      "",
      "If you completed the gift, a quick reply confirming would be wonderful (with payment app + amount, or",
      "a purchase receipt, whatever's easy). If you haven't been able to yet, we totally understand.",
      "",
      "If you'd like to free the gift up for someone else, you can simply ignore this email and it",
      "will release automatically tomorrow.",
      "",
      "Shipping address (in case you're sending a physical gift):",
      "  Merry Shipman",
      "  13183 Aspen Way NE",
      "  Aurora, OR 97002",
      "",
      "Love,",
      "Hannah & Stan",
      "",
      `[claim:${token}]`
    ].join("\n")
  },
  {
    label: "final",
    subject: "Final reminder — your gift claim from hanstan.wedding",
    body: (gifterName, giftTitle, token) => [
      `Hi ${(gifterName || "").split(" ")[0] || "friend"},`,
      "",
      `This is the last automated reminder for your "${giftTitle}" claim.`,
      "",
      "If you've already sent or arranged the gift, please reply to this email with any",
      "confirmation detail — even just \"yes, sent\" works. We'll mark it claimed.",
      "",
      "If you'd rather not proceed, no action needed — the claim will auto-release in a few hours",
      "and the gift will be available for someone else again.",
      "",
      "Either way, thank you for thinking of us.",
      "",
      "Love,",
      "Hannah & Stan",
      "",
      `[claim:${token}]`
    ].join("\n")
  }
];

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

async function sendPromptEmail(claim, promptIdx) {
  const isDev = !!process.env.NETLIFY_DEV;
  const tpl = PROMPT_TEMPLATES[promptIdx];
  if (!tpl) return { ok: false, error: "no_template" };

  const subject = tpl.subject + ` [claim:${claim.confirmationToken}]`;
  const bodyText = tpl.body(claim.claimerName, claim.giftTitle, claim.confirmationToken);
  const bodyHtml = bodyText
    .split("\n")
    .map(l => l.startsWith("  ") ? `<div style="margin-left:16px">${l.trim()}</div>` : `<p style="margin:8px 0">${l}</p>`)
    .join("");

  if (isDev) {
    console.log(`[email-stubbed] prompt-${tpl.label} to ${claim.claimerEmail} re ${claim.giftTitle}`);
    return { ok: true, stubbed: true };
  }

  const baseUrl = process.env.URL || "";
  const bypass = process.env.PLANNER_MASTER_BOOTSTRAP_TOKEN || "";
  if (!baseUrl || !bypass) return { ok: false, error: "no_internal_setup" };

  try {
    const res = await fetch(baseUrl + "/.netlify/functions/zoho-broadcast-send", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Internal-Bypass": bypass },
      body: JSON.stringify({
        fromAlias: "hannah",
        recipients: [{ email: claim.claimerEmail, name: claim.claimerName }],
        subject,
        bodyText,
        bodyHtml,
        broadcastId: `prompt-${tpl.label}-${claim.claimId}`,
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
  // Auth: master Bearer OR X-Internal-Bypass (scheduled or fire-and-forget)
  let isInternal = false;
  let auth = null;
  const internalHeader = request.headers ? request.headers.get("X-Internal-Bypass") : null;
  if (internalHeader && process.env.PLANNER_MASTER_BOOTSTRAP_TOKEN && internalHeader === process.env.PLANNER_MASTER_BOOTSTRAP_TOKEN) {
    isInternal = true;
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

  const store = getStore(PLANNER_STORE_NAME);
  const nowDate = new Date();
  const now = nowDate.toISOString();
  const nowMs = nowDate.getTime();

  let state;
  try {
    const raw = await store.get(STATE_KEY);
    if (!raw) return new Response(JSON.stringify({ error: "state_not_found" }), { status: 500, headers: { "Content-Type": "application/json" } });
    state = JSON.parse(raw);
  } catch (e) {
    return new Response(JSON.stringify({ error: "state_read_failed", detail: e.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }

  if (!Array.isArray(state.giftClaims)) state.giftClaims = [];
  const claims = state.giftClaims;

  const auditEntries = [];
  const summary = { promptsSent: 0, promptsFailed: 0, autoReverted: 0, scanned: claims.length };

  // Ensure registry channel exists for any messages we might post
  if (!state.messageBoard || typeof state.messageBoard !== "object") state.messageBoard = {};
  if (!state.messageBoard.channels || typeof state.messageBoard.channels !== "object") state.messageBoard.channels = {};
  if (!state.messageBoard.channels.registry) {
    state.messageBoard.channels.registry = { name: "Registry", members: [], messages: [], createdAt: now, createdBy: "system-bootstrap-on-prompts-tick" };
    auditEntries.push({ ts: now, by: "gift-claim-prompts-tick", entity: "channel", action: "channel.create", target: "registry", summary: "Auto-created Registry channel during prompts-tick" });
  }
  const regChan = state.messageBoard.channels.registry;
  if (!Array.isArray(regChan.messages)) regChan.messages = [];

  for (const claim of claims) {
    if (claim.status !== "Pending") continue;

    // Auto-revert FIRST (so we don't fire prompts on a claim that's about to revert)
    const revertAtMs = new Date(claim.autoRevertAt).getTime();
    if (revertAtMs <= nowMs) {
      claim.status = "AutoReverted";
      claim.autoRevertedAt = now;
      const msg = {
        id: `msg-registry-revert-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
        by: "registry-system",
        ts: now,
        text: `🕒 Auto-released: gift "${claim.giftTitle || claim.giftId}" — no confirmation received within 48h. Gift is available again.`,
        reactions: {},
        giftId: claim.giftId,
        claimId: claim.claimId,
        kind: "claim-auto-reverted"
      };
      regChan.messages.push(msg);
      if (!Array.isArray(state.notes)) state.notes = [];
      state.notes.push({
        id: "note-revert-" + claim.claimId,
        text: `Gift "${claim.giftTitle || claim.giftId}" auto-released after 48h with no confirmation from ${claim.claimerName} <${claim.claimerEmail}>. Gift is available again.`,
        by: "registry-system",
        ts: now,
        status: "unread",
        channel: "registry",
        giftId: claim.giftId,
        claimId: claim.claimId,
        kind: "claim-auto-reverted"
      });
      auditEntries.push({ ts: now, by: "gift-claim-prompts-tick", entity: "giftClaim", action: "giftClaim.autoRevert", target: claim.claimId, summary: msg.text, giftId: claim.giftId });
      summary.autoReverted++;
      continue;
    }

    // Prompts: check each scheduled prompt
    if (Array.isArray(claim.promptsScheduled)) {
      for (let i = 0; i < claim.promptsScheduled.length; i++) {
        const p = claim.promptsScheduled[i];
        if (p.sentAt) continue;
        const dueMs = new Date(p.dueAt).getTime();
        if (dueMs > nowMs) continue;
        // Send
        const result = await sendPromptEmail(claim, i);
        if (result.ok) {
          p.sentAt = new Date().toISOString();
          if (result.stubbed) p.stubbed = true;
          regChan.messages.push({
            id: `msg-registry-prompt-${i}-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
            by: "registry-system",
            ts: p.sentAt,
            text: `📧 Prompt #${i+1} (${p.label}) sent to ${claim.claimerEmail} re "${claim.giftTitle || claim.giftId}".`,
            reactions: {},
            giftId: claim.giftId,
            claimId: claim.claimId,
            kind: "prompt-sent",
            promptIndex: i
          });
          auditEntries.push({ ts: p.sentAt, by: "gift-claim-prompts-tick", entity: "giftClaim", action: "giftClaim.prompt.sent", target: claim.claimId, summary: `Prompt ${i+1} (${p.label}) sent to ${claim.claimerEmail}`, giftId: claim.giftId, promptIndex: i, stubbed: !!result.stubbed });
          summary.promptsSent++;
        } else {
          // Will retry next tick. Audit but don't set sentAt.
          auditEntries.push({ ts: now, by: "gift-claim-prompts-tick", entity: "giftClaim", action: "giftClaim.prompt.failed", target: claim.claimId, summary: `Prompt ${i+1} send failed: ${result.error || "unknown"}`, giftId: claim.giftId, promptIndex: i });
          summary.promptsFailed++;
        }
      }
    }
  }

  state.lastModified = now;
  state.lastModifiedBy = "gift-claim-prompts-tick";

  // Save state once at end of tick
  try {
    await store.set(STATE_KEY, JSON.stringify(state));
  } catch (e) {
    return new Response(JSON.stringify({ error: "state_write_failed", detail: e.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }

  if (auditEntries.length) await appendAudit(store, auditEntries);

  return new Response(JSON.stringify({
    ok: true,
    isInternal,
    now,
    summary
  }), { status: 200, headers: { "Content-Type": "application/json" } });
}

export const config = {
  path: "/.netlify/functions/gift-claim-prompts-tick",
  schedule: "*/5 * * * *"  // every 5 minutes — site is on a tier that supports scheduled functions
};
