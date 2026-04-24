# ticket_plannerUpdate_stage1_all_v1.md

**Single consolidated Stage 1 build ticket** per Scrybal directive 2026-04-24 ("one big ticket per stage, not one per phase").
Covers Phase A.0 → Phase A → Phase B → Phase C → Phase D → Phase E.
Each phase has its own pre-flight, steps, and exit-criteria check. Claude verifies exit criteria before advancing to next phase.

---

## Front Matter

```yaml
ticket_id: "plannerUpdate_stage1_all_v1"
project_name: "plannerUpdate"
date: "2026-04-24"
change_type: "feature"
template_version: "v4.2-autonomous"  # one-big-ticket variant for autonomous Claude execution

output_mode: "mixed"  # full_files for new code; delta_blocks for commits where a delta is clearer; live-POST phases are state-mutations out of repo scope
placement_method: "multi"  # multiple placement methods across phases; documented per-phase
idempotency: "one_shot"  # live POSTs + git commits are one-shot

trust_level: "strict"
preflight_validation: true
structured_warnings: true

files_modify:
  - "F:/Wedding Website/hanstan-wedding/netlify/functions/planner-state.mjs"
  - "F:/Wedding Website/hanstan-wedding/planner/planner.js"
  - "F:/Wedding Website/hanstan-wedding/planner/planner.css"
  - "F:/Wedding Website/hanstan-wedding/planner/index.html"
  - "F:/Wedding Website/hanstan-wedding/HANSTAN_WEDDING_SITE_SPEC.md"  # additive append only
  - "F:/Wedding Website/hanstan-wedding/_preUpdate_snapshots/capture_plannerUpdate_stage0_phaseC_2026-04-23.jsonl"  # append Phase B + E capture entries
  - "F:/Wedding Website/hanstan-wedding/discoveryLog_hanstanWedding.md"  # Phase E update
  - "F:/Wedding Website/hanstan-wedding/spec_plannerUpdate_26apr23.md"  # Phase E parking-lot strikethroughs

files_readonly:
  - "F:/Wedding Website/hanstan-wedding/spec_plannerUpdate_26apr23.md"  # also read-as-source before Phase-E update
  - "F:/Wedding Website/hanstan-wedding/data/planner-seed.json"
  - "F:/Wedding Website/hanstan-wedding/netlify/functions/planner-coordinators.mjs"
  - "F:/Wedding Website/hanstan-wedding/netlify/functions/planner-audit.mjs"
  - "F:/Wedding Website/hanstan-wedding/netlify/functions/planner-snapshots.mjs"
  - "F:/Wedding Website/hanstan-wedding/_preUpdate_snapshots/hunkCatalogue_plannerUpdate_stage0_phaseA_plannerJS_v1.md"
  - "F:/Wedding Website/hanstan-wedding/_preUpdate_snapshots/hunkCatalogue_plannerUpdate_stage0_phaseA_plannerCSS_v1.md"
  - "F:/Wedding Website/hanstan-wedding/_preUpdate_snapshots/stageOneCommitPlan_plannerUpdate_stage0_phaseD_v1.md"

files_forbidden:
  - "F:/Wedding Website/hanstan-wedding/HANSTAN_WEDDING_SITE_SPEC_preUpdate_plannerUpdate_stage0_26apr23.md"  # frozen; never modify
  - "F:/Wedding Website/hanstan-wedding/planner/hanstan-schedule-defaults.js"  # landed as-is from 1,162-line set; Phase D commits, no content change
  - "F:/Wedding Website/hanstan-wedding/data/planner-seed.json"  # seed is not re-read by live; stays uncommitted

modules_used:
  - "MODULE_API_CHANGE"  # Phase A code change
  - "MODULE_UI_CHANGE"   # Phase C code change

definition_of_done:
  - "Phase A.0: task M48 exists on live with investigation findings in desc; no separate markdown file created."
  - "Phase A: netlify/functions/planner-state.mjs has DIFFERS registry + 8 top-level differs (tasks, contacts, groups, tags, scheduleEvents, schedulePhases, scheduleQuestions, coordinators) + set-union field-key iteration + whyNote optional parameter + extended diffCoordinators. Committed locally as Commit 5 of Phase D sequence."
  - "Phase B: all non-duplicate capture-JSONL entries replayed into audit-log.json via syntheticAuditEntries; Stan + Hannah contacts updated-in-place with zoomLink + visibilitySet + constraints + notes-concatenation; visibilitySet propagated onto all 22 master-only tasks."
  - "Phase C: Activity tab renders unified audit stream with where/who/when/why format + 4 filters (person, date-range, action-type, visibility-scope) + master-only gate; nav reordered Settings-left/Activity-right/hidden admin slot; FAB menu has 5 buttons; Full Add Task modal opens and creates tasks; test-artifact entries filtered from UI. Committed locally as Commit 6 of Phase D sequence."
  - "Phase D: 7 commits pushed to origin/main in order (03f5639 Stage-0 + 4 hunk commits + Phase A commit + Phase C commit); every Netlify build green; live site renders the new UI."
  - "Phase E: stage1smoke token revoked via DELETE /.netlify/functions/planner-coordinators; 3 coordinator tokens remain (stanshan, shipsie, everfindingbeauty); discoveryLog + spec parking-lot + capture JSONL updated; final wrap-up commit pushed (origin/main at 8 commits ahead of pre-Stage-1 HEAD)."

depends_on:
  - "tickets_plannerUpdate_stage0_all_v1.md (executed 2026-04-24; Stage 0 complete)"

revision: 1
supersedes: ""

spec_excerpts_whitelisted:
  - "spec_plannerUpdate_26apr23.md §Stage 1 (entry state, exit state, non-goals, decisions locked, phases A.0–E, ticket model)"
  - "spec_plannerUpdate_26apr23.md §Schema Correction Banner (taskId vs id)"
  - "spec_plannerUpdate_26apr23.md §PU-7 (Structured Capture Protocol)"
  - "spec_plannerUpdate_26apr23.md §APL-1 (PL items referenced)"
  - "_preUpdate_snapshots/stageOneCommitPlan_plannerUpdate_stage0_phaseD_v1.md (hunk-commit plan for Phase D commits 1–4)"
  - "_preUpdate_snapshots/hunkCatalogue_plannerUpdate_stage0_phaseA_plannerJS_v1.md (hunk boundaries for commit-splitting)"
  - "_preUpdate_snapshots/hunkCatalogue_plannerUpdate_stage0_phaseA_plannerCSS_v1.md (ditto)"
```

