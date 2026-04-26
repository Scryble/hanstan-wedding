// HW-PLANNER-001 | Stage 3 Phase A — Ask-A-Question public form handler
// Public endpoint reachable from /, /faq/, /registry/. Submits a guest message that:
//   1. Gets validated (name + valid-email format + non-trivial message)
//   2. Lands as a state.notes[] entry (channel: "asq-public-<pageId>") so it shows up
//      in the planner Communications inbox alongside other notes
//   3. Triggers a Zoho-out broadcast email from hello@ to stan@ + hannah@ (which
//      forward to personal Gmails per Zoho's config) — best-effort; failure does NOT
//      block the note write
//
// No CAPTCHA / honeypot / rate-limit. ~150 wedding guests; if a bot floods it,
// Stan will see it in the inbox and react. Adding spam infrastructure pre-emptively
// is the kind of abstraction-beyond-need-of-task pattern explicitly disallowed.

import { getStore } from "@netlify/blobs";

const STATE_KEY = "planner/state-current.json";
const PLANNER_STORE_NAME = "hanstan-wedding-data";

async function appendNote(store, note) {
  const raw = await store.get(STATE_KEY);
  if (!raw) throw new Error("state_not_found");
  const state = JSON.parse(raw);
  if (!Array.isArray(state.notes)) state.notes = [];
  state.notes.push(note);
  state.lastModified = new Date().toISOString();
  state.lastModifiedBy = "asq-public-form";
  await store.set(STATE_KEY, JSON.stringify(state));
}

async function emailViaZoho(toAddrs, subject, bodyText, fromAlias) {
  const password = process.env.ZOHO_APP_PASSWORD;
  if (!password) return { ok: false, error: "no_zoho_password", skipped: true };
  const endpoint = process.env.URL ? process.env.URL + "/.netlify/functions/zoho-broadcast-send" : null;
  if (!endpoint) return { ok: false, error: "no_internal_url", skipped: true };
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Bypass": process.env.PLANNER_MASTER_BOOTSTRAP_TOKEN || ""
      },
      body: JSON.stringify({
        fromAlias: fromAlias || "hello",
        recipients: toAddrs.map(addr => ({ email: addr })),
        subject,
        bodyText,
        bodyHtml: bodyText.replace(/\n/g, "<br>"),
        broadcastId: "asq-" + Date.now(),
        internal: true
      })
    });
    const data = await res.json();
    return { ok: !!data.ok, data };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

export default async function handler(req) {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" }
    });
  }

  let body;
  try {
    body = await req.json();
  } catch (e) {
    return new Response(JSON.stringify({ error: "invalid_json" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  // Field validation (basic — no anti-spam stack)
  const name = (body.name || "").trim().slice(0, 100);
  const email = (body.email || "").trim().slice(0, 200);
  const message = (body.message || "").trim().slice(0, 4000);
  const pageId = (body.pageId || "unknown").trim().slice(0, 50);

  if (!name) return new Response(JSON.stringify({ error: "name_required" }), { status: 400, headers: { "Content-Type": "application/json" } });
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return new Response(JSON.stringify({ error: "valid_email_required" }), { status: 400, headers: { "Content-Type": "application/json" } });
  if (!message || message.length < 5) return new Response(JSON.stringify({ error: "message_too_short" }), { status: 400, headers: { "Content-Type": "application/json" } });

  const store = getStore(PLANNER_STORE_NAME);

  // Build the note
  const note = {
    id: "note-asq-" + Date.now(),
    text: "Q from " + name + " <" + email + "> on /" + pageId + ":\n\n" + message,
    by: name + " <" + email + "> (public ASQ /" + pageId + ")",
    ts: new Date().toISOString(),
    status: "unread",
    channel: "asq-public-" + pageId,
    asqMeta: { name, email, pageId }
  };

  // Write the note to planner state.notes[]
  try {
    await appendNote(store, note);
  } catch (e) {
    return new Response(JSON.stringify({ error: "note_write_failed", detail: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }

  // Best-effort email forward (non-blocking failure)
  const emailResult = await emailViaZoho(
    ["stan@hanstan.wedding", "hannah@hanstan.wedding"],
    "[ASQ /" + pageId + "] Question from " + name,
    "From: " + name + " <" + email + ">\nPage: /" + pageId + "\n\n" + message + "\n\n— Reply to the visitor at the email above. This message also lives in the planner Communications inbox.",
    "hello"
  );

  return new Response(JSON.stringify({
    ok: true,
    noteId: note.id,
    emailForwarded: !!(emailResult && emailResult.ok),
    emailSkipped: !!(emailResult && emailResult.skipped)
  }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
}

export const config = { path: "/.netlify/functions/public-contact" };
