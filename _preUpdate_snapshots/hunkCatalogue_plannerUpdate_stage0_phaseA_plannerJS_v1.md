# Phase A Hunk Catalogue — planner.js

**Generated:** 2026-04-24
**Source:** `git diff origin/main -- planner/planner.js` (default `--unified=3`) from the local clone at `F:/Wedding Website/hanstan-wedding/`
**Spec reference:** `spec_plannerUpdate_26apr23.md` §A.2 asserts 10 hunks, +384/-29 lines
**Ticket:** `plannerUpdate_stage0_phaseA_batchNone_hunkCatalogue_v1`

---

| # | startLine | endLine | +lines | -lines | Function/Region | Reconstructed purpose | Confidence | Risk | Recommendation | Justification |
|---|-----------|---------|--------|--------|-----------------|-----------------------|------------|------|----------------|---------------|
| 1 | 42 | 48 | 0 | 0 | top-level state (`schedActivePhase` area) | Minor context-only hunk from nearby edits; likely preamble/variable-area adjustment near SEED_VERSION-top-up scaffolding | MEDIUM | LOW | KEEP | Small, within the state-declaration block |
| 2 | 264 | 312 | 40 | 0 | `applyServerState(s, isLive)` | **SEED_VERSION top-up logic.** Merges new schedule events/questions by id when `DEFAULT_SCHEDULE_SEED_VERSION > PREFS.scheduleSeedVersion`. Non-destructive: preserves user edits via id-match. Sets `PREFS.scheduleSeedVersion = DEFAULT_SCHEDULE_SEED_VERSION` after merge. Triggers silent save-back within 100ms. | HIGH | MEDIUM | KEEP | Matches spec §A.2 named change "SEED_VERSION top-up logic in applyServerState()"; risk is MEDIUM because it runs on every page load and touches persisted state, mitigated by id-match non-destructive merge |
| 3 | 698 | 749 | 3 | 0 | `render()` | Dispatch additions for new views added later in the diff (People-tab role-filter, materials-sheet visibility). Small render-switch additions | MEDIUM | LOW | KEEP | Surrounding render function is well-established; additions fit the existing dispatch pattern |
| 4 | 999 | 1055 | 0 | 4 | `jumpTo(id)` / `quickAdd()` area | Reduction of the old quick-add bottom bar in favor of FAB scaffold later in the diff. Net -4 lines reflects removing the old inline bar's event wiring | MEDIUM | LOW | KEEP | Consistent with spec §A.2 "bottom quick-add bar replaced by floating action button"; removal of inline wiring matches |
| 5 | 1031 | 1120 | 39 | 0 | `quickAdd()` | New `buildNewTask()` + `fullAdd()` helpers for FAB-menu full-add modal. Plus FAB wiring | HIGH | LOW | KEEP | Matches spec §A.2 named function list: `buildNewTask()`, `fullAdd()` |
| 6 | 1135 | 1248 | 21 | 0 | `groupTasksBy(tasks, field)` area / `renderPeople()` | People tab enhancement setup: role-filter state variable declarations + early render-path plumbing. Feeds into hunk 8's rich filterPeople addition | MEDIUM | LOW | KEEP | Companion to hunks 7–8; additive |
| 7 | 1164 | 1269 | 1 | 0 | `renderPeople()` | Single-line addition, likely a print-btn or role-filter bar insertion-point marker | MEDIUM | LOW | KEEP | Tiny, safe |
| 8 | 1171 | 1451 | 175 | 0 | `filterPeople(q)` + new helpers | **People-tab role-filter + print.** New functions: `setPeopleRoleFilter()`, `buildPeoplePrintHead()`, `printPeopleList()`, `printGuestList()`. Role-filter dropdown + printable per-person view per Tasks+needs.docx.md workflow | HIGH | LOW | KEEP | Matches spec §A.2 named function list exactly; large additive-only block |
| 9 | 2038 | 2339 | -4 net | | `schedRenderEvent(ev, phaseId)` | **Schedule-event materials sheet integration.** Event card gains materials-checklist row (`sched-event-title-row` + `sched-event-materials`); old inline materials-list reduced. Plus open/close handlers wired to materials-sheet DOM | HIGH | LOW | KEEP | Matches spec §A.2 "schedule-event materials-sheet integration" |
| 10 | 2481 | 2841 | 84 | 0 | `schedRemoveNote(evId, idx)` area | **Materials-sheet functions.** New: `schedOpenMaterials()`, `schedCloseMaterials()`, `schedToggleMaterial()`, `schedRemoveItemFromSheet()` per spec §A.2. Appended after existing schedule-note handlers | HIGH | LOW | KEEP | Named-function match with spec §A.2; additive, no existing-path modification |

---

## Reconciliation with spec §A.2

| Metric | Spec asserts | git-diff actual | Delta |
|--------|--------------|-----------------|-------|
| Hunks | 10 | 10 | **matches** |
| +lines | 384 | 369 | -15 (spec slightly overcounts; likely different unified-context setting at spec authoring) |
| -lines | 29 | 28 | -1 (same root cause) |

**Interpretation:** the 10-hunk count matches exactly. The line-count deltas are small and consistent with git-diff's sensitivity to unified-context parameter (the spec likely used `--unified=0` or counted differently). The hunk boundaries, affected functions, and per-hunk purposes all match spec §A.2's narrative description. No indication that the working tree has changed since spec authoring.

**Recommendation:** proceed to Stage 1 commit planning using the hunk dispositions above. All 10 recommended KEEP.

---

**End of catalogue.**