---

## Pre-Flight Validation (before Phase A.0)

Emit block with the following checks; fail deterministically if any FAIL.

```
=== PRE-FLIGHT VALIDATION ===
ticket_id: plannerUpdate_stage1_all_v1
checks:
  - scope_lock_files_exist: { status: PASS|FAIL, detail: "all files_modify + files_readonly resolvable" }
  - live_endpoint_reachable: { status: PASS|FAIL, detail: "GET /planner-state returns 200" }
  - live_endpoint_accepts_syntheticAuditEntries: { status: PASS|FAIL, detail: "Stage 0 batch C.3c Part 1 commit 659ab57 deployed; field accepted" }
  - stage0_tickets_executed: { status: PASS|FAIL, detail: "D12 + D13 + M1–M35 + M37 present on live; stage1smoke token exists" }
  - capture_jsonl_has_73_entries: { status: PASS|FAIL, detail: "~73 entries expected post-Stage-0" }
  - local_main_ahead_by_one: { status: PASS|FAIL, detail: "03f5639 local-but-unpushed; origin/main at 659ab57" }
  - uncommitted_1162_line_set_intact: { status: PASS|FAIL, detail: "5 files modified: planner-seed.json + hanstan-schedule-defaults.js + index.html + planner.css + planner.js" }
  - netlify_deploy_status_ready: { status: PASS|FAIL, detail: "last deploy Ready" }
  - master_token_valid: { status: PASS|FAIL, detail: "stanshan returns 200 on GET planner-state" }
  - target_schema_verified: { status: PASS|FAIL, detail: "L14 — contact/task/scheduleEvent/schedulePhase/scheduleQuestion actual shapes match spec §Stage 1 Phase A Step 3 per 2026-04-24 audit" }
result: PASS|FAIL
=== END PRE-FLIGHT VALIDATION ===
```

On FAIL → emit failure block per CLAUDE_GOVERNANCE §12.6, halt.

---

# PHASE A.0 — Multi-parent task-group schema investigation → M48 task

## A.0 Pre-flight

Pre-conditions: global pre-flight PASS. No phase-specific extras.

## A.0 Steps

1. `grep -n "t\.group\|\.group ===\|group:" planner/planner.js` — record every site that reads/writes/filters by `t.group`.
2. `grep -n "group" netlify/functions/planner-state.mjs` — record any group-field handling in POST/GET/diff paths.
3. Inspect `renderPeople`, `renderTasks`, `groupTasksBy` (search for function definitions in planner.js) for secondary-group affordances.
4. Compose conclusion paragraph: likely outcome "Schema is hard single-string `t.group`; multi-parent support requires the PL-01 schema-extension work (Stage 2 scope). Current `tasks[].tags[]` workaround populated by Stage 0 M41 for B4 + Indian-family rolodex cards is the temporary cross-surface mechanism; render-layer does not yet aggregate tasks across parent-group dimensions." But actual conclusion depends on grep output; confirm or update.
5. GET live state. Find next available M-id (expected M48 per spec §C.3 M38-is-skipped guidance). Build task object:
   ```json
   {
     "id": "t<Date.now()>",
     "taskId": "M48",
     "workstream": "m",
     "title": "Multi-parent task-group schema investigation (PL-46 result)",
     "desc": "<conclusion from Step 4, full>",
     "priority": "low",
     "status": "done",
     "quadrant": "q4",
     "deadline": "",
     "persona": "",
     "assignee": "Stan",
     "location": "",
     "contacts": "",
     "tags": ["investigation", "schema", "pl-46-result", "stage1"],
     "blockedBy": "",
     "group": "Website",
     "subtasks": [],
     "comments": [],
     "recurring": "",
     "reminder": "",
     "modified": "<now>",
     "history": [{"action": "Created", "time": "<now>"}],
     "created": "<now>"
   }
   ```
6. POST to planner-state with body `{state: <live-state-with-M48-appended>, by: "Hannah & Stan"}`. Expect 200.
7. Verify via fresh GET: M48 present with correct taskId + status + desc length > 200 chars.
8. Append capture JSONL:
   ```json
   {"ts":"<now>","by":"Hannah & Stan","entity":"task","action":"create","target":"M48","summary":"PL-46 multi-parent schema investigation result; status=done on creation","source":"spec_plannerUpdate_26apr23.md §Stage 1 Phase A.0","batch":"stage1_phaseA0"}
   ```

## A.0 Exit Criteria

- M48 exists on live with status=done, desc > 200 chars (substantive conclusion).
- No separate markdown file in the repo.
- Capture JSONL has 1 new entry with batch="stage1_phaseA0".

If any criterion fails → halt, emit failure block, do not advance to Phase A.

---

# PHASE A — Unified diffStates() engine

## A Pre-flight

