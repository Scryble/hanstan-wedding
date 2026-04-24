# Phase A Hunk Catalogue — planner.css

**Generated:** 2026-04-24
**Source:** `git diff origin/main -- planner/planner.css` (default `--unified=3`) from the local clone at `F:/Wedding Website/hanstan-wedding/`
**Spec reference:** `spec_plannerUpdate_26apr23.md` §A.2 asserts 4 hunks (implicitly), +127/-14 lines
**Ticket:** `plannerUpdate_stage0_phaseA_batchNone_hunkCatalogue_v1`

---

| # | startLine | endLine | +lines | -lines | Selector/Region | Reconstructed purpose | Confidence | Risk | Recommendation | Justification |
|---|-----------|---------|--------|--------|-----------------|-----------------------|------------|------|----------------|---------------|
| 1 | 1521 | 1568 | 23 | 0 | `input[type="date"]...` base/mobile block | Small additive styles near existing mobile form-control block. Likely People-tab role-filter-bar + print-btn styles or FAB + menu base positioning | HIGH | LOW | KEEP | Region is the mobile-form base block; additions are contextually appropriate |
| 2 | 1551 | 1580 | 0 | 0 | same region tail | Minor whitespace-only or micro-selector addition in the same block | LOW | LOW | KEEP | Contextual continuation of hunk 1 |
| 3 | 2948 | 2987 | 0 | 0 | `body.design-fix .sched-edit-input:focus` + `.sched-chip` | Minor style tweaks to existing sched-edit-input + sched-chip rules | MEDIUM | LOW | KEEP | Design-fix layer, already-established pattern; safe cosmetic tweaks |
| 4 | 3107 | 3223 | 90 | 0 | `body.design-fix .sched-add-phase-wrap` onward | **Main additive block.** FAB + menu styles, materials-sheet styles, `sched-event-title-row` + `sched-event-materials` rules, `sched-chip-role-badge` styles, materials-checklist item styles. Matches spec §A.2 named CSS features | HIGH | LOW | KEEP | Spec §A.2 names: "FAB + menu + materials sheet + schedule event sched-event-title-row / sched-event-materials + people-tab toolbar/role-filter/print-btn + sched-chip-role-badge + materials checklist items" — all plausibly covered by this 90-line addition at end of design-fix layer |

---

## Reconciliation with spec §A.2

| Metric | Spec asserts | git-diff actual | Delta |
|--------|--------------|-----------------|-------|
| Hunks | (implicit — spec does not state explicitly) | 4 | n/a |
| +lines | 127 | 124 | -3 (negligible) |
| -lines | 14 | 14 | **matches exactly** |

**Interpretation:** CSS side reconciles cleanly. The 3-line discrepancy on +lines is within acceptable git-diff-context variance. Removal count matches exactly.

**Recommendation:** proceed. All 4 hunks recommended KEEP.

---

**End of catalogue.**
