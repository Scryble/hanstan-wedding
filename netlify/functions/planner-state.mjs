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

// === Unified diff engine (Stage 1 Phase A, 2026-04-24) ===
// DIFFERS registry maps each top-level PlannerState entity type to its per-entity differ.
// Adding a new entity type = adding one entry to the registry.
// Every differ iterates set-union of prev+next field keys (scalar fields) so new fields
// added to live schema in the future are automatically diffed (exclusions: id, modified,
// history, created — meta-fields that change every POST and would spam the log).
// Compound fields (people[], itemsToBring[], notes, eventIds[]) are handled explicitly
// per differ with sub-entry emission (person.add/remove/update, materialsCheck.*, note.*).
// Optional 4th parameter `whyNote` propagates to every emitted entry as `why` — unused
// in Stage 1 callers; Stage 2 Quick-Edit will populate it.

const META_FIELDS = new Set(["id", "modified", "history", "created"]);

function diffScalars(prev, next, entity, target, by, ts, whyNote) {
  const entries = [];
  const keys = new Set([...Object.keys(prev || {}), ...Object.keys(next || {})]);
  for (const k of keys) {
    if (META_FIELDS.has(k)) continue;
    // Compound fields handled separately by per-entity differs
    if (k === "subtasks" || k === "comments" || k === "history" || k === "tags" ||
        k === "people" || k === "itemsToBring" || k === "notes" || k === "eventIds") continue;
    const pv = prev ? prev[k] : undefined;
    const nv = next ? next[k] : undefined;
    // Only diff scalar-ish values (string, number, bool, null)
    if (typeof pv === "object" && pv !== null) continue;
    if (typeof nv === "object" && nv !== null) continue;
    if ((pv || "") !== (nv || "")) {
      const entry = { ts, by, entity, action: entity + ".update", target, field: k, from: pv, to: nv, summary: k + ": " + (pv == null ? "(none)" : pv) + " → " + (nv == null ? "(none)" : nv) };
      if (whyNote) entry.why = whyNote;
      entries.push(entry);
    }
  }
  return entries;
}

