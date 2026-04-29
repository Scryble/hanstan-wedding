# Registry ↔ Comms ↔ Zoho wiring

Shipped 2026-04-28 (Phase C: commits `02f9848` + `830e0f8` merged via `06feb65`; Phase E: streamlining pass).

Audit doc with full design rationale: `F:/Wedding Website/registry_comms_wiring_audit_2026-04-28.md` (lives outside the repo intentionally — large, session-scoped, references master tokens).

## What this wiring does

When a guest fills out the gift-claim form on `/registry/`:

1. The form **dual-POSTs** — the new `gift-claim-submit` function is the primary path; legacy Netlify Forms is a redundant audit copy.
2. The new function writes a record to `state.giftClaims[]`, posts a note to `state.notes[]` tagged `channel: "registry"`, and posts a message to the auto-created `messageBoard.channels.registry` channel.
3. An immediate **thank-you email** fires from `hello@hanstan.wedding`.
4. Three **prompt emails** are scheduled at T+15min / T+12h / T+36h from `hannah@hanstan.wedding`. Each prompt embeds a `[claim:<token>]` magic marker in its subject.
5. At T+48h with no confirmation, the claim **auto-reverts** — gift returns to Available, registry channel gets a "released" note.

Three event-driven cancellations of pending prompts:
- Guest replies to a prompt email (inbound-pull detects the `[claim:<token>]` marker, flips claim → Claimed).
- Guest re-submits the registry note (idempotent dedup catches it, OR a separate confirmation flow updates the claim).
- Stan/Hannah manually mark Claimed in the planner.

## The four new functions

| File | Role |
|---|---|
| `netlify/functions/gift-claim-submit.mjs` | Public POST endpoint. Receives the form. Dedup, channel-bootstrap, state writes, thank-you email. |
| `netlify/functions/gift-claims-public.mjs` | Public GET endpoint. Returns `{overlays: {<giftId>: {status}}}` for the frontend to apply on top of the published gifts blob. Also fires `gift-claim-prompts-tick` fire-and-forget for wake-on-traffic prompt scheduling. |
| `netlify/functions/gift-claim-prompts-tick.mjs` | Master/internal-bypass POST endpoint. Sweeps `state.giftClaims[]` for due prompts and overdue auto-reverts. Triggered ~10s by frontend polling; can also be POSTed manually. |
| `netlify/functions/gift-claim-email-reply.mjs` | Helper module exporting `processNote(state, note)` — invoked by `zoho-inbound-pull.mjs` after each new note is appended to detect `[claim:<token>]` markers and route the reply back to the originating claim. |

## State shape additions

Two new top-level fields on `state-current.json`:

```js
state.giftClaims = [
  {
    claimId, giftId, giftTitle,
    claimerName, claimerEmail, claimerMessage,
    transactionDetail,                  // captured from registry note OR email reply
    isGroupGift, paymentPath,
    payloadHash,                        // S3: 60-min extended idempotency hash
    claimStartedAt,
    status: "Pending" | "Claimed" | "AutoReverted",
    claimedAt, claimedVia,              // "registry-note" | "email-reply" | "manual"
    confirmationToken,                  // 12-char, embedded in prompt-email subjects
    promptsScheduled: [
      { index, dueAt, sentAt, label }   // index 0/1/2; label "gentle"/"checkin"/"final"
    ],
    autoRevertAt,
    autoRevertedAt
  }
]

state.messageBoard.channels.registry = {
  name: "Registry",
  members: [],                          // empty = master-only access
  messages: [...],                       // includes claim-submitted, prompt-sent, claim-confirmed-via-email, claim-auto-reverted
  createdAt, createdBy
}
```

## Frontend changes

`registry/registry.js`:
- `applyServerClaimOverlays()` — applied at init + on each 10s polling refresh, before local overrides.
- `buildShippingBlock()` — renders Merry Shipman / 13183 Aspen Way NE / Aurora, OR 97002 on every gift detail (both Send Funds and Purchase Personally paths).
- `submitGiftForm()` does dual-POST with state-aware banners (S9): silent on success, soft warning if primary fails but legacy succeeds, loud warning if both fail.
- Honeypot field `bot_field` rejected silently server-side (S7).

`registry/copy.registry.json`:
- New `right.shippingTitle` / `right.shippingAddressLines` / `right.shippingBlockNote` (admin-editable; JS has fallback defaults).
- Updated `overlay.giftMessage` label to ask for transaction detail.

`registry/registry.css`:
- New `.detailShipping` block (Rivendell gold accent).

## Operations

**Where do claims show up?**
- Planner Comms tab → registry channel + Inbox
- Zoho inboxes (`hello@`, `stan@`, `hannah@`) — the thank-you email is a tracked send via `zoho-broadcast-send` and lands in Sent
- Personal Gmails — only via the 12h digest from `digest-emit.mjs`, which already includes `note.create` audit entries

**Manually trigger a prompt sweep:** POST `/.netlify/functions/gift-claim-prompts-tick` with `Authorization: Bearer <master-token>`.

**Manually re-process an inbound note that should match a claim** (rare): POST `/.netlify/functions/gift-claim-email-reply` with `{noteId: "<note-id>"}` and master token.

**Cancel a pending claim manually:** edit `state.giftClaims[].status` from "Pending" to "Claimed" (or "AutoReverted") via planner-state POST. The overlay endpoint will stop showing it on the next 10s poll.

## Known properties

- **Concurrency:** state writes use read-modify-write on Netlify Blobs. Rapid back-to-back POSTs (within seconds) can race; loser's write is lost. This is a property of every state-writing function in this repo, not a regression. Real guest traffic does not trigger it. Phase D candidate to fix with `setJSON({etag})` retry.
- **Scheduled-functions tier:** the `schedule:` config field is omitted from `gift-claim-prompts-tick.mjs` because the site's `nf_team_dev` plan rejects the export shape with that field (same incident as `digest-emit` on 2026-04-26). Wake-on-traffic via `gift-claims-public` is the replacement trigger.
- **Email warmup:** outbound mail uses Zoho with DMARC at `p=none`. Until M53 (warmup + DMARC promotion) is complete, expect 30–60% of first-send prompts to land in spam for guests on Gmail/Outlook. Stan-side action.
