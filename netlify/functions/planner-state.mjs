// HW-PLANNER-001 | GET current state, POST new state.
// On POST: snapshots previous state, computes audit diff, writes new state.
// Atomic semantics: snapshot write happens before state write.

import { readFile } from "fs/promises";
import { validateToken } from "./_planner_lib/auth.mjs";

const STATE_KEY = "planner/state-current.json";
const AUDIT_KEY = "planner/audit-log.json";
const SNAPS_MANIFEST_KEY = "planner/snapshots-manifest.json";
const SNAPS_PREFIX = "planner/snapshots/";
const SEED_PATH = new URL("../../data/planner-seed.json", import.meta.url);
const MAX_SNAPSHOTS = 200;
const MAX_AUDIT_ENTRIES = 5000;

async function ensureState(store) {
  const existing = await store.get(STATE_KEY);
  if (existing) return JSON.parse(existing);
  const seedText = await readFile(SEED_PATH, "utf-8");
  const seed = JSON.parse(seedText);
  const initial = {
    schemaVersion: 6,
    lastModified: new Date().toISOString(),
    lastModifiedBy: "system-seed",
    tasks: seed.tasks || [],
    contacts: seed.contacts || [],
    groups: seed.groups || [],
    tags: seed.tags || [],
    savedViews: seed.savedViews || [],
    prefs: seed.prefs || {}
  };
  await store.set(STATE_KEY, JSON.stringify(initial));
  return initial;
}

function diffStates(prev, next, by) {
  const entries = [];
  const ts = new Date().toISOString();
  const prevTaskMap = new Map((prev.tasks || []).map(t => [t.id, t]));
  const nextTaskMap = new Map((next.tasks || []).map(t => [t.id, t]));
  for (const [id, t] of nextTaskMap) {
    const p = prevTaskMap.get(id);
    if (!p) {
      entries.push({ ts, by, action: "task.create", target: t.taskId || id, summary: "Created task: " + (t.title || "") });
    } else {
      if (p.status !== t.status) {
        entries.push({ ts, by, action: "task.update", target: t.taskId || id, summary: "Status: " + p.status + " → " + t.status });
      }
      if (p.title !== t.title) {
        entries.push({ ts, by, action: "task.update", target: t.taskId || id, summary: "Renamed: " + (t.title || "") });
      }
      if ((p.assignee || "") !== (t.assignee || "")) {
        entries.push({ ts, by, action: "task.update", target: t.taskId || id, summary: "Assigned: " + (t.assignee || "(none)") });
      }
      if ((p.deadline || "") !== (t.deadline || "")) {
        entries.push({ ts, by, action: "task.update", target: t.taskId || id, summary: "Deadline: " + (t.deadline || "(cleared)") });
      }
      if ((p.priority || "") !== (t.priority || "")) {
        entries.push({ ts, by, action: "task.update", target: t.taskId || id, summary: "Priority: " + (p.priority || "(none)") + " → " + (t.priority || "(none)") });
      }
    }
  }
  for (const [id, p] of prevTaskMap) {
    if (!nextTaskMap.has(id)) {
      entries.push({ ts, by, action: "task.delete", target: p.taskId || id, summary: "Deleted task: " + (p.title || "") });
    }
  }
  const prevPpl = new Map((prev.contacts || []).map(c => [c.id, c]));
  const nextPpl = new Map((next.contacts || []).map(c => [c.id, c]));
  for (const [id, c] of nextPpl) {
    if (!prevPpl.has(id)) {
      entries.push({ ts, by, action: "person.create", target: id, summary: "Added person: " + (c.name || "") });
    }
  }
  for (const [id, c] of prevPpl) {
    if (!nextPpl.has(id)) {
      entries.push({ ts, by, action: "person.delete", target: id, summary: "Removed person: " + (c.name || "") });
    }
  }
  const prevG = new Set(prev.groups || []);
  const nextG = new Set(next.groups || []);
  for (const g of nextG) if (!prevG.has(g)) entries.push({ ts, by, action: "group.add", target: g, summary: "Added group: " + g });
  for (const g of prevG) if (!nextG.has(g)) entries.push({ ts, by, action: "group.delete", target: g, summary: "Deleted group: " + g });
  const prevT = new Set(prev.tags || []);
  const nextT = new Set(next.tags || []);
  for (const t of nextT) if (!prevT.has(t)) entries.push({ ts, by, action: "tag.add", target: t, summary: "Added tag: " + t });
  for (const t of prevT) if (!nextT.has(t)) entries.push({ ts, by, action: "tag.delete", target: t, summary: "Deleted tag: " + t });
  return entries;
}

