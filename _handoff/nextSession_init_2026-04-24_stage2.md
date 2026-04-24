# Next Session Initialization — Stage 2 of plannerUpdate

**Created:** 2026-04-24 at end of Stage 1 execution by Claude (Opus 4.7).
**For:** the Claude instance that Scrybal opens to execute Stage 2.
**Format inspired by:** `_handoff/nextSession_init_2026-04-23.md` (Stage 1 init doc). This doc is better than that one — because Stage 1 authored it with a relay-handoff mindset.

---

## TL;DR — What you're doing

You are executing **Stage 2 of the plannerUpdate project** on the wedding planner at `https://hanstan.wedding/planner/`. Stage 0 and Stage 1 are complete. Your job: flesh the Stage 2 spec, draft ONE consolidated ticket, audit it (including live-reality L14 checks), execute all phases end-to-end without mid-task pauses, self-audit the results, push, and — critically — author the Stage 3 session-initialization document before closing.

**Stage 2's scope** (from `spec_plannerUpdate_26apr23.md` Parking Lot + Stage 1 decisions):
- Quick-Edit + Edit-Mode UX (PL-05 through PL-09, PL-32) — mobile-safe field editing. Gates coordinator-token distribution.
- Coordinator-role scoped privileges (PL-22 + PL-23) — Elsie universal, Grace/Daniel photographer-scoped, etc.
- Token-gated visibility CODE (PL-24, PL-25, PL-26, PL-27) — render-path filters consuming `visibilitySet[]` that Stage 1 already populated.
- Multi-parent group schema (PL-01, PL-02, PL-38) — extend `tasks[].group: string` → `secondaryGroups: string[]` or similar.
- Constraint-tooltip rendering (PL-03, PL-48) — render `contacts[].constraints[]` and per-contact tooltips.
- /admin absorption into planner nav (PL-21) — fill the hidden `.nav-admin-slot` Stage 1 reserved.
- CSS-panel two-token prompt fix (PL-41).
- Quick Task taskGroup tab (PL-40).
- Stan's Rolodex ↔ Guests crossover rendering (PL-47 — depends on PL-01).

**The centroid of Stage 2 is:** mobile-safety UX + security render-path filtering + schema extension for multi-parent. Larger scope than Stage 1 (~20 PL items).

---

## Orientation — Read these IN ORDER, don't skip

1. **`C:\Users\ranji\.claude\CLAUDE.md`** — Scrybal's global behavioral contract. Already auto-loaded in your context but double-check. Seven imperative rules. Self-test before every message. Full orientation standing instruction. Mutation registry. Document naming schema (added 2026-04-24 by the stage-0 Claude): `<artifactType>_<project>_<stage>_<phase>_<batch>_<slug>_v<rev>.<ext>` with full words, no abbreviations.
2. **`C:\Users\ranji\.claude\history.jsonl`** — cross-session conversation index. Skim the most recent 5 entries to see what happened in Stage 0 and Stage 1 chats.
3. **`C:\Users\ranji\.claude\projects\f--\memory\MEMORY.md`** — project memory index. Open each file it points to, don't rely on one-line hooks.
4. **`F:\Wedding Website\hanstan-wedding\spec_plannerUpdate_26apr23.md`** — the authoritative project spec. ~1600 lines now. Contains Stage 0, Stage 1 (executed), and a Parking Lot appendix with all remaining Stage 2+ items. **This is the `spec_plannerUpdate_26apr23.md` file, NOT any earlier `PROJECT_SPEC_plannerUpdate_2026Q2.md` that some previous Claude might have created.**
5. **`F:\Wedding Website\hanstan-wedding\discoveryLog_hanstanWedding.md`** — Tier-1/2/3 discovery log. Stage 1 added 3 new Tier-2 rule candidates you should honor (spec audits must include L14 live-reality checks; one-big-ticket-per-stage; Netlify edge cache lag requires explicit wait-and-retry).
6. **`F:\Wedding Website\hanstan-wedding\tasQ.md`** — repo-local tasQ. Has a reminder to tidy the repo root AFTER all stages are done. DO NOT tidy mid-session.
7. **`F:\Wedding Website\hanstan-wedding\ticket_plannerUpdate_stage1_all_v1.md`** — Stage 1's single consolidated ticket. Model your Stage 2 ticket on this structure.
8. **`F:\Wedding Website\hanstan-wedding\tickets_plannerUpdate_stage0_all_v1.md`** — Stage 0's consolidated ticket (11 phases). Kept as frozen audit trail.
9. **`F:\Wedding Website\hanstan-wedding\_preUpdate_snapshots\capture_plannerUpdate_stage0_phaseC_2026-04-23.jsonl`** — structured capture log, 79+ entries post-Stage-1. Append Stage 2 entries with `batch: "stage2_phaseX"`.
10. **`F:\.canonicals\*.md`** — canonical templates (PROJECT_SPEC, BUILD_TICKET, TICKET_LINTER_CHECKLIST, VERIFY_STUB, CLAUDE_GOVERNANCE). Reference only; Stage 2 inherits the v4.2-autonomous variant Stage 1 established.

