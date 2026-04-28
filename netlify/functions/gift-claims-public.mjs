// HW-REGISTRY-COMMS-WIRING (2026-04-28) — gift-claims-public
//
// Public read-only endpoint that returns the claim-status overlay for the registry frontend
// to apply on top of the published gifts blob:
//   GET /.netlify/functions/gift-claims-public
//   → { overlays: { <giftId>: { status: "ClaimPendingConfirmation" | "Claimed" } } }
//
// Wake-on-traffic fallback: every call also fires-and-forgets a sweep of the prompts-tick
// logic via internal-bypass, so even if Netlify Scheduled Functions don't fire, prompts and
// auto-reverts still happen at least every time the registry is being viewed (~10s polling).
//
// No PII is exposed. Only the gift-id → status mapping. Safe for public, no auth.

import { getStore } from "@netlify/blobs";

const PLANNER_STORE_NAME = "hanstan-wedding-data";
const STATE_KEY = "planner/state-current.json";

async function loadJson(store, key, defaultValue) {
  try {
    const raw = await store.get(key);
    return raw ? JSON.parse(raw) : defaultValue;
  } catch (e) {
    return defaultValue;
  }
}

async function fireAndForgetSweep() {
  // Fire-and-forget POST to gift-claim-prompts-tick using internal-bypass.
  // We do NOT await this; if it fails the user-visible response is unaffected.
  const baseUrl = process.env.URL || "";
  const bypass = process.env.PLANNER_MASTER_BOOTSTRAP_TOKEN || "";
  if (!baseUrl || !bypass) return;
  try {
    fetch(baseUrl + "/.netlify/functions/gift-claim-prompts-tick", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Internal-Bypass": bypass },
      body: JSON.stringify({ source: "gift-claims-public-fallback" })
    }).catch(() => {});  // swallow any error, this is best-effort
  } catch (e) {
    /* swallow */
  }
}

export default async function handler(request) {
  if (request.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" }
    });
  }

  const store = getStore(PLANNER_STORE_NAME);
  const state = await loadJson(store, STATE_KEY, {});
  const claims = Array.isArray(state.giftClaims) ? state.giftClaims : [];

  const overlays = {};
  for (const c of claims) {
    if (c.status === "Pending") {
      // Pending always overrides any other in-blob status
      overlays[c.giftId] = { status: "ClaimPendingConfirmation", claimId: c.claimId };
    } else if (c.status === "Claimed") {
      // Claimed overrides "Available" but ALSO surfaces in case the gifts blob hasn't been
      // re-published yet (we don't write to the gifts blob from the public path)
      overlays[c.giftId] = { status: "Claimed", claimId: c.claimId };
    }
    // AutoReverted → no overlay; gift falls back to its blob status (Available)
  }

  // Best-effort sweep — do not await, do not let failures affect the response.
  // Netlify Functions in standard runtime don't keep promises alive after response, so this
  // is opportunistic. The Scheduled Function is the primary mechanism; this is the fallback.
  fireAndForgetSweep();

  return new Response(JSON.stringify({
    overlays,
    fetchedAt: new Date().toISOString()
  }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store, max-age=0"
    }
  });
}

export const config = { path: "/.netlify/functions/gift-claims-public" };
