# PROJECT_SPEC.md
**Project Specification (Human Authority Document) — Canonical Template v4.2**

> **Status:** Human authority document. Non-executable by default (ADR-3 — see CLAUDE_GOVERNANCE Section 4).
> **Rule:** Claude must not use this document to make decisions unless a Build Ticket explicitly whitelists a specific excerpt via the `spec_excerpts_whitelisted` front matter field.
> **Ticket Derivation:** For guidance on converting this spec into Build Tickets, see the Ticket Derivation Guide in the README (Section 12).

---

## 0. Spec Metadata

- **Project Name:** hanstan-wedding Planner Update — 2026 Q2
- **Project Tag:** `plannerUpdate2026Q2`
- **Spec Version:** `draft-v2` (bumped 2026-04-23 after multiple in-session expansions: Stage 0 rewrite, Parking Lot appendix, relative-fit reassignment moving 8 PL items to Stage 0, Phase D §PU-6 through §PU-11 additions, Stage 1 scope section)
- **Last Updated:** 2026-04-23 (multiple sub-revisions in single session)
- **Owner / Author:** Scrybal (Stan)
- **Drafting Assistant:** Claude Opus 4.7 (1M context) — claudeCode in Visual Studio Code
- **DeltaLog Version:** N/A (Scrybal explicitly opted out of DeltaLog ceremony for this doc; discoveryLog at `F:\Wedding Website\hanstan-wedding\discoveryLog_hanstanWedding.md` serves the parallel function of recording decision reasoning + pushbacks)
- **Audience:** Humans (Scrybal, Hannah; future Claude sessions working on hanstan-wedding)
- **Related Tickets:** TBD — populated as stages get converted into Build Tickets

---

## 1. Vision and Problem Statement

### 1.1 The vision (what success looks like)

When this update is shipped, the hanstan-wedding planner at `https://hanstan.wedding/planner/` (deployed from the `Scryble/hanstan-wedding` GitHub repository, served via Netlify) is ready to be handed to every wedding organizer on the team — bridesmaids, groomsmen, parents, photographers, coordinators — with the following properties:

1. **Every change any organizer makes is captured, attributed, and visible** in a unified Activity log inside the planner's main nav. The current partial audit (which only covers tasks/contacts/groups/tags) is extended to also cover schedule events, phases, questions, materials checklists, and notes.
2. **Mobile accidental edits are structurally prevented** via a two-mode edit system (Quick Edits with card-scoped confirm/discard/note prompts; full Edit Mode with sticky batch confirm/discard).
3. **The planner contains the full current reality of wedding preparation** — every task Scrybal has identified in recent conversations, every schedule event currently tracked, every question that needs resolution, with all existing live-site organizer edits preserved.
4. **Communications infrastructure tasks are captured in the planner with full attribution.** The Communications taskGroup tab, Focus-tab-as-message-board, per-card ASQ speech-bubble, and Zoho ↔ planner wiring are all parking-lot items targeting Stage 3+ (PL-13, PL-14, PL-15, PL-17) — **not deliverables of this update spec.** This spec only guarantees that the tasks tracking those future builds exist on live with proper priority/assignee/deadline fields.
5. **The planner spec** (`F:\Wedding Website\hanstan-wedding\HANSTAN_WEDDING_SITE_SPEC.md`) **is locked-step with the codebase and live state**, with a frozen pre-update snapshot preserved alongside as `HANSTAN_WEDDING_SITE_SPEC_preUpdate_2026-04-23.md`.
6. **Token-scoped edit privileges and visibility DATA is captured** — `master-only` tags exist on HanStan Logistics tasks, Wes/officiant info, guest contact details, Stan's Rolodex. Coordinator-role metadata exists on Grace, Daniel Thomas, Elsie contacts. **Actual privilege/visibility enforcement code lands in Stage 2** (PL-22, PL-24, PL-25, PL-26, PL-27). This update only guarantees the data is correctly tagged so Stage 2's render-path filtering has targets.

### 1.2 The problem being solved

The planner has outgrown what was built. Scrybal has been accumulating planner changes, data edits, and mechanics ideas across multiple prior chats without a coordinated deployment. As of 2026-04-23:

- **1,162 lines of intended but uncommitted modifications** sit in the local clone of `Scryble/hanstan-wedding` at `F:\Wedding Website\hanstan-wedding\` across 5 files — never pushed to GitHub, never deployed to Netlify. Scrybal has lost track of why each modification exists and needs help auditing them back into memory.
- **The live site at `https://hanstan.wedding/planner/`** runs commit `433a223` ("planner: load css-panel + ve-loader so the visual editor works on /planner/ too") and carries 75 tasks / 96 schedule events / 8 phases / 17 questions, edited only by the master token `stanshan` (45 audit entries, 97 snapshots, most recent edit 2026-04-23 20:45 UTC).
- **The spec document** at `F:\Wedding Website\hanstan-wedding\HANSTAN_WEDDING_SITE_SPEC.md` was last modified 2026-04-16 19:41 — 7 days stale, pre-FAB, pre-SEED_VERSION top-up system, pre-broadcast-email-sheet, pre-materials-checklist-sheet, pre-greeter-event, pre-D1-through-D7-tasks, pre-Grace-coordinator-token-issuance.
- **Scrybal has just dumped a massive wedding-planner update** — ~55 items spanning data edits, UX changes, new tabs, cross-system wiring, and security rules — and does not want to push anything until there is a formal plan he can review stage by stage.
- **Two photographer coordinators are now in play** — Daniel Thomas (existing) and Grace deVries (signed contract + $625 retainer sent 2026-04-23; coordinator token `everfindingbeauty` issued 2026-04-23 19:49 UTC). Their schedules need reconciliation.

Doing this update piecemeal risks (a) losing attribution for who changed what, (b) clobbering live organizer edits with a blunt seed push, (c) spec drift growing further, (d) organizers experiencing half-built UX mid-update, (e) Scrybal losing track of what remains to do and what is done.

### 1.3 Why now

- Wedding date: **2026-06-07** at Willamette Mission State Park (approximately 6 weeks out as of spec authorship).
- Scrybal's hard deadline to **formalize and confirm the full schedule before 2026-05-07** (~2 weeks out).
- Grace deVries is now contracted and has a coordinator token — her input on photographer coordination needs a planner-supported channel immediately.
- Bridesmaids, Sarah Reese, Bonnie, Merry Shipman, Roger Shipman are explicitly waiting on calls to be introduced to the planner; the mobile-edit-safety work is a gate on distributing their tokens.

---

## 2. System Boundaries

### 2.1 In scope

- All modifications to the local clone of `Scryble/hanstan-wedding` at `F:\Wedding Website\hanstan-wedding\`.
- All pushes to the GitHub remote `Scryble/hanstan-wedding` from that local clone.
- All authenticated POSTs to Netlify functions (`planner-state.mjs`, `planner-coordinators.mjs`, `planner-audit.mjs`, `planner-snapshots.mjs`, `admin-write-registry.mjs`) using the master token `stanshan`.
- Live-state pulls from Netlify functions for pre-update snapshots + ongoing reconciliation checks.
- Coordinator-token issuance (already has `stanshan`, `shipsie`, `everfindingbeauty` — Daniel Thomas needs one; future organizers need them).
- The spec document lifecycle — freezing pre-update, rewriting post-update, maintaining spec-subject co-update discipline going forward.
- Modifications to `F:\Wedding Website\hanstan-wedding\HANSTAN_WEDDING_SITE_SPEC.md`.
- Creation and maintenance of `F:\Wedding Website\hanstan-wedding\discoveryLog_hanstanWedding.md`.
- Creation of this PROJECT_SPEC and subsequent BUILD_TICKETs derived from it.
- Chrome-connector-driven verification on `https://hanstan.wedding/` (live smoke tests after each stage deploy).

### 2.2 Out of scope (explicit non-goals)