function diffTasks(prev, next, by, whyNote) {
  const ts = new Date().toISOString();
  const entries = [];
  const pm = new Map((prev || []).map(t => [t.id, t]));
  const nm = new Map((next || []).map(t => [t.id, t]));
  for (const [id, t] of nm) {
    const target = t.taskId || id;
    const p = pm.get(id);
    if (!p) {
      const e = { ts, by, entity: "task", action: "task.create", target, summary: "Created task: " + (t.title || "") };
      if (whyNote) e.why = whyNote;
      entries.push(e);
    } else {
      // Legacy summary-style entries for back-compat on status/title/assignee/deadline/priority
      if (p.status !== t.status) { const e = { ts, by, entity: "task", action: "task.update", target, field: "status", from: p.status, to: t.status, summary: "Status: " + p.status + " → " + t.status }; if (whyNote) e.why = whyNote; entries.push(e); }
      if (p.title !== t.title) { const e = { ts, by, entity: "task", action: "task.update", target, field: "title", from: p.title, to: t.title, summary: "Renamed: " + (t.title || "") }; if (whyNote) e.why = whyNote; entries.push(e); }
      if ((p.assignee || "") !== (t.assignee || "")) { const e = { ts, by, entity: "task", action: "task.update", target, field: "assignee", from: p.assignee, to: t.assignee, summary: "Assigned: " + (t.assignee || "(none)") }; if (whyNote) e.why = whyNote; entries.push(e); }
      if ((p.deadline || "") !== (t.deadline || "")) { const e = { ts, by, entity: "task", action: "task.update", target, field: "deadline", from: p.deadline, to: t.deadline, summary: "Deadline: " + (t.deadline || "(cleared)") }; if (whyNote) e.why = whyNote; entries.push(e); }
      if ((p.priority || "") !== (t.priority || "")) { const e = { ts, by, entity: "task", action: "task.update", target, field: "priority", from: p.priority, to: t.priority, summary: "Priority: " + (p.priority || "(none)") + " → " + (t.priority || "(none)") }; if (whyNote) e.why = whyNote; entries.push(e); }
      // New scalar fields (desc, group, persona, location, contacts, blockedBy, workstream, quadrant, recurring, reminder, visibilitySet) via set-union
      const handledKeys = new Set(["status", "title", "assignee", "deadline", "priority", "subtasks", "comments", "history", "tags"]);
      const keys = new Set([...Object.keys(p || {}), ...Object.keys(t || {})]);
      for (const k of keys) {
        if (META_FIELDS.has(k) || handledKeys.has(k)) continue;
        const pv = p[k], nv = t[k];
        if (typeof pv === "object" && pv !== null) continue;
        if (typeof nv === "object" && nv !== null) continue;
        if ((pv || "") !== (nv || "")) {
          const e = { ts, by, entity: "task", action: "task.update", target, field: k, from: pv, to: nv, summary: k + ": " + (pv == null ? "(none)" : pv) + " → " + (nv == null ? "(none)" : nv) };
          if (whyNote) e.why = whyNote;
          entries.push(e);
        }
      }
      // Tags: array-diff emitting tag-on-task add/remove
      const pTags = new Set(p.tags || []);
      const nTags = new Set(t.tags || []);
      for (const tag of nTags) if (!pTags.has(tag)) { const e = { ts, by, entity: "task", action: "task.tag.add", target, field: "tags", to: tag, summary: "Tag added: " + tag }; if (whyNote) e.why = whyNote; entries.push(e); }
      for (const tag of pTags) if (!nTags.has(tag)) { const e = { ts, by, entity: "task", action: "task.tag.remove", target, field: "tags", from: tag, summary: "Tag removed: " + tag }; if (whyNote) e.why = whyNote; entries.push(e); }
      // secondaryGroups[]: array-diff emitting multi-parent membership add/remove (Stage 2 Phase A)
      const pSec = new Set(p.secondaryGroups || []);
      const nSec = new Set(t.secondaryGroups || []);
      for (const g of nSec) if (!pSec.has(g)) { const e = { ts, by, entity: "task", action: "task.secondaryGroup.add", target, field: "secondaryGroups", to: g, summary: "Added to secondary group: " + g }; if (whyNote) e.why = whyNote; entries.push(e); }
      for (const g of pSec) if (!nSec.has(g)) { const e = { ts, by, entity: "task", action: "task.secondaryGroup.remove", target, field: "secondaryGroups", from: g, summary: "Removed from secondary group: " + g }; if (whyNote) e.why = whyNote; entries.push(e); }
    }
  }
  for (const [id, p] of pm) {
    if (!nm.has(id)) {
      const e = { ts, by, entity: "task", action: "task.delete", target: p.taskId || id, summary: "Deleted task: " + (p.title || "") };
      if (whyNote) e.why = whyNote;
      entries.push(e);
    }
  }
  return entries;
}

function diffContacts(prev, next, by, whyNote) {
  const ts = new Date().toISOString();
  const entries = [];
  const pm = new Map((prev || []).map(c => [c.id, c]));
  const nm = new Map((next || []).map(c => [c.id, c]));
  for (const [id, c] of nm) {
    if (!pm.has(id)) { const e = { ts, by, entity: "contact", action: "person.create", target: id, summary: "Added person: " + (c.name || "") }; if (whyNote) e.why = whyNote; entries.push(e); }
    else entries.push(...diffScalars(pm.get(id), c, "contact", id, by, ts, whyNote));
  }
  for (const [id, p] of pm) if (!nm.has(id)) { const e = { ts, by, entity: "contact", action: "person.delete", target: id, summary: "Removed person: " + (p.name || "") }; if (whyNote) e.why = whyNote; entries.push(e); }
  return entries;
}

function diffGroups(prev, next, by, whyNote) {
  const ts = new Date().toISOString();
  const entries = [];
  const pg = new Set(prev || []);
  const ng = new Set(next || []);
  for (const g of ng) if (!pg.has(g)) { const e = { ts, by, entity: "group", action: "group.add", target: g, summary: "Added group: " + g }; if (whyNote) e.why = whyNote; entries.push(e); }
  for (const g of pg) if (!ng.has(g)) { const e = { ts, by, entity: "group", action: "group.delete", target: g, summary: "Deleted group: " + g }; if (whyNote) e.why = whyNote; entries.push(e); }
  return entries;
}

