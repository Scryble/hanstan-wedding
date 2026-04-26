// HW-PLANNER-001 | Stage 3 Phase A — 12-hour delta digest emit
// Synthesizes a delta report (tasks created/changed, schedule edits, new notes,
// new channel messages, registry/copy/theme publishes, broadcast statuses) over
// the last N hours and emails it to Stan + Hannah's personal Gmails (via Zoho
// forwarding).
//
// Trigger options (per spec):
//   1. POST from a Netlify Scheduled Function (cron, 12h cadence) — primary
//   2. POST from master-authenticated planner UI manual "Emit Digest Now" button — secondary
//
// Auth: master coordinator OR scheduled-bypass header (X-Internal-Bypass) for cron
//
// On-demand cadence per OQ-2 directive: Scrybal said "Only on demand" for inbound
// pull. The 12h digest is separately scheduled (Scrybal-confirmed in Flow 4 spec).
// Both paths land here.

import { getStore } from "@netlify/blobs";
import { validateToken } from "./_planner_lib/auth.mjs";

const PLANNER_STORE_NAME = "hanstan-wedding-data";
const STATE_KEY = "planner/state-current.json";
const AUDIT_KEY = "planner/audit-log.json";
const DIGEST_RUN_KEY = "planner/digest-runs.json";
const DEFAULT_WINDOW_HOURS = 12;
const PERSONAL_RECIPIENTS = ["scryballer@gmail.com"]; // Stan-personal; Hannah's added when known

async function loadJson(store, key, defaultValue) {
  try {
    const raw = await store.get(key);
    return raw ? JSON.parse(raw) : defaultValue;
  } catch (e) {
    return defaultValue;
  }
}

function buildDigestSections(state, audit, sinceTs) {
  const since = new Date(sinceTs).getTime();
  const entries = (audit.entries || []).filter(e => {
    const t = new Date(e.ts).getTime();
    return t >= since;
  });

  const sections = {
    tasksCreated: entries.filter(e => e.action === "task.create"),
    tasksUpdated: entries.filter(e => e.action === "task.update" && e.field !== "status"),
    tasksStatusChanged: entries.filter(e => e.action === "task.update" && e.field === "status"),
    scheduleChanges: entries.filter(e => (e.entity || "").startsWith("schedule") || e.action === "person.add" || e.action === "person.remove"),
    notesNew: entries.filter(e => e.action === "note.create"),
    notesProcessed: entries.filter(e => e.action === "note.status" || e.action === "note.convert"),
    channelMessages: entries.filter(e => e.action === "channelMessage.send"),
    broadcastsSent: entries.filter(e => e.action === "broadcast.complete"),
    broadcastsFailed: entries.filter(e => e.action === "broadcast.fail"),
    registryPublishes: entries.filter(e => e.action === "registryDraft.publish" || e.action === "registry.publish"),
    coordinatorChanges: entries.filter(e => (e.entity || "") === "coordinator")
  };
  return sections;
}

