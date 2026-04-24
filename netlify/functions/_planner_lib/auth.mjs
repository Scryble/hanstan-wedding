// HW-PLANNER-001 | shared auth helper for planner-* functions
// Validates Bearer token against planner/coordinators.json blob.
// Bootstraps registry on first call using PLANNER_MASTER_BOOTSTRAP_TOKEN env var.
// Falls back to env-var token if registry is missing or token is not in registry.

import { getStore } from "@netlify/blobs";

export const PLANNER_STORE_NAME = "hanstan-wedding-data";
export const COORDINATORS_KEY = "planner/coordinators.json";

async function ensureCoordinators(store) {
  const existing = await store.get(COORDINATORS_KEY);
  if (existing) return JSON.parse(existing);
  const masterToken = process.env.PLANNER_MASTER_BOOTSTRAP_TOKEN;
  if (!masterToken) {
    return {};  // No bootstrap available; auth will fail
  }
  const initial = {
    [masterToken]: {
      name: "Hannah & Stan",
      isMaster: true,
      addedAt: new Date().toISOString(),
      addedBy: "system-bootstrap"
    }
  };
  await store.set(COORDINATORS_KEY, JSON.stringify(initial));
  return initial;
}

export async function validateTokenString(token) {
  if (!token) {
    return { ok: false, error: "no_token", status: 401 };
  }
  const store = getStore(PLANNER_STORE_NAME);
  let coords;
  try {
    coords = await ensureCoordinators(store);
  } catch (e) {
    return { ok: false, error: "registry_unavailable", status: 500 };
  }
  // First check the registry
  const entry = coords[token];
  if (entry) {
    return {
      ok: true,
      name: entry.name,
      isMaster: !!entry.isMaster,
      scopedEntities: Array.isArray(entry.scopedEntities) ? entry.scopedEntities : [],
      token,
      store
    };
  }
  // Fallback: env-var master token (in case registry got deleted)
  if (token === process.env.PLANNER_MASTER_BOOTSTRAP_TOKEN) {
    return { ok: true, name: "Hannah & Stan", isMaster: true, scopedEntities: [], token, store };
  }
  return { ok: false, error: "invalid_token", status: 401 };
}

export async function validateToken(req) {
  const auth = req.headers.get("Authorization") || "";
  if (!auth.startsWith("Bearer ")) {
    return { ok: false, error: "no_token", status: 401 };
  }
  const token = auth.slice(7).trim();
  return validateTokenString(token);
}