function diffTags(prev, next, by, whyNote) {
  const ts = new Date().toISOString();
  const entries = [];
  const pt = new Set(prev || []);
  const nt = new Set(next || []);
  for (const t of nt) if (!pt.has(t)) { const e = { ts, by, entity: "tag", action: "tag.add", target: t, summary: "Added tag: " + t }; if (whyNote) e.why = whyNote; entries.push(e); }
  for (const t of pt) if (!nt.has(t)) { const e = { ts, by, entity: "tag", action: "tag.delete", target: t, summary: "Deleted tag: " + t }; if (whyNote) e.why = whyNote; entries.push(e); }
  return entries;
}

function diffScheduleEvents(prev, next, by, whyNote) {
  const ts = new Date().toISOString();
  const entries = [];
  const pm = new Map((prev || []).map(e => [e.id, e]));
  const nm = new Map((next || []).map(e => [e.id, e]));
  for (const [id, e] of nm) {
    if (!pm.has(id)) { const ent = { ts, by, entity: "scheduleEvent", action: "scheduleEvent.create", target: id, summary: "Created event: " + (e.title || "") }; if (whyNote) ent.why = whyNote; entries.push(ent); continue; }
    const p = pm.get(id);
    // Scalar fields via scan
    entries.push(...diffScalars(p, e, "scheduleEvent", id, by, ts, whyNote));
    // people[] — diff by name+role identity
    const pPeople = (p.people || []).map(x => (x.name || "") + "|" + (x.role || ""));
    const nPeople = (e.people || []).map(x => (x.name || "") + "|" + (x.role || ""));
    for (const key of nPeople) if (!pPeople.includes(key)) { const ent = { ts, by, entity: "scheduleEvent", action: "scheduleEvent.person.add", target: id, field: "people", to: key, summary: "Added person to event: " + key }; if (whyNote) ent.why = whyNote; entries.push(ent); }
    for (const key of pPeople) if (!nPeople.includes(key)) { const ent = { ts, by, entity: "scheduleEvent", action: "scheduleEvent.person.remove", target: id, field: "people", from: key, summary: "Removed person from event: " + key }; if (whyNote) ent.why = whyNote; entries.push(ent); }
    // itemsToBring[] — materialsCheck.*
    const pItems = (p.itemsToBring || []).map(x => typeof x === "string" ? x : (x.text || "") + "|" + (x.done || false));
    const nItems = (e.itemsToBring || []).map(x => typeof x === "string" ? x : (x.text || "") + "|" + (x.done || false));
    for (const item of nItems) if (!pItems.includes(item)) { const ent = { ts, by, entity: "scheduleEvent", action: "materialsCheck.add", target: id, to: item, summary: "Material added: " + item }; if (whyNote) ent.why = whyNote; entries.push(ent); }
    for (const item of pItems) if (!nItems.includes(item)) { const ent = { ts, by, entity: "scheduleEvent", action: "materialsCheck.del", target: id, from: item, summary: "Material removed: " + item }; if (whyNote) ent.why = whyNote; entries.push(ent); }
    // notes — array of note objects or strings; if array, treat as set
    const pNotes = Array.isArray(p.notes) ? p.notes : (p.notes ? [p.notes] : []);
    const nNotes = Array.isArray(e.notes) ? e.notes : (e.notes ? [e.notes] : []);
    const pNoteKeys = pNotes.map(x => typeof x === "string" ? x : JSON.stringify(x));
    const nNoteKeys = nNotes.map(x => typeof x === "string" ? x : JSON.stringify(x));
    for (const k of nNoteKeys) if (!pNoteKeys.includes(k)) { const ent = { ts, by, entity: "scheduleEvent", action: "note.add", target: id, to: k.slice(0, 80), summary: "Note added: " + k.slice(0, 80) }; if (whyNote) ent.why = whyNote; entries.push(ent); }
    for (const k of pNoteKeys) if (!nNoteKeys.includes(k)) { const ent = { ts, by, entity: "scheduleEvent", action: "note.remove", target: id, from: k.slice(0, 80), summary: "Note removed: " + k.slice(0, 80) }; if (whyNote) ent.why = whyNote; entries.push(ent); }
  }
  for (const [id, p] of pm) if (!nm.has(id)) { const ent = { ts, by, entity: "scheduleEvent", action: "scheduleEvent.delete", target: id, summary: "Deleted event: " + (p.title || "") }; if (whyNote) ent.why = whyNote; entries.push(ent); }
  return entries;
}