function renderDigestHtml(sections, sinceTs, now, state) {
  const sec = (title, items, renderRow) => {
    if (!items || !items.length) return "";
    const rows = items.slice(0, 50).map(renderRow).join("");
    return `<h3 style="margin:14px 0 6px;font-family:Georgia,serif;color:#7a5e2e">${title} <span style="font-weight:normal;color:#888;font-size:13px">(${items.length})</span></h3><div style="font-size:14px;line-height:1.5;color:#222">${rows}</div>`;
  };

  const taskRow = e => `<div style="padding:4px 0">• <strong>${e.target || ""}</strong>: ${e.summary || ""} <span style="color:#999;font-size:12px">(${e.by})</span></div>`;
  const noteRow = e => `<div style="padding:4px 0;border-left:3px solid #d4af6c;padding-left:8px;margin:4px 0">${e.summary || ""} <span style="color:#999;font-size:12px">— ${e.by}</span></div>`;
  const generic = e => `<div style="padding:3px 0">• ${e.summary || ""} <span style="color:#999;font-size:12px">(${e.by}, ${e.ts ? new Date(e.ts).toLocaleString() : ""})</span></div>`;

  const totalCount = Object.values(sections).reduce((sum, arr) => sum + (arr ? arr.length : 0), 0);

  const plannerLink = (process.env.URL || "https://hanstan.wedding") + "/planner/";

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family:Georgia,serif;color:#222;background:#fbf7ed;padding:24px;max-width:680px;margin:0 auto">
<div style="background:#fff;border:1px solid #e9d59f;border-radius:8px;padding:24px">
  <h1 style="margin:0 0 4px;font-size:22px;color:#7a5e2e">HanStan Wedding — 12h Digest</h1>
  <div style="color:#888;font-size:13px;margin-bottom:18px">${new Date(sinceTs).toLocaleString()} → ${new Date(now).toLocaleString()} • ${totalCount} change${totalCount === 1 ? "" : "s"}</div>
  ${totalCount === 0 ? '<p style="color:#888;font-style:italic">Nothing to report this window. The planner has been quiet.</p>' : ""}
  ${sec("New tasks", sections.tasksCreated, taskRow)}
  ${sec("Task status changes", sections.tasksStatusChanged, taskRow)}
  ${sec("Task edits", sections.tasksUpdated, taskRow)}
  ${sec("Schedule changes", sections.scheduleChanges, generic)}
  ${sec("New notes (inbox)", sections.notesNew, noteRow)}
  ${sec("Notes triaged", sections.notesProcessed, generic)}
  ${sec("Channel messages", sections.channelMessages, generic)}
  ${sec("Broadcasts sent", sections.broadcastsSent, generic)}
  ${sec("Broadcasts FAILED — needs attention", sections.broadcastsFailed, generic)}
  ${sec("Registry / site content publishes", sections.registryPublishes, generic)}
  ${sec("Coordinator changes", sections.coordinatorChanges, generic)}
  <div style="margin-top:24px;padding-top:14px;border-top:1px solid #eee;font-size:12px;color:#999">
    Open the planner: <a href="${plannerLink}" style="color:#7a5e2e">${plannerLink}</a><br>
    Generated ${new Date(now).toISOString()}
  </div>
</div></body></html>`;
}

function renderDigestText(sections, sinceTs, now) {
  const lines = [];
  lines.push("HanStan Wedding — 12h Digest");
  lines.push("Window: " + new Date(sinceTs).toLocaleString() + " → " + new Date(now).toLocaleString());
  lines.push("");
  const sec = (title, items, format) => {
    if (!items || !items.length) return;
    lines.push("== " + title + " (" + items.length + ") ==");
    items.slice(0, 50).forEach(e => lines.push("  • " + format(e)));
    lines.push("");
  };
  sec("New tasks", sections.tasksCreated, e => (e.target || "") + ": " + (e.summary || ""));
  sec("Task status changes", sections.tasksStatusChanged, e => (e.target || "") + " — " + (e.summary || ""));
  sec("Task edits", sections.tasksUpdated, e => (e.target || "") + ": " + (e.summary || ""));
  sec("Schedule changes", sections.scheduleChanges, e => e.summary || "");
  sec("New notes", sections.notesNew, e => e.summary || "");
  sec("Channel messages", sections.channelMessages, e => e.summary || "");
  sec("Broadcasts sent", sections.broadcastsSent, e => e.summary || "");
  sec("Broadcasts FAILED", sections.broadcastsFailed, e => e.summary || "");
  sec("Registry publishes", sections.registryPublishes, e => e.summary || "");
  return lines.join("\n");
}

async function callBroadcastSend(toAddrs, subject, bodyText, bodyHtml) {
  const endpoint = (process.env.URL || "") + "/.netlify/functions/zoho-broadcast-send";
  if (!endpoint) return { ok: false, error: "no_internal_url" };
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Bypass": process.env.PLANNER_MASTER_BOOTSTRAP_TOKEN || ""
      },
      body: JSON.stringify({
        fromAlias: "hello",
        recipients: toAddrs.map(addr => ({ email: addr })),
        subject,
        bodyText,
        bodyHtml,
        broadcastId: "digest-" + Date.now()
      })
    });
    return await res.json();
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

  // Auth: master coordinator OR scheduled bypass
  let auth;
  let isInternal = false;
  const internalHeader = request.headers.get("X-Internal-Bypass");
  if (internalHeader && process.env.PLANNER_MASTER_BOOTSTRAP_TOKEN && internalHeader === process.env.PLANNER_MASTER_BOOTSTRAP_TOKEN) {
    isInternal = true;
    auth = { ok: true, name: "scheduled-digest", isMaster: true, store: getStore(PLANNER_STORE_NAME) };
  } else {
    auth = await validateToken(request);
    if (!auth.ok) return new Response(JSON.stringify({ error: auth.error || "unauthorized" }), { status: auth.status || 401, headers: { "Content-Type": "application/json" } });
    if (!auth.isMaster) return new Response(JSON.stringify({ error: "master_only" }), { status: 403, headers: { "Content-Type": "application/json" } });
  }

  let body = {};
  try { body = await request.json(); } catch (e) { /* allow empty body for cron */ }
  const windowHours = body.windowHours || DEFAULT_WINDOW_HOURS;
  const previewOnly = !!body.preview;

  const now = new Date().toISOString();
  const sinceTs = new Date(Date.now() - windowHours * 60 * 60 * 1000).toISOString();

  const state = await loadJson(auth.store, STATE_KEY, {});
  const audit = await loadJson(auth.store, AUDIT_KEY, { entries: [] });

  const sections = buildDigestSections(state, audit, sinceTs);
  const totalCount = Object.values(sections).reduce((sum, arr) => sum + (arr ? arr.length : 0), 0);

  const html = renderDigestHtml(sections, sinceTs, now, state);
  const text = renderDigestText(sections, sinceTs, now);

  if (previewOnly) {
    return new Response(JSON.stringify({
      ok: true,
      preview: true,
      windowHours,
      sinceTs,
      now,
      totalCount,
      sectionCounts: Object.fromEntries(Object.entries(sections).map(([k, v]) => [k, v.length])),
      html,
      text
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  }

  // Determine recipients (Stan personal + Hannah personal — Hannah's email is on her contact record)
  const recipients = [...PERSONAL_RECIPIENTS];
  const hannahContact = (state.contacts || []).find(c => c.id === "p1");
  if (hannahContact && hannahContact.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(hannahContact.email) && !recipients.includes(hannahContact.email)) {
    recipients.push(hannahContact.email);
  }

  const subject = "HanStan Wedding — 12h digest (" + totalCount + " change" + (totalCount === 1 ? "" : "s") + ")";
  const sendResult = await callBroadcastSend(recipients, subject, text, html);

  // Record digest run
  const runs = await loadJson(auth.store, DIGEST_RUN_KEY, { runs: [] });
  runs.runs.unshift({
    id: "digest-" + now,
    sinceTs,
    now,
    windowHours,
    recipients,
    sentOk: !!sendResult.ok,
    sectionCounts: Object.fromEntries(Object.entries(sections).map(([k, v]) => [k, v.length])),
    totalCount,
    isInternal
  });
  if (runs.runs.length > 200) runs.runs = runs.runs.slice(0, 200);
  await auth.store.set(DIGEST_RUN_KEY, JSON.stringify(runs));

  return new Response(JSON.stringify({
    ok: !!sendResult.ok,
    sinceTs,
    now,
    windowHours,
    recipients,
    totalCount,
    sectionCounts: Object.fromEntries(Object.entries(sections).map(([k, v]) => [k, v.length])),
    sendResult: sendResult,
    isInternal
  }), { status: 200, headers: { "Content-Type": "application/json" } });
}

// Stage 3 Phase D fix-forward (2026-04-26): the original config block had a
// `schedule: "0 0,12 * * *"` field for Netlify Scheduled Functions. That feature
// requires a non-Free plan tier and the build rejected the export shape on this
// site's tier. Dropped the schedule. Endpoint is master-authenticated manual
// trigger only; Stan/Hannah hit "Email digest now" via planner UI when wanted.
// If we ever upgrade the Netlify tier, re-add: schedule: "0 0,12 * * *".
export const config = {
  path: "/.netlify/functions/digest-emit"
};
