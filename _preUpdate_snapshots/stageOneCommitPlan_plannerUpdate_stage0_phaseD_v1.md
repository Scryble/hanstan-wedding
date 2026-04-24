# Stage 1 Commit Plan — plannerUpdate

**Generated:** 2026-04-24 by batch phaseD_batchNone_frozenSpecAndGovernance_v1
**Source:** Phase A hunk catalogues (`hunkCatalogue_plannerUpdate_stage0_phaseA_plannerJS_v1.md` + `_plannerCSS_v1.md`) plus the Phase A-recommended KEEP/DROP/MODIFY per hunk.
**Purpose:** per-file, per-hunk staging plan for the 1,162-line uncommitted local-clone modification set, with proposed commit boundaries + commit messages, to be executed during Stage 1 item #4 (git commit + push).

---

## Summary

All 14 hunks across planner.js (10) and planner.css (4) are recommended **KEEP** per Phase A. Zero DROP, zero MODIFY. Line-count reconciliation against spec §A.2 matched within trivial delta (JS +369 actual vs +384 spec-asserted, CSS +124 actual vs +127 spec-asserted — both within unified-context variance).

## Proposed Stage 1 commit boundaries

Four logically-separable commits, pushed together at Stage 1 item #4 execution:

### Commit 1 — `planner: SEED_VERSION top-up scaffolding + schedule defaults additions`

**Files:** `planner/hanstan-schedule-defaults.js`, `planner/planner.js` (hunk 2 only — `applyServerState` SEED_VERSION top-up block).

**Purpose:** enables non-destructive merge of new schedule events/questions into existing live user state on SEED_VERSION bump.

**Risk:** MEDIUM (runs on every page load, touches persisted state). Mitigated by id-match non-destructive merge logic.

**Uncommitted hunk coverage:**
- planner.js hunk #2 (line 264–312, +40/-0) — `applyServerState` SEED_VERSION merge logic
- entire `hanstan-schedule-defaults.js` delta (+38/-0) — SEED_VERSION=3 bump + 3 new schedule events + 4 new questions + scope-moderation notes + phase-eventIds updates
- `planner/index.html` small FAB-sheet-container adjustments if any apply (likely better to land in Commit 2)

**Commit message:**
```
planner: SEED_VERSION top-up system + new schedule defaults (events se-006/007/049, questions sq-18/19/20/21, scope-moderation notes on se-029/045/073/081/084)

Non-destructive merge on SEED_VERSION bump. Preserves user edits via id-match. Covers the 1,162-line set's schedule-defaults additions. Part of Stage 1 item #4.
```

### Commit 2 — `planner: FAB + floating action menu UI scaffold`

**Files:** `planner/index.html`, `planner/planner.css` (hunks 1, 2, 3 — mostly FAB/menu styles), `planner/planner.js` (hunks 4, 5 — jumpTo/quickAdd reductions + buildNewTask/fullAdd helpers + FAB wiring).

**Purpose:** replaces the old inline quick-add bottom bar with a floating action button + menu. Adds full-add modal helper.

**Risk:** LOW (additive UI; preserves hidden qaInput/qaBtn for backwards compat).

**Commit message:**
```
planner: FAB + floating action menu (quick-add / full-add) replacing inline quick-add bar

Additive UI. Hidden legacy quick-add elements preserved for backwards compat. Part of Stage 1 item #4.
```

### Commit 3 — `planner: People-tab role-filter + printable per-person views`

**Files:** `planner/planner.js` (hunks 6, 7, 8 — `groupTasksBy` + `renderPeople` + `filterPeople` large additive block including `setPeopleRoleFilter`, `buildPeoplePrintHead`, `printPeopleList`, `printGuestList`), `planner/planner.css` (part of hunk 4 — people-tab toolbar/role-filter/print-btn styles).

**Purpose:** People tab gains role-filter dropdown + printable per-person schedule view (for Cassie's print + distribute workflow per D3).

**Risk:** LOW (additive, new functions, no existing-path modification).

**Commit message:**
```
planner: People tab role-filter + printable per-person views

Adds setPeopleRoleFilter/buildPeoplePrintHead/printPeopleList/printGuestList. Powers Cassie's per-person schedule distribution (live task D3). Part of Stage 1 item #4.
```

### Commit 4 — `planner: schedule-event materials-sheet integration`

**Files:** `planner/planner.js` (hunks 9, 10 — `schedRenderEvent` adjustments + new `schedOpenMaterials`/`schedCloseMaterials`/`schedToggleMaterial`/`schedRemoveItemFromSheet` block), `planner/planner.css` (part of hunk 4 — materials-sheet + sched-event-title-row + sched-event-materials styles), `planner/index.html` (materials-sheet container scaffolding if not already landed in Commit 2).

**Purpose:** event card gains materials-checklist row; opens full materials sheet for checklist editing.

**Risk:** LOW (additive; old inline materials-list reduced harmlessly).

**Commit message:**
```
planner: schedule-event materials-sheet integration (checklist row + sheet with open/close/toggle/remove handlers)

Part of Stage 1 item #4.
```

## Push order

All 4 commits pushed together at Stage 1 item #4 execution time. Netlify auto-build triggers on push; each commit builds and deploys individually in order.

## Dependencies + preconditions

- `data/planner-seed.json` remains uncommitted after Stage 1. Its changes are first-boot-only and do not apply to existing live state (which is merged via SEED_VERSION top-up from commit 1). Seed-file commit is deferred to a later stage when the new D/M-series task set in seed is verified against live.
- Stage 1 must issue its first POST to `/.netlify/functions/planner-state` after commit 1 lands so that the SEED_VERSION top-up fires for Scrybal on his own load. All other coordinators experience the top-up on their next load.

## Recommendation

Execute in listed order. Each commit is ≤ ~150 lines of delta. Revert path is per-commit `git revert <hash>` plus `git push`.

---

**End of Stage 1 commit plan.**