function diffSchedulePhases(prev, next, by, whyNote) {
  const ts = new Date().toISOString();
  const entries = [];
  const pm = new Map((prev || []).map(p => [p.id, p]));
  const nm = new Map((next || []).map(p => [p.id, p]));
  for (const [id, p] of nm) {
    if (!pm.has(id)) { const ent = { ts, by, entity: "schedulePhase", action: "schedulePhase.create", target: id, summary: "Created phase: " + (p.title || "") }; if (whyNote) ent.why = whyNote; entries.push(ent); continue; }
    const prevP = pm.get(id);
    entries.push(...diffScalars(prevP, p, "schedulePhase", id, by, ts, whyNote));
    const pIds = prevP.eventIds || [];
    const nIds = p.eventIds || [];
    for (const eId of nIds) if (!pIds.includes(eId)) { const ent = { ts, by, entity: "schedulePhase", action: "schedulePhase.event.add", target: id, field: "eventIds", to: eId, summary: "Event " + eId + " added to phase" }; if (whyNote) ent.why = whyNote; entries.push(ent); }
    for (const eId of pIds) if (!nIds.includes(eId)) { const ent = { ts, by, entity: "schedulePhase", action: "schedulePhase.event.remove", target: id, field: "eventIds", from: eId, summary: "Event " + eId + " removed from phase" }; if (whyNote) ent.why = whyNote; entries.push(ent); }
  }
  for (const [id, prevP] of pm) if (!nm.has(id)) { const ent = { ts, by, entity: "schedulePhase", action: "schedulePhase.delete", target: id, summary: "Deleted phase: " + (prevP.title || "") }; if (whyNote) ent.why = whyNote; entries.push(ent); }
  return entries;
}

function diffScheduleQuestions(prev, next, by, whyNote) {
  const ts = new Date().toISOString();
  const entries = [];
  const pm = new Map((prev || []).map(q => [q.id, q]));
  const nm = new Map((next || []).map(q => [q.id, q]));
  for (const [id, q] of nm) {
    if (!pm.has(id)) { const ent = { ts, by, entity: "scheduleQuestion", action: "scheduleQuestion.create", target: id, summary: "Created question: " + (q.question || "").slice(0, 80) }; if (whyNote) ent.why = whyNote; entries.push(ent); continue; }
    entries.push(...diffScalars(pm.get(id), q, "scheduleQuestion", id, by, ts, whyNote));
  }
  for (const [id, p] of pm) if (!nm.has(id)) { const ent = { ts, by, entity: "scheduleQuestion", action: "scheduleQuestion.delete", target: id, summary: "Deleted question: " + (p.question || "").slice(0, 80) }; if (whyNote) ent.why = whyNote; entries.push(ent); }
  return entries;
}

function diffCoordinators(prev, next, by, whyNote) {
  // Coordinators shape: { [token]: { name, isMaster, addedAt, addedBy, scopedEntities? } }
  const ts = new Date().toISOString();
  const entries = [];
  const p = prev || {};
  const n = next || {};
  const tokens = new Set([...Object.keys(p), ...Object.keys(n)]);
  for (const token of tokens) {
    const pv = p[token], nv = n[token];
    if (!pv && nv) { const ent = { ts, by, entity: "coordinator", action: "coordinator.create", target: token, summary: "Added coordinator: " + (nv.name || "") + (nv.isMaster ? " (master)" : "") }; if (whyNote) ent.why = whyNote; entries.push(ent); }
    else if (pv && !nv) { const ent = { ts, by, entity: "coordinator", action: "coordinator.delete", target: token, summary: "Removed coordinator: " + (pv.name || "") }; if (whyNote) ent.why = whyNote; entries.push(ent); }
    else if (pv && nv) {
      entries.push(...diffScalars(pv, nv, "coordinator", token, by, ts, whyNote));
      // scopedEntities[]: array-diff (Stage 2 Phase A)
      const pSet = new Set(Array.isArray(pv.scopedEntities) ? pv.scopedEntities : []);
      const nSet = new Set(Array.isArray(nv.scopedEntities) ? nv.scopedEntities : []);
      for (const s of nSet) if (!pSet.has(s)) { const ent = { ts, by, entity: "coordinator", action: "coordinator.scope.add", target: token, field: "scopedEntities", to: s, summary: "Scope added: " + s }; if (whyNote) ent.why = whyNote; entries.push(ent); }
      for (const s of pSet) if (!nSet.has(s)) { const ent = { ts, by, entity: "coordinator", action: "coordinator.scope.remove", target: token, field: "scopedEntities", from: s, summary: "Scope removed: " + s }; if (whyNote) ent.why = whyNote; entries.push(ent); }
    }
  }
  return entries;
}