Read current `netlify/functions/planner-state.mjs`. Confirm:
- Current `diffStates(prev, next, by)` function exists (line 36 at Stage 0 observation; verify current).
- Current `appendAudit(store, newEntries)` helper exists.
- `syntheticAuditEntries` acceptance block from Stage 0 batch C.3c Part 1 is present.

## A Steps

1. Read `planner-state.mjs` start-to-end. Locate diffStates + appendAudit + POST handler.
2. Refactor existing task/contact/group/tag diff logic into per-entity helpers:
   - `diffTasks(prev, next, by, whyNote)`
   - `diffContacts(prev, next, by, whyNote)`
   - `diffGroups(prev, next, by, whyNote)`
   - `diffTags(prev, next, by, whyNote)`
   Preserve existing behavior exactly — backwards-compatible audit output.
3. Add 4 new differs with the same signature:
   - `diffScheduleEvents(prev, next, by, whyNote)` — covers every field in the actual live schema verified 2026-04-24: `title`, `details`, `startTime`, `duration`, `status`, `zone`, `parallelGroup`, `isMilestone`, `isGuestVisible` (scalars); `people[]`, `itemsToBring[]`, `notes` (arrays/compound). people[] → person.add/remove/update-role sub-entries with entity="scheduleEvent". itemsToBring[] → materialsCheck.toggle/add/del sub-entries. notes → note.add/edit/remove sub-entries.
   - `diffSchedulePhases(prev, next, by, whyNote)` — covers `number`, `title`, `color`, `collapsed`, `note` (scalars); `eventIds[]` (array → phase-event-add/remove).
   - `diffScheduleQuestions(prev, next, by, whyNote)` — covers `question`, `eventId`, `status`, `resolution`, `resolvedDate` (all scalars). Note: question-text field is `question`, NOT `text`.
   - `diffCoordinators(prev, next, by, whyNote)` — covers add/remove + field mutations (`isMaster` toggle, `name` edit, future `scopedEntities[]`/`visibilitySet[]`). Input is an object keyed by token, not an array; adapt iteration accordingly.
4. **Set-union field-key iteration rule:** each differ iterates `Object.keys({...prevRecord, ...nextRecord})` for scalar fields, skipping the already-handled compound fields. Any new scalar field added to live state in the future is automatically diffed. Exclusions: `id`, `modified`, `history`, `created` (meta-fields that change every POST and would spam audit log).
5. Build DIFFERS registry at top of file:
   ```js
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
   ```
   Note: `coordinators` is in a separate blob, not in PlannerState; the differ runs only if both prev+next snapshots include a coordinators field. For Stage 1, coordinator changes still go through planner-coordinators.mjs which has its own audit hook; the diff-from-state-POST path is additive and only fires if a caller includes coordinators in state (none currently do).
6. Rewrite `diffStates(prev, next, by, whyNote)`:
   ```js
   function diffStates(prev, next, by, whyNote) {
     return Object.entries(DIFFERS).flatMap(([key, fn]) =>
       fn(prev[key] || (key === 'coordinators' ? {} : []), next[key] || (key === 'coordinators' ? {} : []), by, whyNote)
     );
   }
   ```
7. Ensure every emitted entry includes `entity: <key>` in addition to the existing `{ts, by, action, target, summary}` shape. If `whyNote` is supplied, include `why: whyNote` on each entry.
8. Preserve the `target: t.taskId || id` fallback in task differ per schema correction banner.
9. Add inline test-comment block at top of diffStates documenting expected input/output for each differ.
10. `git add -- netlify/functions/planner-state.mjs`. Commit locally with message:
    `planner-state: unified diffStates() engine — DIFFERS registry + 4 new differs (scheduleEvents/Phases/Questions, coordinators) + whyNote parameter + set-union field-key iteration (spec_plannerUpdate_26apr23.md §Stage 1 Phase A)`
11. DO NOT push yet — pushed in Phase D.

## A Exit Criteria

- `planner-state.mjs` contains DIFFERS registry with 8 entries.
- Every pre-existing differ behavior preserved (task create/update/delete, contact person.create/update/delete, group.create/delete, tag.add/remove).
- New differ behaviors observable in unit-test comment block.
- `whyNote` optional 4th parameter documented in diffStates signature comment.
- `git log -1 --oneline` shows the Phase A commit locally.
- No push.
- No modification to client-side code.

---

# PHASE B — PL-42 absorption + visibilitySet propagation + retroactive audit replay

## B Pre-flight

- Phase A commit exists locally.
- Capture JSONL at `_preUpdate_snapshots/capture_plannerUpdate_stage0_phaseC_2026-04-23.jsonl` reachable with ~73 entries.
- Live state has 22 master-only-tagged tasks (verified 2026-04-24 audit).
- Live state has Stan (p2) + Hannah (p1) contacts already present (verified 2026-04-24 audit).

## B Steps

### B.0a — Update Stan + Hannah contacts in place (additive-merge per Scrybal directive 2026-04-24)

