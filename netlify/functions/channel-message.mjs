// HW-PLANNER-001 | Stage 3 Phase A — channel-message endpoint
// Posts a message to state.messageBoard.channels[channelId].messages[].
// Coordinator-token authenticated. Master sees all channels; non-master can only post in
// channels where their token is in members[] (or is the master, who bypasses).
//
// Body:
//   {
//     channelId: "general",
//     text: "...",
//     replyToId?: "msg-..."   // optional thread-reply pointer
//   }
//
// Each message gets:
//   { id, by, ts, text, replyToId?, reactions: {} }
//
// Audit-log entry: { entity: "channelMessage", action: "channelMessage.send", target: msgId,
//                    channel: channelId, summary: "..." }
//
// This endpoint exists separately from planner-state.mjs POST so individual messages
// don't have to round-trip the entire state blob. The planner-state.mjs POST path
// also supports messageBoard updates (from full-state save), so this is the
// optimization endpoint for high-frequency single-message writes.

import { getStore } from "@netlify/blobs";
import { validateToken } from "./_planner_lib/auth.mjs";

const PLANNER_STORE_NAME = "hanstan-wedding-data";
const STATE_KEY = "planner/state-current.json";
const AUDIT_KEY = "planner/audit-log.json";
const MAX_AUDIT_ENTRIES = 5000;

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

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return new Response(JSON.stringify({ error: "invalid_json" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  const channelId = (body.channelId || "").trim();
  const text = (body.text || "").trim();
  const replyToId = body.replyToId ? String(body.replyToId).trim() : null;

  if (!channelId) return new Response(JSON.stringify({ error: "channelId_required" }), { status: 400, headers: { "Content-Type": "application/json" } });
  if (!text) return new Response(JSON.stringify({ error: "text_required" }), { status: 400, headers: { "Content-Type": "application/json" } });
  if (text.length > 10000) return new Response(JSON.stringify({ error: "text_too_long" }), { status: 400, headers: { "Content-Type": "application/json" } });

  // Load state
  let state;
  try {
    const raw = await auth.store.get(STATE_KEY);
    if (!raw) return new Response(JSON.stringify({ error: "state_not_found" }), { status: 500, headers: { "Content-Type": "application/json" } });
    state = JSON.parse(raw);
  } catch (e) {
    return new Response(JSON.stringify({ error: "state_read_failed" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }

  if (!state.messageBoard || typeof state.messageBoard !== "object") state.messageBoard = {};
  if (!state.messageBoard.channels || typeof state.messageBoard.channels !== "object") state.messageBoard.channels = {};

  const channel = state.messageBoard.channels[channelId];
  if (!channel) {
    return new Response(JSON.stringify({ error: "channel_not_found", detail: "Channel '" + channelId + "' does not exist. Master must create channels via the Communications tab first." }), {
      status: 404,
      headers: { "Content-Type": "application/json" }
    });
  }

  // Membership check: master bypasses; otherwise token must be in channel.members[]
  if (!auth.isMaster) {
    const members = Array.isArray(channel.members) ? channel.members : [];
    if (!members.includes(auth.token)) {
      return new Response(JSON.stringify({ error: "not_a_member", detail: "Your token is not a member of channel '" + channelId + "'. Master must add you via the Communications tab." }), {
        status: 403,
        headers: { "Content-Type": "application/json" }
      });
    }
  }

  // Build message
  if (!Array.isArray(channel.messages)) channel.messages = [];
  const now = new Date().toISOString();
  const message = {
    id: "msg-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8),
    by: auth.name,
    ts: now,
    text,
    reactions: {}
  };
  if (replyToId) message.replyToId = replyToId;

  channel.messages.push(message);
  state.lastModified = now;
  state.lastModifiedBy = auth.name;
  await auth.store.set(STATE_KEY, JSON.stringify(state));

  // Audit
  await appendAudit(auth.store, [{
    ts: now,
    by: auth.name,
    entity: "channelMessage",
    action: "channelMessage.send",
    target: message.id,
    channel: channelId,
    summary: "Channel #" + channelId + ": " + text.slice(0, 80) + (text.length > 80 ? "..." : "")
  }]);

  return new Response(JSON.stringify({
    ok: true,
    messageId: message.id,
    ts: now
  }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
}

export const config = { path: "/.netlify/functions/channel-message" };