// === Render-path visibility filter (Stage 2 Phase A, 2026-04-24) ===
// Parses scope strings of form "<entity>:tag=<value>". Returns true if the record
// of the given entity class carries the value in record.tags. Empty-or-invalid
// scope strings match nothing. Master bypass is handled by the caller, not here.
function matchesScope(record, entity, scopes) {
  if (!Array.isArray(scopes) || scopes.length === 0) return false;
  const tags = Array.isArray(record.tags) ? record.tags : [];
  for (const s of scopes) {
    if (typeof s !== "string") continue;
    const m = s.match(/^([a-zA-Z]+):tag=(.+)$/);
    if (!m) continue;
    if (m[1] !== entity) continue;
    if (tags.includes(m[2])) return true;
  }
  return false;
}

// filterStateForToken: returns { state, suppressedCount }. Master bypass yields
// original state + suppressedCount=0. For non-master, tasks and contacts are
// filtered: keep if visibilitySet is absent/empty, or token is in visibilitySet,
// or matchesScope for the record's class. Audit entries are NOT filtered here
// (the Activity tab's own master-only gate handles that on the client).
function filterStateForToken(state, isMaster, token, scopedEntities) {
  if (isMaster) return { state, suppressedCount: 0 };
  let suppressedCount = 0;
  const visKeep = (record, entity) => {
    const vs = record.visibilitySet;
    if (!Array.isArray(vs) || vs.length === 0) return true;
    if (vs.includes(token)) return true;
    if (matchesScope(record, entity, scopedEntities)) return true;
    suppressedCount += 1;
    return false;
  };
  const filtered = {
    ...state,
    tasks: (state.tasks || []).filter(t => visKeep(t, "task")),
    contacts: (state.contacts || []).filter(c => visKeep(c, "contact"))
  };
  return { state: filtered, suppressedCount };
}

const DIFFERS = {
  tasks: diffTasks,
  contacts: diffContacts,
  groups: diffGroups,
  tags: diffTags,
  scheduleEvents: diffScheduleEvents,
  schedulePhases: diffSchedulePhases,
  scheduleQuestions: diffScheduleQuestions,
  coordinators: diffCoordinators
};

function diffStates(prev, next, by, whyNote) {
  // Unified entry point. Iterates DIFFERS registry; each differ handles its entity type.
  // Backwards-compatible: existing task/contact/group/tag behavior preserved.
  // `whyNote` (optional) propagates to every emitted entry as `why`.
  const all = [];
  for (const [key, fn] of Object.entries(DIFFERS)) {
    const empty = key === "coordinators" ? {} : [];
    const result = fn(prev[key] || empty, next[key] || empty, by, whyNote);
    all.push(...result);
  }
  return all;
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
      const rawState = await ensureState(auth.store);
      // Stage 2 Phase A: render-path visibility filter. Master bypasses.
      // Non-master tokens get tasks+contacts filtered by visibilitySet[] membership
      // and scopedEntities[] tag-based scope matching.
      const { state: filtered, suppressedCount } = filterStateForToken(
        rawState,
        auth.isMaster,
        auth.token,
        auth.scopedEntities
      );
      // Surface isMaster on state for client-side master-only gates (PL-59 preparation —
      // clients may gate on state.isMaster instead of comparing token literals).
      const withFlags = { ...filtered, isMaster: !!auth.isMaster };
      return new Response(
        JSON.stringify(withFlags),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "no-store",
            "X-Visibility-Filtered": String(suppressedCount)
          }
        }
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

      // Generate audit entries from diff. whyNote on the POST body propagates onto
      // every emitted entry as `why` (Stage 1 Phase A signature; Stage 2 Phase C
      // wires the client Edit-Mode flow to send this).
      const whyNote = typeof body.whyNote === 'string' && body.whyNote.trim() ? body.whyNote.trim() : undefined;
      const auditEntries = diffStates(prev, stamped, auth.name, whyNote);
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
