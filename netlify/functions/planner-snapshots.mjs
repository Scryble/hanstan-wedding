// HW-PLANNER-001 | List/fetch/restore snapshots.
// GET (no params): list manifest
// GET ?id=X: fetch a specific snapshot
// POST {action:"restore", id:X} (master only): replace state-current with snapshot

import { validateToken } from "./_planner_lib/auth.mjs";

const STATE_KEY = "planner/state-current.json";
const AUDIT_KEY = "planner/audit-log.json";
const MANIFEST_KEY = "planner/snapshots-manifest.json";
const SNAPS_PREFIX = "planner/snapshots/";

export default async function handler(request) {
  const auth = await validateToken(request);
  if (!auth.ok) {
    return new Response(
      JSON.stringify({ error: auth.error }),
      { status: auth.status, headers: { "Content-Type": "application/json; charset=utf-8" } }
    );
  }

  const url = new URL(request.url, "http://localhost");

  if (request.method === "GET") {
    const id = url.searchParams.get("id");
    try {
      if (id) {
        const data = await auth.store.get(SNAPS_PREFIX + id + ".json");
        if (!data) {
          return new Response(
            JSON.stringify({ error: "not_found" }),
            { status: 404, headers: { "Content-Type": "application/json; charset=utf-8" } }
          );
        }
        return new Response(
          data,
          { status: 200, headers: { "Content-Type": "application/json; charset=utf-8" } }
        );
      }
      const manifest = await auth.store.get(MANIFEST_KEY);
      const m = manifest ? JSON.parse(manifest) : { snapshots: [] };
      return new Response(
        JSON.stringify(m),
        { status: 200, headers: { "Content-Type": "application/json; charset=utf-8" } }
      );
    } catch (e) {
      return new Response(
        JSON.stringify({ error: "read_failed", detail: e.message }),
        { status: 500, headers: { "Content-Type": "application/json; charset=utf-8" } }
      );
    }
  }

  if (request.method === "POST") {
    if (!auth.isMaster) {
      return new Response(
        JSON.stringify({ error: "master_only" }),
        { status: 403, headers: { "Content-Type": "application/json; charset=utf-8" } }
      );
    }
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return new Response(
        JSON.stringify({ error: "invalid_json" }),
        { status: 400, headers: { "Content-Type": "application/json; charset=utf-8" } }
      );
    }
    if (body.action !== "restore" || !body.id) {
      return new Response(
        JSON.stringify({ error: "invalid_action" }),
        { status: 400, headers: { "Content-Type": "application/json; charset=utf-8" } }
      );
    }
    try {
      const snapData = await auth.store.get(SNAPS_PREFIX + body.id + ".json");
      if (!snapData) {
        return new Response(
          JSON.stringify({ error: "snapshot_not_found" }),
          { status: 404, headers: { "Content-Type": "application/json; charset=utf-8" } }
        );
      }
      // Snapshot the current state so the restore itself is undoable
      const current = await auth.store.get(STATE_KEY);
      if (current) {
        const ts = new Date().toISOString().replace(/[:.]/g, "-");
        const preRestoreKey = SNAPS_PREFIX + ts + "-" + auth.name + "-pre-restore.json";
        await auth.store.set(preRestoreKey, current);
        let manifest;
        try {
          const raw = await auth.store.get(MANIFEST_KEY);
          manifest = raw ? JSON.parse(raw) : { snapshots: [] };
        } catch (e) { manifest = { snapshots: [] }; }
        const cur = JSON.parse(current);
        manifest.snapshots.unshift({
          id: ts + "-" + auth.name + "-pre-restore",
          ts: cur.lastModified,
          by: cur.lastModifiedBy,
          taskCount: (cur.tasks || []).length
        });
        await auth.store.set(MANIFEST_KEY, JSON.stringify(manifest));
      }
      // Restore
      const restored = JSON.parse(snapData);
      restored.lastModified = new Date().toISOString();
      restored.lastModifiedBy = auth.name + " (restored from snapshot)";
      restored.schemaVersion = 6;
      await auth.store.set(STATE_KEY, JSON.stringify(restored));
      // Audit entry
      let auditLog;
      try {
        const raw = await auth.store.get(AUDIT_KEY);
        auditLog = raw ? JSON.parse(raw) : { entries: [] };
      } catch (e) { auditLog = { entries: [] }; }
      auditLog.entries.unshift({
        ts: restored.lastModified,
        by: auth.name,
        action: "snapshot.restore",
        target: body.id,
        summary: "Restored snapshot from " + body.id
      });
      await auth.store.set(AUDIT_KEY, JSON.stringify(auditLog));
      return new Response(
        JSON.stringify({ ok: true }),
        { status: 200, headers: { "Content-Type": "application/json; charset=utf-8" } }
      );
    } catch (e) {
      return new Response(
        JSON.stringify({ error: "restore_failed", detail: e.message }),
        { status: 500, headers: { "Content-Type": "application/json; charset=utf-8" } }
      );
    }
  }

  return new Response(
    JSON.stringify({ error: "Method Not Allowed" }),
    { status: 405, headers: { "Content-Type": "application/json; charset=utf-8" } }
  );
}