async function appendAudit(store, newEntries) {
  if (!newEntries.length) return;
  let log;
  try {
    const raw = await store.get(AUDIT_KEY);
    log = raw ? JSON.parse(raw) : { entries: [] };
  } catch (e) {
    log = { entries: [] };
  }
  log.entries = [...newEntries.reverse(), ...log.entries];
  if (log.entries.length > MAX_AUDIT_ENTRIES) {
    log.entries = log.entries.slice(0, MAX_AUDIT_ENTRIES);
  }
  await store.set(AUDIT_KEY, JSON.stringify(log));
}

export default async function handler(request) {
  const auth = await validateToken(request);
  if (!auth.ok) {
    return new Response(
      JSON.stringify({ error: auth.error }),
      { status: auth.status, headers: { "Content-Type": "application/json; charset=utf-8" } }
    );
  }

  if (request.method === "GET") {
    try {
      const state = await ensureState(auth.store);
      return new Response(
        JSON.stringify(state),
        { status: 200, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } }
      );
    } catch (e) {
      return new Response(
        JSON.stringify({ error: "read_failed", detail: e.message }),
        { status: 500, headers: { "Content-Type": "application/json; charset=utf-8" } }
      );
    }
  }

  if (request.method === "POST") {
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return new Response(
        JSON.stringify({ error: "invalid_json" }),
        { status: 400, headers: { "Content-Type": "application/json; charset=utf-8" } }
      );
    }
    const newState = body.state;
    if (!newState || !Array.isArray(newState.tasks)) {
      return new Response(
        JSON.stringify({ error: "invalid_state" }),
        { status: 400, headers: { "Content-Type": "application/json; charset=utf-8" } }
      );
    }

    try {
      const prev = await ensureState(auth.store);
      const now = new Date().toISOString();
      const stamped = {
        ...newState,
        schemaVersion: 6,
        lastModified: now,
        lastModifiedBy: auth.name
      };

      // Snapshot previous state BEFORE overwriting (atomic guard)
      const snapTs = now.replace(/[:.]/g, "-");
      const snapKey = SNAPS_PREFIX + snapTs + "-" + auth.name + ".json";
      await auth.store.set(snapKey, JSON.stringify(prev));

      // Update snapshot manifest
      let manifest;
      try {
        const raw = await auth.store.get(SNAPS_MANIFEST_KEY);
        manifest = raw ? JSON.parse(raw) : { snapshots: [] };
      } catch (e) {
        manifest = { snapshots: [] };
      }
      manifest.snapshots.unshift({
        id: snapTs + "-" + auth.name,
        ts: prev.lastModified,
        by: prev.lastModifiedBy,
        taskCount: (prev.tasks || []).length
      });
      // Cap snapshots
      if (manifest.snapshots.length > MAX_SNAPSHOTS) {
        const dropped = manifest.snapshots.splice(MAX_SNAPSHOTS);
        for (const d of dropped) {
          try { await auth.store.delete(SNAPS_PREFIX + d.id + ".json"); } catch (e) {}
        }
      }
      await auth.store.set(SNAPS_MANIFEST_KEY, JSON.stringify(manifest));

      // Generate audit entries from diff
      const auditEntries = diffStates(prev, stamped, auth.name);
      await appendAudit(auth.store, auditEntries);

      // === syntheticAuditEntries acceptance (added per spec_plannerUpdate_26apr23.md §C.3c Part 1) ===
      // Used by one-shot migrations (e.g. Phase C.3c Elsie backfill) to inject historical
      // audit entries with their original ts+by values. When the field is absent, behavior is unchanged.
      if (Array.isArray(body.syntheticAuditEntries)) {
        for (let i = 0; i < body.syntheticAuditEntries.length; i++) {
          const e = body.syntheticAuditEntries[i];
          const missing = ['ts', 'by', 'action', 'target', 'summary'].filter(f => !e[f]);
          if (missing.length) {
            return new Response(
              JSON.stringify({ ok: false, error: `syntheticAuditEntries[${i}] missing required fields: ${missing.join(', ')}` }),
              { status: 400, headers: { 'content-type': 'application/json' } }
            );
          }
        }
        await appendAudit(auth.store, body.syntheticAuditEntries);
      }
      // === end syntheticAuditEntries acceptance ===

      // Write new state (atomic commit point)
      await auth.store.set(STATE_KEY, JSON.stringify(stamped));

      return new Response(
        JSON.stringify({
          ok: true,
          lastModified: now,
          savedAs: auth.name,
          auditEntries: auditEntries.length
        }),
        { status: 200, headers: { "Content-Type": "application/json; charset=utf-8" } }
      );
    } catch (e) {
      return new Response(
        JSON.stringify({ error: "write_failed", detail: e.message }),
        { status: 500, headers: { "Content-Type": "application/json; charset=utf-8" } }
      );
    }
  }

  return new Response(
    JSON.stringify({ error: "Method Not Allowed" }),
    { status: 405, headers: { "Content-Type": "application/json; charset=utf-8" } }
  );
}