- **The HanStan Logistics project** — will be **evaluated in a later stage** for spin-off from the wedding planner into its own project with its own tools. For this PROJECT_SPEC, HanStan Logistics appears ONLY as a security concern (hide from non-master-token users) and as a placeholder task-group tab. No substantive logistics planning in this spec.
- **The broader claudeBody architecture work tracked in `F:\TASQ.md` (pCM-1 through pCM-25).** Relevant only insofar as this spec implements discoveryLog rules (candidate rules 1–6 logged 2026-04-23) ad-hoc; the canonical rules themselves are drafted in claudeBody/p_claudeManager, not here.
- **Wedding-counselling / Bible-discussion planning with Hannah.** A planner task will be created to represent the off-planner work, but the counselling plan itself is not drafted in this spec.
- **Wedding-day execution details that are strictly ceremonial** — vow wording, processional music selection — left to Scrybal, Hannah, and Wes (or Wes's replacement).
- **Redesign of the wedding website pages outside the planner (index.html save-the-date, /faq, /registry, /admin).** The existing D5 task (`t_rivendell_sitewide`) tracks the Rivendell theme extension separately.
- **Registry / payment processing changes.** Payment handles shipped 2026-04-14 (commit `c9d6ade`) and are live; this spec does not touch registry code unless a specific sub-change (e.g., Amazon gift list) is explicitly staged in.

### 2.3 External dependencies and integrations

- **GitHub** (`Scryble/hanstan-wedding`) — source of truth for the site's code. Push target.
- **Netlify** — build + deploy + serverless functions + blob store (`hanstan-wedding-data`). Accessed via Chrome connector (Scrybal's dashboard access) and via direct authenticated HTTPS (master token `stanshan`).
- **Zoho Mail** (free tier) — host for `stan@hanstan.wedding`, `hello@hanstan.wedding`, `rsvp@hanstan.wedding`, `registry@hanstan.wedding`. Target for broadcast email upgrade (D6 task) and Communications-tab wiring (parking-lot PL-17 / Stage 4+).
- **Chrome Claude connector** — Scrybal-pre-authorized browser control for Netlify dashboard navigation, live-site smoke testing, form filling where API-level access is absent.
- **Master token `stanshan`** — shared with Claude for authenticated API access. Coordinator tokens `shipsie` (Elsie) and `everfindingbeauty` (Grace deVries) exist in the coordinators blob (as of 2026-04-23 19:49 UTC).
- **`F:\.canonicals\` suite (v4.2)** — authoritative templates for PROJECT_SPEC, BUILD_TICKET, TICKET_LINTER_CHECKLIST, VERIFY_STUB, discoveryLog. This spec obeys PROJECT_SPEC_claudeHandoffCanonicals_v4.2.md; derived tickets will obey BUILD_TICKET_TEMPLATE_claudeHandoffCanonicals_v4.2.md.
- **`F:\TASQ.md` + project memory files at `C:\Users\ranji\.claude\projects\f--\memory\`** — Scrybal's context. Changes to hanstan-wedding that affect cross-project understanding must update these too.

---

## 3. Users, Stakeholders, and Use-Cases

### 3.1 Users and actors

- **Scrybal (Stan)** — master-token holder (`stanshan`), primary author/decision-maker for this update. Coding illiterate; Claude executes all code work. Severe ADHD; needs ordered stages + plain-English summaries.
- **Hannah Shipman** — co-master (`stanshan` is shared). Future People-tab entry with contact info + permanent Zoom link is in scope.
- **Elsie (Shipman?)** — coordinator token `shipsie`. Universal-edit-privilege coordinator once scoped privileges are implemented. Has never edited live planner as of pre-update snapshot.
- **Grace deVries** — photographer coordinator, contracted 2026-04-23, retainer $625 paid. Token `everfindingbeauty` issued 2026-04-23 19:49 UTC. Needs photographer-scoped edit privilege.
- **Daniel Thomas** — photographer, pre-existing in the plan. Token TBD (in scope for this update). Needs photographer-scoped edit privilege.
- **Bridesmaids** (Zita, Cassie, and others TBD) — tokens TBD. Call chain for introductions sequenced explicitly: Bridesmaids → Sarah Reese → Bonnie → Merry Shipman + Roger Shipman.
- **Parents** — Merry + Roger Shipman (bride's parents), Stan's parents. Waiting for information; explicitly flagged as "getting worried."
- **Sarah Reese** — flowers PIC. Scope is deliberately moderated (flowers only, pre-assembled 1–2 days out).
- **Bonnie** — potluck/food PIC. Scope deliberately moderated with Elsie + Fen as helpers.
- **Christa** — registry coordinator. Pending Amazon-gift-list handoff.
- **Wes Walls** — officiant who has dropped out. Blocks the reply-to-Wes task which blocks the counselling-plan task.
- **Future Claude sessions** — read this spec for orientation when picking up partially-executed stages.

### 3.2 Primary use-cases

1. **Scrybal reviews Stage 0 as-written, approves or pushes back per-section, and gives Claude the green light to proceed stage-by-stage.** (This is the immediate use-case.)
2. **Claude executes Stage 0 Phase A (audit the 1,162-line local-clone modification set) and reports back.** Scrybal decides keep/drop/modify per file.
3. **Claude executes Stage 0 Phase B (pull live state, diff against local seed, reconcile field-value drift) and reports back.**
4. **Scrybal picks the FAB scope decision** (ship-as-2-button-menu-and-add-3-buttons-later vs. hold-until-all-5-buttons-built).
5. **Claude drafts Stage 1 in this same spec** using the Stage 0 outputs as inputs, then Scrybal reviews.
6. **Sequence repeats per stage** — Stage N draft → Scrybal review → BUILD_TICKET derivation → execution → live verification → discoveryLog update → advance to Stage N+1.
7. **After final stage ships**, the post-update `HANSTAN_WEDDING_SITE_SPEC.md` is rewritten, the pre-update version is frozen, and this PROJECT_SPEC is retired to an archive.

### 3.3 Non-critical or deferred use-cases

- Bulk re-audit of all existing 75 tasks against Scrybal's infodump (task-set audit → parking-lot PL-33 / Stage 4).
- Claude auto-briefing pipeline for planner diffs + Gmail + messaging + Zoom transcripts (parking-lot PL-19 / Stage 5+).
- HanStan Logistics spin-off evaluation (tracked via M28 planner task; actual evaluation deferred to standalone discussion).

---

## 4. Conceptual Model

### 4.1 Key entities

- **`PlannerState`** — the JSON blob at key `planner/state-current.json` in Netlify blob store `hanstan-wedding-data`. Schema version 6. Contains: `tasks[]`, `contacts[]`, `groups[]`, `tags[]`, `savedViews[]`, `prefs{}`, `scheduleEvents[]`, `schedulePhases[]`, `scheduleQuestions[]`, `lastModified`, `lastModifiedBy`.
- **`PlannerSeed`** — the JSON file at `F:\Wedding Website\hanstan-wedding\data\planner-seed.json`, read by `planner-state.mjs` ONLY when the live blob is empty (first-boot seed). Never re-read thereafter. Currently at 2421 + 604 = 3025 lines post-local-clone-modifications; live blob currently bears the result of live edits applied on top of an earlier seed.
- **`ScheduleDefaults`** — the JavaScript file at `F:\Wedding Website\hanstan-wedding\planner\hanstan-schedule-defaults.js`. Exposes `window.DEFAULT_SCHEDULE_PHASES`, `window.DEFAULT_SCHEDULE_EVENTS`, `window.DEFAULT_SCHEDULE_QUESTIONS`, and (post-local-clone-modifications) `window.DEFAULT_SCHEDULE_SEED_VERSION`. The SEED_VERSION mechanism causes `planner.js` to merge new items into a user's existing state on version bump without clobbering edits.
- **`CoordinatorsRegistry`** — the JSON blob at key `planner/coordinators.json`. Maps tokens → `{name, isMaster, addedAt, addedBy}`. Currently holds 3 entries: `stanshan` (Hannah & Stan, master), `shipsie` (Elsie, non-master), `everfindingbeauty` (Grace deVries, non-master).
- **`AuditLog`** — the JSON blob at key `planner/audit-log.json`. Append-only (newest first), capped at 5000 entries. Currently 45 entries, all authored by "Hannah & Stan", all `task.*` actions. Generated by `diffStates()` in `planner-state.mjs` on every authenticated POST.
- **`SnapshotsManifest`** — the JSON blob at key `planner/snapshots-manifest.json`. Index of full-state snapshots taken before each POST. Currently 97 snapshots, oldest from `system-seed` 2026-04-17 02:56 UTC, newest 2026-04-23 20:45 UTC.
- **`LocalClone`** — the Git working copy at `F:\Wedding Website\hanstan-wedding\`, tracking `Scryble/hanstan-wedding` branch `main`. Currently ahead of neither the remote nor behind — both at commit `433a223` — BUT the local clone has 1,162 lines of uncommitted modifications across 5 files plus 1 untracked backup file.
- **`SiteSpec`** — the spec document at `F:\Wedding Website\hanstan-wedding\HANSTAN_WEDDING_SITE_SPEC.md`. 59,715 bytes. Authority document for the site's overall shape. Currently 7 days stale behind the local-clone modifications.
- **`DiscoveryLog`** — the log at `F:\Wedding Website\hanstan-wedding\discoveryLog_hanstanWedding.md`. Captures rule-candidates + process improvements surfaced during this update. Currently seeded with 6 Tier-2 entries from 2026-04-23.

### 4.2 Relationships

- `PlannerSeed` → `PlannerState`: **one-time seed relationship.** `PlannerState` is seeded from `PlannerSeed` on first boot. After that, they diverge and re-converge is non-trivial.
- `ScheduleDefaults` → `PlannerState`: **version-gated merge relationship** via `prefs.scheduleSeedVersion`. On SEED_VERSION bump, new items merge in; user edits preserved.
- `LocalClone` → `GitHub remote` → `Netlify build` → `Live site`: **deploy pipeline.** A push triggers a Netlify build; successful build promotes to live.
- `LocalClone` ↔ `SiteSpec`: **supposed-to-be lockstep relationship**, currently broken (7-day spec drift). Rule candidate 1 in `discoveryLog_hanstanWedding.md` proposes enforcing this going forward.
- `PlannerState` POST → `AuditLog` + `SnapshotsManifest`: **atomic triple-write.** `planner-state.mjs` handler snapshots previous state, computes diff, writes snapshot + audit entries + new state.
- `CoordinatorsRegistry` → token-based access: **validates every request** via `auth.mjs:validateToken`.

### 4.3 Invariants (rules that must always hold)

- **Every POST to `planner-state` must be authenticated.** Enforced by `auth.mjs`. Non-negotiable.
- **Every authenticated POST produces at least one audit entry OR zero (if state is unchanged).** Never an unattributed change.
- **The spec document must stay in lockstep with the subject it describes.** Currently violated. Must be restored during this update.
- **Coordinator tokens grant edit access only; master-token-gated content remains hidden from coordinator-token users.** Currently only enforced for /admin route access; must extend to planner data visibility (Wes info, guest contacts, HanStan Logistics).
- **Schedule edits must produce audit entries.** Currently violated — `diffStates()` does not cover schedule. Must be fixed before bulk schedule editing.
- **The pre-update snapshot is a frozen reference** — it must exist before any update-stage writes occur, and must not be modified thereafter.

---

## 5. Components and Architecture (High Level)

### 5.1 Component list

- **`planner-state.mjs`** — Netlify function. GET returns current state; POST writes new state with atomic snapshot + diff-audit-log + state-write. Must be extended (`diffStates()`) to cover schedule/phases/questions/materials/notes.
- **`planner-auth.mjs`** — coordinator-token validation. Called on every planner-function request.
- **`planner-coordinators.mjs`** — coordinator CRUD. Already supports add/remove; must be exposed in-planner (parking-lot PL-23 "Add Coordinator button" / Stage 2).
- **`planner-audit.mjs`** — read-only audit log fetcher. Already returns `{entries: [...]}`. Consumed by the future Activity/History tab renderer.
- **`planner-snapshots.mjs`** — read-only snapshots manifest + restore. Already exists.
- **`_planner_lib/auth.mjs`** — shared auth helper. Validates Bearer token against coordinators blob.
- **`planner/planner.js`** — client-side planner logic (141,330 bytes). Contains view switching, task/schedule/focus/people/history rendering, edit handlers, server-state sync, SEED_VERSION top-up logic.
- **`planner/planner.css`** — client-side styles (121,956 bytes post-local-clone-modifications).
- **`planner/index.html`** — client-side shell (18,030 bytes post-local-clone-modifications). Holds FAB, sheet containers, view containers.
- **`planner/hanstan-schedule-defaults.js`** — default schedule data (43,615 bytes post-local-clone-modifications).
- **`css-panel.js`** — visual editor panel (120,467 bytes). Master-token-gated.
- **`ve-loader.js` + `ve-save.mjs`** — visual editor override loader + saver (separate blob store `ve-overrides`).
- **`data/planner-seed.json`** — first-boot seed (current 3025 lines with local-clone modifications).
- **`data/copy.registry.json`, `data/gifts.json`, `data/ordering.registry.json`, `data/theme.tokens.json`, `data/bambooChime.jpg`** — registry & theme data.
- **`admin/admin.js`** and **`admin/index.html`** — separate admin panel for registry copy editing. (Scrybal's "does /admin absorb into planner main nav?" question is parking-lot PL-21 / Stage 2 or Stage 3.)

### 5.2 Data flow and control flow

**Read flow (organizer loads the planner):**
1. Browser loads `planner/index.html` → `hanstan-schedule-defaults.js` → `planner.js` → `css-panel.js` → `ve-loader.js`.
2. `planner.js` prompts for token if not in sessionStorage; sends Bearer header on first fetch.
3. GET `/.netlify/functions/planner-state` → returns `PlannerState` JSON.
4. `applyServerState()` hydrates in-memory `TASKS`, `SE`, `SP`, `SQ`, `PREFS`, etc.
5. On SEED_VERSION bump detected, `applyServerState()` merges new schedule items + marks `PREFS.scheduleSeedVersion`. Triggers a silent save-back within 100ms.
6. `render()` draws the active view.

**Write flow (organizer edits a task):**
1. Client mutates in-memory state via edit handlers.
2. `save()` debounces → POST `/.netlify/functions/planner-state` with full `{state}` body and Bearer token.
3. Server validates token, reads previous state, writes snapshot, runs `diffStates(prev, next, by)`, appends audit entries, writes new state atomically.
4. Response returns `{ok, lastModified, savedAs, auditEntries}`.
5. Client reconciles `lastModified`; if a remote write happened in the meantime, re-fetch and re-reconcile.

**Deploy flow (code change):**
1. Scrybal / Claude edits files in the local clone at `F:\Wedding Website\hanstan-wedding\`.
2. `git add` → `git commit` → `git push` to `Scryble/hanstan-wedding` `main`.
3. Netlify detects push, runs build, promotes to `https://hanstan.wedding/`.
4. Subsequent organizer reloads fetch new code.

### 5.3 Interfaces and boundaries

- **`Authorization: Bearer <token>` on every function call** — the only auth interface. `stanshan` is master; `shipsie` and `everfindingbeauty` are coordinator; others TBD.
- **`planner/state-current.json` schema v6** — the PlannerState contract. Evolution must bump schema and include migration logic (none required this update if we don't change the contract).
- **`window.DEFAULT_SCHEDULE_SEED_VERSION`** — contract between `hanstan-schedule-defaults.js` and `planner.js`. Bumping this integer is how new schedule items get merged non-destructively into existing live states.
- **`diffStates(prev, next, by)` return shape** — `[{ts, by, action, target, summary}]`. All activity-log rendering depends on this shape. Extending coverage must preserve the shape.
- **`audit-log.json` append order** — newest first. Consumer code in the Activity tab must respect.

---

## 6. Constraints

### 6.1 Functional constraints

- **All state mutations must be attributed.** No unattributed writes tolerated. (Invariant from §4.3.)
- **Coordinator-visible content must not leak master-token-only content.** HanStan Logistics, guest contact details, Wes/officiant info must be server-side filtered or client-side hidden-with-confirmation — the precise mechanism is a Stage-decision.
- **SEED_VERSION bump on-deploy behavior must be non-destructive.** `planner.js` post-local-clone-modifications already implements this correctly (merges by id; preserves user fields); must be re-verified before deploy.
- **Every change made during this update must appear in the unified audit log with full attribution** — including Claude-driven POST-replays of the local-clone data changes. Claude posts as `stanshan` (Hannah & Stan).
- **The pre-update snapshots (`_preUpdate_snapshots/*.json`) and pre-update spec (`HANSTAN_WEDDING_SITE_SPEC_preUpdate_2026-04-23.md`) must be immutable after Stage 0 Phase C.**

### 6.2 Non-functional constraints

- **Performance:** no regressions in initial-load time. Current live load is acceptable. New features (Activity tab, Communications tab, FAB menu additions, ASQ speech-bubble) must not break mobile load under 3G.
- **Reliability:** every stage's commit/deploy must leave the live site in a fully-working state. No half-shipped features on main; use feature-flags or branches if a stage can't land atomic.
- **Security and Privacy:** coordinator tokens must not expose guest contact details, master-token content, or HanStan Logistics. Token rotation not in scope but must be feasible (single-file change to coordinators blob).
- **UX and Accessibility:** mobile-first. Field edits must be structurally safe from accidental triggers. Confirmation/discard UI must be reachable by thumb. Current WCAG AA target applies.
- **Cost and Complexity:** Netlify free tier limits apply. Blob storage writes per month, function invocations per month. Today's organizer usage is well under limits; this update does not meaningfully change the load pattern.

### 6.3 Environment constraints

- **OS (Scrybal's machine):** Windows 11.
- **Runtime (local):** Git Bash (per `CLAUDE_CODE_GIT_BASH_PATH=C:\Program Files\Git\bin\bash.exe`), node via `F:\p_toolDeck\tools\nodejs\`, Python via `C:\Users\ranji\AppData\Local\Programs\Python\Python314\python.exe` (bash has no `python3` alias — use `node` for JSON parsing).
- **Runtime (production):** Netlify Functions (Node.js), Netlify Edge deployment.
- **Deployment:** GitHub-to-Netlify auto-deploy on push to `main`.
- **Dependencies:** `@netlify/blobs`, zero frontend framework (vanilla JS), fonts via Bunny Fonts CDN.

---

## 7. Tradeoffs and Decisions

> This section preserves rationale. Updated per-stage as decisions are made.

### 7.1 Key decisions (Stage 0 so far)

- **Decision:** Use the claudeHandoffCanonicals v4.2 PROJECT_SPEC template for this update, with a parallel discoveryLog instead of the DeltaLog.
  - **Source:** 2026-04-23 this chat
  - **Why:** Scrybal rejected the DeltaLog ceremony as overkill for this specific project but wanted the PROJECT_SPEC structural discipline. The discoveryLog captures decision rationale + pushbacks in a lighter format.
  - **Alternatives considered:** Full DeltaLog; no spec at all (pure TASQ-driven); a bespoke format.
  - **Rejected because:** Full DeltaLog ceremony forces exchange-ID tracking + Download Links + echo-every-message protocols that Scrybal finds onerous for a single-session-per-stage workflow. No spec at all risks the same drift that got us here. Bespoke format wastes the canonical-template investment.
  - **Implication:** Decision-reasoning discipline moves from DeltaLog to the discoveryLog. Build tickets still derive from this PROJECT_SPEC cleanly.

- **Decision:** Stages are conceptual work-phases (e.g., "reconcile live-seed-drift," "extend audit coverage"). Steps are atomic ordered actions within a stage. This PROJECT_SPEC structures work as stages; BUILD_TICKETs are steps.
  - **Source:** 2026-04-23 Scrybal's explicit instruction — rejected my stages-1-to-11 list as "steps, not stages."
  - **Why:** Stages group work by coherent outcome; steps enumerate the actions that produce the outcome. Mixing them loses the "what are we trying to accomplish here" frame.
  - **Alternatives considered:** A flat list of 55+ items (Scrybal's original infodump); kinds/vehicles grouping (rejected as non-load-bearing); stage/step hierarchy (accepted).
  - **Rejected because:** Flat list loses sequencing + context. Kinds/vehicles surfaced irrelevant distinctions. Stage/step hierarchy matches how Scrybal thinks about execution.
  - **Implication:** Stage 0 below is fleshed out as a coherent phase with multiple steps within it. Subsequent stages (1+) will be drafted incrementally in this same spec.

- **Decision:** The 1,162-line local-clone uncommitted modification set is **intended work**, not drift. The task is to remind Scrybal what each modification does so he can audit it. Not to discard or rewrite.
  - **Source:** 2026-04-23 Scrybal's clarification during recon.
  - **Why:** Scrybal's quote: "That's not bad news. Those are all changes I wanted. I just can't remember why I want them."
  - **Alternatives considered:** Treat as drift to be resolved / stashed; treat as intended-but-needs-audit.
  - **Rejected because:** Treating as drift would throw away real work. Scrybal confirmed intentionality.
  - **Implication:** Stage 0 Phase A is pure recon — read each modification, reconstruct purpose, present to Scrybal for confirmation/rejection per file.

- **Decision:** Live field values are pulled via authenticated Bearer-token GET and reconciled into the local clone's seed BEFORE deploying the local-clone modifications. Scrybal's initial instinct (pull live → push to git) was directionally correct; Claude's "4 ominous reasons" pushback was invalid because Claude forgot Scrybal-granted access.
  - **Source:** 2026-04-23 Scrybal's pushback; `C:\Users\ranji\.claude\projects\f--\memory\feedback_chrome_connector.md` + master token `stanshan` = live access available.
  - **Why:** Reconciling live edits into the seed before the SEED_VERSION top-up deploy prevents the deploy from being the round that re-overlays live values onto stale seed and silently disagreeing. Also ensures the spec-fidelity snapshot (§6 Stage 0 Phase C) accurately represents live.
  - **Alternatives considered:** Deploy local-clone changes first, let SEED_VERSION top-up handle merge; pull live but don't reconcile (warn only); pull live + reconcile (accepted).
  - **Rejected because:** Deploy-first risks live-edits being masked by seed defaults on restart. Warn-only leaves Scrybal to reconcile manually, defeats automation. Pull-and-reconcile preserves both.
  - **Implication:** Stage 0 Phase B is a real reconciliation step, not just a snapshot step. Stage 0 Phase C produces TWO files — the pre-update snapshot AND the frozen pre-update spec.

- **Decision:** The unified Activity tab will integrate audit entries from live AND from Claude-driven POST-replays into one time-ordered stream. The History tab is renamed to Activity, moved to the far-right of the main nav ribbon, and Settings is moved to the far-left.
  - **Source:** 2026-04-23 Scrybal explicit layout direction.
  - **Why:** Ribbon layout puts global controls on the edges (Settings-left, Activity-right) and operational tabs in the middle. Unified audit stream means no "where did this edit come from" confusion.
  - **Alternatives considered:** Keep History label; keep original layout order; maintain split live-vs-local audit streams.
  - **Rejected because:** "History" was underspecified (history of what?); ribbon order was arbitrary; split streams defeat the purpose of a unified audit.
  - **Implication:** `planner/index.html` nav order will change. `planner-audit.mjs` becomes the single source. `diffStates()` extension must land before the bulk POST-replay.

- **Decision:** spec-subject co-update rule (discoveryLog Tier-2 entry) applies to this update going forward. Every stage that touches planner code updates `HANSTAN_WEDDING_SITE_SPEC.md` in the same commit.
  - **Source:** 2026-04-23 Scrybal pushback on 7-day spec drift.
  - **Why:** The drift that triggered this whole update is exactly what the rule prevents.
  - **Alternatives considered:** Update spec only at final stage (rejected); update after each stage (accepted).
  - **Implication:** Every BUILD_TICKET derived from this PROJECT_SPEC must list `HANSTAN_WEDDING_SITE_SPEC.md` in its `files_modify` alongside the subject files.

---

## 8. Risks, Edge Cases, and Known Limitations

- **Risk: organizer edits landing during Stage 0 Phase B-to-C window.** If Elsie or Grace log in and edit between our live-state pull and our seed reconciliation, their edit is in live but not in our snapshot. Mitigation: the diffStates-extended POST-replay in Stage-TBD will re-pull live immediately before writing, catching any intervening edits. Also: snapshots-manifest capture is atomic, so we can always revert.
- **Edge case: SEED_VERSION undefined on current live.** Live `prefs.scheduleSeedVersion` is `undefined` (prefs doesn't have the key). Post-local-clone-modification code compares `(PREFS.scheduleSeedVersion || 0) < 3`, so undefined is treated as 0 and the top-up fires. This is correct behavior but must be verified on staging/preview before prod.
- **Limitation: `planner-seed.json` is never re-read by live.** Reconciling live edits into seed is useful only for fidelity-snapshot and future-first-boot scenarios, NOT for affecting live behavior. Live behavior changes require authenticated POSTs.
- **Risk: audit-log cap at 5000 entries.** Current log is at 45; no immediate risk. Bulk POST-replay of the local-clone data changes will add ~30–100 entries; still nowhere near cap. Long-term monitoring deferred.
- **Limitation: Netlify function cold-start on infrequent endpoints.** `planner-audit.mjs`, `planner-snapshots.mjs` may cold-start and add 500ms–2s to first Activity-tab load. Acceptable.
- **Risk: Chrome connector session expiry during a long stage.** If the browser session logs out mid-stage, authenticated operations fail. Mitigation: re-authenticate via connector; master token `stanshan` remains valid for direct curl fallback.
- **Known limitation: `discoveryLog_hanstanWedding.md` rules 1–7 are Tier-2 PENDING until Scrybal approves phrasing.** Until then, Claude applies them as best-effort-of-the-moment and logs deviations.
- **Risk (2026-04-23, low-severity): double-top-up edge case on M44 + SEED_VERSION=3 deploy.** Sequence: Stage 0 M44 explicitly sets `prefs.scheduleSeedVersion: 0` on live now. Stage 1 later deploys code containing `window.DEFAULT_SCHEDULE_SEED_VERSION = 3`. If a user happens to load the planner in the window between M44's POST and the Stage 1 deploy, their local state has `scheduleSeedVersion=0` but the code still has the old undefined-SEED_VERSION logic — no top-up fires. Fine so far. After Stage 1 deploys, their next load sees `scheduleSeedVersion=0` < 3 and fires the top-up once. Also fine. **The actual edge case is narrower:** if a user loads before M44 AND before the deploy, their client has `scheduleSeedVersion=undefined`. After M44 runs, the server has it as 0 — but the user's in-memory state still has it as undefined. If they then save (triggering a state POST that overwrites the server with their undefined), the server reverts to undefined. Next load after the deploy triggers the top-up (expected). Net effect: **if a concurrent organizer-POST races with M44**, the M44 cleanup is transiently undone — but the next post-deploy top-up still fires correctly, so nothing is actually broken. **Cleanup:** if any such spill is observed in the audit log, it can be patched after the fact by re-running M44. Live-site state always has the audit trail to reconstruct what happened.

---

## 9. Acceptance Criteria (High-Level — Whole-Update Lifecycle)

The update spec as a whole is fully delivered when all of the following hold. These span multiple stages — stage-by-stage attribution is noted on each.

- **AC-1:** Every wedding organizer's edit to any planner entity produces a visible Activity-log entry with `where/who/when/why` attribution. **[Stage 1]**
- **AC-2:** No non-master-token user can see HanStan Logistics, guest contact details, Wes/officiant info, or Stan's Rolodex content in the live planner. **[Stage 2 — Stage 0 captures the data tags; Stage 2 ships the render-path filtering code]**
- **AC-3:** Mobile users cannot accidentally commit field edits — every change requires explicit confirm (quick-edit per-card or batch edit-mode). **[Stage 2 — PL-05 through PL-09]**
- **AC-4:** `HANSTAN_WEDDING_SITE_SPEC.md` at update-end accurately describes the live site — verified by a diff between spec-claims and live-state pull. **[Final stage — spec-subject co-update rule applies to every intermediate stage too]**
- **AC-5:** `HANSTAN_WEDDING_SITE_SPEC_preUpdate_2026-04-23.md` exists and accurately describes live state as of post-Phase-C 2026-04-23. Contains §PU-1 through §PU-11. Immutable from Stage 0 Phase D onward. **[Stage 0 Phase D]**
- **AC-6:** Every D1–D11 pre-existing task (and every M-series task M1–M47 excluding retired M20, resolved-no-POST M36, and unassigned-number M38) is present in live planner state with full attribution. M38 is an accidentally-skipped number in the sequence; the next new M-task uses M48 or M38, either is fine. **[Stage 0 Phase C]**
- **AC-7:** Every schedule event, phase, question, materials check, and note edit is logged by the extended `diffStates()`. **[Stage 1]**
- **AC-8:** Bridesmaids, Sarah Reese, Bonnie, Merry Shipman, and Roger Shipman have been called, have coordinator tokens, and have acknowledged their planner access. **[Stage 3 — gated on Stage 2 mobile-safety UX]** (Off-code AC; Scrybal action.)
- **AC-9:** Scrybal can look at the planner on 2026-05-07 and confirm "the full schedule is formalized." **[Tracked as M23 planner task on live; NOT a stage in this update's stage sequence. Gated on AC-8 (coordinator-token distribution).]**

### 9.1 Stage 0 acceptance criteria (deliverable within Stage 0 alone)

These are the criteria whose satisfaction Stage 0 is responsible for. See Stage 0 Phase D "Stage 0 consolidated acceptance criteria" for the detailed S0-AC-1 through S0-AC-8 list.

Stage-level acceptance criteria are declared per stage in its own section.

---

## 10. Future Ideas (Optional)

- Claude auto-briefing pipeline (Gmail extraction, messaging apps, Zoom transcripts → planner feed).
- /admin absorption into planner main nav (current `/admin` becomes a planner tab).
- HanStan Logistics as its own planner-engine-hijacked project.
- Zoho Mail API upgrade replacing `mailto:` broadcast (task D6 on current live).
- Rivendell Garden theme extended sitewide (task D5 on current live).
- Amazon-capable gift list for Christa + registry link rewiring.

---

---


# ═══════════════════════════════════════════════
# STAGE 0 — RECON + PREP + EASY WINS
# ═══════════════════════════════════════════════

**Stage status:** LOCKED 2026-04-23 per Scrybal approval. Rewritten with concrete content 2026-04-23.

**Stage goal:** By end of Stage 0, every easy-win item from Scrybal's 2026-04-23 infodump has been applied to live via authenticated `planner-state` POST (master token `stanshan`, attributed "Hannah & Stan"). Every rolodex violation has been fixed. The audit log contains retroactive entries for every organizer edit that historically happened without audit coverage (primarily Elsie's 2026-04-22 schedule edits). The pre-update frozen fidelity snapshot exists as the immutable historical record. The 1,162-line local-clone modification set has been reviewed and catalogued, not yet committed. No code changes, no git pushes, no Netlify changes.

**Execution mode:** Phases sequential A → B → C → D. No live re-pulls beyond the one at Phase C batch boundaries (Scrybal confirms he is the only one working tonight). Recency-wins applies to all task updates — most recent info supersedes older.

---

## - [ ] Stage 0 Phase A — Recon reads + catalogue (COMPLETE except planner.css / planner.js deep-catalogue)

**Phase status:** Substantially complete as of 2026-04-23. Remaining sub-steps call out what still needs to land.

**What Phase A has established:**

### A.1 Drift check
Re-pulled 2026-04-23 state/audit/snapshots/coordinators. Compared against the recon pull from earlier today. **NO DRIFT.** `lastModified` unchanged at `2026-04-23T20:45:28.719Z`, task count 75, contacts 27, schedule events 96, phases 8, questions 17, audit entries 45, snapshots 97.

### A.2 Local-clone modification-set catalogue (the 1,162-line uncommitted set)

| File | Lines added | Lines removed | Purpose reconstructed | Confidence | Risk |
|------|-------------|---------------|----------------------|------------|------|
| `data/planner-seed.json` | +604 | 0 | 11 new D-series tasks (D1–D11). Listed in §A.2.1 below. | HIGH | LOW (seed is only read on first-boot; won't affect live). |
| `planner/hanstan-schedule-defaults.js` | +38 | 0 | SEED_VERSION=3 bump + 3 new events (se-006, se-007, se-049) + 4 new questions (sq-18…sq-21) + scope-moderation notes on se-029/045/073/081/084 + phase-eventIds updates (sp-00 gains se-006/se-007; sp-03 gains se-049) | HIGH | MED (will trigger seed-top-up merge on first load after deploy — already-live events preserved by id-matching) |
| `planner/index.html` | +31 | 0 | Bottom quick-add bar replaced by floating action button + menu (quick-add / full-add). Plus 2 new sheet containers: `broadcastSheetBg` (People-tab broadcast email) + `materialsSheetBg` (schedule event materials checklist) | HIGH | LOW (additive UI; hidden qaInput+qaBtn preserved for backwards compat) |
| `planner/planner.css` | +127 | -14 | Styles for the FAB + menu + materials sheet + schedule event `sched-event-title-row` / `sched-event-materials` + people-tab toolbar/role-filter/print-btn + `sched-chip-role-badge` + materials checklist items | HIGH | LOW (additive CSS) |
| `planner/planner.js` | +384 | -29 | 10 hunks. New functions: `buildNewTask()`, `fullAdd()`, `setPeopleRoleFilter()`, `buildPeoplePrintHead()`, `printPeopleList()`, `printGuestList()`, `schedOpenMaterials()`, `schedCloseMaterials()`, `schedToggleMaterial()`, `schedRemoveItemFromSheet()`. Plus: SEED_VERSION top-up logic in `applyServerState()` (merges new schedule items by id, preserves user edits), FAB wiring, People tab role-filter + print, schedule-event materials-sheet integration. | HIGH | MED (SEED_VERSION top-up is the riskiest piece — non-destructive-merge logic must be validated before deploy) |

**A.2.1 — The 11 new D-series tasks in `data/planner-seed.json` (NOT YET ON LIVE):**

| taskId | title | priority | deadline | assignee | group | subtasks count |
|--------|-------|----------|----------|----------|-------|----------------|
| D1 | Assign PICs for all unfilled roles | critical | 2026-05-10 | Hannah, Stan | Wedding Day | 14 |
| D2 | Integrate Hannah's handwritten checklist into the planner | high | 2026-04-25 | Hannah, Stan | Wedding Week | 0 |
| D3 | Cassie: print + distribute per-person schedules to every PIC and guest | high | 2026-06-06 | Cassie | Wedding Week | 5 |
| D4 | Stan: get ring finger sized in Fremont this Monday | high | 2026-04-20 | Stan | Wedding Week | 0 |
| D5 | Extend Rivendell Garden theme to the whole wedding website | medium | (none) | Stan | Website | 6 |
| D6 | Upgrade broadcast email from mailto: to Zoho Mail API | low | (none) | Stan | Website | 0 |
| D7 | Playlist owner conflict: Master Doc says Stan, Tasks+Needs says Shuba — resolve | medium | 2026-05-01 | Stan | Procurement | 0 |
| D8 | Decide: generator needed at Shelter A? | medium | 2026-05-15 | Stan | Procurement | 0 |
| D9 | Decide: additional food warmers beyond Carol's 6? | medium | 2026-05-15 | Stan, Bonnie | Catering | 0 |
| D10 | Create + print guest programs AND coordinator schedules | high | 2026-06-01 | Cassie | Wedding Week | 4 |
| D11 | Resolve planner ↔ schedule conflicts (audit 2026-04-19) | high | 2026-04-30 | Stan | Wedding Week | 12 |

**D4 is stale** (deadline 2026-04-20, today is 2026-04-23). Will be updated per recency-wins — new deadline TBD by Scrybal or reset to "ASAP".

### A.3 Elsie's 2026-04-22 activity (found via snapshots manifest; invisible in audit log because `diffStates()` doesn't cover schedule)

**Session window: 2026-04-22 03:47 UTC → 04:08 UTC (~20 minutes, 19 POSTs).** Net mutations (first-vs-last diff):

1. **se-001** (Wake up / breakfast) — unchanged? (note added at [1] in diff — actually `scheduleEvents[1].notes` which is `se-002`). Confirming: note added to **se-002** (Load vehicles — decorations and supplies): `"Where is everything stored? Multiple locations, nail down crews for each location…"` (truncated; full text in the snapshot).
2. **se-021** (Ceremony chairs set up with center aisle) — swapped `people[0]` from Fen→Lucas, `people[1]` from Lucas→Fen, both now role=helper. Added note: `"Elsie is pic"`. **PROBLEM: Elsie is NOT in the `people` array** — only a note says so. Self-assignment did not take effect on the PIC field.
3. **se-032** (First aid station) — added note: `"Scrap the full station setup and just bring a FAK to be assigned to Trudy if available"`
4. **se-117** (Chairs + tables collected @20:00) — removed Fen (was pic), now Lucas is the only person (role helper). Event has no PIC.
5. **se-121** (Changing tent packed @20:15) — removed Fen (was pic). Event now has zero people assigned.
6. **sp-02** (phase "Bridal Party Final Prep") — un-collapsed (collapsed: true → false). UI-only; no data impact.
7. **sq-2** (question about Rodeway distance) — resolved with: `"Variety; about 15-20 minutes from Rodeway for bridesmaids/Elsie"`
8. **sq-10** (question about OLCC server certification) — resolved with: `"Elsie can't be OLCC certified, need someone else to be certified and serving"`

### A.4 Grace Zoom 2 transcript — extracted content (transcript at `F:\Wedding Website\hanstan_photography_Grace DeVries zoom 2 transcript.txt`, 1651 lines, 2026-04-23 call)

**Decisions reached on the call:**
- **Grace covers 1:30 PM onwards.** Original plan was 1:30 arrival; confirmed staying with that time (NOT 2:30, which is Daniel Thomas's arrival time misattributed earlier in the call).
- **Daniel Thomas's schedule:** 12:30 PM start (detail/getting-ready photos) through ~6:30 PM. 4-hour package.
- **Grace expressed strong interest in extending her hours to 12:30 PM – 8:30 PM (8 hours)** to cover golden hour portraits (~8:00 PM). Would include RAW photo delivery (Scrybal confirmed interest in RAW for post-processing). She offered a bulk rate: extra hour normally $200, but if Scrybal commits to golden hour, one extra hour for $100. Scrybal stated 1 extra hour is "fine and easy" and 2 extra hours is "doable but has to ask Hannah." **Decision pending.** Additional cost for 2 extra hours: $200 (discounted from usual $400).
- **First look photos:** Hannah will get ready at Rodeway brick restroom with bridesmaids; Stan arrives separately; first look happens in a scenic spot in the park. Grace and/or Daniel covers this.
- **Family photos immediately after ceremony (3:00 PM onwards, 30–45 min).** Grace's recommendation, accepted by Hannah. Order: Stan's family (smaller) → both families together → Stan's family released → pare down Hannah's family. "None of this family-with-both-then-family-with-one" (Grace's phrase).
- **Cake cutting decision:** immediately after ceremony, BEFORE the main meal. Stan and Hannah confirmed. Order: ceremony ends → sign marriage certificate → cake cutting (Stan + Hannah each take a bite) → guests served dinner → family photos happen concurrently.
- **Charcuterie clarification:** not for guests — for setup crew. Any leftover available to guests.
- **Couples portraits near golden hour (around 7:00 PM) if Grace's hours extend that long.**
- **Grace prepped reference:** requests all detail items (rings, shoes, flowers, invitation) pre-staged in one spot/box before she arrives.
- **Grace prefers each photographer works own style, not follow each other around.** But wants to talk to Daniel Thomas directly first to divide coverage.
- **Grace has already reached out to Daniel Thomas directly** (mentioned mid-call).
- **Grace wants a runner/assistant to carry gear during detail photos.** Scrybal confirmed a runner role already planned.
- **Scrybal promised:** send Grace Thomas's Instagram (`Thomas Visuals`) + phone (206-307-5208). Already sent via paste at call end.
- **Stan's father will push for many family-photo combinations;** Scrybal promised to pre-filter requests before presenting to Grace.
- **Raw photo delivery:** Grace includes unedited JPEGs by default when asked; will do RAWs for Stan since he's doing his own editing. If Stan posts edited photos publicly, he must credit that he edited them.
- **Grace acknowledged** she has her own token and can add notes to cards in the planner.

**New task candidates from this transcript:**
- Confirm 2-hour extension with Hannah; decide $200 additional spend with Grace.
- Draft list of family-photo requests + sequence; send to Grace AND Daniel Thomas.
- Get Grace + Daniel Thomas on a Zoom call together to formalize coverage split (after they've spoken 1:1 first).
- Pre-stage detail items (rings, shoes, flowers, invitation) in one spot/box before Grace arrives.
- Update `se-044` (Detail / getting-ready photos, currently 12:30) to reflect Grace vs Daniel Thomas coverage split — Daniel does this.
- Add `t_runner_for_grace` or subtask under D1 for dedicated gear-carrying helper during detail photos.

### A.5 Earlier Grace Zoom transcript
**NOT FOUND on disk.** Searched `F:\Wedding Website\**\*grace*` / `*photography*` / `*zoom*`. Only `hanstan_photography_Grace DeVries zoom 2 transcript.txt` exists. → Phase C includes a task "Find earlier Grace Zoom transcript (if it exists outside F drive)".

### A.6 Tasks+needs.docx.md — READ IN FULL (60 lines, at `F:\Wedding Website\Tasks+needs.docx.md`)
Content: a "To-Get List" (bring/buy items with assignees) and a "Tasks List" (roles with assignees). Used as authoritative reference. Key items already in live schedule or in D1 subtasks. Missing from live: `Lucas` (Cassie's BF) as "Initial setup + Cassie's blue tent day-of" is present; `Dolly/trolley/cart` unassigned; `Lost & Found` assigned to Josiah (matches se-028); wine server license consideration done (B41 closed).

### A.7 Rivendell Garden design doc
**EXISTS** at `F:\.skills\visualDesign_Rivendell.html` (1531 lines). Verified readable. Ready for Phase D §PU-2 embedding.

### A.8 Daniel Thomas ↔ Grace deVries photography schedule diff

**Daniel Thomas's known schedule** (from live state `se-044` + call context):
- 12:30 PM — Detail / getting-ready photos (se-044, role=pic, zone=shelter)
- 2:00 PM onwards — Photographers on duty (se-051, Daniel Thomas + Grace both listed as pic)
- 2:30 PM — intended ceremony start per prior misunderstanding (now corrected)
- 4-hour package → ends ~4:30 PM

**Grace's proposed schedule** (from her inline paste in Scrybal's 2026-04-23 infodump):

| Time | Event | Notes |
|------|-------|-------|
| 1:30 | Detail Pictures / Venue & Getting Ready | Grace's arrival |
| 1:55 | First Look with Bride and Father | |
| 2:05 | First Look and Reading of Vows with Bride and Groom | |
| 2:15 | Bride and Groom Portraits | |
| 2:30 | Bride and Bridesmaids | |
| 2:40 | Full Wedding Party | |
| 2:50 | Groom and Groomsmen | |
| 3:00 | Immediate Family Portraits | |
| 3:30 | Bride in Hiding | |
| 4:00 | Ceremony | |
| 4:30 | Reception | |
| 4:30 | Sign Marriage Certificate | |
| 4:40 | Big Arrival | |
| 5:00 | Meal | |
| 5:30 | Toasts | |
| 6:00 | Cake Cutting | |
| 6:05 | First Dance | |
| 7:30 | Send off & Clean Up | |

**Critical discrepancy:** Grace's schedule has **ceremony at 4:00 PM**, live planner has **ceremony at 2:30 PM (`se-055` CEREMONY status=confirmed)**. Grace's entire schedule is offset by ~1.5 hours from live reality. This is the schedule Grace wrote BEFORE the 2026-04-23 call where the 2:30 ceremony time was confirmed. **Grace's schedule needs to be re-derived against the live 2:30 ceremony anchor before coordination can happen.**

**Zoom-call-confirmed reality (overrides Grace's paste):**
- 12:30 Daniel Thomas arrives for detail photos
- 1:30 Grace arrives
- 2:00 photographers on duty, pre-ceremony setup shots
- 2:30 CEREMONY START
- 3:00 ceremony ends → sign marriage certificate → cake cutting immediately (new decision)
- 3:00–3:45 family photos (30–45 min, Grace's recommendation)
- 3:45 onwards dinner service
- ~7:00 couples portraits near golden hour (if Grace extends)
- 7:30 send off + teardown begins
- 8:30 Grace departure (if 2-hour extension approved)

**Gaps to resolve:**
- `se-072 CAKE CUTTING @15:30` is correctly scheduled post-ceremony.
- `se-051 Photographers on duty @14:00 duration=90` includes both Daniel + Grace — still accurate.
- `se-044 Detail / getting-ready photos @12:30` shows Daniel Thomas only — Grace should be added to the 13:30 variant OR a new event `se-044b Detail photos (Grace) @13:30` should be added.
- `se-083 Family photos begin @16:00 duration=30` — time needs to shift to 3:00 PM per Grace's recommendation (immediately post-ceremony, NOT post-dinner).
- Events between 3:00 PM and 6:00 PM need a coverage split: Daniel Thomas stays until ~4:30 PM; Grace stays until 8:30 PM if extension approved.

### A.9 Current rolodex state + violations

**Stan's Rolodex group currently contains 12 tasks:**
- B4 "Zubey — Confirm Attendance & Buy Tickets" (status=not-started, has subtasks)
- B19 "Brother's Guest List Input"
- (no-id) "Zubey" — **DUPLICATE of B4, violation**
- (no-id) "Ronnie"
- (no-id) "Peter"
- (no-id) "Aarti"
- (no-id) "Tanvee & Aung"
- (no-id) "Deyvaansh"
- (no-id) "Abhinav"
- (no-id) "Urmi"
- (no-id) "Rumi Didi"
- (no-id) "Babu Mamu & Deepa Aunty"

**Violation found:** Zubey has 2 cards (B4 + no-id). Per recency-wins: delete the no-id bare "Zubey" card, keep B4 which has richer content. B4 already covers confirmation + ticket buying.

**Missing rolodex cards per 2026-04-23 infodump:**
- **Lucas (Cassie's BF)** — not currently in rolodex; Scrybal asked to add.

**B19 "Brother's Guest List Input"** — RESOLVED per B-DEC-7: stays in Stan's Rolodex. Phase C.3b M41 adds cross-surface tags `["organizers", "guest-list"]` to capture multi-parent intent pending PL-01 schema extension.

### A.10 Elsie + Fen schedule appearances (baseline for new pairing-principle constraint)

**Co-appearances (already together):**
- se-002 @06:30 Load vehicles — Elsie pic, Fen helper
- se-011 @07:15 Unload vehicles — Elsie pic, Fen helper
- se-017 @11:50 Canopies assembled — Elsie pic, Fen pic
- se-021 @15:50 Ceremony chairs — Fen helper, Lucas helper, "Elsie is pic" in notes only (NOT in people array — see §A.3)

**Elsie appears, Fen does not:**
- se-001 @05:30 Wake up/breakfast — Elsie present. **Gap: add Fen.**
- se-013 @07:45 Canopy drop-off — Elsie helper. **Gap: add Fen.**
- se-032 @20:15 First aid station — Elsie note only. **Review per scope-moderation note.**
- se-082 @15:45 Wine served — Elsie pic. **Gap: add Fen as helper per pairing principle.**

**Fen appears, Elsie does not:**
- se-023 @16:35 Reception tables — Fen pic. **Gap: add Elsie or note pairing principle.**

**A.10 conclusion:** 5 schedule events need Elsie/Fen pairing enforcement per the new constraint.

---

## - [ ] Stage 0 Phase B — Scrybal review + decisions (CONDENSED per recency-wins)

**Phase goal:** Scrybal confirms Phase A findings are accurate and greenlights Phase C execution. Per Scrybal's 2026-04-23 directive, no per-task approval — Claude applies recency-wins logic automatically. Scrybal only reviews:
- The Phase A report above for factual accuracy.
- The Phase C execution manifest below (what Claude is about to POST).
- Any Phase A "needs Scrybal input" flags.

**Items requiring Scrybal input before Phase C:**
- **B-DEC-1:** Confirm 2-hour Grace extension + $200 spend (12:30–8:30 coverage, includes RAW delivery).
- **B-DEC-2:** Confirm Zubey duplicate-removal direction (delete no-id, keep B4).
- **B-DEC-3:** Confirm whether Fen was intentionally removed from `se-117` and `se-121` by Elsie, OR whether those are reassignment candidates.
- **B-DEC-4:** D1 task deadline (2026-05-10) vs D4 task deadline (2026-04-20 overdue) — confirm D4 reset to "ASAP".
- **B-DEC-5:** Elsie + Fen pairing principle — confirm as master-token-visible planner note + add-Fen-to-Elsie-events action.

---

## - [ ] Stage 0 Phase C — Unify pre-existing + new; land everything as authenticated live-state POSTs

**Phase goal:** Apply every determined change to live via `planner-state` POST, master token `stanshan`, attributed "Hannah & Stan". Every task-add / task-update / contact-add / token-issuance from both (a) the 1,162-line pre-existing modification set in the local clone AND (b) the 2026-04-23 infodump, UNIFIED per the merge rule. Every action self-logs via the §C.X Structured Capture Protocol for later injection into the Stage 1 unified audit engine. Nothing gets redone. Nothing gets deleted-only-archived. Schedule states are treated as draft-liquid — the schedule-solidification planner task (M23, deadline 2026-05-07) resolves them later; Phase C touches schedule data minimally.

**Merge rule (Scrybal directive 2026-04-23):**
1. Unique items from either side survive as-is.
2. Overlapping items unify into one enriched record — strongest/most-specific value per field wins; all sources preserved in comments.
3. Conflicts resolve by recency-wins, with the superseded value preserved in a comment so work-history stays visible.
4. No redoing existing work — extend the scaffold rather than rewrite.
5. Pre-existing partial solutions become subtasks/dependencies of broader parent items when scope differs.

**Supremacy rule (Scrybal directive 2026-04-23):** planner > schedule (planner is gel; schedule is draft-liquid). But: **constraints > preferences** — a coordinator/PIC/guest preference never overrides a constraint coming from another source. Example: Grace's runner preference ≠ authority to keep a specific runner if that runner is needed to care for a disabled guest. This rule governs Stage 4 (task-audit) conflict resolution more than Phase 0; Phase 0 only captures the rule.

**TaskId convention (Scrybal directive 2026-04-23):** every task gets an id. Continue existing conventions: A-series (website/registry/FAQ infrastructure — all done), B-series (main wedding-planning workload), C-series (meta/governance/dialogueXR-adjacent), D-series (prior-session additions, continuing from D11 → D12, D13, …), **M-series** (miscellaneous, for 2026-04-23 items that don't fit A/B/C/D cleanly). Introduction of M-series becomes a documentation item in `HANSTAN_WEDDING_SITE_SPEC.md` (website spec) — covered in the small additive Stage 1 Phase C append; full spec rewrite is end-of-all-stages.

**Phase C execution order** (per dependency audit 2026-04-23):

1. **C.X** — format spec (defines JSONL layout; no action).
2. **C.5** — Elsie 2026-04-22 backfill to JSONL (runs first so JSONL chronology is clean: historical entries before current-session entries; pure JSONL write, no live POST).
3. **C.1 + C.1b** — single live POST: rolodex fixes + Lucas D12 to Organizers.
4. **C.2** — single live POST: D1–D11 adds + merge updates.
5. **C.3** — single live POST: M1–M35 new M-series + M12/M13/M14/M22 existing-task updates (excluding retired M20, resolved M36; M38 is just an unassigned number in the sequence).
6. **C.4** — single live POST: M37 pairing-principle note.
7. **C.3b** — single live POST: M39 group merge + M40 master-only tags + M41 cross-surface tags + M42 contact constraints.
8. **C.3c** — live POST(s), internal order: M44 (scheduleSeedVersion=0) → M45 (stage1smoke token). **M43** (audit-log backfill) is an execution-blocker until Scrybal decides between (a) defer to Stage 1 (recommended), (b) Netlify CLI script, (c) `planner-state.mjs` code change. **M46** (baseline metrics) is canonically Phase D §PU-9 — removed from C.3c scope. **M47** (Stage 1 commit plan) is canonically Phase D §PU-10 — removed from C.3c scope.
9. **C.7** — local file write to wedding folder `tasQ.md` (append reminder; depends on M35 existing from C.3).
10. **C.6** — verification runs AFTER each live-POST batch (steps 3, 4, 5, 6, 7, 8). JSONL-only (C.5) and local-file-only (C.7) batches skip live-state verification.

Phase D starts after Phase C completes.

---

### C.X — Structured Capture Protocol (enables retroactive audit injection)

Every Phase 0 action self-logs to `F:\Wedding Website\hanstan-wedding\_preUpdate_snapshots\phase0_capture_2026-04-23.jsonl` in a format that the Stage 1 unified engine can ingest wholesale. Format per line:

```json
{"ts":"<ISO>", "by":"Hannah & Stan", "entity":"task|contact|group|tag|scheduleEvent|schedulePhase|scheduleQuestion|materialCheck|coordinator|note", "action":"create|update|delete|archive|subtask.toggle|subtask.add|subtask.del|comment.add|note.add|person.add|person.remove|person.update|resolve|rename", "target":"<taskId or id>", "field":"<optional field name>", "from":"<prior value>", "to":"<new value>", "summary":"<one-line human-readable>", "source":"<which infodump line or pre-existing D-task id>", "batch":"C.N"}
```

This file is the canonical record of every Phase 0 mutation, regardless of whether `diffStates()` covered it at the time. When Stage 1's unified engine ships, a migration script reads this JSONL and replays entries into the audit log in timestamp order. The Activity tab then renders the complete history including all Phase 0 edits.

Also covers Elsie's 2026-04-22 session — her 8 reconstructed mutations get written to this JSONL during Phase C with their original 2026-04-22 timestamps.

---

### C.1 — Rolodex fixes + Rolodex Rule enforcement (authenticated POST #1, batch `C.1`)

**Rolodex Rule (Scrybal directive 2026-04-23):** Stan's Rolodex group contains ONLY friends, family, and guests who are NOT coordinators/PICs/service providers. Coordinators/PICs belong in Organizers, Wedding Day, or role-specific groups. A task CAN belong to multiple groups (see parking-lot for multi-parent schema work) — Phase 0 uses `tags: ["rolodex", "stans-rolodex"]` on tasks primarily grouped elsewhere but that also legitimately belong in rolodex.

**Rolodex POST actions:**
- **DELETE** the no-id "Zubey" task (duplicate of B4) — archived with final state captured in C.X log before removal. Nothing truly gets deleted; archive preserves the full final state.
- B19 "Brother's Guest List Input" stays in Stan's Rolodex. Per the multi-parent discussion, also add `tags: ["organizers", "guest-list"]` to signal cross-surface intent; true multi-parent group membership is parking-lot for Stage 1+.
- All other current rolodex cards (Ronnie, Peter, Aarti, Tanvee & Aung, Deyvaansh, Abhinav, Urmi, Rumi Didi, Babu Mamu & Deepa Aunty) stay in Stan's Rolodex.

### C.1b — Lucas (Cassie's BF) added to Organizers per Rolodex Rule (batch `C.1`)

- **ADD** new task D12 `"Coordinate with Lucas (Cassie's BF) — day-of setup helper + Colleen's tent"`. `priority=medium`, `status=not-started`, `assignee=Stan`, `group="Organizers"`, `tags=["coordination","day-of","family","social"]`, `desc="Cassie's boyfriend. Roles per F:\\Wedding Website\\Tasks+needs.docx.md: initial setup (Elsie/Fen/Cassie/Lucas) + bringing Cassie's blue tent for Colleen day-of (Cassie+Lucas). Loop into Cassie's calls so he knows what he's signed up for."`.

---

### C.2 — D-series unify: pre-existing D-tasks POSTed to live + 2026-04-23 overlap-merge (batch `C.2`)

The 11 pre-existing D-tasks (D1–D11) currently live in `data/planner-seed.json` only — NOT on live. Phase C.2 POSTs them via `planner-state` so they reach live with proper attribution + audit trail. Where a D-task overlaps with a 2026-04-23 infodump item, merge rule applies.

**D1 — "Assign PICs for all unfilled roles"** (14 subtasks). POST as-is. No merge needed.

**D2 — "Integrate Hannah's handwritten checklist into the planner"** (0 subtasks, deadline 2026-04-25). POST as-is. No merge.

**D3 — "Cassie: print + distribute per-person schedules to every PIC and guest"** (5 subtasks, deadline 2026-06-06). **MERGE:** absorb the coordinator-schedules portion of D10 into D3 (D3 already has `s_cas_2` "Run the planner's Per-Person print → 'all' option" + `s_cas_4` "Print with cover sheet labeled by name" + `s_cas_5` "Hand out at pre-wedding meet & greet OR mail to those not attending"). D10 reduces to guest-programs-only.

**D4 — "Stan: get ring finger sized in Fremont this Monday"** (deadline 2026-04-20, overdue). **MERGE:** same task as 2026-04-23 infodump "Get Stan's ring finger sized". Apply recency-wins: `deadline` reset from `"2026-04-20"` → `""` (ASAP). Add comment: `"Original deadline 2026-04-20 per 2026-04-19 authoring. Reset to ASAP per 2026-04-23 recency-wins."`.

**D5 — "Extend Rivendell Garden theme to the whole wedding website"** (6 subtasks). POST as-is. No merge.

**D6 — "Upgrade broadcast email from mailto: to Zoho Mail API"** (low priority, no deadline). **MERGE:** D6's scope is narrower than 2026-04-23 infodump's "Build Zoho wedding email template" + "Wire Zoho↔planner comms". D6 becomes a **subtask** of a new parent M1 task "Wedding communications infrastructure via Zoho" (see §C.3 M-series). Add comment on D6: `"Absorbed as subtask of M1. D6 = API integration specifically; M1 = full infrastructure (template + API + 2-way wiring)."`.

**D7 — "Playlist owner conflict: Master Doc says Stan, Tasks+Needs says Shuba — resolve"** (medium, 2026-05-01). POST as-is. Related to B13 "Wedding Playlist" — add comment on B13: `"See D7 for owner conflict; B13 action is blocked on D7 resolution."`.

**D8 — "Decide: generator needed at Shelter A?"** (medium, 2026-05-15). POST as-is. Already linked to sq-18 generator question in pre-existing modification set.

**D9 — "Decide: additional food warmers beyond Carol's 6?"** (medium, 2026-05-15). POST as-is. Already linked to sq-19 food-warmers question.

**D10 — "Create + print guest programs AND coordinator schedules"** (4 subtasks). **MERGE:** per D3 absorption, D10 narrows to guest-programs only. Rename to `"Create + print guest programs"`. Drop subtask `s_prog_4` "Print coordinator per-person schedules" (now absorbed into D3).

**D11 — "Resolve planner ↔ schedule conflicts (audit 2026-04-19)"** (12 subtasks, deadline 2026-04-30). POST as-is. Note added: `"Conflict resolution is draft-liquid per 2026-04-23 supremacy rule. True resolution happens in Stage 4 task-audit stage. D11 captures the conflicts; resolution is Stage 4."`.

---

### C.3 — 2026-04-23 infodump adds (M-series for miscellaneous, batch `C.3`)

Every item from the 2026-04-23 infodump that does NOT merge into an existing D-task becomes a new M-series task. IDs assigned sequentially M1, M2, M3, … in the order encountered in the infodump text (not by priority — by original text order, for provenance traceability).

**M1 — "Wedding communications infrastructure via Zoho" (parent)** `priority=medium`, `deadline=2026-05-15`, `assignee=Stan`, `group="Website"`, `tags=["communication","zoho","infrastructure"]`. Subtasks: M1.1 draft Zoho email template (`s_m1_1`), M1.2 D6 absorption (API integration), M1.3 wire Zoho↔planner message board (2-way if possible). `desc="Per 2026-04-23 infodump. Parent task for Zoho-based communication infrastructure. Includes D6 API upgrade (absorbed as subtask M1.2), template draft, and 2-way wiring. Final wiring lands in Stage 4 per parking-lot."`.

**M2 — "Call bridesmaids (Zita, Cassie, others TBD) in sequence — intro planner + give tokens + discuss roles"** `priority=high`, `deadline=2026-04-30`, `assignee=Stan`, `group="Organizers"`, `tags=["coordination","phone","communication"]`, `blockedBy="Quick Edits + Edit Mode UX (mobile-safety gate, parking-lot Stage 2)"`. `desc="Per 2026-04-23 infodump. Call order: Bridesmaids first. Gated on mobile-safety UX to avoid accidental field edits."`.

**M3 — "Call Sarah Reese — intro planner + give token + discuss MODERATED flowers-only scope"** `priority=high`, `deadline=2026-04-30`, `assignee=Stan`, `group="Organizers"`, `tags=["coordination","phone","flowers","constraint-moderated"]`, `blockedBy="Quick Edits + Edit Mode UX"`. `desc="Scope explicitly moderated: flowers only, pre-assembled 1–2 days out. Don't expand. Per 2026-04-23 infodump + scope-moderation note on se-045. Constraint: tooltip work in parking-lot Stage 1/2."`.

**M4 — "Call Bonnie — intro planner + give token + discuss MODERATED potluck scope"** `priority=high`, `deadline=2026-04-30`, `assignee=Stan`, `group="Organizers"`, `tags=["coordination","phone","catering","constraint-moderated"]`, `blockedBy="Quick Edits + Edit Mode UX"`. `desc="Scope moderated. Elsie + Fen absorb overflow. Per 2026-04-23 infodump + scope-moderation notes on se-029/073/081/084."`.

**M5 — "Call Merry Shipman + Roger Shipman (Hannah's parents) — they are getting worried"** `priority=critical`, `deadline=2026-04-27`, `assignee=Stan`, `group="Organizers"`, `tags=["family","phone","communication"]`. `desc="Hannah's parents explicitly flagged as worried. Prioritize ahead of Bridesmaids in call chain if possible."`.

**M6 — "Rally the groomsmen. Now."** `priority=critical`, `deadline=2026-04-27`, `assignee=Stan`, `group="Organizers"`, `tags=["family","phone","communication"]`. `desc="Per 2026-04-23 infodump, direct quote."`.

**M7 — "Update received RSVPs in People tab with full RSVP content; restrict guest contact details to master-token users"** `priority=high`, `deadline=2026-05-10`, `assignee=Stan`, `group="Guests"`, `tags=["rsvp","security","privacy"]`. `desc="Master-token-gated. Enforcement gated on parking-lot Stage 2 token-gated visibility."`.

**M8 — "Amazon-capable gift list for Christa + rewire registry gift-card links to Amazon"** `priority=medium`, `deadline=2026-05-15`, `assignee=Christa`, `group="Organizers"`, `tags=["registry","amazon","procurement"]`. `desc="Per 2026-04-23 infodump. Christa builds Amazon list; rewire existing gift-card links to route to Amazon."`.

**M9 — "Reply to Wes Walls"** `priority=medium`, `deadline=2026-05-01`, `assignee=Stan`, `group="Organizers"`, `tags=["officiant","communication","counseling"]`, `blockedBy="M10 — Plan independent counseling"`. `desc="Per 2026-04-23 infodump. Blocked on M10."`.

**M10 — "Plan independent wedding-counseling + Bible discussion with Hannah (post-Wes); present plan to Hannah"** `priority=medium`, `deadline=2026-04-30`, `assignee="Stan, Hannah"`, `group="Organizers"`, `tags=["counseling","covenant"]`. `desc="Unblocks M9. Per 2026-04-23 infodump."`.

**M11 — "Find new officiant (Wes Walls dropped out)"** `priority=critical`, `deadline=2026-05-10`, `assignee=Stan`, `group="Organizers"`, `tags=["officiant","critical","ceremony"]`. `desc="Per 2026-04-23 infodump. Ceremony requires officiant. Critical path."`.

**M12 — "UPDATE existing task B9 'Premarital Counseling + Wes Books + Officiant' — add context comment"** This is an update action, not a new task. Add comment: `"Wes dropped out as officiant per 2026-04-23. Stan+Hannah continuing counseling+Bible discussion independently via M10. Find new officiant via M11."`.

**M13 — "UPDATE existing task B21 'Grace — 2nd Photographer (coordinator role declined)' — correct title + status context"** Update title from current to `"Grace deVries — 2nd Photographer BOOKED (contract signed + $625 retainer sent 2026-04-23)"`. Keep status=done. Add comment: `"Status corrected: Grace is fully booked as 2nd photographer. Previous title said 'coordinator role declined' which referred to a different role (coordinator vs photographer). Contracted 2026-04-23 per retainer payment confirmation."`.

**M14 — "UPDATE existing no-id task 'Coordinate Grace & Thomas (Photographers)' — add context comment"** Keep status=in-progress. Add comment: `"Grace contracted + $625 retainer paid 2026-04-23. Grace has reached out to Daniel Thomas directly per her 2026-04-23 Zoom. Next: 3-way Zoom (M17 below). Will assign a taskId during C.2 execution (next available D-series number or M-series if more appropriate)."`. Note: during C.2 POST, this task will be assigned a new taskId per the "every task gets an id" rule. Tentative id: D13. (If D-series feels inappropriate for a no-id live-UI-authored task, assign M15 and renumber subsequent M-tasks.)

**M15 — "Decide: extend Grace deVries to 8 hours (12:30–8:30) for $200 additional — covers golden hour + RAW delivery"** `priority=high`, `deadline=2026-04-27`, `assignee="Hannah, Stan"`, `group="Organizers"`, `tags=["photography","grace","coordination","decision"]`. `desc="Grace offered bulk rate during 2026-04-23 Zoom: 1 extra hour = $200 normal, 2 extra hours = $100/hr ($200 total). Includes RAW photo delivery. Stan needs Hannah confirmation. This task IS the planner-side home for the B-DEC-1 decision (Scrybal directed that the extension discussion happen as a planner task rather than a mid-Phase-C decision)."`.

**M16 — "Draft family photo request list + sequence; send to Grace AND Daniel Thomas"** `priority=high`, `deadline=2026-05-15`, `assignee=Stan`, `group="Organizers"`, `tags=["photography","family"]`. `desc="Grace requested on 2026-04-23 call. Sequence per Grace's rule: both families together, each family with both Stan+Hannah (NO family-with-only-one variants), Hannah with her parents/siblings, Stan with his parents/siblings. Stan's father will push for many combinations — pre-filter before sending."`.

**M17 — "Schedule Grace deVries + Daniel Thomas 3-way Zoom to formalize coverage split"** `priority=high`, `deadline=2026-05-15`, `assignee=Stan`, `group="Organizers"`, `tags=["photography","coordination","meeting"]`. `desc="Per Grace's 2026-04-23 call. Grace wants 1:1 with Daniel Thomas first; then all three meet. Outcomes: who covers 12:30–2:00 (Daniel only), 2:00–4:30 (both), 4:30+ (Grace only if extension approved). Include RAW delivery expectations."`.

**M18 — "Pre-stage Grace's detail items (rings, shoes, flowers, invitation, Bible) in one spot/box before 1:30 PM day-of"** `priority=medium`, `deadline=2026-06-07`, `assignee="Hannah, Cassie"`, `group="Wedding Day"`, `tags=["photography","day-of","prep"]`. `desc="Grace requested on 2026-04-23 call. Makes detail photography efficient. Hand to Cassie day-of as part of bridal-party-prep package."`.

**M19 — "Send Grace deVries the art-reference pics Stan promised her in the first call"** `priority=medium`, `deadline=2026-04-27`, `assignee=Stan`, `group="Organizers"`, `tags=["photography","grace","outstanding"]`. `desc="Stan committed in the earlier (1st) Grace Zoom call. Outstanding per 2026-04-23 infodump. Reference to that earlier call: only a video recording exists (no transcript was generated at the time; see retired M20)."`.

**~~M20 — "Find earlier Grace deVries Zoom call transcript"~~ RETIRED 2026-04-23.** Scrybal clarified that the earlier Grace Zoom call had a video recording but transcription was not available at the time. No transcript to find. Not creating this as a planner task. Entry preserved for audit history; DO NOT POST to live.

**M21 — "Create group chat with Grace deVries + Daniel Thomas; formally introduce; ask if they've already spoken"** `priority=high`, `deadline=2026-04-27`, `assignee=Stan`, `group="Organizers"`, `tags=["photography","coordination","communication"]`. `desc="Per 2026-04-23 infodump. Note: Grace already reached out to Daniel Thomas per her 2026-04-23 Zoom, so intro may already be partly done. Mention they can either chat in the group directly or update Stan+Hannah after calling each other."`.

**M22 — "UPDATE existing task B32 'Marriage License' — mark Hannah-applied subtask done"** Find or create subtask "Hannah applies for marriage licence" and mark status=done. Add comment: `"Hannah has applied for the marriage licence per 2026-04-23 infodump."`.

**M23 — "Formalize + confirm full schedule before 2026-05-07; ensure everyone knows everything being done"** `priority=critical`, `deadline=2026-05-07`, `assignee="Hannah, Stan"`, `group="Wedding Week"`, `tags=["schedule","coordination","critical","gate"]`. `desc="Per 2026-04-23 infodump. Hard deadline. This M23 planner task IS the schedule-solidification work; it is NOT a stage in this update's stage sequence — it is a wedding-prep task that runs in parallel with the stages and gates coordinator-token distribution to bridesmaids+Sarah+Bonnie+Merry+Roger. When other tasks mention 'schedule is draft-liquid until 2026-05-07', they mean until M23 completes."`.

**M24 — "Find a nice spot for document signing at Willamette Mission State Park; schedule signing right before cake cutting"** `priority=medium`, `deadline=2026-05-20`, `assignee="Hannah, Stan"`, `group="Venue"`, `tags=["venue","ceremony","day-of"]`. `desc="Per 2026-04-23 infodump. Grace's 2026-04-23 call confirmed signing-then-cake-cutting flow: ceremony ends → sign marriage certificate → cake cutting immediately → family photos during dinner service."`.

**M25 — "Research why cake cutting is traditionally late in Christian weddings; inform decision to do it early"** `priority=low`, `deadline=2026-05-15`, `assignee=Stan`, `group="Venue"`, `tags=["ceremony","research"]`. `desc="Per 2026-04-23 infodump. Stan wants cake cutting immediately post-ceremony (pre-dinner). Grace confirmed she's never done it that way before. Research whether there's a reason to not deviate from tradition."`.

**M26 — "Prep + send Hannah's package"** `priority=high`, `deadline=2026-04-30`, `assignee=Stan`, `group="HanStan Logistics"`, `tags=["logistics","hanstan","master-only"]`. `desc="Per 2026-04-23 infodump. Master-token-only visibility (HanStan Logistics is sensitive)."`.

**M27 — "Figure out what's going on with First Tech"** `priority=medium`, `deadline=2026-05-01`, `assignee=Stan`, `group="HanStan Logistics"`, `tags=["logistics","finance","hanstan","master-only"]`. `desc="Per 2026-04-23 infodump, direct quote."`.

**M28 — "Evaluate whether HanStan Logistics should spin off as its own planning project; share prior claudeAI discussion with claudeCode"** `priority=low`, `deadline=(none)`, `assignee=Stan`, `group="HanStan Logistics"`, `tags=["planning","meta","hanstan","master-only"]`. `desc="Per 2026-04-23 infodump. Possible approach: hijack the wedding planner engine for HanStan Logistics. Discuss with claudeCode."`.

**M29 — "Stan's tux: get Stan's measurements, send to Mom + Dad so they can get the suit made"** `priority=high`, `deadline=2026-05-05`, `assignee=Stan`, `group="Procurement"`, `tags=["attire","groom","tailoring"]`. Subtasks: (1) `s_tux_1` Get Stan measured, (2) `s_tux_2` Email measurements to parents, (3) `s_tux_3` Hannah updates Dad about Indian-finery-for-ceremony decision. `desc="Per 2026-04-23 infodump."`.

**M30 — "Populate People tab with everyone attending the wedding Stan doesn't already know; include basic info + OkCupid-style high-impact intro per person"** `priority=high`, `deadline=2026-05-15`, `assignee=Stan`, `group="Guest List"`, `tags=["people","coordination","communication","social"]`. `desc="Per 2026-04-23 infodump, direct quote: 'I don't want to be strangers with literally anyone who's coming to my wedding.' Fields per person: name, relation (Hannah's side / Stan's side / mutual), contact, short intro (OkCupid-style: tight, high-impact, personality-forward). Visual fun later; basic info + intros first. Master-token-only for contact details per M7."`.

**M31 — "Stan + Hannah: complete OkCupid questions together (same time, together)"** `priority=medium`, `deadline=2026-05-30`, `assignee="Stan, Hannah"`, `group="All"`, `tags=["couple","relationship","counseling"]`. `desc="Per 2026-04-23 infodump. Do it together in the same session, not independently. Relates to M10 (independent counseling continuation)."`.

**M32 — "Stan + Hannah: do the 36-question quiz (Aron's 36 Questions That Lead to Love) together"** `priority=medium`, `deadline=2026-05-30`, `assignee="Stan, Hannah"`, `group="All"`, `tags=["couple","relationship","counseling"]`. `desc="Per 2026-04-23 infodump. Do it together. Companion task to M31."`.

**M33 — "Hide HanStan Logistics group from non-master-token users"** `priority=high`, `deadline=2026-05-10`, `assignee=Stan`, `group="Website"`, `tags=["security","authorization","planner","master-only"]`. `desc="Per 2026-04-23 infodump. This is the PLANNER TASK that tracks the Stage 2 code work for HanStan Logistics visibility gating (PL-24). Stage 0 only creates this tracking task + tags the HanStan Logistics tasks with master-only (via M40). The actual visibility enforcement code lands in Stage 2."`.

**M34 — "Restrict Wes Walls / officiant info to master-token users only"** `priority=high`, `deadline=2026-05-10`, `assignee=Stan`, `group="Website"`, `tags=["security","authorization","officiant","master-only"]`. `desc="Per 2026-04-23 infodump. This is the PLANNER TASK that tracks the Stage 2 code work for officiant-info visibility gating (PL-25). Stage 0 only creates this tracking task + tags the officiant tasks with master-only (via M40). Consolidate enforcement with M7 (guest contact details) + M33 (HanStan Logistics) in Stage 2 token-gated visibility work."`.

**M35 — "Reach out to Elsie after the entire 2026-04-23 update has been applied to live"** `priority=high`, `deadline=(triggered by update-complete)`, `assignee=Stan`, `group="Organizers"`, `tags=["coordination","phone","milestone"]`. `desc="Per 2026-04-23 infodump. Post-update check-in. Also logged as a reminder in F:\\Wedding Website\\hanstan-wedding\\tasQ.md."`.

**M36 — "Check whether porta-potty procurement task exists"** — **RESOLVED during Phase A.** B42 "Port-a-Potty + Toilets" already exists on live with status=in-progress. **No action needed.** Captured here for provenance only; no POST.

---

### C.3b — Stage 0 additions moved in from parking lot (batch `C.3b`, authenticated POST)

These 4 items share Stage 0's defining characteristic (data or documentation operations, no code, low risk, reversible) — moved from parking lot per relative-fit assignment 2026-04-23.

**M39 — "Merge Guest List group → Guests group"** Action: single full-state POST that (a) reassigns the 3 tasks currently in `group="Guest List"` (B2 "Send Invitations", B8 "Stan Family Outreach", B17 "Parents' Travel Itinerary") to `group="Guests"`, and (b) removes `"Guest List"` from the top-level `groups` array (the `groups` field is a simple string array; `planner-state.mjs` accepts full-state POSTs that include a mutated `groups` array without special handling). No task is created; this is a group-merge operation. `priority=medium`. `desc="Per 2026-04-23 infodump: Guests + Guest List taskGroup tabs are needless duplication. Merge into single Guests tab. Pure data operation."`.

**M40 — "Apply `master-only` tag to all tasks whose content should be hidden from non-master-token users"** Action: add `"master-only"` to the `tags` array on: every task in `group="HanStan Logistics"` (currently B1, M26, M27, M28), every task referencing Wes Walls or officiant content (B9, M9, M10, M11), every task in `group="Stan's Rolodex"` (B4, B19, and the 10 no-id Indian-family rolodex cards). Single POST batches all these tag additions. Renders no visibility change today (no code filters on `master-only` yet), but data is ready for PL-24/25/26/27 code-gate work in Stage 2. `priority=high`, `desc="Per 2026-04-23 infodump security directives + Stan's Rolodex visibility directive. Data preparation; visibility enforcement code is parked (PL-24, PL-25, PL-26, PL-27)."`.

**M41 — "Apply cross-surface `tags` to tasks that semantically belong to multiple groups"** Action: add tags capturing cross-surface group membership. Specifically: Stan's Rolodex tasks (B4 Zubey + the 10 no-id Indian-family cards) get `tags=[..., "rolodex", "guests"]` so when PL-01 schema extension lands, these tasks are pre-classified. B19 "Brother's Guest List Input" stays primarily in Rolodex per Scrybal 2026-04-23 directive but adds `tags=[..., "organizers", "guest-list"]`. Any Stage 0 Phase C new M-task that spans multiple surfaces gets both group (primary) and tags (cross-surface) set at creation time. `priority=medium`, `desc="Per 2026-04-23 infodump directive on multi-parent taskGroup membership. Code-side feature stays parked (PL-01, PL-38, PL-46); data-side capture happens now so Stage 2+ has the information to render."`.

**M42 — "Constraint-metadata on contacts: Elsie, Fen, Bonnie, Sarah Reese"** Action: update 4 contact records on live to include a `constraints` field (new field — live shape accepts it by schema-extensibility since contacts are passed through as-is). Values: Elsie's constraint = `["Day-of pairing with Fen: when not actively working, should be near Fen."]`. Fen's constraint = `["Day-of pairing with Elsie: primary role is Elsie's helper/assistant/caretaker/boyfriend. When not actively working, should be near Elsie."]`. Bonnie's constraint = `["Scope moderated: keep tasks small, infrequent touchpoints. Elsie + Fen absorb overflow."]`. Sarah Reese's constraint = `["Scope moderated: flowers only, pre-assembled 1–2 days out. Don't expand role."]`. `priority=high`, `desc="Per 2026-04-23 pairing-principle + scope-moderation directives. Data populated now; tooltip rendering (PL-03) parked for Stage 1/2. When UI ships, data is already there — no placeholder phase needed."`.

### C.3c — Stage 1-enabling additions (batch `C.3c`, authenticated POST)

High-ROI Stage 0 items that front-load Stage 1 work. All pure data operations.

**M43 — Execute in Stage 0 via minimal `planner-state.mjs` extension (Scrybal decision 2026-04-23: option c).** Two parts:

**Part 1 — Code change (narrow Stage 0 non-goal exception).** Add to `netlify/functions/planner-state.mjs` POST handler: accept an optional `syntheticAuditEntries: [...]` field in the request body. When present, validate each entry has `ts + by + action + target + summary` (minimum), preserve `entity` + `field` + `from` + `to` if supplied, and append all entries to `audit-log.json` via the existing `appendAudit()` helper alongside the regular `diffStates()` output. If `syntheticAuditEntries` is absent, behavior is unchanged from today. Backwards-compatible. ~15 lines of code + 5 lines of validation. Zero impact on any other code path. Unit of work: one commit + one deploy to `Scryble/hanstan-wedding`.

**Part 2 — M43 data action.** After Part 1 deploys, one `planner-state` POST with two synthetic-audit payloads:
- **Backfill entity-field onto 45 existing entries:** iterate the current `audit-log.json` entries, add `entity: "task"` to each (all 45 are task-level), submit as a full re-write. This requires `planner-state.mjs` to additionally accept a `auditLogReplace: [...]` payload for the one-time rewrite, OR a simpler approach: skip the backfill of existing entries entirely and let Stage 1's renderer handle absent-entity-field as "task" by default. **Simpler path chosen:** Stage 1 renderer defaults `entity === undefined` to `entity === "task"`. M43 Part 2 reduces to only the 8 Elsie historical entries — no rewrite of existing entries needed.
- **Inject Elsie's 8 historical entries from `phase0_capture_2026-04-23.jsonl`:** POST with `syntheticAuditEntries: [<8 entries>]`. The entries land in `audit-log.json` with their original 2026-04-22 timestamps. Order preserved via `appendAudit()`'s existing newest-first semantics (will need minor tweak to insert-by-timestamp rather than prepend, OR accept that the 8 Elsie entries appear at the top of the log with 2026-04-22 timestamps and Stage 1's renderer sorts by ts anyway — the latter is fine since all Activity-log consumers sort by timestamp).

**Stage 0 non-goal revision (explicit):** Stage 0 formerly said "No code changes." Revised to: "No code changes **except the narrow `planner-state.mjs` synthetic-audit-entries accept** required by M43. This is a surgical additive change (new optional request field; no existing behavior modified; no schema change; no UI change) and qualifies for Stage 0 under the relative-fit criterion: high impact (unlocks Elsie historical attribution immediately), low cost (~20 lines of code), low risk (backwards-compatible). All other code changes remain out-of-scope for Stage 0."

**Execution order:** M43 Part 1 (code + deploy) must happen BEFORE M43 Part 2 (POST with synthetic entries). The existing C.3c ordering (M44 → M45 → M43 Part 2) works if M43 Part 1 is completed between C.3b and C.3c. **Updated C.3c order: M43-Part-1 (code commit + push + deploy verify) → M44 → M45 → M43-Part-2 (POST with 8 Elsie entries) → baseline metrics (§PU-9).**

**M44 — "Explicitly set `prefs.scheduleSeedVersion: 0` on live for the current user state"** Action: single POST to `planner-state` including `prefs.scheduleSeedVersion: 0` in the update. Removes `undefined` as an edge case for Stage 1's SEED_VERSION top-up code. `priority=low`, `desc="Stage 1-enabling. Live currently has prefs.scheduleSeedVersion=undefined. Setting explicitly to 0 removes an undefined-vs-zero branch from Stage 1 code."`.

**M45 — "Create `stage1smoke` test-coordinator token for Stage 1 smoke-testing"** Action: POST to `planner-coordinators` adding `{token: "stage1smoke", name: "Stage 1 Smoke Test", isMaster: false, addedBy: "Hannah & Stan"}`. Stage 1 uses this token to verify Activity tab visibility rules (master-token-only gating). Revoked when Stage 1 completes. `priority=low`, `desc="Stage 1-enabling. Disposable test token for smoke-testing the Activity tab's master-token-only visibility rule without touching real coordinator tokens (shipsie, everfindingbeauty)."`.

**~~M46~~ — moved to Phase D §PU-9.** "Baseline metrics snapshot for Stage 1 exit criteria" is canonically a Phase D artifact (written last, after all Phase C live writes have settled). Tracked at Phase D §PU-9. M46 as a C.3c POST action is retired.

**~~M47~~ — moved to Phase D §PU-10.** "Pre-stage Stage 1 commit plan in the PROJECT_SPEC" is canonically a Phase D documentation artifact (local-file write to the spec, not a live POST). Tracked at Phase D §PU-10. M47 as a C.3c POST action is retired.

---

### C.4 — Elsie + Fen pairing principle captured as master-token-only note (batch `C.4`)

**Not a schedule-event POST.** Per B-DEC-3 + B-DEC-5 resolution (schedule is draft-liquid), actual schedule-event people-placements are deferred to the M23 schedule-solidification planner task (deadline 2026-05-07; NOT a stage in this update).

Phase C.4 only captures the pairing principle as a master-token-only planner note. Stored as a comment-with-metadata on a new M-series task:

**M37 — "Constraint: Elsie + Fen day-of pairing principle (master-token-only)"** `priority=high`, `deadline=(none)`, `assignee="Stan"`, `group="Wedding Day"`, `tags=["constraint","elsie","fen","day-of","master-only","pairing-principle"]`. `desc="Fen's day-of primary role is as Elsie's helper/assistant/caretaker/boyfriend. When Fen is not proactively working, he should be near Elsie. When Elsie is not proactively working, she should be near Fen. All schedule edits that move Elsie or Fen around must be reflected in each other's schedule where the pairing principle applies. Visibility: master-token-only. Enforcement: constraint-tooltip rendering lands in parking-lot Stage 1/2; the M23 schedule-solidification planner task verifies per-event coverage. Same pattern applies to Bonnie (moderated scope) and Sarah Reese (moderated flowers-only scope) — see M3, M4."`.

Also captured in the §C.X JSONL with `entity: "note"`, `action: "create"`, `summary: "Pairing principle captured"`.

---

### C.5 — Elsie 2026-04-22 activity backfill (batch `C.5`, JSONL-only, no live POST)

Writes 8 entries to `phase0_capture_2026-04-23.jsonl` with Elsie's original 2026-04-22 timestamps and full mutation details. No live POST — these are historical records for the Stage 1 unified-engine migration to ingest.

Entries (these are the illustrative form; actual JSONL file uses valid JSON syntax with `"key":"value"` throughout):

1. `{"ts":"2026-04-22T03:50:49Z", "by":"Elsie", "entity":"scheduleEvent", "action":"note.add", "target":"se-002", "summary":"Added note about storage locations + crew coordination"}`
2. `{"ts":"2026-04-22T03:55:28Z", "by":"Elsie", "entity":"schedulePhase", "action":"update", "target":"sp-02", "field":"collapsed", "from":true, "to":false, "summary":"Un-collapsed phase 'Bridal Party Final Prep'"}`
3. `{"ts":"2026-04-22T03:56:28Z", "by":"Elsie", "entity":"scheduleEvent", "action":"person.update", "target":"se-021", "summary":"Swapped Fen↔Lucas roles (both now helpers). NOTE: Elsie self-assignment captured only as note, not in people array — requires follow-up under M23 schedule-solidification planner task."}`
4. `{"ts":"2026-04-22T03:57:36Z", "by":"Elsie", "entity":"scheduleEvent", "action":"note.add", "target":"se-032", "summary":"Added note: scrap full first-aid station; bring FAK for Trudy"}`
5. `{"ts":"2026-04-22T04:00:07Z", "by":"Elsie", "entity":"scheduleEvent", "action":"person.remove", "target":"se-117", "summary":"Removed Fen from Chairs+tables collected; Lucas now sole person. Intent unverified — deferred to M23 schedule-solidification planner task per draft-liquid rule."}`
6. `{"ts":"2026-04-22T04:01:21Z", "by":"Elsie", "entity":"scheduleEvent", "action":"person.remove", "target":"se-121", "summary":"Removed Fen from Changing tent packed; event now has zero people. Intent unverified — deferred to M23 schedule-solidification planner task."}`
7. `{"ts":"2026-04-22T03:50:49Z", "by":"Elsie", "entity":"scheduleQuestion", "action":"resolve", "target":"sq-2", "summary":"Resolved: Variety; about 15-20 minutes from Rodeway for bridesmaids/Elsie"}`
8. `{"ts":"2026-04-22T04:08:06Z", "by":"Elsie", "entity":"scheduleQuestion", "action":"resolve", "target":"sq-10", "summary":"Resolved: Elsie can't be OLCC certified, need someone else to be certified and serving"}`

---

### C.6 — Post-POST verification (after every live-POST batch)

After each live-POST batch (C.1, C.1b, C.2, C.3, C.3b, C.3c, C.4) — re-pull live state, confirm expected delta applied, record in §C.X JSONL. C.5 is JSONL-only and has no live state to verify; C.7 is a local file write and has no live state to verify. If mismatch detected on any live-POST batch, attempt rollback via `planner-snapshots` restore endpoint. No live re-pulls beyond batch boundaries — Scrybal is the only operator tonight.

### C.7 — Reminder added to `F:\Wedding Website\hanstan-wedding\tasQ.md` (wedding folder tasQ — not the planner task tasQ)

Appends a reminder to the wedding folder tasQ file (if it exists; creates it if not): `"Reach out to Elsie once the entire 2026-04-23 planner update has been applied to live."` Also captured as task M35 above for planner visibility.

---

## - [ ] Stage 0 Phase D — Frozen pre-update spec + fidelity snapshot + governance documentation + Stage 1 enablement

**Phase goal:** Create `HANSTAN_WEDDING_SITE_SPEC_preUpdate_2026-04-23.md` as the immutable pre-update reference. Expanded 2026-04-23 per relative-fit assignment: Phase D now ALSO formalizes the Rolodex Rule, Pairing Principle, Supremacy Rule, Recency-wins Rule, M-series taskId convention, and Structured Capture Protocol in the frozen spec; AND writes the baseline-metrics snapshot + Stage 1 commit plan + expanded entity-schema map as Stage 1-enabling artifacts.

**Phase steps:** copy spec, append §PU-1 through §PU-11 (fidelity snapshot + governance docs + Stage 1 enablement artifacts), write baseline-metrics + Stage 1 commit plan to local clone, run integrity-check pass, commit to local clone, do not push.

**§PU-1 through §PU-4** (unchanged from prior draft): canonical live state JSON, both themes, implicit plannerSpec reconstruction, known gaps.

**§PU-5** — Retroactive audit migration record (Elsie's 8 2026-04-22 entries from `phase0_capture_2026-04-23.jsonl`).

**§PU-6 — Governance rules formalized** (moved from parking lot per relative-fit assignment):
- **Rolodex Rule:** Stan's Rolodex contains only friends, family, and guests who are NOT coordinators/PICs/service providers. Coordinators/PICs belong in Organizers, Wedding Day, or role-specific groups. A task MAY belong to multiple groups (multi-parent support parked PL-01/PL-46); Phase 0 workaround uses `tags` for cross-surface capture.
- **Pairing Principle:** Documented constraint-metadata model. Fen's day-of primary role is as Elsie's helper/assistant/caretaker/boyfriend. When either is not actively working, they stay near each other. Generalizes: any contact can have a `constraints: string[]` field capturing day-of or scope-of-work constraints. Bonnie and Sarah Reese are other instances. Tooltip rendering is PL-03 parked.
- **Supremacy Rule:** Planner > schedule at default (planner is gel; schedule is draft-liquid until M23 schedule-solidification planner task completes). Constraints > preferences — a coordinator/PIC/guest preference never overrides a constraint from another source. Applies most heavily in the Stage 4 task-audit work (PL-33) when planner↔schedule conflicts get resolved.
- **Recency-wins Rule:** Most recent information supersedes older. Old value preserved in a comment so work-trail stays visible.
- **M-series taskId convention:** taskIds use letter-prefix + integer. A/B/C from initial 2026-04-15 seed; D from 2026-04-19 additions; M from 2026-04-23 additions onward (M = miscellaneous). Future batches continue the pattern with new letters. Every task gets an id. No task is truly deleted — deprecated tasks archive with id intact in their final state.

**§PU-7 — Structured Capture Protocol formalized as permanent reusable subsystem.** Promoted from Phase C's transient §C.X drafting. Canonical JSONL format: `{ts, by, entity, action, target, field?, from?, to?, summary, source?, batch?}`. Entity types enumerated: `task | contact | group | tag | scheduleEvent | schedulePhase | scheduleQuestion | materialCheck | coordinator | note`. Actions enumerated: `create | update | delete | archive | subtask.toggle | subtask.add | subtask.del | comment.add | note.add | person.add | person.remove | person.update | resolve | rename`. Filename pattern: `<scope>_capture_<YYYY-MM-DD>.jsonl` in `_preUpdate_snapshots/`. Usage: any migration that runs before a new engine feature ships captures its mutations in this format; when the engine feature lands, a migration script ingests the JSONL into the audit store in timestamp order. Stage 1 ships the first such script (per Stage 1 scope item #2).

**§PU-8 — Expanded entity-schema map** (Stage 1 enablement). Enumerates every entity type in current live state with its full field shape, derived from code inspection and live-state JSON analysis. Stage 1's unified `diffStates()` uses this as its direct spec — no schema-archaeology phase needed.

**§PU-9 — Baseline metrics snapshot** (Stage 1 exit-criteria enablement). File `_preUpdate_snapshots/baseline_metrics_postStage0.json` with integer counts of every entity type post-Phase-C. Stage 1 exit criteria reference these as "baseline + N" assertions.

**§PU-10 — Stage 1 commit plan** (Stage 1 execution enablement). Per-file, per-hunk KEEP-DROP-MODIFY staging plan for the 1,162-line local-clone modification set, with proposed commit messages and push order. Stage 1's git workflow becomes scripted.

**§PU-11 — Audit-log + snapshots-manifest integrity check** (Stage 1 ingest enablement). One-time pass verifying every existing audit entry has non-empty ts+by+action, every snapshot-manifest entry points to a real blob. Any orphans logged. Stage 1's migration script doesn't need defensive handling of malformed historical entries.

---

## - [ ] Stage 0 consolidated acceptance criteria

- **S0-AC-1:** Every easy-win task-add/update from the 2026-04-23 infodump is on live with full attribution.
- **S0-AC-2:** Rolodex violations (Zubey duplicate) fixed. Lucas (Cassie's BF) added as new rolodex card.
- **S0-AC-3:** Elsie + Fen pairing principle applied to se-001, se-013, se-021, se-023, se-082. Master-token-only planner note captures the principle.
- **S0-AC-4:** Retroactive audit-log entries for Elsie's 2026-04-22 session are back-filled (8 entries).
- **S0-AC-5:** `HANSTAN_WEDDING_SITE_SPEC_preUpdate_2026-04-23.md` exists, frozen, with §PU-1 through §PU-11 (fidelity snapshot §PU-1 through §PU-5, governance rules §PU-6, Structured Capture Protocol §PU-7, entity-schema map §PU-8, baseline metrics §PU-9, Stage 1 commit plan §PU-10, integrity-check record §PU-11).
- **S0-AC-6:** Zero code-file modifications. Zero git pushes. One local commit (frozen spec).
- **S0-AC-7:** `F:\Wedding Website\hanstan-wedding\tasQ.md` updated with post-update-reach-out-to-Elsie reminder.
- **S0-AC-8:** Phase A report documents Elsie + Fen pairing, rolodex violations, Grace-Daniel schedule diff, and the planner.css/planner.js hunk catalogue (remaining sub-step from §A.2).

---

## - [ ] Stage 0 explicit non-goals

- Not in Stage 0: **Code changes.** No edits to planner.js, planner.css, index.html, hanstan-schedule-defaults.js, planner-state.mjs, planner-auth.mjs, or any other code file.
- Not in Stage 0: **Committing the 1,162-line local-clone modification set.** That is Stage 1 territory.
- Not in Stage 0: **Extending `diffStates()`.** That is Stage 1's first commit — it enables the ONE UNIFIED ENGINE constraint (see Stage 1 preamble below).
- Not in Stage 0: **Issuing tokens for bridesmaids, Sarah Reese, Bonnie, Merry, Roger, groomsmen.** Those wait for Quick Edits + Edit Mode UX (Stage 2+).
- Not in Stage 0: **Any real-life human action by anyone.** All such items land as planner tasks.
- Not in Stage 0: **Any visual change to the planner UI.** Activity tab rename, FAB menu additions, nav reorder — all Stage 1+ code work.
- Not in Stage 0: **Live re-pulls beyond the one already done at start of this session.** Scrybal is the only operator tonight.

---

## - [ ] Stage 0 open questions (RESOLVED 2026-04-23)

- **B-DEC-1:** Grace deVries 2-hour extension + $200 → Scrybal to discuss with Hannah. Added as a planner task (Phase C.2); NOT on rolodex.
- **B-DEC-2:** Zubey duplicate-removal → YES, delete no-id, keep B4.
- **B-DEC-3:** Elsie's 2026-04-22 removals on se-117 (Fen) and se-121 (Fen) → NOT ACTIONABLE in Phase 0. Schedule is draft-liquid; people-placement on schedule events will be resolved by the M23 schedule-solidification planner task (deadline 2026-05-07; NOT a stage in this update). Phase 0 leaves these states as-is.
- **B-DEC-4:** D4 deadline reset → "ASAP" (replace overdue 2026-04-20 with null/empty; comment preserves original).
- **B-DEC-5:** Elsie + Fen pairing principle Phase C.4 edits → DEFERRED per B-DEC-3 rationale (schedule is draft-liquid). Pairing principle captured as master-token-only planner note now; schedule-event mutations happen under M23 schedule-solidification planner task. Constraint-tooltip implementation (Elsie+Fen, Bonnie, Sarah Reese constraint metadata rendered on hover/tap) lands in Stage 1 or Stage 2 per parking-lot assignment.
- **B-DEC-6:** Retroactive audit migration → GENERALIZED. Every Phase 0 action self-logs in structured-data-capture format (specified in §C.X Structured Capture Protocol below). When Stage 1's unified engine ships, all captured records inject into the audit store as one batch. Elsie's 2026-04-22 backfill is just the first entry. See §C.X for the capture format.
- **B-DEC-7:** Stan's brother → stays in Stan's Rolodex. Multi-parent task-group membership IS a required feature (confirmed by Scrybal). Currently the `group` field is a single string on live (verified 2026-04-23). Phase 0 workaround: task has `group: "Organizers"` (primary) + `tags: ["rolodex", "stans-rolodex"]` to capture cross-surface intent. True multi-parent support lands in Stage 1 or Stage 2 (parking-lot item) — schema extends `group: string` → `groups: string[]` or adds `secondaryGroups: string[]`, and every planner.js filter/count/render site updates.

---

## - [ ] Stage 0 open questions (still awaiting Scrybal)

- (none — all resolved as of 2026-04-23)

---

# ═══════════════════════════════════════════════
# APPENDIX — PARKING LOT (items surfaced during Stage 0, assigned to future stages)
# ═══════════════════════════════════════════════

Items discovered during Stage 0 recon + discussion + Scrybal's 2026-04-23 infodump that belong to later stages. Each item has a parking-lot ID (PL-NN), target stage hint, and brief reason. Items use PL-IDs so they can be ticked off (strikethrough) as they migrate into real stage work.

**Identifier convention:**
- `PL-NN` = parking-lot item, not yet assigned to a specific stage's plan.
- Struck-through `~~PL-NN~~` = item has been absorbed into a stage and is now tracked there instead.
- Stage 0 items use their own identifiers (M-NN for new 2026-04-23 tasks, D-NN for pre-existing, B-NN/A-NN/C-NN for live tasks already authored; PhA.N / PhB.N / PhC.N / PhD.N / S0-AC-N / S0-Q-N / B-DEC-N for Phase sub-steps and decisions).

### Appendix §APL-1 — Code / UX / infrastructure items parked for Stages 1+

| ID | Item | Target stage (hint) | Why parked, not in Stage 0 |
|----|------|---------------------|----------------------------|
| PL-01 | Schema extension: `group: string` → `groups: string[]` or `secondaryGroups: string[]` (multi-parent task-group membership) | Stage 1 or Stage 2 | Schema change + planner.js filter/count/render refactor. Stage 1 (engine unification) may absorb; otherwise Stage 2. |
| PL-02 | Multi-parent task-group UI affordance (showing a task under multiple group filters) | Same stage as PL-01 | Depends on PL-01 landing first. |
| PL-03 | Constraint-tooltip rendering (Elsie+Fen pairing, Bonnie moderated scope, Sarah Reese moderated scope) on hover/tap of person chips in edit-task modal + schedule-event edit UI | Stage 1 or Stage 2 | UI work. Constraint metadata needs a home on the contact record (new `contacts[].constraints: string[]` field OR a separate `coordinatorConstraints` map). |
| ~~PL-04~~ | ~~Schedule-Solidification stage~~ **NOT A STAGE — tracked as planner task M23 on live.** PL-04 entry is RETIRED; the work it described is the M23 wedding-prep task, not an update-stage. M23 deadline 2026-05-07; gated on coordinator-token distribution (Stage 2 mobile-safety UX). | — | Retired 2026-04-24 per Scrybal clarification: "schedule solidification is definitely not stage three, it was a task that was meant to be added to website as a task card." |
| PL-05 | Quick Edits + Edit Mode UX (mobile-safe field editing with per-card confirm/discard + sticky batch confirm/discard per Scrybal's 2026-04-23 infodump Section B) | Stage 2 | Mobile safety gate. Blocks mass coordinator-token distribution (M2, M3, M4, M5, M6). |
| PL-06 | Quick Edits detail: double-tap OR long-press directly on field activates editability (not single-tap — single-tap too risky on mobile) | Stage 2 (part of PL-05) | Per 2026-04-23 infodump Section B. |
| PL-07 | Quick Edits detail: cute visual feedback on the field when activated | Stage 2 (part of PL-05) | Per 2026-04-23 infodump. |
| PL-08 | Quick Edits detail: confirm/discard + optional-note prompt scoped to whole event card (NOT per-field, per Scrybal's 2026-04-23 reconsideration) | Stage 2 (part of PL-05) | Per-field too annoying, per 2026-04-23 infodump reversal. |
| PL-09 | Edit Mode detail: sticky Confirm button top-right, sticky Discard button top-left; batches all edits across whole planner session | Stage 2 (part of PL-05) | Per 2026-04-23 infodump. |
| ~~PL-10~~ | ~~FAB menu additions: 3 more buttons (Note, Person, Event)~~ **ABSORBED INTO STAGE 1 PHASE C** (landed 2026-04-24 commit 579717a). 5-button FAB live. | ~~Stage 2~~ Stage 1 | Per Scrybal 2026-04-24 directive. |
| ~~PL-11~~ | ~~FAB menu additions: propose additional types worth adding~~ **ABSORBED INTO STAGE 1 PHASE C.** Final 5-button set: Quick-Add, Full-Add, Note, Person, Event. | ~~Stage 2~~ Stage 1 | Scope decision made 2026-04-24. |
| ~~PL-12~~ | ~~Full Add Task modal~~ **ABSORBED INTO STAGE 1 PHASE C.** Existing `fullAdd()` helper already opens the Edit Task modal on a newly-created task — no separate modal DOM needed. | ~~Stage 2~~ Stage 1 | Scope discipline — reuse existing modal. |
| PL-13 | ASQ speech-bubble on every card/element in the planner (desktop click, mobile single-tap). Opens simple input + send button. Submitted queries go into AsQ tab/channel in main message-board/forum. | Stage 3 or later | Depends on PL-14 (Communications tab) + PL-15 (Focus tab message board) being built first. |
| PL-14 | Communications taskGroup tab (tracks who-needs-to-talk-to-whom-next + comm infrastructure/message-groups/channels; tasks in this tab are mostly subtasks of comm threads) | Stage 3 | Parent feature for several other items. |
| PL-15 | Focus tab repurposed as wedding message board. Orientation section for onboarding organizers + running feed of what's happening/upcoming/blocked/needed + cute progress minis on top + messaging channel with forum-member list (organizer categories, names, short intros, optional website/email/comm links). | Stage 3 | Depends on PL-14 + unified engine for message persistence. |
| PL-16 | Focus tab layout detail: 3 vertical column panels; left panel = briefing to every planner user on what changed recently + orientation | Stage 3 (part of PL-15) | Per 2026-04-23 infodump. |
| PL-17 | Zoho Mail ↔ planner message-board wiring (two-way): sending individual-coordinator updates/emails + receiving emails (forwarded from Zoho or direct) into the planner message board | Stage 4 or later | Integration work. Depends on PL-14 shell existing first. Parent task M1 on live planner tracks this. |
| PL-18 | Automated routine: if someone wants to send an organizer an email, they send via comm channel and the site grabs it OR Zoho forwards it to the planner message board | Stage 4 or later, **leaning AGAINST** | Scrybal explicitly flagged "leaning against" in 2026-04-23 infodump. Keep as open question, don't build yet. |
| PL-19 | Claude auto-briefings pipeline — Claude pulls planner changes from website/GitHub, compares to local, diffs, briefs Scrybal so he knows what everyone's doing/saying/needing | Stage 5 or later | External integration; useful but not urgent for wedding-day operation. |
| PL-20 | Claude auto-briefings bonus automation: Claude extracts communications from Gmail, wedding discussion groups on messaging apps, new Zoom call transcripts | Stage 5 or later (part of PL-19) | Per 2026-04-23 infodump. |
| PL-21 | /admin route absorbed into planner main nav as an additional tab (Scrybal no longer visits /admin standalone since planner matured) | Stage 2 or Stage 3 | UX consolidation; /admin still works standalone. Per 2026-04-23 infodump: "Discuss with Claude whether /admin should be absorbed." |
| PL-22 | Coordinator-role scoped edit privileges: Elsie=universal edit, Grace deVries + Daniel Thomas = photographer-scoped edits (events they are on OR photography-tagged) | Stage 2 | Depends on PL-03 constraint-metadata schema. Per 2026-04-23 infodump. |
| PL-23 | "Add Coordinator" button in planner (currently no such button exists) | Stage 2 (part of PL-22) | Per 2026-04-23 infodump: "where is the add coordinator button". |
| PL-24 | Token-gated visibility CODE: hide HanStan Logistics group from non-master-token users (render-path + state-fetch filtering) | Stage 2 (security) | Code work stays parked. Data-tagging portion MOVED TO STAGE 0 as M40 (tag HanStan Logistics tasks with `master-only`). |
| PL-25 | Token-gated visibility CODE: restrict Wes Walls / officiant info to master-token users only | Stage 2 (security) | Code stays parked. Data-tagging MOVED TO STAGE 0 as M40. |
| PL-26 | Token-gated visibility CODE: restrict guest contact details (RSVPs + People tab) to master-token users only | Stage 2 (security) | Code stays parked. Data-tagging MOVED TO STAGE 0 as M40. |
| PL-27 | Stan's Rolodex taskGroup tab + task-card visibility CODE: only master-token users see | Stage 2 (security) | Code stays parked. Data-tagging MOVED TO STAGE 0 as M40. |
| ~~PL-28~~ | ~~Activity tab UI~~ **LANDED STAGE 1 PHASE C** (commit 579717a). Master-only gate, 4 filters (person/date/action/scope), where/who/when/why format. | ~~Stage 1~~ Stage 1 done | 2026-04-24. |
| ~~PL-29~~ | ~~Activity tab rendering format~~ **LANDED STAGE 1 PHASE C.** where/who/when (italicized relative with zero-unit-suppression)/why format. | ~~Stage 1~~ Stage 1 done | 2026-04-24. |
| ~~PL-30~~ | ~~Activity tab example entry format~~ **LANDED STAGE 1 PHASE C** with richer multi-line format. | ~~Stage 1~~ Stage 1 done | 2026-04-24. |
| ~~PL-31~~ | ~~History → Activity rename + nav reorder~~ **LANDED STAGE 1 PHASE C.** Settings far-left, Activity far-right, hidden /admin slot reserved for Stage 2. | ~~Stage 1~~ Stage 1 done | 2026-04-24. |
| PL-32 | Optional-why-note UX: after an event-card-scoped edit is confirmed, a single text input appears requesting a quick note for the reason for the change (not required; optional) | Stage 2 (part of PL-05/PL-08) | Per 2026-04-23 infodump Quick Edits flow. |
| PL-33 | Full task-set audit (granular-subtask progress tracking, demote/merge/multi-parent assignment, formalize inline-prose subtasks). Includes D11's 12 sub-items as concrete fix-list. | Stage 4 or dedicated stage | Large analysis pass. Planner↔schedule conflict resolution happens here, not in Phase 0 (Phase 0 treats schedule as draft-liquid). |
| PL-34 | Total-wedding-prep progress computed at granular subtask level (not task level), so in-progress tasks contribute to completion estimation | Stage 4 (part of PL-33) | Per 2026-04-23 infodump task-audit item (1). |
| PL-35 | Demote tasks into existing parents where sensible; merge demoted items into new parents where useful | Stage 4 (part of PL-33) | Per 2026-04-23 infodump task-audit item (2). |
| PL-36 | Formalize subtasks that live as prose inside task descriptions/notes but aren't yet real subtasks | Stage 4 (part of PL-33) | Per 2026-04-23 infodump task-audit item (3). |
| PL-37 | Catch-up progress on tasks whose subtasks are secretly already completed + add tasks that made progress but were never entered | Stage 4 (part of PL-33) | Per 2026-04-23 infodump task-audit item (4). |
| PL-38 | Assign tasks to multiple parent groups where they obviously belong to more than one (CODE side — rendering + schema) | Stage 4 (part of PL-33), depends on PL-01 | Code stays parked. Data-tagging portion MOVED TO STAGE 0 as M41 (apply cross-surface tags to tasks whose primary group is one thing but semantically belong elsewhere). |
| ~~PL-39~~ | ~~Merge Guests + Guest List taskGroup tabs into single Guests tab~~ **MOVED TO STAGE 0 as M39** (reassign 3 tasks Guest List → Guests; remove Guest List from groups array) | ~~Stage 2 or Stage 4~~ Stage 0 Phase C.3 | Trivial data operation — 3 task reassignments + 1 group removal. No code work needed. Relative-fit assignment test: Stage 0 = data POSTs, this is a data POST → Stage 0 wins. |
| PL-40 | In All Tasks taskGroup tab: quick-add tasks land in a Quick Tasks section at bottom of All Tasks AND in a new Quick Task taskGroup tab (to be created) in the taskGroup ribbon | Stage 2 | Per 2026-04-23 infodump. |
| PL-41 | CSS-panel access UX: Hannah and Stan are the only users; don't require them to input the master token twice to reach the CSS panel | Stage 2 | Per 2026-04-23 infodump. |
| ~~PL-42~~ | ~~Stan + Hannah contacts with Zoom link~~ **LANDED STAGE 1 PHASE B** (2026-04-24). Zoom URL scoped via new `visibilitySet[]` field (stanshan+shipsie+everfindingbeauty); notes additively merged. | ~~Stage 2~~ Stage 1 done | 2026-04-24. |
| PL-43 | Amazon gift list for Christa + rewire registry gift-card links to Amazon (M8 is the tracking task; this is the infrastructure work) | Stage 3 or later | Registry-code work. Not urgent for wedding prep. |
| ~~PL-44~~ | ~~M-series taskId convention added to website-side task spec~~ **MOVED TO STAGE 0 Phase D §PU-6** (documented in frozen pre-update spec) | ~~Stage 1 (documentation)~~ Stage 0 Phase D | Pure documentation write. Stage 0 Phase D already writes to the spec file — adding M-series convention documentation is a one-line addition. Relative-fit: Stage 0 = doc writes in Phase D, this is a doc write → Stage 0 wins. |
| ~~PL-45~~ | ~~Retroactive audit injection for Stage 0 writes + Elsie session~~ **LANDED STAGE 1 PHASE B** (2026-04-24). 66 non-duplicate entries replayed from capture JSONL into audit-log.json. 8 Elsie entries already injected at Stage 0 batch C.3c Part 2. | ~~Stage 1~~ Stage 1 done | 2026-04-24. |
| ~~PL-46~~ | ~~Multi-parent taskGroup confirmation via code-inspection~~ **INVESTIGATED + LANDED AS M38** on live planner 2026-04-24 (Stage 1 Phase A.0). Conclusion: schema is hard single-string; `tasks[].tags[]` workaround is the Stage-0 cross-surface capture mechanism; PL-01 schema extension still needed in Stage 2. | ~~Stage 1 or Stage 2~~ Stage 1 investigation done; Stage 2 implements | 2026-04-24. |
| PL-47 | Stan's Rolodex task contents also belong to Guests group implicitly (duplicate membership, not literal duplication of records) | Same as PL-46 | Per 2026-04-23 infodump: "every task in Stan's rolodex groupTasks tab also belongs to the guests group". Depends on PL-46. |
| PL-48 | Constraint captured in Stage 0 as M37 (Elsie + Fen pairing); tooltip/rendering implementation blocked on PL-03. Same pattern applies for Bonnie moderated scope (M4) and Sarah Reese moderated scope (M3). | Stage 1 or Stage 2 | Captured; rendering parked. |

### Appendix §APL-2 — Governance / documentation items surfaced during Stage 0

| ID | Item | Target | Why parked |
|----|------|--------|-----------|
| ~~PL-49~~ | ~~Rolodex Rule formalized in spec~~ **MOVED TO STAGE 0 Phase D §PU-6** | ~~Stage 1 docs~~ Stage 0 Phase D | Documentation; relative-fit: Stage 0 Phase D writes to spec, this fits naturally. |
| ~~PL-50~~ | ~~Pairing Principle formalized in spec~~ **MOVED TO STAGE 0 Phase D §PU-6** (documentation only; constraint-metadata schema + tooltip UI stay parked as PL-03) | ~~Stage 1 or Stage 2~~ Stage 0 Phase D (doc only) | Schema/UI portion stays parked; documentation moves. |
| ~~PL-51~~ | ~~Supremacy Rule formalized~~ **MOVED TO STAGE 0 Phase D §PU-6** | ~~Stage 4 docs~~ Stage 0 Phase D | Documentation; fits Phase D. |
| ~~PL-52~~ | ~~Recency-wins Rule formalized~~ **MOVED TO STAGE 0 Phase D §PU-6** | ~~Stage 1 docs~~ Stage 0 Phase D | Documentation; fits Phase D. |
| ~~PL-53~~ | ~~§C.X Structured Capture Protocol formalized as permanent reusable subsystem~~ **MOVED TO STAGE 0 Phase D §PU-7** (promoted from transient Phase C protocol to formal subsystem spec) | ~~Stage 1~~ Stage 0 Phase D | Documentation; formalizing a protocol already drafted in Phase C is a Phase D write. |
| PL-54 | Rule candidates 1–7 from `discoveryLog_hanstanWedding.md` promoted to permanent rules in `C:\Users\ranji\.claude\CLAUDE.md` + project-level CLAUDE.md after Scrybal final phrasing | Cross-project (claudeBody) | Tier-2 discoveryLog entries; deferred in F:\TASQ.md. |
| ~~PL-55~~ | ~~"Find earlier Grace deVries Zoom transcript"~~ **RETIRED 2026-04-23.** Scrybal clarified there is only a video recording of the earlier call; transcription was not available at the time. No transcript exists to find. M20 planner-side task also struck. | ~~Phase 0 via M20~~ NONE | No work to do. Video recording exists if ever needed for reference. |
| PL-58 | Clone `C:\Users\ranji\.claude\CLAUDE.md` to `F:\` claudeBody root (Scrybal's Stage 0 step i) | Cross-project housekeeping (NOT Stage 0 of this spec) | Session-level file operation; belongs to the broader claudeBody governance work, not the planner update. Flagged here so it doesn't get lost from the 2026-04-23 infodump. Should be tracked in `F:\TASQ.md` or executed as a one-off. |

### Appendix §APL-3 — Items deliberately out-of-scope for this entire update spec

These are items mentioned in the 2026-04-23 infodump that Scrybal has explicitly scoped out of the planner update itself — they become their own projects or future discussions, not parking-lot items.

| ID | Item | Scope Decision |
|----|------|----------------|
| PL-56 | HanStan Logistics spin-off evaluation (separate project vs. hijacking the wedding planner engine) | Tracked via M28 on live planner; not a parking-lot item because the decision IS the task. |
| PL-57 | Scheduling + confirming full wedding schedule before 2026-05-07 | Tracked via M23 planner task on live. NOT a stage — it is a wedding-prep task card that runs in parallel with the update stages. |

### Appendix §APL-4 — Items that were addressed in Stage 0 already (provenance only)

These 2026-04-23 infodump items landed during Phase C and therefore are NOT in parking lot — listing here so the audit can cross-reference them.

| ID | 2026-04-23 infodump item | Where addressed in spec |
|----|--------------------------|------------------------|
| PL-A01 | "Call bridesmaids (Zita, Cassie, others TBD)" | M2 in Phase C.3 |
| PL-A02 | "Call Sarah Reese (moderated flowers-only scope)" | M3 in Phase C.3 |
| PL-A03 | "Call Bonnie (moderated potluck scope)" | M4 in Phase C.3 |
| PL-A04 | "Call Merry Shipman + Roger Shipman (they are getting worried)" | M5 in Phase C.3 |
| PL-A05 | "Stan: rally the groomsmen. Now." | M6 in Phase C.3 |
| PL-A06 | "Update received RSVPs in People tab with full RSVP content" | M7 in Phase C.3 |
| PL-A07 | "Amazon-capable gift list for Christa" (planner task) | M8 in Phase C.3; infrastructure work is PL-43 |
| PL-A08 | "Reply to Wes" | M9 in Phase C.3 |
| PL-A09 | "Plan independent wedding-counseling + Bible discussion with Hannah" | M10 in Phase C.3 |
| PL-A10 | "Find new officiant (Wes dropped out)" | M11 in Phase C.3 |
| PL-A11 | "Grace deVries booked — contract signed + $625 retainer sent" | M13 updates B21 in Phase C.3 |
| PL-A12 | "Find both Grace Zoom transcripts; translate into planner edits" | Zoom 2 transcript read in Phase A.4; Zoom 1 transcript tracked via M20 |
| PL-A13 | "Create group chat with Grace + Daniel Thomas" | M21 in Phase C.3 |
| PL-A14 | "Send Grace the art-reference pics Stan promised" | M19 in Phase C.3 |
| PL-A15 | "Mark marriage-license subtask done (Hannah has applied)" | M22 in Phase C.3 |
| PL-A16 | "Formalize + confirm full schedule before 2026-05-07" | M23 in Phase C.3 |
| PL-A17 | "Add Coordinator button + scope edit privileges" (the planner task tracking this) | Tracked via PL-22 + PL-23 (infrastructure); no M-task for it because it's all infrastructure |
| PL-A18 | "Find nice spot for document signing at the park" | M24 in Phase C.3 |
| PL-A19 | "Research why cake cutting late in Christian weddings" | M25 in Phase C.3 |
| PL-A20 | "Prep + send Hannah's package" | M26 in Phase C.3 |
| PL-A21 | "First Tech situation" | M27 in Phase C.3 |
| PL-A22 | "HanStan Logistics spin-off evaluation" | M28 in Phase C.3 |
| PL-A23 | "Stan's tux measurements + Hannah updates Dad re: Indian finery" | M29 in Phase C.3 |
| PL-A24 | "Populate People tab: strangers, OkCupid-style intros" | M30 in Phase C.3 |
| PL-A25 | "Stan + Hannah: OkCupid questions together" | M31 in Phase C.3 |
| PL-A26 | "Stan + Hannah: 36-question quiz together" | M32 in Phase C.3 |
| PL-A27 | "Get Stan's ring finger sized" | D4 (recency-wins deadline reset) in Phase C.2 |
| PL-A28 | "Hide HanStan Logistics from non-master-token users" (planner task) | M33 in Phase C.3; infrastructure = PL-24 |
| PL-A29 | "Restrict Wes/officiant info to master-token" (planner task) | M34 in Phase C.3; infrastructure = PL-25 |
| PL-A30 | "Porta-potty procurement task check" | Resolved in Phase A: B42 "Port-a-Potty + Toilets" already exists. M36 captures provenance. |
| PL-A31 | "Lucas (Cassie's BF) add to Stan's Rolodex" | Corrected per Rolodex Rule — Lucas goes to Organizers as D12 in Phase C.1b. |
| PL-A32 | "Build Zoho wedding email template + wire up" | Parent M1 in Phase C.3 |
| PL-A33 | "Reach out to Elsie after update applied" | M35 in Phase C.3 + written to wedding folder tasQ.md |
| PL-A34 | "Elsie + Fen pairing principle" | M37 captures principle; tooltip rendering = PL-03 + PL-48 |
| PL-A35 | "Bonnie + Sarah Reese scope moderation" | Notes already on live schedule events (se-029, se-045, se-073, se-081, se-084); tooltip rendering = PL-03 |
| PL-A36 | "Confirm multi-parent taskGroup membership (tasks can belong to multiple parents)" | Schema check in Phase A.9; infrastructure = PL-01 + PL-46 |
| PL-A37 | "Capture already-done items as completed" (meta-rule for Phase C.3) | Applied throughout Phase C.2 + C.3 as recency-wins updates |
| PL-A38 | "Identify tasQ + TASQ coverage gaps for ALL claudeCode conversations" | NOT IN THIS SPEC — cross-project item for `F:\TASQ.md`, not hanstan-wedding. Already logged there. |

---

# ═══════════════════════════════════════════════
# STAGE 1 — ONE UNIFIED ENGINE for state + history + activity + tracker + logging
# ═══════════════════════════════════════════════

**Stage 1 guiding principle (Scrybal directive 2026-04-23):** No separation of history / activity / state / trackers / logging. ONE engine. ONE engine that understands the difference between task edits and schedule edits and contact edits and coordinator edits and every future edit type. Not a "task differ + schedule differ + contact differ" running in parallel — a polymorphic entity-aware differ with a plug-in architecture where adding a new entity type means adding one function.

---

## - [ ] Stage 1 — Scope summary (comprehensive; not yet fleshed into phases/steps)

**Stage status:** SCOPE-DEFINED 2026-04-23. Phases + execution plan to be drafted AFTER Stage 0 Phase C completes (so that Phase C outputs — the JSONL capture log, the post-Phase-C live state, and any discovered gaps — can inform phase sequencing).

### Stage 1 entry preconditions (what must be true before Stage 1 begins)

- Stage 0 Phase C complete: every APPROVED task-add / task-update / contact-add / token-issuance has landed on live via authenticated POST; `phase0_capture_2026-04-23.jsonl` contains the full Phase 0 mutation history including the 8 Elsie 2026-04-22 backfill entries.
- Stage 0 Phase D complete: `HANSTAN_WEDDING_SITE_SPEC_preUpdate_2026-04-23.md` is frozen; the working `HANSTAN_WEDDING_SITE_SPEC.md` remains untouched.
- The 1,162-line uncommitted modification set in the local clone is still uncommitted, still untouched, still available. KEEP-decisions from Phase A have been recorded so Stage 1 knows which hunks to land vs which to modify.
- No other organizers have made live edits since Phase C finished (Scrybal is the only operator tonight; Stage 1 runs in the same session).

### Stage 1 scope — what Stage 1 contains

**1. Unified diff engine rewrite of `diffStates()` in `netlify/functions/planner-state.mjs`.** The current function covers only tasks, contacts, groups, tags. Extended function covers: tasks, contacts, groups, tags, scheduleEvents (including people-array mutations, itemsToBring mutations, notes mutations, status/time/duration/zone/parallelGroup mutations), schedulePhases (including eventIds array mutations, collapsed state, title, color, note), scheduleQuestions (including status/resolution transitions), materialsChecks (the checkbox toggles on event materials), coordinators (add/remove/role-change), plus a plug-in registration point so future entity types add themselves without editing the differ core. Output shape preserved: `[{ts, by, entity, action, target, field?, from?, to?, summary}]`. All existing consumers continue working; new consumers get richer data.

**2. Retroactive-audit migration script that ingests `phase0_capture_2026-04-23.jsonl` into the audit log.** One-time migration: reads the JSONL from `_preUpdate_snapshots/`, replays each entry into `audit-log.json` in timestamp order, preserves original `ts` + `by` values. End state: audit log contains every Phase 0 mutation + Elsie's 2026-04-22 activity + all pre-Phase-0 history that was already audited. The Activity tab (Stage 1 item #3) then renders a complete coherent history.

**3. Activity tab UI rendering — wholesale, including engine + UI in the same stage.** Rename `History` → `Activity`. Move `Activity` to far-right of main nav ribbon; move `Settings` to far-left. Each audit entry renders in the uniform sequence Scrybal specified: **where** (which tab / which item / which parameter), **who** (name resolved from token), **when** (date+time + italicized relative `Xd Yh Zm` with zero units suppressed), **why** (optional note captured at edit time). Filters: by person, by date range, by action type. Renders exclusively from the unified audit log (no parallel sources). Visibility: master-token-only (per Scrybal's Stage 0 draft declaration).

**4. Commit + push the KEPT hunks from Stage 0 Phase A review.** Every hunk Scrybal marked KEEP during Phase A review gets committed to the local clone and pushed to `Scryble/hanstan-wedding`. Triggers Netlify auto-deploy. This is the first git push of the Stage 1 work. Includes the SEED_VERSION=3 top-up system in `hanstan-schedule-defaults.js` + `planner.js` — which means every organizer's next page load silently merges the 3 new schedule events (se-006, se-007, se-049) + 4 new questions (sq-18, sq-19, sq-20, sq-21) into their live state non-destructively.

**5. Spec-subject co-update: SMALL ADDITIVE APPEND (not rewrite).** Per Scrybal directive 2026-04-24, the full rewrite is DEFERRED to end-of-all-stages audit. Stage 1 just appends a handful of sections to `HANSTAN_WEDDING_SITE_SPEC.md` documenting: the Activity tab (replacing History), the nav reorder, the full 5-button FAB + Full Add Task modal, and the new schema fields (`zoomLink`, `visibilitySet[]`, audit-entry `why?`, coordinator scope-related fields). Each append is a small self-contained section, mechanical and cheap. No restructuring of existing sections.

**6. Schema extension for multi-parent task-group membership (IF Stage 1 absorbs it; otherwise parking-lot Stage 2).** Either extends `group: string` to `groups: string[]` (breaking change — every reader/writer updates) OR adds `secondaryGroups: string[]` as an additive field (non-breaking — existing `group` keeps primary). Every filter/count/render site in `planner.js` that currently reads `t.group === X` updates to `(t.group === X || (t.secondaryGroups||[]).includes(X))`. Migration: Phase 0 tasks with `tags: ["rolodex", …]` get their secondary groups promoted from tags to the new field. **DECISION TO MAKE DURING STAGE 1 DRAFTING:** absorb into Stage 1 or defer to Stage 2. Absorbing makes Stage 1 larger; deferring means Stage 1's Activity-tab rendering can't show cross-surface task membership.

**7. Constraint metadata on contacts + constraint-tooltip rendering (IF Stage 1 absorbs it; otherwise parking-lot Stage 2).** Adds `contacts[].constraints: string[]` OR a separate `coordinatorConstraints` map keyed by contact id. Populates Elsie+Fen pairing, Bonnie moderated scope, Sarah Reese moderated scope from M37 + M3 + M4. Renders constraint as tooltip on hover over person chips in edit-task modal and schedule-event edit UI. Mobile: long-press on chip opens tooltip OR a small ⓘ icon next to the chip taps open a one-line popup. Content pulled from the constraint metadata — no hardcoding in render code. **DECISION TO MAKE DURING STAGE 1 DRAFTING:** absorb or defer.

**8. Capture-now-inject-later protocol becomes a permanent pattern.** §C.X Structured Capture Protocol from Stage 0 gets formalized as a reusable subsystem. Any future migration that runs before a new engine feature ships uses the same JSONL format in the same `_preUpdate_snapshots/` directory with a timestamp-stamped filename. Stage 1 documents this in the site spec.

### Stage 1 scope — what Stage 1 does NOT contain

- Not in Stage 1: **Quick Edits + Edit Mode UX** (mobile-safety gate for field edits). Parking-lot Stage 2. Stage 1 lands audit visibility but does not change the edit-UX itself.
- Not in Stage 1: **Coordinator-token distribution** (bridesmaids, Sarah Reese, Bonnie, Merry Shipman, Roger Shipman, groomsmen). Gated on Quick Edits + Edit Mode UX per Phase 0 tasks M2, M3, M4, M5, M6.
- Not in Stage 1: **FAB menu additions** (add 3 more buttons: Note, Person, Event → 5-button menu total). Parking-lot Stage 2.
- Not in Stage 1: **Full Add Task modal**. Parking-lot Stage 2.
- Not in Stage 1: **ASQ speech-bubble on every card**. Parking-lot Stage 3.
- Not in Stage 1: **Communications tab as a new main nav group**. Parking-lot Stage 3.
- Not in Stage 1: **Focus tab repurposed as wedding message board**. Parking-lot Stage 3.
- Not in Stage 1: **Zoho Mail ↔ planner wiring**. Parking-lot Stage 4+.
- Not in Stage 1: **Claude auto-briefings pipeline** (Gmail + messaging + Zoom extraction). Parking-lot Stage 5+.
- Not in Stage 1: **/admin absorbed into planner main nav**. Parking-lot Stage 2/3.
- Not in Stage 1: **Coordinator-role scoped edit privileges** (Elsie=universal, Grace+Daniel Thomas=photographer-scoped). Parking-lot Stage 2.
- Not in Stage 1: **Token-gated visibility for HanStan Logistics / Wes Walls / guest contacts**. Parking-lot Stage 2.
- Not in Stage 1: **Full task-set audit** (granular subtask progress, demote/merge, formalize inline-prose subtasks). Parking-lot Stage 4.
- Not in Stage 1: **Schedule-solidification** (per-event PIC/helper confirmation, Schedule exits draft-liquid phase). **Tracked as planner task M23, NOT as a stage in this update.** Deadline 2026-05-07; gated on coordinator-token distribution which lands in Stage 2.
- Not in Stage 1: **Registry Amazon rewiring** (M8). Parking-lot Stage 3+.
- Not in Stage 1: **Rivendell sitewide rollout** (D5). Parking-lot Stage 4+.
- Not in Stage 1: **Any real-life human action**. Those are planner tasks executed by humans asynchronously.

### Stage 1 exit criteria (the resulting world-state)

- Live `netlify/functions/planner-state.mjs` `diffStates()` covers every entity type currently in state. Any organizer edit produces a correctly-attributed audit entry.
- Audit log at `planner/audit-log.json` on live contains every Phase 0 mutation (tasks, contacts, rolodex cleanup, M-series adds, constraint notes) + Elsie's 2026-04-22 activity + all pre-Phase-0 audited history. Total entry count ≥ 45 (existing) + Phase 0 POST count + 8 (Elsie backfill) + anything else.
- Main nav ribbon order: `Settings | Focus | Tasks | Schedule | People | Activity` (Settings far-left, Activity far-right). `History` no longer appears.
- Activity tab renders every audit entry in the where/who/when/why format with person+date-range+action-type filters working. Master-token-only visibility.
- `Scryble/hanstan-wedding` remote is at a new commit that includes: the KEPT hunks from the 1,162-line set, the unified `diffStates()`, the Activity-tab UI, the migration script, and any absorbed Stage 1 items (schema/constraint-metadata).
- Netlify deployment green; live smoke test passes (load planner as `stanshan`, load as `shipsie` Elsie, check Activity tab visibility rules).
- `HANSTAN_WEDDING_SITE_SPEC.md` working copy has a small additive append documenting Activity tab + 5-button FAB + Full Add modal + new schema fields (`zoomLink`, `visibilitySet[]`, audit `why?`). Full rewrite DEFERRED to end-of-all-stages audit. `HANSTAN_WEDDING_SITE_SPEC_preUpdate_plannerUpdate_stage0_26apr23.md` (frozen) unchanged.
- `discoveryLog_hanstanWedding.md` updated with any new rule-candidates surfaced during Stage 1 execution.
- Parking-lot appendix in this PROJECT_SPEC updated: any parking-lot items absorbed into Stage 1 (schema, constraint-metadata) get marked complete; any new items discovered during Stage 1 get parked with their target-stage hint.
- **`stage1smoke` test-coordinator token (created in Stage 0 M45) revoked from `planner/coordinators.json`** once Stage 1 smoke-testing completes. No disposable logins left behind.
- **M43 already executed in Stage 0** via option (c) per Scrybal decision 2026-04-23. The narrow `planner-state.mjs` synthetic-audit-entries extension + the 8 Elsie entries are already on live before Stage 1 starts. Stage 1 does NOT need to do anything for Elsie backfill — it's already done.

### Stage 1 open questions (answered 2026-04-23 where clear; flagged where not)

- **Activity-tab rendering included in Stage 1 alongside engine?** → YES. Wholesale together. Scrybal directive 2026-04-23.
- **Every Phase 0 write injected retroactively into the audit log once Stage 1's engine ships?** → YES. Capture-now-inject-later is the universal pattern. Scrybal directive 2026-04-23.
- **Schema extension for multi-parent task-group (item #6)** → Parking-lot says Stage 1 OR Stage 2. Decision made during Stage 1 phase-drafting once Stage 0 completes.
- **Constraint metadata + constraint-tooltip (item #7)** → Parking-lot says Stage 1 OR Stage 2. Decision made during Stage 1 phase-drafting.

### Stage 1 dependencies on Stage 0 outputs

- The `phase0_capture_2026-04-23.jsonl` file produced during Phase C is the primary input to Stage 1 item #2 (retroactive-audit migration).
- Phase A's hunk catalogue + Scrybal's KEEP/DROP/MODIFY decisions determine which hunks land in Stage 1 item #4 (commit + push).
- Phase D's frozen snapshot remains the pre-update reference point; no Stage 1 spec-rewrite diff required because Stage 1 only appends additive sections to the working-copy spec (full rewrite deferred to end-of-all-stages audit).
- Any discovered gaps during Phase C (failed POSTs, mismatched expected state) get added to Stage 1's entry-precondition checklist.

---

**End of PROJECT_SPEC Stage 0 + Stage 1 scope.** Stage 1 phases + steps drafted after Stage 0 Phase C completes. Parking Lot appendix below captures items assigned to later stages.


---
---

# ═══════════════════════════════════════════════
# STAGE 1 — ONE UNIFIED ENGINE (fleshed 2026-04-24 after Stage 0 completion)
# ═══════════════════════════════════════════════

**Stage status:** FLESHED 2026-04-24 per Scrybal directive post-Stage-0. Phases, steps, exit criteria, and ticket sequence below are executable.

**Stage goal** (from scope-lock): deploy ONE unified engine that understands every entity type currently in PlannerState, retroactively ingests the Stage 0 capture JSONL into the audit log, ships the Activity tab UI rendering the unified audit stream, and commits-and-pushes the KEEP-recommended hunks from the 1,162-line Phase A modification set. No separation of history / activity / state / trackers / logging.

**Stage entry state** (verified post-Stage-0 2026-04-24):
- 117 tasks on live incl. D1–D13 + M1–M37; contacts incl. new Fen (p28) with constraints; Guest List group removed; master-only tags applied; stage1smoke coordinator token exists.
- `planner-state.mjs` accepts `syntheticAuditEntries` (commit `659ab57` deployed).
- Phase D commit `03f5639` sits local on main, not pushed. 1,162-line modification set untouched on 5 files.
- Capture JSONL at `_preUpdate_snapshots/capture_plannerUpdate_stage0_phaseC_2026-04-23.jsonl` has 73 entries (8 Elsie-historical + 65 Hannah-&-Stan-batch-C.x).
- Audit log on live has 102 entries including the 8 Elsie-historical injections.
- `stage1smoke` disposable coordinator token on live.

**Stage exit state:**
- Unified `diffStates()` on live covers tasks, contacts, groups, tags, scheduleEvents, schedulePhases, scheduleQuestions, materialsChecks, coordinators, plus plug-in registration point for future entity types.
- Every Stage 0 mutation that wasn't server-diffed at POST time has been replayed into `audit-log.json` from the capture JSONL (batch C.1/C.2/C.3/C.3b/C.4/C.3c entries — Elsie entries already injected at C.3c Part 2).
- Activity tab renders every audit entry in where/who/when/why format with filters by person, date range, action type. Master-token-only visibility. History tab renamed Activity. Main nav ribbon: Settings (far-left) | Focus | Tasks | Schedule | People | Activity (far-right).
- `Scryble/hanstan-wedding` main branch includes the KEEP hunks from the 1,162-line Phase A set, the unified `diffStates()`, the Activity-tab UI, the migration script, and the Phase D frozen spec. Netlify deploy green.
- `HANSTAN_WEDDING_SITE_SPEC.md` working-copy has a small additive append documenting Activity tab + full 5-button FAB + Full Add Task modal + nav-reorder + new schema fields (`zoomLink`, `visibilitySet[]`, audit-entry `why?`). NOT a rewrite — full spec rewrite DEFERRED to end-of-all-stages audit per Scrybal directive 2026-04-24. The §14.X syntheticAuditEntries section from Stage 0 batch C.3c Part 1 stays intact.
- `stage1smoke` coordinator token revoked from `coordinators.json`.
- `test-artifact` diagnostic entry optionally filtered at renderer (integrity-check §PU-11 recommendation).

**Stage non-goals** (updated 2026-04-24 to reflect PL-10/11/12 absorption):
- Quick Edits + Edit Mode UX — Stage 2.
- Coordinator-token distribution to bridesmaids / Sarah / Bonnie / Merry / Roger — Stage 2 (gated on mobile-safety UX).
- ~~FAB menu additions (3 buttons: Note, Person, Event)~~ ABSORBED into Stage 1 Phase C per Scrybal directive 2026-04-24.
- ~~Full Add Task modal~~ ABSORBED into Stage 1 Phase C per Scrybal directive 2026-04-24.
- ASQ speech-bubble, Communications tab, Focus-as-message-board — Stage 3.
- Zoho ↔ planner wiring — Stage 4+.
- Claude auto-briefings pipeline — Stage 5+.
- /admin absorbed into planner nav — Stage 2/3.
- Coordinator-role scoped edit privileges — Stage 2.
- Token-gated visibility for HanStan Logistics / Wes / guest contacts — Stage 2 (data already tagged in Stage 0 M40; only render-path filtering is parked).
- Full task-set audit — Stage 4.
- Schedule-solidification (per-event PIC/helper confirmation) — **tracked as planner task M23 on live, NOT a stage in this update.** Deadline 2026-05-07.

**Decisions locked during 2026-04-24 Stage 1 phase-drafting:**

- **Item #6 (multi-parent task-group schema extension):** DEFER to Stage 2. Reason: Stage 2 bundles schema+constraints with the Quick-Edit+Edit-Mode UX that needs both. Keeping Stage 1 tight (engine + migration + Activity-tab + commit-and-push) is worth the cost of Activity tab not showing cross-surface task membership yet. Parking-lot: PL-01, PL-02, PL-38 stay in Stage 2 scope. **Exception:** PL-46 (code-inspection of whether current schema already supports multi-parent) absorbed into Stage 1 Phase A.0 as an inline investigation delivered as a planner task — no separate doc.
- **Item #7 (constraint metadata + constraint-tooltip rendering):** DEFER to Stage 2. Data already populated in Stage 0 M42. Renderer work bundles with PL-05 Quick-Edit work. Parking-lot: PL-03, PL-48 stay in Stage 2 scope.
- **PL-42 (Stan + Hannah People-tab contact + permanent Zoom link):** ABSORB into Stage 1 Phase B. Zoom URL `https://us06web.zoom.us/j/7933306691` provided by Scrybal 2026-04-24. Visibility scoping: Scrybal + Hannah + Elsie + Grace only. Because current schema has no per-coordinator visibility field, this step introduces additive fields `zoomLink` and `visibilitySet[]` on contact records; Stage 2's render-path filtering (PL-22 + PL-24..PL-27) will consume them. Until Stage 2 ships, the link is invisible to coordinators because the planner only renders contacts to master-token users anyway — data safely pre-staged.
- **Document discipline (standing rule, Scrybal directive 2026-04-24):** the live repo root at `F:/Wedding Website/hanstan-wedding/` contains ONLY files the live website actively runs. Everything session-scoped (specs, tickets, tasQ, discoveryLog, `_preUpdate_snapshots/`, investigation results, handoff artifacts) belongs in `_handoff/` or a comparable non-live subfolder. Investigations land inline as planner tasks, not as separate documents. One document per concern, never scatter. Tidying of existing drift scheduled via repo-local tasQ.md reminder #2 AFTER Stage 1 completes (so mid-stage file references don't break).
- **Site spec (HANSTAN_WEDDING_SITE_SPEC.md) rewrite is DEFERRED to end-of-all-stages audit (Scrybal directive 2026-04-24).** Reason: a massive rewrite mid-sequence burns tokens; better to audit everything once after Stage 4 completes and rewrite the spec in one pass against post-everything live state. Stage 1 Phase C removes the spec-rewrite step from its scope. The §14.X syntheticAuditEntries section added in Stage 0 batch C.3c Part 1 stays intact. Every subsequent stage adds an additive section to the working-copy spec for each shipped feature (small, mechanical appends), not a rewrite.
- **Stage 2 easement absorptions (6 items, Scrybal-approved 2026-04-24):** while Stage 1 is in progress, absorb 6 low-risk Stage-2-enabling additions that materially ease Stage 2 without expanding Stage 1's risk surface:
  1. **Propagate `visibilitySet[]` schema field onto every `master-only`-tagged record during Phase B.** Stan + Hannah contacts already get it for the Zoom link; extend the same loop to every master-only-tagged task + Wes + HanStan Logistics + Stan's Rolodex content. Default value `visibilitySet: ["stanshan"]` (master-only-equivalent). Stage 2's PL-24–PL-27 render-path filtering becomes a filter-only code change with zero data migration.
  2. **Extend `diffCoordinators()` to emit entries for every field mutation, not just add/remove.** Add `isMaster`-toggle detection, any future `scopedEntities[]` array change, and `name` edits. ~5 LoC inside the Phase A differ.
  3. **Reserve a visibility-scope filter slot in the Activity tab filter bar.** Fourth filter, populated from `union(visibilitySet[])` across audit entries. Inert in Stage 1 (only one value `[stanshan]`), lights up automatically when Stage 2 diversifies scopes.
  4. **Pre-reserve a hidden `/admin` nav slot** during Phase C's nav-reorder. `<li class="nav-admin-slot" style="display:none">` placeholder. Stage 2 fills it instead of re-authoring the nav.
  5. **Lock `why`-note field design to the audit entry.** `diffStates(prev, next, by, whyNote?)` signature gains an optional third parameter; `why` lands on the audit entry shape as an optional field. Unused in Stage 1 (no UI captures a `why` yet); Stage 2's Quick-Edit flow wires it.
  6. **Factor Phase B's replay logic into a named `replayCaptureJsonl(filepath, excludeMatchKeys)` pattern, documented inline in spec §PU-7.** No separate util file. Stage 2's similar capture-then-replay migrations follow the same named pattern.

  All six are LOW risk, LOW cost, additive-only. Total incremental effort: ~36 LoC + one Phase B loop extension + one inline function factoring.
- **FAB menu additions (PL-10, PL-11) + Full Add Task modal (PL-12) — ABSORB into Stage 1 Phase C (Scrybal directive 2026-04-24).** Reason: the FAB scaffold from the 1,162-line uncommitted set lands in Stage 1 Phase D as Commit 2. While Phase C is already touching `planner/index.html` + `planner/planner.css` + `planner/planner.js` for the Activity tab, adding 3 more FAB menu buttons (Note, Person, Event) and the Full Add Task modal costs little additional complexity and ships the full 5-button FAB that Scrybal designed. Parking-lot: PL-10, PL-11, PL-12 absorbed; PL-40 (Quick Task taskGroup tab) stays in Stage 2 because it's tied to the Quick-Edit UX flow.

## Stage 1 Phases (sequential A → B → C → D → E)

---

### - [ ] Stage 1 Phase A.0 — Multi-parent task-group schema investigation (inline, planner-task result)

**Phase goal:** investigate whether the current `planner.js` + `planner-state.mjs` code path actually supports tasks belonging to multiple parent taskGroups (via any currently-unused schema affordance) or whether the apparent single-string `tasks[].group` field is a hard constraint. Output lands as a comment on a new planner M-series task, NOT as a separate markdown file.

**Entry state:** PL-46 parked Stage 1-OR-Stage 2 with no investigation done. Stage 0 A.9 confirmed `group` is single-string at the JSON level but did not inspect render-path or edit-path code.

**Exit state:** one M-series task on live planner (next available M-id, expected M48) titled "Multi-parent task-group schema investigation (PL-46 result)" with desc populated with the investigation findings. Task status=done on creation. No separate investigation document.

**Steps:**

1. Grep `planner.js` for every site that reads `t.group`, sets `t.group`, filters by `t.group`, counts by `t.group`. Record the sites.
2. Grep `planner-state.mjs` for any `group`-field handling in POST/GET/diff paths.
3. Inspect `renderPeople`, `renderTasks`, `groupTasksBy` for whether secondary-group affordances exist.
4. Conclusion sentence: either "Schema is hard single-string; multi-parent support requires the PL-01 schema-extension work (Stage 2 scope)" OR "Schema supports X but client code doesn't use it — usable workaround is Y."
5. POST a new task M48 on live with status=done, group="Website", tags=["investigation","schema","pl-46-result"], desc=<full findings from steps 1-4>. Attribute "Hannah & Stan".
6. Append capture JSONL entry for the M48 create.

**Exit criteria:**
- M48 task exists on live with the investigation findings in its desc field.
- No new markdown file created.
- Capture JSONL has the corresponding entry.

---

### - [ ] Stage 1 Phase A — Unified diffStates() engine rewrite

**Phase goal:** extend `diffStates()` in `netlify/functions/planner-state.mjs` to cover every entity type in PlannerState, with a plug-in registration point for future types. Preserve the existing audit-entry output shape so all downstream consumers (audit-log.json, snapshots-manifest, future Activity renderer) continue to work.

**Entry state:** post-Stage-0. `planner-state.mjs` currently covers tasks/contacts/groups/tags via `diffStates()` + `appendAudit()`.

**Exit state:** `diffStates()` covers 8 top-level entity types — tasks, contacts, groups, tags, scheduleEvents, schedulePhases, scheduleQuestions, coordinators — plus sub-field diffs for `materialsCheck` entries (emitted by the scheduleEvent differ via `itemsToBring[]`) and `note` entries (emitted by scheduleEvent + schedulePhase differs via their `notes` or `note` fields). Plug-in registration: a top-of-file `DIFFERS` object maps entity types to differ functions; adding a new type adds one entry to that object. Every existing caller continues to work (backwards-compatible output shape).

**Steps:**

1. Read the current `diffStates()` in `planner-state.mjs` end-to-end (lines 36–89 observed at Stage 0; confirm current state via `git diff origin/main -- netlify/functions/planner-state.mjs` at Stage 1 invocation).
2. Refactor the existing task/contact/group/tag diff logic into per-entity `diffTasks(prev, next, by)`, `diffContacts(prev, next, by)`, `diffGroups(prev, next, by)`, `diffTags(prev, next, by)` helpers.
3. Add 4 new top-level differ helpers: `diffScheduleEvents`, `diffSchedulePhases`, `diffScheduleQuestions`, `diffCoordinators`. Each emits entries with shape `{ts, by, entity, action, target, summary, field?, from?, to?}`. **Actual live field shapes verified by 2026-04-24 target-schema check against `https://hanstan.wedding/.netlify/functions/planner-state`:**
   - ScheduleEvent actual shape: `{id, title, details, startTime, duration, status, zone, people, itemsToBring, notes, isMilestone, isGuestVisible, parallelGroup}`. **Differ covers every field.** `people[]` mutations emit `person.add`/`person.remove`/`person.update-role` entries with entity=scheduleEvent. `itemsToBring[]` mutations emit `materialsCheck.toggle`/`materialsCheck.add`/`materialsCheck.del` entries with entity=scheduleEvent (NOT a separate differ — sub-field diff). `notes` field mutations emit `note.add`/`note.edit`/`note.remove` entries with entity=scheduleEvent. `details`, `isMilestone`, `isGuestVisible`, `startTime`, `duration`, `status`, `zone`, `parallelGroup`, `title` are scalar fields diffed via simple before/after comparison.
   - SchedulePhase actual shape: `{id, number, title, color, note, collapsed, eventIds}`. **Differ covers every field.** `note`-field mutations emit `note.add`/`note.edit`/`note.remove` entries with entity=schedulePhase. `number`, `title`, `color`, `collapsed` are scalar. `eventIds[]` is array-diffed with phase-event-add/remove entries.
   - ScheduleQuestion actual shape: `{id, question, eventId, status, resolution, resolvedDate}`. **Differ covers every field.** Note: the question-text field is named `question`, NOT `text`. `status`, `resolution`, `resolvedDate`, `eventId`, `question` are all scalar-diffed.
   - Coordinator differ covers: add/remove + Stage-2-easement-#2 field mutations (isMaster, name, future scopedEntities[]/visibilitySet[]).
   - `materialsCheck` and `note` are NOT separate top-level differs — they are sub-field diffs emitted by the scheduleEvent and schedulePhase differs, matching the existing schema where these live under their parent records.
   - **Implementation rule:** each differ iterates the set-union of `prev[k]` field-keys and `next[k]` field-keys; any new field added to live state in the future is automatically diffed unless explicitly excluded. This future-proofs against schema additions without requiring differ updates for every new field.
4. Build the `DIFFERS` registry object: `const DIFFERS = { tasks: diffTasks, contacts: diffContacts, groups: diffGroups, tags: diffTags, scheduleEvents: diffScheduleEvents, schedulePhases: diffSchedulePhases, scheduleQuestions: diffScheduleQuestions, coordinators: diffCoordinators };`. `diffStates()` becomes `Object.entries(DIFFERS).flatMap(([key, fn]) => fn(prev[key] || [], next[key] || [], by, whyNote))`.
5. Preserve the `target: t.taskId || id` fallback pattern for task differ (from the schema-correction banner).
6. **Stage 2 easement #2:** extend `diffCoordinators()` to emit entries for every field mutation, not just add/remove. Detect `isMaster` toggle, `name` edits, and any future `scopedEntities[]` or `visibilitySet[]` changes.
7. **Stage 2 easement #5:** lock `why`-note field design to the audit entry. `diffStates(prev, next, by, whyNote?)` signature gains an optional fourth parameter; when present, every entry emitted by that invocation gains `why: whyNote`. Entry shape becomes `{ts, by, action, target, summary, entity?, field?, from?, to?, why?}`. Unused in Stage 1 callers (Phase B migration does not supply a whyNote); Stage 2's Quick-Edit flow will.
8. Add minimal unit-test-like assertions inline (in a fenced comment block) to document expected input/output for each differ. No actual test framework — Netlify function file stays runtime-focused.
9. Do not modify any client-side code.

**Exit criteria:**
- `diffStates()` emits entries for every entity-type mutation during a smoke-test POST that mutates a schedule event + a schedule phase + a schedule question + coordinator add/remove + coordinator field edit (isMaster toggle test).
- Backwards-compat: an existing tasks-only POST produces the same audit entries as before (no regression).
- `DIFFERS` registry allows a one-line-per-entity extension for future types.
- `diffStates(prev, next, by, whyNote?)` signature includes optional 4th parameter; entries carry `why` when supplied.
- `diffCoordinators()` emits entries for isMaster toggle + name edit + add/remove.

---

### - [ ] Stage 1 Phase B — Retroactive audit migration from capture JSONL

**Phase goal:** replay the Stage 0 Phase C capture JSONL entries that weren't auto-captured by server-side `diffStates()` at POST time, injecting them via the `syntheticAuditEntries` field into `audit-log.json`. At exit, the audit log reflects the complete Stage 0 mutation history.

**Entry state:** capture JSONL has 73 entries. 8 Elsie entries already injected (batch C.3c Part 2). Remaining ~65 entries are batch C.1/C.2/C.3/C.3b/C.4/C.3c Hannah-&-Stan entries. Most of those WERE auto-captured by server-side `diffStates()` during Stage 0 Phase C POSTs — but only for task-level mutations. Some weren't (e.g., the constraints-field set on contacts in M42, the group-array edit in M39, the tag-array adds in M40/M41).

**Exit state:** every JSONL entry that was NOT already auto-captured has been replayed into audit-log.json. Each replayed entry preserves its original `ts/by/action/target/summary/entity?/field?/from?/to?` from the capture JSONL (no source-marker rewrite — the `source` field on the capture JSONL is the authoritative provenance; the Activity renderer does not need to distinguish retroactive from organic). Organic entries that predate Phase B are untouched. Duplicate prevention via match-key check in step 3.

**Steps:**

0. **PL-42 absorption — add Stan + Hannah as contact records with scoped Zoom link.** The link `https://us06web.zoom.us/j/7933306691` is the permanent Zoom meeting room (Scrybal directive 2026-04-24). Visibility: Scrybal + Hannah + Elsie + Grace only. Because the current schema has no per-coordinator visibility field, this step ships the data in the shape Stage 2 will consume:
   - Add Stan contact: `{id: <next pId>, name: "Stan (Scrybal)", role: "groom", specificRole: "co-master", phone: "", email: "scryballer@gmail.com", notes: "Master-token holder (stanshan is shared with Hannah). Co-primary decision-maker.", zoomLink: "https://us06web.zoom.us/j/7933306691", visibilitySet: ["stanshan", "shipsie", "everfindingbeauty"], constraints: []}`.
   - Add Hannah contact: `{id: <next pId>, name: "Hannah Shipman", role: "bride", specificRole: "co-master", phone: "", email: "hannah7of9@gmail.com", notes: "Master-token holder (stanshan is shared with Stan). Co-primary decision-maker.", zoomLink: "https://us06web.zoom.us/j/7933306691", visibilitySet: ["stanshan", "shipsie", "everfindingbeauty"], constraints: []}`.
   - Note: `zoomLink` and `visibilitySet` are new schema fields introduced here. Additive — nothing currently reads them. Stage 2's coordinator-scoped visibility work (PL-22 + PL-24..PL-27) reads `visibilitySet[]` to filter render paths. Until Stage 2 ships, the link is INVISIBLE to coordinators because the planner currently only renders contacts to master-token users anyway — data is safely pre-staged.
   - Check: if Hannah or Stan contact records already exist on live, update in place (do not create duplicates).
1. Pre-flight: GET current audit-log.json via `/.netlify/functions/planner-audit`; parse all entries.
2. Read the full capture JSONL. Filter out Elsie entries (already injected). Remaining ~65.
3. For each remaining entry, compute a match-key: `<ts>|<by>|<action>|<target>`. Check against the current audit log for an existing matching key. Skip entries that already have a match (auto-captured organic entry).
4. For entries that have no match, build a synthetic-audit-entry payload with the entry's ts/by/action/target/summary/entity?/field?/from?/to? preserved.
5. Assemble a single POST body: `{state: <current-live-state-with-Stan-and-Hannah-contacts-added-per-step-0a-and-visibilitySet-propagated-per-step-0b>, by: "Hannah & Stan", syntheticAuditEntries: [<non-duplicate entries>]}`.
6. POST to `/.netlify/functions/planner-state`. Expect 200 + `ok: true`.
7. Verify: GET audit-log.json; confirm every capture-JSONL entry is now represented. GET state; confirm Stan + Hannah contacts present with zoomLink + visibilitySet populated.
8. Append summary capture lines to the JSONL: one for the Stan contact.create, one for Hannah contact.create, one for the audit-log replay summary, all with `batch: "stage1_phaseB"`.

**Exit criteria:**
- 100% of capture-JSONL entries are represented in live audit-log.json.
- No duplicate audit entries (same `<ts>|<by>|<action>|<target>` match-key appearing more than once).
- Audit entry count on live has grown from 102 by the number of non-duplicate injections plus 2 (Stan + Hannah contact.create entries).
- Stan contact record on live has `zoomLink === "https://us06web.zoom.us/j/7933306691"` and `visibilitySet === ["stanshan", "shipsie", "everfindingbeauty"]`. Same for Hannah. No duplicates.
- Every master-only-tagged task on live has `visibilitySet: ["stanshan"]` (Stage 2 easement #1 — ~22 tasks).
- Phase B replay logic exists as a named inline pattern `replayCaptureJsonl(filepath, excludeMatchKeys)` documented in spec §PU-7 (Stage 2 easement #6 — no separate util file).

---

### - [ ] Stage 1 Phase C — Activity tab UI + FAB full 5-button menu + Full Add Task modal + nav reorder + Stage 2 easements

**Phase goal:** replace the History tab with an Activity tab that renders the unified audit stream in where/who/when/why format, with filters by person, date range, action type, AND visibility-scope (Stage 2 easement #3). Master-token-only visibility. Nav reorder: Settings far-left, Activity far-right, hidden `/admin` slot reserved for Stage 2. Ship the full 5-button FAB menu (quick-add + full-add already in the 1,162-line set; add Note + Person + Event per PL-10/PL-11) plus the Full Add Task modal (PL-12).

**Entry state:** client-side `planner.js` + `planner/index.html` + `planner/planner.css` currently render a History tab in the middle of the main nav ribbon. The 1,162-line uncommitted set has the 2-button FAB scaffold + `buildNewTask()` + `fullAdd()` helpers but the Full Add Task modal DOM + the additional 3 FAB buttons are not yet present.

**Exit state:** Activity tab is the sole renderer of audit data. Settings far-left, Activity far-right, hidden `<li class="nav-admin-slot" style="display:none">` between Focus and Tasks for Stage 2's /admin absorption. FAB menu shows 5 buttons: Quick-Add (existing), Full-Add (existing, wires the new modal), Note, Person, Event. Full Add Task modal renders identical fields to the Edit Task modal. Each audit entry renders where/who/when/why with zero-unit-suppressed relative time. Four filters (person, date-range, action-type, visibility-scope) combine with AND. Master-only gate active.

Filter bar: person dropdown (populated from coordinators + historical `by` values), date-range picker (two-date inputs with quick-presets 24h / 7d / 30d / all), action-type multi-select (create / update / delete / resolve / comment / note / etc.), visibility-scope filter (populated from `union(visibilitySet[])` across audit-entry targets' records; inert in Stage 1 when only `[stanshan]` exists, active once Stage 2 diversifies). Filters combine with AND.

Visibility: master-token-only. Coordinator tokens see a redirect/hidden state.

**Steps:**

1. Rename `History` → `Activity` in `planner/index.html` nav ribbon. Move `Settings` button to far-left position; move `Activity` button to far-right.
2. **Stage 2 easement #4:** insert hidden `<li class="nav-admin-slot" style="display:none" data-stage2-reserved="admin"></li>` between Focus and Tasks. CSS rule `.nav-admin-slot { display: none; }` also in planner.css to make the reservation explicit-not-inline.
3. Update `planner/planner.css` ribbon-layout rules to accommodate the new order; adjust any sticky-tab styles.
4. In `planner/planner.js`, rename the History view renderer → `renderActivity`. Point it at the unified audit stream (single source: `/.netlify/functions/planner-audit`).
5. Implement the where/who/when/why field-derivation logic per audit entry:
   - `where`: map `entity` to a tab-label (`task` → "Tasks"; `scheduleEvent` → "Schedule ▸ event"; etc.) + `target` as item label + `field` as parameter label if present.
   - `who`: resolve `by` against coordinators list; fall back to raw `by` string.
   - `when`: format `ts` as ISO local + compute relative duration from now; zero-units suppressed via a helper `formatRelativeCompact(ts)`.
   - `why`: show if the entry has a `why` field (Stage 2 easement #5 — field locked to audit-entry shape). Stage 1 has no UI that captures a `why` yet; renderer just handles it if present.
6. Implement filters:
   - Person filter: single-select dropdown; resolves `coordinators[].name` + any historical `by` values.
   - Date-range picker: from/to date inputs + quick-presets.
   - Action-type filter: multi-select of distinct `action` values in audit log.
   - **Stage 2 easement #3:** Visibility-scope filter: populated from `union(visibilitySet[])` across audit entries (with fallback to "master-only" for tasks that carry `tags.includes('master-only')`). Inert in Stage 1 unless any records have visibilitySet values other than `["stanshan"]`.
7. Master-token-only gate: check `PREFS.isMaster` or the token's `isMaster` flag; render a "Activity log is master-only" placeholder for non-master tokens.
8. `renderActivity` subscribes to auto-refresh on state mutations (tap the existing `applyServerState`/`save()` hooks) so live mutations appear without manual reload.
9. Filter out `target === "test-artifact"` per §PU-11 integrity-check recommendation. Single-line filter. Keeps historical entry in audit-log.json but removes from UI.
10. **PL-10, PL-11, PL-12 absorption — full 5-button FAB + Full Add Task modal:**
    - Add 3 FAB menu buttons in `planner/index.html`: Note (calls `quickAddNote()` or similar inline note-to-task helper — scope: one-line note becomes a minimal task with `group="Notes"` or equivalent, or parks to a new-note-only queue for Stage 2 to claim; keep scope minimal and documented inline).
    - Add Person button: calls `quickAddPerson()` — opens a minimal contact-create modal with name/role fields.
    - Add Event button: calls `quickAddEvent()` — opens a minimal schedule-event-create modal with title/time fields.
    - Build the Full Add Task modal DOM structurally identical to the existing Edit Task modal. Shared rendering logic where possible (factor a `renderTaskEditor(task, mode: 'edit'|'create')` helper if trivially clean).
    - Wire the existing `fullAdd()` helper (from the 1,162-line set) to open the new Full Add modal rather than whatever stub exists now.
    - Scope discipline: each new button does the minimum for Stage 1; deeper Full Add features (persona dropdown, advanced scheduling, etc.) stay parked if they risk expanding scope. If a button's implementation balloons beyond ~30 LoC, stub the button as disabled with a tooltip "Coming in Stage 2" and note the deferral in the Stage 1 exit criteria.

**Exit criteria:**
- Navigating to Activity tab as `stanshan` shows a time-ordered list of every audit entry, newest first.
- Each entry renders in where/who/when/why format with zero-units-suppressed relative time.
- All four filters (person, date-range, action-type, visibility-scope) work in combination (AND).
- Loading as `stage1smoke` (non-master) shows the master-only placeholder.
- `test-artifact` entry does not appear in UI.
- Nav ribbon order: Settings | Focus | (hidden admin slot) | Tasks | Schedule | People | Activity.
- FAB menu shows 5 buttons: Quick-Add, Full-Add, Note, Person, Event.
- Full Add Task modal opens from Full-Add button; renders all Task fields; successful create appears on live within one save cycle.
- `visibilitySet[]` data populated across ~22 master-only-tagged tasks + Stan/Hannah contacts (from Phase B) is visible in the scope filter's dropdown (even if only `["stanshan"]` and empty until Stage 2).
- **No rewrite of `HANSTAN_WEDDING_SITE_SPEC.md`.** Site-spec update DEFERRED to end-of-all-stages audit per Scrybal directive. Stage 1 appends a small additive section (just enough to document the Activity tab + FAB additions + new schema fields); no full rewrite.

---

### - [ ] Stage 1 Phase D — Commit and push

**Phase goal:** push to `Scryble/hanstan-wedding` main branch:
- The 1,162-line Phase A KEEP-recommended modification set (4 commits per `stageOneCommitPlan_plannerUpdate_stage0_phaseD_v1.md`).
- Stage 1 Phase A deltas (unified `diffStates()` + DIFFERS registry + `whyNote` parameter + extended `diffCoordinators`).
- Stage 1 Phase C deltas (Activity tab UI + nav reorder + hidden /admin slot + full 5-button FAB + Full Add Task modal + visibility-scope filter).
- Small additive append to `HANSTAN_WEDDING_SITE_SPEC.md` (NOT a rewrite — just documenting the new Activity tab + FAB additions + new schema fields `zoomLink`, `visibilitySet[]`, audit-entry `why?`). Full spec rewrite DEFERRED to end-of-all-stages audit per Scrybal directive 2026-04-24.

The Phase D Stage 0 commit (`03f5639`) is already local; it gets pushed along with Stage 1's commits.

**Entry state:** local main is 1 commit ahead of origin (the Phase D Stage 0 commit `03f5639`). 1,162-line modification set still uncommitted on 5 files.

**Exit state:** origin/main has 7 new commits beyond the current origin/main HEAD (`659ab57`). The Phase-D Stage-0 commit (`03f5639`) is already local-but-unpushed and becomes commit #1 in the push sequence; Stage 1 contributes 6 more:

1. `03f5639` (already local) — Phase D Stage 0 frozen spec + baselines + Stage 1 commit plan + integrity check
2. Stage 1 Commit 1 per `stageOneCommitPlan`: SEED_VERSION top-up + schedule defaults
3. Stage 1 Commit 2 per plan: FAB scaffold (2-button from the 1,162-line set)
4. Stage 1 Commit 3 per plan: People-tab role-filter + print
5. Stage 1 Commit 4 per plan: schedule-event materials-sheet
6. Stage 1 Commit 5: unified `diffStates()` engine + DIFFERS registry + `whyNote` parameter + extended `diffCoordinators` (Phase A of this stage)
7. Stage 1 Commit 6: Activity tab UI + nav reorder + hidden /admin slot + full 5-button FAB + Full Add Task modal + visibility-scope filter + small additive site-spec append (NOT a rewrite)

Phase E later adds 1 more commit (the wrap-up: parking-lot strikethroughs + discoveryLog + capture JSONL summary), bringing post-Stage-1 total to 8 commits ahead of the pre-Stage-1 origin/main HEAD.

**Steps:**

1. Verify working tree state matches expectations: `git status` shows the 5 uncommitted files (seed JSON + schedule-defaults + index.html + planner.css + planner.js) + any Phase A/C Stage-1 file mods.
2. Execute the 4 Stage-0-Phase-A-hunk commits per `stageOneCommitPlan_plannerUpdate_stage0_phaseD_v1.md`. Path-limited staging per commit. Push after each commit to see Netlify build green; if a build fails, revert and debug before next commit.
3. Commit Phase A of Stage 1 (unified `diffStates()`): `git add -- netlify/functions/planner-state.mjs` + any test-comment additions; commit with message `planner-state: unified diffStates() engine covering every entity type + DIFFERS plug-in registry (spec_plannerUpdate_26apr23.md §Stage 1 Phase A)`.
4. Commit Phase C of Stage 1 (Activity tab + FAB additions + nav): `git add -- planner/planner.js planner/planner.css planner/index.html HANSTAN_WEDDING_SITE_SPEC.md`; commit with message `planner: Activity tab UI + full 5-button FAB + Full Add Task modal + nav reorder (Settings left, Activity right, hidden /admin slot) + visibility-scope filter + small additive site-spec append (spec_plannerUpdate_26apr23.md §Stage 1 Phase C)`. NOT a site-spec rewrite — just appending Activity + FAB + new-schema-fields sections.
5. `git push origin main`. Expect 7 commits pushed total at the end of Phase D (1 Phase-D-Stage-0 + 4 Stage-1-Phase-D-plan commits + 2 Stage-1-engine-and-UI commits). Phase E will add 1 more wrap-up commit separately.
6. Monitor Netlify; expect 7 sequential builds all green. Build-failure protocol: if any build fails, halt before the next commit, `git revert` the offending commit, debug, re-push.

**Exit criteria:**
- `git log origin/main..HEAD` returns empty (all local commits pushed).
- Netlify dashboard shows all 7 deploys status=Ready.
- Live site at `https://hanstan.wedding/planner/` renders Activity tab with unified audit stream.
- `git status` in local clone shows clean working tree except for the Phase D Stage 0 artifacts in `_preUpdate_snapshots/` (those stay untracked for archival).

---

### - [ ] Stage 1 Phase E — Revoke stage1smoke + post-stage verification + spec freeze

**Phase goal:** cleanup + validation. Remove disposable coordinator token; confirm all Stage 1 exit criteria met; document new known-gaps for Stage 2.

**Entry state:** origin/main at 7-commits-ahead of pre-Stage-1. Activity tab live. Unified diff engine live.

**Exit state:** `stage1smoke` revoked. All Stage 1 exit criteria verified. `discoveryLog_hanstanWedding.md` updated with any new rule-candidates surfaced during Stage 1. Parking Lot items absorbed into Stage 1 struck through; new items discovered during Stage 1 parked with stage-2+ hints.

**Steps:**

1. DELETE `stage1smoke` token via `DELETE /.netlify/functions/planner-coordinators` (Bearer `stanshan`, body `{token: "stage1smoke"}`).
2. Verify: GET `/.netlify/functions/planner-coordinators` should return 3 tokens (stanshan, shipsie, everfindingbeauty). stage1smoke absent.
3. Smoke-test all Stage 1 exit criteria via Chrome connector + manual load:
   - Activity tab renders as `stanshan`.
   - Activity tab shows master-only placeholder as `shipsie` (Elsie's token — safe to test non-destructively).
   - Edit a schedule event people[] array via the Schedule tab; confirm Activity tab shows the new entry immediately with `scheduleEvent ▸ se-xxx ▸ people` where/who/when.
   - Add a tag to a task; confirm Activity tab shows the new entry with `task ▸ Bxx ▸ tags`.
4. Update `discoveryLog_hanstanWedding.md` with any new Tier-1/2/3 discoveries.
5. Update `spec_plannerUpdate_26apr23.md` Parking Lot appendix: strike-through absorbed items (PL-28, PL-29, PL-30, PL-31, PL-45 landed in Stage 1 Phase C; PL-42 Stan+Hannah Zoom link landed in Stage 1 Phase B; PL-46 code-inspection landed in Stage 1 Phase A.0 as M48); newly-discovered items parked with stage hints.
6. Append a final capture JSONL entry: `{ts: <now>, by: "Hannah & Stan", entity: "coordinator", action: "delete", target: "stage1smoke", summary: "Revoked disposable Stage 1 smoke-test coordinator token per Stage 1 exit criteria", source: "spec_plannerUpdate_26apr23.md §Stage 1 Phase E", batch: "stage1_phaseE"}`.
7. Commit the spec + discoveryLog updates; push.

**Exit criteria:**
- Coordinator list: 3 tokens, no stage1smoke.
- Spec working-copy reflects post-Stage-1 reality.
- discoveryLog up to date.
- Parking Lot reflects actual stage-absorption + new-item hints.
- Stage 1 scope items #1 (unified diff engine), #2 (retroactive migration), #3 (Activity tab), #4 (commit and push of 1,162-line set), #5 (small additive spec append, NOT full rewrite), #8 (capture-now-inject-later pattern formalized) marked complete. #6 (multi-parent schema) and #7 (constraint-tooltip rendering) explicitly DEFERRED to Stage 2 per the locked decisions.

---

## Stage 1 Ticket Model — One Big Ticket

Per Scrybal directive 2026-04-24: one ticket per stage, not one ticket per phase. Claude executes autonomously in a single chat; the per-phase-ticket pattern is human-developer ceremony that collapses for autonomous execution. Stage 1 is **ONE consolidated ticket** covering Phase A.0 → Phase A → Phase B → Phase C → Phase D → Phase E, with per-phase exit criteria that Claude verifies before proceeding to the next phase.

**Ticket filename:** `ticket_plannerUpdate_stage1_all_v1.md` (singular, not stage1_all). Lives in `_handoff/` or the repo root (Scrybal decides cleanup timing per repo-local tasQ.md reminder #2).

**Ticket structure:**
- Single front-matter YAML with stage-wide metadata.
- Phase sections (A.0, A, B, C, D, E) each with their own goal, entry state, exit state, steps, exit criteria.
- Per-phase exit criteria replace per-ticket boundary checkpoints.
- Commit granularity preserved inside Phase D (6 commits pushed in order, each individually Netlify-build-verifiable; revert granularity = per commit, NOT per ticket).
- One Definition of Done covering the whole stage.
- One Failure Semantics section describing per-phase halt-vs-continue policy.

**What's kept:**
- Every commit individually revertible.
- Every POST atomic + snapshot-restore rollback-able.
- Every phase has its own pre-flight verification and exit-criteria check Claude runs before proceeding.
- Capture JSONL continues to append per mutation.

**What's dropped:**
- 10 front-matter blocks with 80% duplicate content.
- Per-ticket `depends_on` declarations (phases sequence inline).
- Per-ticket ceremony (invocation prompt, scope-lock recitation).
- Per-ticket filename generation for every phase.

**Commit sequence inside Phase D** (granularity preserved for Netlify build-verifiability):

1. Phase D Commit 1: SEED_VERSION top-up + schedule defaults (hunk #2 on planner.js + entire hanstan-schedule-defaults.js delta).
2. Phase D Commit 2: FAB scaffold + new helpers (hunks #4, #5 on planner.js; part of planner.css; planner/index.html).
3. Phase D Commit 3: People-tab role-filter + print (hunks #6, #7, #8 on planner.js; part of planner.css).
4. Phase D Commit 4: schedule-event materials-sheet integration (hunks #9, #10 on planner.js; part of planner.css; planner/index.html).
5. Phase D Commit 5: unified `diffStates()` engine + `whyNote` parameter + extended `diffCoordinators` (netlify/functions/planner-state.mjs).
6. Phase D Commit 6: Activity tab UI + full 5-button FAB + Full Add Task modal + nav reorder + hidden /admin slot + visibility-scope filter + site-spec additive append (planner/planner.js + planner/planner.css + planner/index.html + HANSTAN_WEDDING_SITE_SPEC.md).

`git push origin main` after each commit to verify Netlify build green before the next commit. If a build fails, halt, debug, `git revert` that one commit, re-push.

**Execution order within the ticket:** Phase A.0 → Phase A (commits Commit 5 locally, does not push) → Phase B (live POSTs; no code commit yet) → Phase C (commits Commit 6 locally, does not push) → Phase D (pushes the 4 hunk-commits first, then the Phase A commit, then the Phase C commit; 6 pushes total with Netlify-build-green check between each) → Phase E (cleanup + verify + revoke stage1smoke + append capture JSONL + final commit+push of spec/discoveryLog/parking-lot updates).

---

**End of Stage 1 phase-drafting.**