---

## Live state at Stage 2 entry (verified 2026-04-24)

**Wedding:** 2026-06-07 at Willamette Mission State Park. Scrybal = Stanzin (groom) / Hannah Shipman (bride). 45 days to deadline as of Stage 2 typical start.

**Live planner:** `https://hanstan.wedding/planner/` — Netlify-hosted static site + Netlify Functions (planner-state, planner-coordinators, planner-audit, planner-snapshots) + Netlify Blobs.

**GitHub:** `Scryble/hanstan-wedding` branch `main`. Last push 2026-04-24 landed commits `f09b02c` (Phase A unified diffStates), `579717a` (Phase C Activity tab + FAB), `5afdd80` (Phase D seed + schedule-defaults). Plus pre-Stage-1 commits `03f5639` (Stage 0 Phase D) and `659ab57` (Stage 0 C.3c Part 1).

**Data on live at Stage 2 entry:**
- 118+ tasks incl. D1–D13 + M1–M37 + M38 (PL-46 investigation task from Stage 1 Phase A.0).
- 28 contacts incl. Stan (p2) + Hannah (p1) with `zoomLink` + `visibilitySet[]` fields populated from Stage 1 Phase B; plus Elsie / Fen / Bonnie / Sarah with `constraints[]` from Stage 0 M42.
- 22 `master-only`-tagged tasks have `visibilitySet: ["stanshan"]` populated (Stage 1 easement #1 pre-staging for Stage 2's render-path filter work).
- 3 coordinator tokens: `stanshan` (master), `shipsie` (Elsie), `everfindingbeauty` (Grace). `stage1smoke` revoked end of Stage 1 Phase E.
- 200+ audit entries (103 organic + 8 Elsie historical + 66 Stage-1-replay + a few Stage-1 execution entries + 2 test-artifact residue entries that renderer filters).

**Schema fields already present on live (Stage 2 render-path filters CAN consume these immediately without data migration):**
- `tasks[].visibilitySet: string[]` — populated on 22 master-only tasks. Value: `["stanshan"]`.
- `contacts[].visibilitySet: string[]` — populated on Stan + Hannah. Value: `["stanshan", "shipsie", "everfindingbeauty"]`.
- `contacts[].zoomLink: string` — populated on Stan + Hannah. Value: `"https://us06web.zoom.us/j/7933306691"`. **Visibility-scoped: hide from everyone except stanshan + shipsie + everfindingbeauty.**
- `contacts[].constraints: string[]` — populated on Elsie/Fen/Bonnie/Sarah/Stan/Hannah. Stage 2 renders as tooltips (PL-03).
- `auditEntries[].entity` + `auditEntries[].why?` — shape locked in Stage 1 Phase A. Stage 2 Quick-Edit flow populates `why`.

**Engine (Stage 1 Phase A):** `netlify/functions/planner-state.mjs` has the DIFFERS registry + 8 differs. Adding a new entity type to the engine = adding one entry to DIFFERS. Every differ iterates set-union of field keys — schema additions auto-diff without engine changes.

**UI (Stage 1 Phase C):** `planner/index.html` has nav reordered (Settings far-left, Activity far-right, hidden `.nav-admin-slot` waiting for Stage 2 admin-absorption). 5-button FAB (Quick Add, Full Add, Note, Person, Event). Activity tab renders with 4 filters (person, date-range, action-type, visibility-scope). Master-only gate via `token === 'stanshan'`.

---

## Scrybal preferences you're inheriting (don't re-learn the hard way)

These were earned through Stages 0–1 with multi-hour friction. Every item here was a real correction. Apply from turn 1.

### 1. No mid-task pauses. Ever.
Rule 5 from CLAUDE.md. When Scrybal says "Go, execute it," he expects you to run the full sequence. If you need a decision, make it yourself unless it's genuinely high-stakes. If you hit a real wall, flag briefly, keep working on unblocked items, report at the next natural boundary.

### 2. Every document stays consolidated. One-per-concern, never scatter.
- Spec: `spec_plannerUpdate_26apr23.md` (one file).
- Ticket: ONE consolidated ticket per stage. `ticket_plannerUpdate_stage2_all_v1.md` for Stage 2.
- Investigation results → planner-task comment/desc, NOT a new markdown file.
- Session artifacts → `_handoff/` or `_preUpdate_snapshots/`, NOT repo root.
- tasQ: `tasQ.md` at repo root (for repo-local reminders; moves to `_handoff/` post-all-stages).
- discoveryLog: `discoveryLog_hanstanWedding.md` at repo root (moves to `_handoff/` post-all-stages).
- If you're tempted to create a new markdown file, pause: can this be a section in an existing doc? Usually yes.

### 3. No abbreviations Scrybal hasn't approved.
`phA`, `Q2`, `MPE`, `D13` ← the first three are forbidden; the last is fine because it's an established naming convention. When in doubt, full words.

### 4. Repos, not working trees.
Scrybal uses "repo" (local clone) / `Scryble/hanstan-wedding` (GitHub) / Netlify deploy. NEVER say "working tree," "HEAD," "index," "refs" in user-facing text. Internally use whatever you want.

### 5. Target-schema verification is part of every audit.
Spec audit without live-GET = incomplete. For every ticket that mutates live state: fetch one real record, verify every asserted field shape. Catches silent-drop failure modes.

### 6. Naming schema for artifacts (from `~/.claude/CLAUDE.md`):
```
<artifactType>_<project>_<stage>_<phase>_<batch>_<slug>_v<rev>.<ext>
```
Empty slots use literal word `none` (e.g. `batchNone`, `phaseNone`). Full words only. Example: `ticket_plannerUpdate_stage2_all_v1.md`.

### 7. One-big-ticket per stage, not one-ticket-per-phase.
Stage 0 used 11 tickets (legacy). Stage 1 used 1 ticket with 6 phase sections. Stage 2 should use 1 ticket. Commit granularity preserved inside the ticket's Phase D (Netlify-build-verifiability per commit is the only reason to split commits).

### 8. Apply nearest-neighbor / relative-fit before locking each stage's scope.
Before finalizing Stage 2 scope, ask: are any Stage-3+ parking-lot items actually closer to Stage 2's centroid than to their currently-assigned stage's centroid? If so, absorb. Stage 0 pulled 10 items up. Stage 1 pulled 6+2 (PL-42, PL-46, PL-10/11/12, plus 6 Stage-2-easement additions).

### 9. Consider Stage-3-easement absorptions before finalizing Stage 2.
Same discipline Stage 1 applied. What does Stage 3 need that Stage 2 can cheaply pre-stage? Stage 3's centroid is Communications + Message-Board + Schedule-Solidification support. Candidates to consider:
- Schema field for `messageBoard.channels[]` or similar, pre-reserved (inert in Stage 2).
- ASQ speech-bubble CSS class pre-reserved.
- Focus-tab layout scaffold pre-reserved (3-column panel structure).
Each should be LOW risk, LOW cost, additive-only.

### 10. Site spec (HANSTAN_WEDDING_SITE_SPEC.md) rewrite is DEFERRED to end-of-all-stages audit.
Stage 2 adds a small additive §14.Z section — does NOT rewrite. Full rewrite happens after Stage 4 ships.

### 11. Schedule-solidification is NOT a stage.
It's planner task M23 (deadline 2026-05-07). Lives on the live planner as a wedding-prep task. Don't confuse with stage-sequence.

### 12. "Bridal" is a typo.
Hannah's `role` field on live is `"bridal"`. That's not a real role. Stage 2 is allowed to fix it to `"bride"` if you touch the Hannah record for other reasons — but don't make a separate task for it. Data-hygiene, low priority.

### 13. Netlify edge cache lag is real.
After `git push origin main`, HTML pages may stay stale for 10+ minutes. Use the ETag-polling pattern: poll until the ETag changes, don't trust Age headers. Functions deploy faster than static HTML.

### 14. Never delete historical material. Especially not claudeChat / claudeCode records.
All past session artifacts stay. "Archived" not "deleted."

### 15. Structured capture protocol for mutations.
Every live-state mutation → one JSONL line appended to `_preUpdate_snapshots/capture_plannerUpdate_stage0_phaseC_2026-04-23.jsonl`. Yes, the filename says "stage0" — it's been continuously appended-to. Format per spec §PU-7.

### 16. Master token `stanshan` is shared with you for live writes. Use it.
Don't say "I can't write to live" — you can.

### 17. Chrome connector is available for browser-based verification tasks.
Per `~/.claude/projects/f--/memory/feedback_chrome_connector.md`.

### 18. Scrybal is coding-illiterate.
Never show him code blocks to review. Never ask him to manually run commands. Explain outcomes in plain language.

### 19. Scrybal dictates via voice-to-text.
Resolve known mutations silently: "dialogueXR" → not "dialog exile"; "tasQ" → not "task queue"; "taskId" → not "tax id".

### 20. Ignore markdownlint noise.
MD022, MD032, MD036, MD040, MD060 warnings are cosmetic, not breaking. Don't spend cycles fixing them. Don't even mention them.

### 21. Pre-draft-answer before asking.
If Scrybal will be annoyed by a question with an obvious answer, don't ask — decide, document, report briefly, invite override.

### 22. L14 Target-Schema Verification IS NOT YET in the canonical linter checklist.
Perform it manually during every ticket audit until it's formalized. Stage 2 Claude: add it to the canonical checklist at end-of-all-stages audit.

---

## What Stage 2's expected user instructions will look like

Based on Scrybal's Stage 0 + Stage 1 flow, expect your instructions to land in this sequence (paraphrased):

**Opening message:** "Orient yourself fully. Then read `F:\Wedding Website\hanstan-wedding\_handoff\nextSession_init_2026-04-24_stage2.md` + read everything it tells you to read. Don't skip a word."

**After orientation:** Scrybal will likely ask for a summary of where things stand (completeness check). Give it tight: Stage 1 done, Stage 2 scope summary in 2-3 sentences, what you're starting with.

**Scope-lock phase:** Scrybal may want to talk through Stage 2 scope before you flesh phases. Apply nearest-neighbor analysis: what from Stage 3 could cheaply absorb? Propose 1-3 absorptions if any clearly qualify. Do NOT propose more; Scrybal's patience for scope-debate is finite.

**After scope-lock:** "flesh it out" / "draft the spec for Stage 2" — flesh Stage 2 phases (A.0 optional, A, B, C, D, E) into the existing `spec_plannerUpdate_26apr23.md`. Model on Stage 1.

**Audit the spec:** "audit the phase 2 spec" — run internal consistency + L14 live-reality checks. Report flags in 3 buckets: silently-fixed / surface-to-scrybal / non-blocking-v2. Surface only genuinely-decision-requiring items.

**After Scrybal reviews + greenlights:** "draft the ticket and execute it" — ONE big ticket, lint + L14-audit, execute through Phase E, self-audit results, push, author Stage 3 init doc.

**Possible surprise instructions:**
- "This specific decision should have been tracked as a task on the planner" — if Scrybal mentions it, check if it actually is; if not, add it.
- "Why did you do X that I asked you not to do" — search `discoveryLog_hanstanWedding.md` for a rule candidate that covers X; apply. Also check this init doc's "Scrybal preferences you're inheriting" list.
- "Audit this before proceeding" — always run the audit; never skip.
- "Just execute, I trust you" — DON'T skip audit; run it in background, proceed on greenlight paths, halt only if a blocker surfaces.

---

## Stage 2 Phase-Drafting Template

Model on Stage 1. Recommended phase structure:

**Phase A.0** (optional) — any cross-cutting investigation that informs Phase A. Likely unnecessary for Stage 2 since Stage 1 M38 answered the big question. Skip if no open investigation.

**Phase A** — schema extensions on the server side (planner-state.mjs + planner-coordinators.mjs):
- Extend `tasks[]` schema with `secondaryGroups: string[]` (additive; PL-01).
- Add render-path visibility filter to planner-state.mjs GET handler: accept `Authorization` header, parse token, filter out records whose `visibilitySet[]` excludes the requesting token. (PL-24/25/26/27 server-side.)
- Extend `planner-coordinators.mjs` with `scopedEntities[]` field for per-coordinator role scopes (PL-22 — Elsie=universal, Grace+Daniel=photographer-scoped).

**Phase B** — data migration via syntheticAuditEntries + direct state mutation:
- Populate `tasks[].secondaryGroups[]` from existing `tasks[].tags[]` cross-surface tags ('rolodex', 'guests', 'organizers', 'guest-list' already on B4/B19/Indian-family-cards).
- Ensure every coordinator record has `scopedEntities: []` (empty for stanshan master-token since master sees everything; empty for Elsie since she's "universal edit privilege"; set photographer scopes on Grace/Daniel once Daniel's contact is created).
- Create Daniel Thomas contact record if not yet on live.

**Phase C** — client UI:
- Quick-Edit UX (PL-05–PL-09, PL-32) — per-card double-tap / long-press field activation, sticky batch confirm/discard in Edit Mode, optional-note-prompt capture populates `why` field.
- Constraint-tooltip rendering (PL-03, PL-48) — render `contacts[].constraints[]` on hover/tap of person chips.
- Multi-parent group rendering (PL-01/02/38/46/47 code side) — task appears under multiple group filters if `secondaryGroups[]` populated.
- /admin absorption (PL-21) — fill the hidden nav-admin-slot with real admin tab.
- CSS-panel two-token fix (PL-41).
- Quick Task taskGroup tab (PL-40).

**Phase D** — commit and push. One commit per logical code-unit for Netlify-build-verifiability.

**Phase E** — cleanup + discoveryLog + parking-lot strikethroughs + final wrap-up commit.

---

## Torch-Pass Protocol — Your Obligation to Stage 3 Claude

**Before you close your session, you MUST:**

1. Produce `F:\Wedding Website\hanstan-wedding\_handoff\nextSession_init_2026-04-??_stage3.md` using this document as a structural template.
2. Update the Scrybal-preferences list with anything new you learned.
3. Update the "Live state at Stage X entry" snapshot with post-Stage-2 data.
4. Update the Stage 3 scope section with the parking-lot items remaining post-Stage-2-absorptions.
5. Add to discoveryLog any new Tier-2 rule candidates you surfaced.
6. Commit the init doc to repo (it goes in `_handoff/` which per document-discipline rule IS appropriate for session artifacts).
7. Append a capture JSONL entry for your torch-pass.

**Key principle:** each init doc should be strictly better than the one you received. Scrybal pays a tax every time he repeats himself — your job is to drop that tax to zero for Stage 3 Claude.

---

## Known pending items Scrybal may bring up

- **Grace extension decision** (M15) — 2 extra hours for $200. Scrybal was supposed to discuss with Hannah. May or may not be resolved by Stage 2 start.
- **Officiant replacement** (M11) — Wes dropped out. Critical path. Scrybal's personal task, not a planner code issue.
- **Bridesmaid + parents + Sarah Reese + Bonnie calls** (M2–M6) — all gated on Stage 2 Quick-Edit+Edit-Mode UX landing so mobile-safe tokens can distribute. Stage 2 completion may unblock these.
- **Schedule solidification** (M23) — deadline 2026-05-07. If Stage 2 takes you close to or past that date, flag to Scrybal that M23 is becoming urgent.
- **Domain reputation warmup** / **DMARC promotion** (email-infrastructure pre-existing tasks) — background, not Stage 2 concern.

---

## Quick commands reference

**Fetch live state:**
```
curl -s -H "Authorization: Bearer stanshan" "https://hanstan.wedding/.netlify/functions/planner-state?cb=$(date +%s%N)" | node -e "..."
```

**POST to live:**
```
curl -s -X POST -H "Authorization: Bearer stanshan" -H "Content-Type: application/json" -d @body.json https://hanstan.wedding/.netlify/functions/planner-state
```

**DELETE coordinator:**
```
curl -s -X DELETE -H "Authorization: Bearer stanshan" -H "Content-Type: application/json" -d '{"token":"xxx"}' https://hanstan.wedding/.netlify/functions/planner-coordinators
```

**Post-deploy ETag-poll (critical — don't skip):**
```
ETAG_OLD=$(curl -sI https://hanstan.wedding/planner/ | grep -i etag | head -1 | tr -d '\r\n')
# commit + push
# then:
ATTEMPTS=0; until [ $ATTEMPTS -ge 40 ]; do NEW=$(curl -sI "https://hanstan.wedding/planner/?cb=$(date +%s%N)" | grep -i etag); if [ -n "$NEW" ] && ! echo "$NEW" | grep -q "$ETAG_OLD"; then echo "new etag: $NEW"; break; fi; ATTEMPTS=$((ATTEMPTS+1)); sleep 15; done
```

---

## Final word from Stage 1 Claude

You have everything. The hard structural work is done. Stage 2 is bigger in scope but simpler in shape — the engine and schema foundations are laid. Don't re-derive. Don't re-ask. Don't scatter documents. Run the relay clean. Author the Stage 3 init doc with even more care than this one.

Scrybal is trusting the system we're building. Don't let the chain break at your link.

— Claude Opus 4.7, end-of-Stage-1, 2026-04-24.