1. GET live state.
2. Find Stan contact by `name` matching `/stan/i`. Update in place:
   - Add `email: "scryballer@gmail.com"` (was empty).
   - Append to `notes`: " | Master-token holder (stanshan is shared with Hannah). Permanent Zoom meeting room: https://us06web.zoom.us/j/7933306691 (visibility: stanshan + shipsie + everfindingbeauty only)."
   - Add `zoomLink: "https://us06web.zoom.us/j/7933306691"`.
   - Add `visibilitySet: ["stanshan", "shipsie", "everfindingbeauty"]`.
   - Add `constraints: []` (empty, for future).
   - Preserve `specificRole: "Groom"` (not "co-master" — Scrybal explicitly doesn't care about that label).
   - Preserve existing notes content; append only.
3. Find Hannah contact by `name === "Hannah"`. Update in place:
   - Leave `name` as "Hannah" (Scrybal: "Hannah's a bride" — name-change not needed).
   - Leave `specificRole: "Bride"`.
   - `role: "bridal"` → **leave as-is** for Stage 1 (data-hygiene task for later; Scrybal acknowledged it's a probable typo but said "nobody cares about that label").
   - Append to `notes`: " | Master-token holder (stanshan is shared with Stan). Permanent Zoom meeting room: https://us06web.zoom.us/j/7933306691 (visibility: stanshan + shipsie + everfindingbeauty only)."
   - Add `zoomLink: "https://us06web.zoom.us/j/7933306691"`.
   - Add `visibilitySet: ["stanshan", "shipsie", "everfindingbeauty"]`.
   - Add `constraints: []`.

### B.0b — Propagate visibilitySet[] onto every master-only-tagged record (Stage 2 easement #1)

4. For each task in `state.tasks[]` with `tags.includes("master-only")` (expected count 22), set `visibilitySet: ["stanshan"]` if the field is absent. Do not overwrite existing visibilitySet values.
5. Counts check: after the loop, confirm 22 tasks have visibilitySet populated.

### B.1 — Retroactive audit replay

6. GET current audit-log.json via `/.netlify/functions/planner-audit`.
7. Read capture JSONL; parse each line. Filter out entries with `by === "Elsie"` (already injected at Stage 0 batch C.3c Part 2).
8. Compute match-key `<ts>|<by>|<action>|<target>` for each remaining capture entry and each audit-log entry.
9. For each remaining capture entry:
    - If its match-key already appears in audit-log → skip (auto-captured organic).
    - Else → build synthetic-audit payload preserving all original fields (`ts, by, action, target, summary`, plus optional `entity, field, from, to`).
10. Assemble non-duplicate list.

### B.2 — Combined POST

11. Build POST body:
    ```json
    {
      "state": <full live state with B.0a Stan+Hannah updates + B.0b visibilitySet propagation applied>,
      "by": "Hannah & Stan",
      "syntheticAuditEntries": [<non-duplicate capture entries from B.1>]
    }
    ```
12. POST to `/.netlify/functions/planner-state`. Expect 200 + `ok: true`.

### B.3 — Verify + capture

13. Fresh GET state (cache-busted). Verify:
    - Stan contact has `zoomLink`, `visibilitySet`, `email: "scryballer@gmail.com"`, notes contains "Zoom meeting room".
    - Hannah contact has same (minus the name change).
    - 22 master-only tasks have `visibilitySet: ["stanshan"]`.
14. Fresh GET audit log. Verify:
    - `audit.entries.length` has grown by (non-duplicate capture count + 2 contact.update entries + 22 task.update entries or however many diff-states emits).
    - Every non-duplicate capture entry's match-key appears.
15. Append capture JSONL lines:
    - 1 entry for B.0a Stan contact update.
    - 1 entry for B.0a Hannah contact update.
    - 1 summary entry: "replayCaptureJsonl: N non-duplicate entries injected".
    - 1 summary entry: "visibilitySet propagated onto 22 master-only tasks (Stage 2 easement #1)".
    All with `batch: "stage1_phaseB"`.

## B Exit Criteria

- Stan contact on live has zoomLink + visibilitySet + email + notes appended.
- Hannah contact on live has zoomLink + visibilitySet + notes appended.
- 22 master-only tasks have `visibilitySet: ["stanshan"]`.
- Audit log grew by the expected amount.
- Capture JSONL has 4 new entries with batch=stage1_phaseB.
- No code commit yet (Phase B is live-POST-only; code commits happen in A and C).

---

# PHASE C — Activity tab UI + full FAB + Full Add Task modal + nav reorder + easements

## C Pre-flight

- Phase A + Phase B complete.
- planner/planner.js + planner/planner.css + planner/index.html reachable.
- `renderActivity` is NOT yet present in planner.js (History view exists with different name).

## C Steps

### C.1 — Nav reorder

1. Read `planner/index.html`. Locate main nav ribbon (likely `<nav>` or `<ul class="main-nav">` or similar).
2. Rename `History` → `Activity` in the nav ribbon.
3. Reorder: Settings far-left, then Focus, then `<li class="nav-admin-slot" style="display:none" data-stage2-reserved="admin"></li>` (Stage 2 easement #4), then Tasks, Schedule, People, Activity (far-right).

### C.2 — CSS

4. Add `.nav-admin-slot { display: none; }` explicit rule to planner.css (redundant with inline style, but makes reservation searchable).
5. Update any sticky-tab or ribbon-layout rules that assumed the old order.

### C.3 — Activity renderer

6. In planner.js, rename `renderHistory` → `renderActivity`. Keep old name as alias if any external code references it.
7. Point the renderer at `/.netlify/functions/planner-audit` (single source of truth).
8. Implement where/who/when/why derivation per audit entry:
   - `where`: map `entity` to tab-label:
     - `task` → "Tasks"
     - `scheduleEvent` → "Schedule ▸ event"
     - `schedulePhase` → "Schedule ▸ phase"
     - `scheduleQuestion` → "Schedule ▸ question"
     - `contact` / `person` → "People"
     - `group` → "Groups"
     - `tag` → "Tags"
     - `coordinator` → "Coordinators"
     - `note` → "Note"
     - fallback → raw entity string
   - Append `target` as item label + `field` if present.
   - `who`: resolve `by` against coordinators list first; fallback to raw `by` string.
   - `when`: ISO local + italicized relative via `formatRelativeCompact(ts)`. Zero-units-suppressed.
   - `why`: show if entry has `why` field (Stage 2 hook; Stage 1 no-op).

### C.4 — `formatRelativeCompact` helper

9. Add helper function:
   ```js
   function formatRelativeCompact(tsStr) {
     const ms = Date.now() - new Date(tsStr).getTime();
     if (ms < 60000) return Math.floor(ms / 1000) + 's ago';
     const m = Math.floor(ms / 60000), h = Math.floor(m / 60), d = Math.floor(h / 24);
     if (d > 0) return (h % 24 ? d + 'd ' + (h % 24) + 'h' : d + 'd') + ' ago';
     if (h > 0) return (m % 60 ? h + 'h ' + (m % 60) + 'm' : h + 'h') + ' ago';
     return m + 'm ago';
   }
   ```

### C.5 — Filters

10. Implement 4 filters. UI: a filter bar above the Activity log list.
    - **Person** (single-select dropdown): options = distinct `by` values ∪ coordinator names.
    - **Date-range** (two date inputs + 4 quick-presets: 24h, 7d, 30d, all).
    - **Action-type** (multi-select): options = distinct `action` values in the current log.
    - **Visibility-scope** (single-select, Stage 2 easement #3): options = `union(record.visibilitySet[])` for records referenced by audit entries + literal `"master-only"` (for tasks with `tags.includes("master-only")` that lack explicit visibilitySet). Inert in Stage 1 (only `["stanshan"]` visible) but wired.
11. Filters combine with AND. Empty filter = no constraint.
12. Filter out `target === "test-artifact"` at renderer level (§PU-11 integrity-check recommendation).

### C.6 — Master-only gate

13. Check `PREFS.isMaster` (or derive from token's `isMaster` flag on coordinators fetch).
14. Non-master tokens see: "Activity log is master-only. Contact Scrybal if you believe you should have access."

### C.7 — Auto-refresh

15. Wire renderActivity to fire on every successful `save()` / POST completion (tap the existing save callback).

### C.8 — FAB full menu (PL-10, PL-11)

16. Read current FAB DOM (from 1,162-line set, landed as Commit 2 in Phase D — **but Phase D hasn't happened yet at Phase C execution time**). Strategy: the Commit 2 changes exist in the uncommitted working tree NOW. Phase C modifies the same files on top of those working-tree changes. Phase D commits them all.
17. In planner/index.html, locate the FAB menu DOM (from hunk catalogue: index.html gained `fabMenuEl` + 2 buttons).
18. Add 3 more buttons: Note, Person, Event. Each with an accessible label + icon.
19. Wire each button to a handler:
    - Note → `quickAddNote()` — creates a task with `group: "All"`, tag `"note"`, title = prompt() value (keep scope minimal).
    - Person → `quickAddPerson()` — opens small modal with `name` + `role` inputs; on submit, appends a contact to state.contacts[] and POSTs.
    - Event → `quickAddEvent()` — opens small modal with `title` + `startTime` + `duration` inputs; on submit, appends to state.scheduleEvents[] and POSTs.
20. If any handler balloons > 30 LoC, stub it disabled with tooltip "Coming in Stage 2" and note in Exit Criteria. Scope discipline.

### C.9 — Full Add Task modal (PL-12)

21. Build modal DOM structurally identical to existing Edit Task modal. Reuse the existing edit modal's rendering helper if it exists.
22. Wire the existing `fullAdd()` helper (from the 1,162-line set's planner.js) to open the new modal and on submit create the task.
23. Full-add button in FAB menu already exists (from 1,162-line set); confirm wiring.

### C.10 — Commit

24. `git add -- planner/planner.js planner/planner.css planner/index.html HANSTAN_WEDDING_SITE_SPEC.md` (spec file gets an additive append below).

### C.11 — Small additive site-spec append (NOT rewrite)

25. Append to HANSTAN_WEDDING_SITE_SPEC.md (after §14.X syntheticAuditEntries section from Stage 0):

    ```markdown
    ### §14.Y — Activity tab + full 5-button FAB + Full Add Task modal + new schema fields (added 2026-04-24, Stage 1 Phase C)

    **Activity tab** replaces the old History tab. Master-only visibility. Renders the unified audit stream (via `/.netlify/functions/planner-audit`) in where/who/when/why format. Four filters: person, date-range, action-type, visibility-scope (Stage 2 easement #3). Nav ribbon reordered: Settings far-left, Activity far-right, hidden `/admin` slot reserved between Focus and Tasks for Stage 2 absorption.

    **FAB menu** now has 5 buttons: Quick-Add (existing), Full-Add (existing, wires to new modal), Note, Person, Event.

    **Full Add Task modal** structurally identical to Edit Task modal; opens from the FAB Full-Add button.

    **New schema fields (additive, populated in Stage 1 Phase B, unread until Stage 2):**
    - `contacts[].zoomLink: string` — permanent Zoom meeting room URL. Populated on Stan + Hannah contacts in Stage 1.
    - `contacts[].visibilitySet: string[]` — array of coordinator tokens that may see master-only content associated with this contact. Stage 2's render-path filtering consumes this.
    - `contacts[].constraints: string[]` — array of day-of constraint strings. Populated on Elsie/Fen/Bonnie/Sarah in Stage 0.
    - `tasks[].visibilitySet: string[]` — same shape as contact version. Populated on 22 master-only tasks in Stage 1.
    - `auditEntries[].why: string?` — optional free-text reason-for-change captured at edit time. Stage 2 Quick-Edit flow populates; Stage 1 renderer handles if present.

    Full site-spec rewrite deferred to end-of-all-stages audit per Scrybal directive 2026-04-24.
    ```

26. Commit with message:
    `planner: Activity tab + full 5-button FAB + Full Add Task modal + nav reorder + visibility-scope filter + small additive site-spec append (spec_plannerUpdate_26apr23.md §Stage 1 Phase C)`

## C Exit Criteria

- Activity tab DOM renders with 4 filters + auto-refresh + master-only gate.
- FAB menu has 5 buttons (any stubbed-as-disabled documented here).
- Full Add Task modal DOM present.
- Nav reordered + hidden admin slot present.
- Site-spec §14.Y section appended.
- Commit visible in `git log -1` with all 4 files staged.
- No push.

---

# PHASE D — Commit and push sequence

## D Pre-flight

- Phase A commit + Phase C commit exist locally.
- 1,162-line modification set still uncommitted on 5 files (seed JSON, schedule-defaults, index.html, planner.css, planner.js).

Wait — Phase C modified `planner/planner.js`, `planner/planner.css`, `planner/index.html`, and `HANSTAN_WEDDING_SITE_SPEC.md` on top of the 1,162-line set. So the working tree now has:
- 4 files with BOTH the 1,162-line hunks AND Phase C additions mixed.
- 1 file (planner-state.mjs) already committed in Phase A.
- Several files that are pure 1,162-line (data/planner-seed.json, planner/hanstan-schedule-defaults.js) untouched by Phase C.

**This creates a staging challenge for Phase D.** The `stageOneCommitPlan` envisions 4 hunk-commits splitting the 1,162-line hunks into 4 logical groups, THEN the Phase A + Phase C commits on top. But after Phase C ran, those 4 files have both the hunks AND Phase C's additions mixed in the working tree.

**Resolution strategy:** use `git add -p` style path-limited + patch-limited staging. Specifically:

- For each of the 4 hunk-commits (Commit 1–4), use `git add -p <path>` to select only the hunks that belong to that commit.
- Phase A's commit (Commit 5) was already made; skip.
- Phase C's commit (Commit 6) was already made; skip.

But Phase C's modifications to planner.js/planner.css/planner/index.html may **overlap** with 1,162-line hunks. If Phase C added code near a 1,162-line-set location, the hunk boundaries shift.

**Mitigation:** before Phase C, record the exact hunk boundaries from `git diff origin/main -- <file>` (already done in Phase A hunk catalogues). After Phase C, those catalogue line-numbers are stale for planner.js/planner.css/planner/index.html because Phase C added lines. For Phase D commit splitting, use `git add -p` interactively — Claude drives this via selecting hunks by semantic content, not line number.

**Simpler alternative (Scrybal-approved implicit via one-big-ticket philosophy):** collapse Commits 1–4 into a single commit covering the entire 1,162-line set, then Commit 5 (Phase A) is already done, then Commit 6 (Phase C) is already done. Net: 3 commits instead of 6. Less revert granularity but less risk of mis-staging at Phase C overlap boundaries.

**Decision:** collapse to 3 commits. Revert granularity per Netlify build unit stays individually-revertible; the logical-commit-splitting was never more than a human-reviewer ergonomic — autonomous Claude doesn't benefit from it, and the risk of mis-staging overlap with Phase C outweighs the ergonomic benefit.

Revised Phase D sequence:
- Pre-existing local commit: `03f5639` (Stage 0 Phase D).
- **Commit 1 (new):** the 1,162-line modification set — all 5 files. Message: `planner: land 1,162-line Phase-A-KEEP set (SEED_VERSION top-up + schedule defaults + FAB scaffold + People-tab role-filter + materials-sheet) in one bundle per one-big-ticket simplification (spec_plannerUpdate_26apr23.md §Stage 1 Phase D)`.
- **Commit 2 (already made, Phase A):** `planner-state: unified diffStates() engine ...`.
- **Commit 3 (already made, Phase C):** `planner: Activity tab + full FAB + Full Add modal + ...`.

But wait — Phase C modified files that also carry the 1,162-line hunks. If I commit the 1,162-line set first, Phase C's additions are part of the same working-tree diff. Order matters: Phase C's commit must go AFTER the 1,162-line commit OR the 1,162-line commit must be synthesized from a git-stash.

**Simplest correct approach:**
1. Git-stash the Phase C modifications BEFORE committing the 1,162-line set.
2. `git add -- data/planner-seed.json planner/hanstan-schedule-defaults.js planner/index.html planner/planner.css planner/planner.js` → Commit 1.
3. `git stash pop` → Phase C mods restored on top.
4. `git add -- planner/planner.js planner/planner.css planner/index.html HANSTAN_WEDDING_SITE_SPEC.md` → Commit 3 (Phase C).

But Phase A's commit (Commit 2) is sandwiched. It was made BEFORE Phase C. So the actual git log order at Phase D entry is:
- HEAD: Phase C commit (Commit 3)
- HEAD~1: Phase A commit (Commit 2)
- HEAD~2: Stage-0 Phase D commit (03f5639)
- HEAD~3: origin/main (659ab57)

The 1,162-line set is uncommitted. Inserting it between Stage-0 Phase D and Phase A would require `git rebase -i` which the session-level rules prohibit (CLAUDE.md forbids `git rebase -i` interactive). Alternative: commit the 1,162-line set AFTER the Phase C commit. Then the log reads:

- HEAD: 1,162-line set commit
- HEAD~1: Phase C commit
- HEAD~2: Phase A commit
- HEAD~3: Stage-0 Phase D commit
- HEAD~4: origin/main

Problem: Netlify will build each commit. If the 1,162-line set deploys LAST, then Phase C's code (which depends on the FAB scaffold from the 1,162-line set) runs without the FAB scaffold for 3 deploys in a row. **The FAB buttons Phase C adds will reference DOM elements that don't exist yet.** Broken UI for 3 deploys, then fixed on commit 4.

**Ugh. This is the real reason the hunk-commit-splitting mattered.**

**Actual correct sequence** (undoing my "simpler alternative" — it's wrong):

1. Stash Phase C mods.
2. Stash Phase A mods (via `git stash pop`? No — Phase A was already committed). Instead: `git reset --soft HEAD~2` to undo Phase A commit + Phase C commit WITHOUT losing the changes (they become staged).
3. Unstage the Phase C changes → they go back to working tree.
4. Now 1,162-line set + Phase A + Phase C are all in working tree, no new commits beyond 03f5639.
5. Commit the 1,162-line set (5 files — seed, schedule-defaults, index.html, planner.css, planner.js — but ONLY their pre-Phase-C hunks).
6. Commit Phase A (planner-state.mjs).
7. Commit Phase C (planner.js + css + index.html + HANSTAN_WEDDING_SITE_SPEC.md — the additive deltas from Phase C).
8. Push all in order.

This requires careful working-tree manipulation. `git reset --soft` is allowed (not hard, not force-push).

**Actually, the cleanest approach:** do Phase D FIRST, before Phase C. Phase C should come after the 1,162-line set is committed + pushed + deployed. That way Phase C's FAB-button additions work against a live DOM that has the FAB scaffold.

**But** Phase C was already described with commit-on-top-of-working-tree semantics, and has been committed locally already. Re-ordering requires git surgery.

**RESOLUTION** — the clean approach that avoids git surgery:

**New Phase D plan, authored 2026-04-24 during audit:**

At Phase D entry, the git state is:
- `HEAD` = Phase C commit (Commit C6 — covers: Activity tab, FAB additions, Full Add modal, nav reorder, §14.Y spec append).
- `HEAD~1` = Phase A commit (Commit A5 — covers: planner-state.mjs unified diffStates).
- `HEAD~2` = Stage-0 Phase D commit `03f5639`.
- `HEAD~3` = origin/main `659ab57`.
- Working tree: 1,162-line set still uncommitted on 5 files (none of those 5 files have Phase C modifications; Phase C only touches 4 files and 3 of them overlap with the 1,162-line set — planner.js, planner.css, planner/index.html — AND planner.js was NOT in 1,162-line set's "touched files" for planner-state.mjs). Wait — planner-state.mjs is NOT in the 1,162-line set (confirmed by `git status` during Stage 0). The 1,162-line set touches: data/planner-seed.json, planner/hanstan-schedule-defaults.js, planner/index.html, planner/planner.css, planner/planner.js. Phase C touches: planner/planner.js, planner/planner.css, planner/index.html, HANSTAN_WEDDING_SITE_SPEC.md. Overlap: planner.js + planner.css + planner/index.html (3 files).

After Phase C's commit, those 3 files are AT Phase-C-clean-state in the index (staged and committed). The 1,162-line set that was also in those 3 files in the working tree is now: either merged-in (if Phase C built on top of them, which it did) OR lost (if Phase C's commit replaced the whole file). Git commits capture the working-tree at time-of-commit, so the Phase C commit includes BOTH the 1,162-line set AND Phase C's additions to those 3 files. The 1,162-line set for data/planner-seed.json + planner/hanstan-schedule-defaults.js remains uncommitted.

**So after Phase A + Phase C commits, the uncommitted working tree has ONLY:**
- data/planner-seed.json (1,162-line subset — its D1-D11 task definitions which are redundant-with-live post-Stage-0)
- planner/hanstan-schedule-defaults.js (SEED_VERSION=3 bump + new events/questions)

The other 3 overlap files were already committed in Phase C (with BOTH sets mixed in the single commit).

**Revised Phase D** (final, no git surgery):

1. `git status` — confirm only 2 files remain uncommitted: data/planner-seed.json + planner/hanstan-schedule-defaults.js.
2. `git add -- data/planner-seed.json planner/hanstan-schedule-defaults.js`.
3. Commit with message: `planner: SEED_VERSION=3 bump in hanstan-schedule-defaults + D1-D11 task definitions in planner-seed (seed is first-boot-only; D-series tasks are already on live from Stage 0 batch C.2 — this commit is for seed-fidelity with live state)`.
4. Push origin main. Watch Netlify build. Expect green.
5. Done. 4 commits total pushed in Phase D: 03f5639 (Stage-0) + seed-and-defaults + Phase A + Phase C.

**Netlify-build-safety note:** the FAB scaffold from the 1,162-line set (in planner/index.html + planner.css + planner.js) was bundled into Phase C's commit. So when Phase C deploys, the FAB scaffold deploys simultaneously with Phase C's additions (5-button FAB, Full Add modal). No broken-intermediate-deploy risk.

**Loss:** per-hunk commit granularity is gone. Revert granularity is per-phase-commit. If Phase C breaks, `git revert <phaseC-hash>` undoes the ENTIRE 1,162-line set for those 3 files PLUS Phase C's additions. Acceptable risk given the one-big-ticket simplification.

## D Steps (Final)

1. `git status` — verify only data/planner-seed.json + planner/hanstan-schedule-defaults.js remain uncommitted. If other files are uncommitted, halt and investigate.
2. `git add -- data/planner-seed.json planner/hanstan-schedule-defaults.js`.
3. `git commit -m "planner: seed + schedule-defaults from Phase A KEEP set (SEED_VERSION=3 bump + D1-D11 seed definitions for first-boot-fidelity with live state) — spec §Stage 1 Phase D"`.
4. `git push origin main`.
5. Wait for Netlify deploy. Verify status=Ready (via Chrome connector if available, else wait ~120s and probe `https://hanstan.wedding/planner/` for 200).
6. Smoke test: load `https://hanstan.wedding/planner/` as stanshan. Confirm:
    - Nav shows Settings left, Activity right, new Activity tab clickable.
    - FAB button opens 5-button menu.
    - Full-Add button opens task modal.
    - Activity tab renders audit entries.
7. If any smoke test fails → attempt revert of the offending commit(s), re-smoke, report.

## D Exit Criteria

- `git log origin/main..HEAD` returns empty (all local commits pushed).
- Netlify shows Ready for the push.
- Live site loads and exhibits all 6 new behaviors.
- 1,162-line modification set is now fully committed (both directly and via Phase C bundling).

---

# PHASE E — Cleanup + final wrap-up commit

## E Pre-flight

- Phase D pushed successfully.
- stage1smoke still in coordinators list.

## E Steps

1. `DELETE /.netlify/functions/planner-coordinators` with body `{token: "stage1smoke"}`, Bearer stanshan. Expect 200 + `ok: true`.
2. Verify: fresh GET /planner-coordinators shows 3 tokens: stanshan, shipsie, everfindingbeauty.
3. Smoke test the Activity tab as shipsie (Elsie's token) in browser (Chrome connector or manual) — should see master-only placeholder.
4. Update `discoveryLog_hanstanWedding.md` with any Stage 1 Tier-1/2/3 discoveries surfaced during execution (write tier entries inline, not as separate files). Include at minimum:
    - Tier 2 candidate: "spec audits must include live-reality (L14) checks, not just document-internal checks" (surfaced 2026-04-24).
    - Tier 2 candidate: "one-big-ticket-per-stage convention supersedes one-ticket-per-phase for autonomous Claude execution" (surfaced 2026-04-24).
    - Any others surfaced during Phase A–D execution.
5. Update `spec_plannerUpdate_26apr23.md` Parking Lot appendix: strikethrough PL-28, PL-29, PL-30, PL-31, PL-45 (absorbed Stage 1 Phase C), PL-42 (absorbed Phase B), PL-46 (absorbed Phase A.0 as M48), PL-10/PL-11/PL-12 (absorbed Phase C).
6. Append final capture JSONL entry:
    ```json
    {"ts":"<now>","by":"Hannah & Stan","entity":"coordinator","action":"delete","target":"stage1smoke","summary":"Revoked stage1smoke test coordinator token per Stage 1 Phase E exit","source":"spec_plannerUpdate_26apr23.md §Stage 1 Phase E","batch":"stage1_phaseE"}
    ```
7. Stage the 3 modified files (discoveryLog + spec + capture JSONL). Commit:
    `planner-stage1-wrap-up: parking-lot strikethroughs + discoveryLog entries + stage1smoke revocation capture + torch-pass readiness (spec_plannerUpdate_26apr23.md §Stage 1 Phase E)`
8. Push origin main.

## E Exit Criteria

- 3 coordinator tokens, no stage1smoke.
- Master-only gate works for non-master tokens.
- discoveryLog up to date.
- Parking Lot appendix reflects Stage 1 absorptions.
- Final wrap-up commit pushed.
- origin/main is at 8 commits ahead of the pre-Stage-1 HEAD (659ab57).

---

## Overall Definition of Done

All phase exit criteria met. Live site reflects unified engine + Activity tab + nav reorder + FAB 5-button + Full Add modal. stage1smoke revoked. discoveryLog + parking-lot + capture JSONL current. 8 commits pushed.

## Failure Semantics

- **Phase A.0 fail** → halt. Investigation cannot be bypassed; it informs Stage 2.
- **Phase A fail** → halt. Engine is foundation for B + C.
- **Phase B fail** → halt if contact updates or master-only-task propagation fails (data-integrity risk). Partial success: if replay fails mid-way but contacts updated, emit partial-completion block, snapshot-restore rollback available.
- **Phase C fail** → halt if commit fails. Partial success: individual step failures (e.g. Person/Event quickAdd handlers ballooning) are acceptable as stubbed-disabled per §C.8 scope-discipline rule; document in exit criteria and proceed.
- **Phase D fail** → halt at first failed build. Revert that commit. Do not proceed to Phase E until Phase D clean.
- **Phase E fail** → not critical path. Revocation + parking-lot + discoveryLog updates can be retried in a subsequent session. Torch-pass doc should mention any uncompleted E steps.

## Target-Schema Verification (L14)

Performed 2026-04-24 before ticket execution:
- Contact schema: `{id, name, role, specificRole, phone, email, notes}` — 28 contacts on live, zero have zoomLink/visibilitySet yet (safe additive).
- Task schema: `{id, taskId, workstream, title, desc, priority, status, quadrant, deadline, persona, assignee, location, contacts, tags, blockedBy, group, subtasks, comments, history, recurring, reminder, modified, created}` — 117 tasks, 22 master-only-tagged, zero have visibilitySet (safe additive).
- ScheduleEvent schema: `{id, title, details, startTime, duration, status, zone, people, itemsToBring, notes, isMilestone, isGuestVisible, parallelGroup}` — 96 events.
- SchedulePhase schema: `{id, number, title, color, note, collapsed, eventIds}` — 8 phases.
- ScheduleQuestion schema: `{id, question, eventId, status, resolution, resolvedDate}` — 17 questions.
- Coordinator schema: `{token, name, isMaster, addedAt, addedBy}` — 4 tokens (stanshan, shipsie, everfindingbeauty, stage1smoke).
- planner-coordinators.mjs DELETE method verified supported (404 not_found returned for probe token).

Every field referenced in Phase A differ scope + Phase B mutation targets + Phase C renderer mapping is verified against actual live shapes. No schema drift. L14 PASS.

---

**End of ticket.**
