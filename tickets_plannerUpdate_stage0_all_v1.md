# tickets_plannerUpdate_stage0_all_v1.md

**Compiled:** 2026-04-24. Single-document compilation of all Stage 0 tickets + verify stub + linter report for the plannerUpdate (spec: `spec_plannerUpdate_26apr23.md`).

---

## Table of Contents

| # | Section | Content |
|---|---------|---------|
| 1 | Ticket — phaseA batchNone hunkCatalogue | planner.js + planner.css deep-hunk catalogue |
| 2 | Ticket — phaseC batchC5 elsieHistoricalBackfill | 8 Elsie 2026-04-22 entries to capture JSONL (local-only) |
| 3 | Ticket — phaseC batchC1 rolodexFixes | Remove Zubey duplicate; tag B19; create D12 Lucas |
| 4 | Ticket — phaseC batchC2 DseriesTasks | POST D1–D11 with merge rules |
| 5 | Ticket — phaseC batchC3 MseriesTasks | POST 30 M-series + 4 existing-task updates |
| 6 | Ticket — phaseC batchC4 pairingPrincipleNote | M37 Elsie+Fen pairing as master-token-only note |
| 7 | Ticket — phaseC batchC3b dataTagsAndGroupMerge | M39/M40/M41/M42 data-only operations |
| 8 | Ticket — phaseC batchC3cPart1 auditExtension | planner-state.mjs accepts syntheticAuditEntries (code push) |
| 9 | Ticket — phaseC batchC3cPart2 elsieBackfillAndStageOneEnablers | M44 + M45 + M43-Part-2 Elsie backfill POST |
| 10 | Ticket — phaseC batchC7 weddingFolderTasqReminder | Repo-local tasQ.md reach-out-to-Elsie reminder |
| 11 | Ticket — phaseD batchNone frozenSpecAndGovernance | Frozen pre-update site spec + §PU-1..11 + baseline metrics + Stage 1 commit plan + integrity check + local commit |
| 12 | Verify Stub — stage0 allBatches | Human-run verification per batch + regression watchlist |
| 13 | Linter Report v1 — stage0 allTickets | L0–L13 static-lint pass (pre-consolidation) |

**Execution order** (from spec §Phase C preamble): §1 (phaseA) runs any time before §11 (phaseD). Live-POST batch order: §2 (batchC5, JSONL only) → §3 (batchC1) → §4 (batchC2) → §5 (batchC3) → §6 (batchC4) → §7 (batchC3b) → §8 (batchC3cPart1, code push) → §9 (batchC3cPart2) → §10 (batchC7, local) → §11 (phaseD, local commit).

---

## Schema Correction Banner (applies to every ticket in this document)

**Discovered during ticket §3 pre-flight (2026-04-24):** the live planner-state schema uses **two** id fields on every task record:

- **`id`** = server-side row identifier. Pattern: `"t" + Date.now()` (e.g. `"t1776266763813"`). Client-generated at task-creation time (see `planner.js:961`, `planner.js:1049`). Primary key for `diffStates()` matching (`netlify/functions/planner-state.mjs:39–40`). **Do not use this for human task labels.**
- **`taskId`** = human-readable label. Pattern: `"B4"`, `"B19"`, `"D12"`, `"M37"`, or empty string (`""`) for tasks never assigned one. Optional. Used as the display/attribution target in audit log entries (`t.taskId || id` — see `planner-state.mjs:44`).

**Every ticket in this document that says `id === 'B19'`, `id === 'D12'`, `id: "M37"`, etc. referring to a human label MUST be read as `taskId === 'B19'`, `taskId === 'D12'`, `taskId: "M37"`.** When creating a new task, populate BOTH: `id: "t" + Date.now() + "_" + counter` (unique per task in the same POST) AND `taskId: "<human-label>"`. When matching an existing task by human label, match on `taskId`.

**Field shape per live record** (from 2026-04-24 GET): `id, taskId, workstream, title, desc, priority, status, quadrant, deadline, persona, assignee, location, contacts, tags, blockedBy, group, subtasks, comments, history, recurring, reminder, modified, created`. Minimum required for new tasks: `id`, `title`, `group`. Others default to empty string / empty array / null.

**The "no-id Zubey" violation referenced throughout the spec §A.9 + §C.1** is actually the task where `taskId === ""` (not where `id` is missing — every task has `id`). Match predicate for that specific task: `t.title === "Zubey" && t.taskId === ""`.

This banner supersedes any contradictory wording in individual ticket sections below. Auditors running §14's §5.5 cross-ticket consistency check should treat `id`-as-human-label references as resolved to `taskId` by this banner.

**Why this wasn't caught earlier:** the spec and the 5-section audit both failed to perform a **target-schema verification** step against a real live record. That missing audit category has been flagged for inclusion as L14 in the next canonical linter revision (one consolidated audit-template doc, not a separate file — per Scrybal preference).

---

# §1 — Ticket: phaseA batchNone hunkCatalogue

# BUILD_TICKET — Phase A Remainder: planner.css + planner.js Deep-Hunk Catalogue

```yaml
# === REQUIRED FIELDS ===
ticket_id: "plannerUpdate_stage0_phaseA_batchNone_hunkCatalogue_v1"
project_name: "plannerUpdate"
date: "2026-04-23"
change_type: "docs"
template_version: "v4.2"

output_mode: "full_files"
placement_method: "new_file_create"
idempotency: "idempotent"

trust_level: "relaxed"
preflight_validation: true
structured_warnings: false

files_modify:
  - "F:/Wedding Website/hanstan-wedding/_preUpdate_snapshots/hunkCatalogue_plannerUpdate_stage0_phaseA_plannerJS_v1.md"
  - "F:/Wedding Website/hanstan-wedding/_preUpdate_snapshots/hunkCatalogue_plannerUpdate_stage0_phaseA_plannerCSS_v1.md"
files_readonly:
  - "F:/Wedding Website/hanstan-wedding/planner/planner.js"
  - "F:/Wedding Website/hanstan-wedding/planner/planner.css"
  - "F:/Wedding Website/hanstan-wedding/spec_plannerUpdate_26apr23.md"
files_forbidden:
  - "F:/Wedding Website/hanstan-wedding/planner/planner.js"
  - "F:/Wedding Website/hanstan-wedding/planner/planner.css"
  - "F:/Wedding Website/hanstan-wedding/planner/index.html"
  - "F:/Wedding Website/hanstan-wedding/planner/hanstan-schedule-defaults.js"
  - "F:/Wedding Website/hanstan-wedding/netlify/functions/planner-state.mjs"
  - "F:/Wedding Website/hanstan-wedding/HANSTAN_WEDDING_SITE_SPEC.md"
  - "F:/Wedding Website/hanstan-wedding/data/planner-seed.json"

modules_used: []

definition_of_done:
  - "File hunkCatalogue_plannerUpdate_stage0_phaseA_plannerJS_v1.md exists and contains one row per uncommitted hunk in planner.js with columns: hunkId, startLine, endLine, linesAdded, linesRemoved, function/region touched, reconstructed purpose, confidence (HIGH|MEDIUM|LOW), risk (LOW|MEDIUM|HIGH), recommended KEEP|DROP|MODIFY, and a one-sentence justification."
  - "File hunkCatalogue_plannerUpdate_stage0_phaseA_plannerCSS_v1.md exists and contains one row per uncommitted hunk in planner.css with the same column structure."
  - "Every hunk reported by 'git diff --unified=0' against the current HEAD of origin/main (commit 433a223) on each of the two files is present exactly once in the corresponding catalogue — no hunks missing, no hunks invented."
  - "The catalogues reconcile against the hunk counts asserted in spec_plannerUpdate_26apr23.md §A.2: planner.js shows +384 / -29 across 10 hunks; planner.css shows +127 / -14. If actual counts diverge from the spec's stated figures, the ticket reports the delta in a final 'Reconciliation' section at the bottom of each file — it does not silently overwrite."
  - "No modifications to planner.js or planner.css themselves."
  - "No git commits, no git pushes, no Netlify operations."

depends_on: []
revision: 1
supersedes: ""

spec_excerpts_whitelisted:
  - "spec_plannerUpdate_26apr23.md §A.2 (Local-clone modification-set catalogue — the table identifying planner.js as +384/-29 across 10 hunks and planner.css as +127/-14)"
  - "spec_plannerUpdate_26apr23.md §Stage 0 acceptance criteria S0-AC-8 (Phase A report must document the planner.css/planner.js hunk catalogue as remaining sub-step)"
```

---

## 1. Purpose and Scope

### 1.1 Ticket Goal (one sentence, literal)
Produce two new catalogue files in `_preUpdate_snapshots/` — one for `planner.js` uncommitted hunks, one for `planner.css` uncommitted hunks — each enumerating every hunk with its line range, size, touched region, reconstructed purpose, confidence, risk, and recommended disposition.

### 1.2 Explicit Non-Goals (must not be acted on)
- Do NOT modify `planner.js` or `planner.css`.
- Do NOT modify any other planner code file, spec, or seed file.
- Do NOT apply any KEEP/DROP/MODIFY decision — only recommend.
- Do NOT commit or push to git.
- Do NOT do a Netlify deploy, a live POST, or any network action.
- Do NOT rewrite hunks into smaller hunks (preserve the boundaries `git diff` emits).
- Do NOT speculate beyond reconstructing-from-code-evidence; if purpose is unclear, write confidence=LOW and say so in the justification.
- Do NOT re-derive Stage 0 scope or propose changes to the spec.

---

## 2. Preconditions and Assumptions

Claude must assume all of the following are true before execution. If any assumption is false, Claude must fail deterministically (CLAUDE_GOVERNANCE Section 12.6).

- The local clone at `F:/Wedding Website/hanstan-wedding/` exists and is the working copy of `Scryble/hanstan-wedding`.
- `git` is available on PATH (Git Bash, Windows).
- The local clone has uncommitted modifications to `planner/planner.js` and `planner/planner.css` — these are the "1,162-line modification set" referenced in `spec_plannerUpdate_26apr23.md` §A.2.
- The current remote branch (`origin/main`) is at commit `433a223` OR at the most-recent-pushed commit; the diff is taken against `HEAD` of the local clone's currently-checked-out branch versus `origin/main`.
- `_preUpdate_snapshots/` directory exists (verified: it does, containing the state/audit/snapshots/coordinators JSON pulls from 2026-04-23).
- Neither `phaseA_hunkCatalogue_plannerJS_2026-04-23.md` nor `phaseA_hunkCatalogue_plannerCSS_2026-04-23.md` already exists — they are new files (Ticket is `idempotent` in the sense that re-running produces the same catalogue; the files are fully rewritten, not appended).

**Ticket dependencies:** None. This is Phase A's remaining sub-step; it has no prior tickets.

**File state verification:** No `file_state_hashes` declared. Pre-flight validation verifies the two readonly files exist and that `git diff` returns non-empty output for each.

---

## 3. Execution Constraints

Claude must obey the full constraint set defined in `F:/.canonicals/CLAUDE_GOVERNANCE_claudeHandoffCanonicals_v4.2.md`. In particular:

- Do not ask clarifying questions.
- Do not optimize or refactor.
- Do not infer intent or fill gaps for a hunk that looks unclear — write confidence=LOW and explain which evidence was available.
- Execute steps literally and in order.
- Do not modify any file outside `files_modify`.
- If blocked, fail deterministically.

Trust level is `relaxed` for this ticket because the work is documentary reconstruction — Claude may emit brief reasoning inside the `Reconstructed purpose` and `Justification` columns of the output, bounded to what is visible in the code + spec-whitelisted excerpts. This relaxation applies ONLY to the content of the two output files' table cells; it does not grant any latitude to modify code or scope.

---

## 4. File Scope Lock

### 4.1 Files Claude May Modify
- `F:/Wedding Website/hanstan-wedding/_preUpdate_snapshots/phaseA_hunkCatalogue_plannerJS_2026-04-23.md`
- `F:/Wedding Website/hanstan-wedding/_preUpdate_snapshots/phaseA_hunkCatalogue_plannerCSS_2026-04-23.md`

(Both files are new file creates. Neither exists at ticket-invocation time.)

### 4.2 Files Claude May Read but NOT Modify
- `F:/Wedding Website/hanstan-wedding/planner/planner.js`
- `F:/Wedding Website/hanstan-wedding/planner/planner.css`
- `F:/Wedding Website/hanstan-wedding/spec_plannerUpdate_26apr23.md` (restricted to §A.2 and §S0-AC-8 per `spec_excerpts_whitelisted`; the rest of the spec is out of read-scope per ADR-3)

### 4.3 Files Claude Must NOT Touch
- Every file listed in `files_forbidden` in the front matter.

Any modification outside Section 4.1 is invalid output.

---

## 5. Placement and Change Mechanics

### 5.1 Placement Method
`new_file_create` (two new files).

### 5.2 Idempotency Declaration
`idempotent`. Re-executing this ticket overwrites both files with freshly-regenerated catalogues derived from the current `git diff` output. Because the output is deterministic w.r.t. the current uncommitted state of the two readonly files, re-execution produces semantically equivalent catalogues (possibly byte-different if `git diff` produces reordered hunks or different context in the future — but informational content is stable).

### 5.3 Encoding and Whitespace Warning
UTF-8, LF line endings. The catalogue files contain markdown tables with pipe separators — preserve exact pipe alignment in the output. Copying hunk snippet fragments into the table must escape pipes (`|` → `\|`) and preserve literal newlines as `<br>` within table cells.

### 5.4 Anchors (if using anchor_insert)
N/A — method is `new_file_create`.

### 5.5 Exact Block (if using exact_block_replace or exact_block_delete)
N/A.

### 5.6 Whole File Replace (if chosen)
N/A.

### 5.7 New File Create (if chosen)

**File 1:** `F:/Wedding Website/hanstan-wedding/_preUpdate_snapshots/hunkCatalogue_plannerUpdate_stage0_phaseA_plannerJS_v1.md`

The file contents are the full catalogue for `planner.js` — header, table, reconciliation section — as produced by the Step-by-Step Instructions below.

**File 2:** `F:/Wedding Website/hanstan-wedding/_preUpdate_snapshots/hunkCatalogue_plannerUpdate_stage0_phaseA_plannerCSS_v1.md`

Same structure, for `planner.css`.

---

## 6. Step-by-Step Instructions

Claude must execute every step in order.

**Step 0 (mandatory):** Read and confirm the current contents of each file listed in Section 4.2 before making any changes. Specifically: run `cat -A` or equivalent to verify `planner.js` and `planner.css` are UTF-8 LF-terminated, and verify neither of the two output files already exists (if either does, fail per Section 11).

**Step 1 — Emit pre-flight validation block** (required by `preflight_validation: true`). Checks to emit:
- `scope_lock_files_exist`: PASS if the two readonly files exist and `_preUpdate_snapshots/` directory exists; FAIL with specifics otherwise.
- `anchors_found_in_files`: N/A.
- `steps_reference_valid_files`: PASS if every path referenced in Steps 2–9 resolves; FAIL otherwise.
- `no_step_contradictions`: PASS (steps do not contradict).
- `file_state_hashes_match`: N/A.
- `depends_on_acknowledged`: N/A.

If any check fails, emit the validation block with `result: FAIL` and then emit a deterministic failure per Section 11. Do not proceed.

**Step 2 — Run `git diff --unified=3 origin/main -- planner/planner.js`** from `F:/Wedding Website/hanstan-wedding/`. Capture the full output. Parse every `@@ -L,N +L,N @@` hunk header to identify each hunk's startLine (new-file side), endLine (new-file side), linesAdded, linesRemoved.

**Step 3 — For each `planner.js` hunk from Step 2:** determine which function, class, or top-level region the hunk touches. To do this: in the new-file side of the diff, scan upward from the hunk's startLine within the current `planner.js` file contents (readonly) until finding the enclosing `function Foo(...)`, `const Foo = (...)`, `Foo: function(...)`, `function Foo()` inside a class, or top-level IIFE boundary. Record that function/region name in the `Function/Region` column. If the hunk touches multiple functions (rare; spans a function boundary), list them comma-separated.

**Step 4 — For each `planner.js` hunk:** reconstruct its purpose. Evidence sources, in priority order:
1. The added lines themselves (what the new code does).
2. The removed lines (what was replaced).
3. Surrounding context in the current `planner.js` (the enclosing function's overall behavior).
4. The whitelisted `spec_plannerUpdate_26apr23.md` §A.2 text, specifically: "SEED_VERSION top-up logic in applyServerState(), FAB wiring, People tab role-filter + print, schedule-event materials-sheet integration, new functions: buildNewTask(), fullAdd(), setPeopleRoleFilter(), buildPeoplePrintHead(), printPeopleList(), printGuestList(), schedOpenMaterials(), schedCloseMaterials(), schedToggleMaterial(), schedRemoveItemFromSheet()."

Write a one- to two-sentence purpose reconstruction. Assign `Confidence`:
- `HIGH` = purpose matches a named item from the spec §A.2 excerpt AND the code clearly implements that item.
- `MEDIUM` = purpose is clear from code evidence alone but not directly confirmed by spec.
- `LOW` = purpose is ambiguous; state which evidence was available and what remains unclear.

**Step 5 — For each `planner.js` hunk:** assign a `Risk` level based ONLY on what the hunk does, not on its purpose:
- `HIGH` = modifies the SEED_VERSION merge logic, auth, state-sync, or any code path that runs on every page load AND touches persisted state.
- `MEDIUM` = modifies client-side rendering or state-mutation paths but is additive or clearly bounded.
- `LOW` = purely additive (new function, new event listener) with no interaction with existing code paths.

**Step 6 — For each `planner.js` hunk:** recommend `KEEP`, `DROP`, or `MODIFY`. Default is `KEEP` unless:
- The hunk's reconstructed purpose directly contradicts a Stage 1 scope item → recommend `MODIFY` with a one-sentence reason.
- The hunk is clearly a leftover experiment or dead code (commented-out, no caller) → recommend `DROP` with a one-sentence reason.
- Otherwise → `KEEP`.

**Step 7 — Run `git diff --unified=3 origin/main -- planner/planner.css`** and repeat Steps 3–6 for `planner.css`. For CSS, the `Function/Region` column becomes `Selector/Region` — record the nearest preceding selector or comment block. The spec §A.2 excerpt for CSS is: "Styles for the FAB + menu + materials sheet + schedule event sched-event-title-row / sched-event-materials + people-tab toolbar/role-filter/print-btn + sched-chip-role-badge + materials checklist items."

**Step 8 — Compose the `planner.js` catalogue file.** Format:

```markdown
# Phase A Hunk Catalogue — planner.js

**Generated:** 2026-04-23
**Source:** `git diff --unified=3 origin/main -- planner/planner.js` taken from the local clone at `F:/Wedding Website/hanstan-wedding/`
**Spec reference:** `spec_plannerUpdate_26apr23.md` §A.2 asserts +384 / -29 lines across 10 hunks.
**Ticket:** `plannerUpdate_stage0_phaseA_batchNone_hunkCatalogue_v1`

---

| # | startLine | endLine | +lines | -lines | Function/Region | Reconstructed purpose | Confidence | Risk | Recommendation | Justification |
|---|-----------|---------|--------|--------|-----------------|-----------------------|------------|------|----------------|---------------|
| 1 | ... | ... | ... | ... | ... | ... | HIGH/MEDIUM/LOW | LOW/MEDIUM/HIGH | KEEP/DROP/MODIFY | ... |
| ... |

---

## Reconciliation with PROJECT_SPEC §A.2

Spec asserts: 10 hunks, +384 lines added, -29 lines removed.

Actual from `git diff`: `<N>` hunks, `+<X>` lines added, `-<Y>` lines removed.

Delta: `<either "matches spec" or "spec off by ..."`. If delta is nonzero, investigate before proceeding to Stage 1 — either the spec is stale or the working tree changed.

---

**End of catalogue.**
```

**Step 9 — Compose the `planner.css` catalogue file** with the same structure. Spec assertion: `+127 / -14`. The header's "Function/Region" column is renamed to "Selector/Region."

**Step 10 — Write both files** to the paths in `files_modify`. Use UTF-8 LF line endings.

---

## 7. Canonical Patch / Delta Format

N/A for `new_file_create` with `full_files` output — use the lightweight format from Template Section 7.2.

```
/* =========================
   PATCH BLOCK: Phase A Hunk Catalogue (planner.js + planner.css)
   What it does: Creates two documentary catalogue files enumerating every uncommitted hunk.
   Applies to: two new files under _preUpdate_snapshots/
   Placement: new_file_create
   ========================= */

/* --- BEGIN FILE 1: phaseA_hunkCatalogue_plannerJS_2026-04-23.md --- */
<FULL CATALOGUE CONTENTS PER STEP 8>
/* --- END FILE 1 --- */

/* --- BEGIN FILE 2: phaseA_hunkCatalogue_plannerCSS_2026-04-23.md --- */
<FULL CATALOGUE CONTENTS PER STEP 9>
/* --- END FILE 2 --- */
```

---

## 8. Output Contract Reference

Output mode is `full_files`. Claude outputs the complete contents of both new files, each preceded by a `=== FILE: <path> ===` header line. The pre-flight validation block precedes the file outputs. No other output is permitted — no commentary, no summary, no rationale outside what appears inside the two catalogue files' table cells and Reconciliation sections.

---

## 9. Definition of Done

This ticket is complete only if all criteria in the front matter `definition_of_done` field are true. Restated:

1. Both catalogue files exist at the specified paths.
2. Every hunk from `git diff` appears exactly once in the correct catalogue.
3. Columns populated per Steps 3–6 (and 7 for CSS).
4. Reconciliation section present at the bottom of each catalogue.
5. Zero code modifications.
6. Zero git operations beyond `git diff` (read-only).
7. Zero Netlify operations.

---

## 10. Post-Execution Verification (Human-Run)

- Build command(s): N/A
- Test command(s): N/A
- Lint command(s): N/A
- Manual smoke steps:
  1. Open `_preUpdate_snapshots/hunkCatalogue_plannerUpdate_stage0_phaseA_plannerJS_v1.md` in VS Code.
  2. Confirm the table renders in Markdown Preview Enhanced with clean columns.
  3. Confirm the Reconciliation section at the bottom shows either "matches spec" or a specific delta.
  4. Open the CSS catalogue; same visual checks.
  5. Spot-check one HIGH-confidence hunk: read the hunk's function in `planner.js`, confirm the Reconstructed purpose is accurate.
  6. Spot-check one LOW-confidence hunk: read Claude's justification, confirm it cites which evidence was available.
  7. Confirm `git status` shows only the two new files untracked; `planner.js` and `planner.css` remain in their pre-ticket modified-but-uncommitted state.

---

## 11. Failure Semantics

If execution fails or output is incorrect:
- Attributed to ticket insufficiency; revise ticket, do not grant Claude discretion.
- If blocked mid-execution, emit completed output + partial completion block per CLAUDE_GOVERNANCE §12.7.

**Common failure modes anticipated:**
- `git diff` produces zero hunks for one of the files → the uncommitted modification set is not present. Emit pre-flight FAIL with detail.
- One of the output files already exists → fail per Step 0, do not overwrite silently.
- `git` not on PATH → emit pre-flight FAIL with the PATH state observed.

---

**End of ticket.**
---

# §2 — Ticket: phaseC batchC5 elsieHistoricalBackfill

# BUILD_TICKET — Phase C Batch C.5: Elsie 2026-04-22 Historical Activity Backfill (Local JSONL Only)

```yaml
ticket_id: "plannerUpdate_stage0_phaseC_batchC5_elsieHistoricalBackfill_v1"
project_name: "plannerUpdate"
date: "2026-04-23"
change_type: "docs"
template_version: "v4.2"

output_mode: "full_files"
placement_method: "new_file_create"
idempotency: "idempotent"

trust_level: "strict"
preflight_validation: true
structured_warnings: false

files_modify:
  - "F:/Wedding Website/hanstan-wedding/_preUpdate_snapshots/capture_plannerUpdate_stage0_phaseC_2026-04-23.jsonl"
files_readonly:
  - "F:/Wedding Website/hanstan-wedding/spec_plannerUpdate_26apr23.md"
  - "F:/Wedding Website/hanstan-wedding/_preUpdate_snapshots/elsie_snaps/"
files_forbidden:
  - "F:/Wedding Website/hanstan-wedding/planner/planner.js"
  - "F:/Wedding Website/hanstan-wedding/planner/planner.css"
  - "F:/Wedding Website/hanstan-wedding/planner/index.html"
  - "F:/Wedding Website/hanstan-wedding/planner/hanstan-schedule-defaults.js"
  - "F:/Wedding Website/hanstan-wedding/netlify/functions/planner-state.mjs"
  - "F:/Wedding Website/hanstan-wedding/HANSTAN_WEDDING_SITE_SPEC.md"
  - "F:/Wedding Website/hanstan-wedding/spec_plannerUpdate_26apr23.md"
  - "F:/Wedding Website/hanstan-wedding/data/planner-seed.json"

modules_used: []

definition_of_done:
  - "The capture JSONL contains 8 new entries representing Elsie's 2026-04-22 session mutations, each with 2026-04-22 ISO timestamps, by='Elsie', batch='C.5', source='reconstructed from _preUpdate_snapshots/elsie_snaps/ per spec §A.3 + §C.5'."
  - "No live POST is issued. No network activity. Pure local file append."
  - "Entries match the 8-entry list in spec §C.5 verbatim in content and order."

depends_on: []

revision: 1
supersedes: ""

spec_excerpts_whitelisted:
  - "spec_plannerUpdate_26apr23.md §A.3 (Elsie's 2026-04-22 activity reconstructed from snapshots — 8-mutation list)"
  - "spec_plannerUpdate_26apr23.md §C.5 (Elsie backfill — JSONL entry definitions)"
  - "spec_plannerUpdate_26apr23.md §C.X (Structured Capture Protocol format)"
```

---

## 1. Purpose and Scope

### 1.1 Ticket Goal (one sentence, literal)
Append 8 capture entries representing Elsie's 2026-04-22 schedule-tab mutations to the Phase C capture JSONL, reconstructed from snapshots per spec §A.3 / §C.5 — no live POST.

### 1.2 Explicit Non-Goals
- Do NOT issue any live POST. This is local-file-only.
- Do NOT modify schedule events on live to reflect Elsie's mutations — those already landed on live 2026-04-22 via Elsie's original POSTs. This ticket only records them in the structured capture log.
- Do NOT extend `diffStates()` (Stage 1 scope).
- Do NOT inject these entries into the audit log directly (batch C.3c ticket does that once the `syntheticAuditEntries` acceptance lands).

---

## 2. Preconditions and Assumptions

- `_preUpdate_snapshots/elsie_snaps/` directory exists with 19 Elsie snapshot JSON files spanning 2026-04-22 03:47 UTC to 04:08 UTC.
- Capture JSONL is append-target (may or may not already have prior-batch entries).

**Ticket dependencies:** None — this is independent of live-POST batches and can run in any order before batch C.3c, but spec §C execution order places C.5 first to keep chronology clean.

---

## 3. Execution Constraints

Strict.

---

## 4. File Scope Lock

### 4.1 Files Claude May Modify
- Capture JSONL (append).

### 4.2 Files Claude May Read
- spec (whitelisted).
- `_preUpdate_snapshots/elsie_snaps/` directory contents.

### 4.3 Files Claude Must NOT Touch
All in `files_forbidden`.

### 4.4 Live Endpoints
None. This ticket is offline.

---

## 5. Placement and Change Mechanics

`new_file_create` (append to JSONL if present; create if absent). `idempotent` — running twice produces same 8 entries (duplicate detection by timestamp+target+action before appending).

UTF-8 LF.

---

## 6. Step-by-Step Instructions

**Step 0 (mandatory):** Read spec §A.3 and §C.5 for the 8-entry definitions.

**Step 1 — Pre-flight validation block.** Verify `_preUpdate_snapshots/` writable; spec readable; no existing entries in capture JSONL with by='Elsie' (idempotency check — if they already exist, skip append and emit success with `entries_skipped: 8`).

**Step 2 — Compose the 8 entries** verbatim from spec §C.5:

```json
{"ts":"2026-04-22T03:50:49Z","by":"Elsie","entity":"scheduleEvent","action":"note.add","target":"se-002","summary":"Added note about storage locations + crew coordination","source":"reconstructed from _preUpdate_snapshots/elsie_snaps/ per spec_plannerUpdate_26apr23.md §A.3 + §C.5","batch":"C.5"}
{"ts":"2026-04-22T03:55:28Z","by":"Elsie","entity":"schedulePhase","action":"update","target":"sp-02","field":"collapsed","from":true,"to":false,"summary":"Un-collapsed phase 'Bridal Party Final Prep'","source":"reconstructed from _preUpdate_snapshots/elsie_snaps/ per spec_plannerUpdate_26apr23.md §A.3 + §C.5","batch":"C.5"}
{"ts":"2026-04-22T03:56:28Z","by":"Elsie","entity":"scheduleEvent","action":"person.update","target":"se-021","summary":"Swapped Fen<->Lucas roles (both now helpers). NOTE: Elsie self-assignment captured only as note, not in people array — requires follow-up in Schedule-Solidification stage.","source":"reconstructed from _preUpdate_snapshots/elsie_snaps/ per spec_plannerUpdate_26apr23.md §A.3 + §C.5","batch":"C.5"}
{"ts":"2026-04-22T03:57:36Z","by":"Elsie","entity":"scheduleEvent","action":"note.add","target":"se-032","summary":"Added note: scrap full first-aid station; bring FAK for Trudy","source":"reconstructed from _preUpdate_snapshots/elsie_snaps/ per spec_plannerUpdate_26apr23.md §A.3 + §C.5","batch":"C.5"}
{"ts":"2026-04-22T04:00:07Z","by":"Elsie","entity":"scheduleEvent","action":"person.remove","target":"se-117","summary":"Removed Fen from Chairs+tables collected; Lucas now sole person. Intent unverified — deferred to Schedule-Solidification stage per draft-liquid rule.","source":"reconstructed from _preUpdate_snapshots/elsie_snaps/ per spec_plannerUpdate_26apr23.md §A.3 + §C.5","batch":"C.5"}
{"ts":"2026-04-22T04:01:21Z","by":"Elsie","entity":"scheduleEvent","action":"person.remove","target":"se-121","summary":"Removed Fen from Changing tent packed; event now has zero people. Intent unverified — deferred to Schedule-Solidification stage.","source":"reconstructed from _preUpdate_snapshots/elsie_snaps/ per spec_plannerUpdate_26apr23.md §A.3 + §C.5","batch":"C.5"}
{"ts":"2026-04-22T03:50:49Z","by":"Elsie","entity":"scheduleQuestion","action":"resolve","target":"sq-2","summary":"Resolved: Variety; about 15-20 minutes from Rodeway for bridesmaids/Elsie","source":"reconstructed from _preUpdate_snapshots/elsie_snaps/ per spec_plannerUpdate_26apr23.md §A.3 + §C.5","batch":"C.5"}
{"ts":"2026-04-22T04:08:06Z","by":"Elsie","entity":"scheduleQuestion","action":"resolve","target":"sq-10","summary":"Resolved: Elsie can't be OLCC certified, need someone else to be certified and serving","source":"reconstructed from _preUpdate_snapshots/elsie_snaps/ per spec_plannerUpdate_26apr23.md §A.3 + §C.5","batch":"C.5"}
```

**Step 3 — Append all 8 lines** to `capture_plannerUpdate_stage0_phaseC_2026-04-23.jsonl`. LF-separated. UTF-8.

**Step 4 — Emit output per `full_files` mode:** the complete final content of the capture JSONL (all entries from prior batches + these 8).

---

## 7. Canonical Patch / Delta Format

N/A — `full_files` output; use §7.2 lightweight format if needed.

---

## 8. Output Contract Reference

`full_files` + pre-flight block. Emit the JSONL file's complete contents after the 8 appends.

---

## 9. Definition of Done

Per front-matter.

---

## 10. Post-Execution Verification (Human-Run)

- Open `capture_plannerUpdate_stage0_phaseC_2026-04-23.jsonl` in VS Code.
- Grep for `"by":"Elsie"`; expect 8 matches.
- Grep for `"batch":"C.5"`; expect 8 matches.
- Spot-check one entry (e.g., sq-10 resolution) against spec §C.5.

---

## 11. Failure Semantics

Standard. Since there's no network activity, the only failure modes are file-system errors (permissions, disk full) and idempotency-conflict (prior by='Elsie' entries already present).

---

**End of ticket.**
---

# §3 — Ticket: phaseC batchC1 rolodexFixes

# BUILD_TICKET — Phase C Batch C.1 + C.1b: Rolodex Fixes + Lucas D12 to Organizers

```yaml
# === REQUIRED FIELDS ===
ticket_id: "plannerUpdate_stage0_phaseC_batchC1_rolodexFixes_v1"
project_name: "plannerUpdate"
date: "2026-04-23"
change_type: "migration"
template_version: "v4.2"

output_mode: "delta_blocks"
placement_method: "new_file_create"
idempotency: "one_shot"

trust_level: "strict"
preflight_validation: true
structured_warnings: false

files_modify:
  - "F:/Wedding Website/hanstan-wedding/_preUpdate_snapshots/capture_plannerUpdate_stage0_phaseC_2026-04-23.jsonl"
files_readonly:
  - "F:/Wedding Website/hanstan-wedding/_preUpdate_snapshots/state-current_2026-04-23.json"
  - "F:/Wedding Website/hanstan-wedding/spec_plannerUpdate_26apr23.md"
files_forbidden:
  - "F:/Wedding Website/hanstan-wedding/planner/planner.js"
  - "F:/Wedding Website/hanstan-wedding/planner/planner.css"
  - "F:/Wedding Website/hanstan-wedding/planner/index.html"
  - "F:/Wedding Website/hanstan-wedding/planner/hanstan-schedule-defaults.js"
  - "F:/Wedding Website/hanstan-wedding/netlify/functions/planner-state.mjs"
  - "F:/Wedding Website/hanstan-wedding/HANSTAN_WEDDING_SITE_SPEC.md"
  - "F:/Wedding Website/hanstan-wedding/data/planner-seed.json"
  - "F:/Wedding Website/hanstan-wedding/spec_plannerUpdate_26apr23.md"

modules_used: []

definition_of_done:
  - "One authenticated POST to https://hanstan.wedding/.netlify/functions/planner-state has been issued using master token 'stanshan', attributed 'Hannah & Stan'."
  - "The POST payload removes the no-id 'Zubey' duplicate task from state.tasks[]."
  - "The POST payload adds tags ['organizers', 'guest-list'] to task B19 ('Brother's Guest List Input'), preserving its existing group='Stan's Rolodex' and all other existing fields verbatim."
  - "The POST payload adds a new task D12 with title 'Coordinate with Lucas (Cassie's BF) — day-of setup helper + Colleen's tent', priority='medium', status='not-started', assignee='Stan', group='Organizers', tags=['coordination','day-of','family','social'], and desc populated per spec_plannerUpdate_26apr23.md §C.1b."
  - "Every live mutation produced by this ticket is appended to capture_plannerUpdate_stage0_phaseC_2026-04-23.jsonl in the §PU-7 Structured Capture Protocol format."
  - "After POST, a GET to https://hanstan.wedding/.netlify/functions/planner-state confirms: no task whose title is 'Zubey' exists without an id; task B19 has the new tags; a task with id D12 exists with the specified fields."
  - "No code-file modifications. No git operations. No modifications to planner.js, planner.css, index.html, hanstan-schedule-defaults.js, planner-state.mjs, planner-seed.json, HANSTAN_WEDDING_SITE_SPEC.md, or the spec file."

depends_on: []
revision: 1
supersedes: ""

spec_excerpts_whitelisted:
  - "spec_plannerUpdate_26apr23.md §A.9 (Current rolodex state + violations — identifies the no-id Zubey duplicate of B4)"
  - "spec_plannerUpdate_26apr23.md §C.1 (Rolodex fixes + Rolodex Rule enforcement — POST actions)"
  - "spec_plannerUpdate_26apr23.md §C.1b (Lucas D12 task definition — full title, priority, tags, desc)"
  - "spec_plannerUpdate_26apr23.md §C.X (Structured Capture Protocol — JSONL format)"
  - "spec_plannerUpdate_26apr23.md §6.1 (All state mutations must be attributed; master token 'stanshan'; attribution 'Hannah & Stan')"
```

---

## 1. Purpose and Scope

### 1.1 Ticket Goal (one sentence, literal)
Issue one authenticated POST to the live planner-state endpoint that removes the no-id Zubey duplicate task, adds cross-surface tags to task B19, and creates new task D12 for Lucas, while appending the corresponding Structured Capture Protocol entries to the Phase C capture log.

### 1.2 Explicit Non-Goals (must not be acted on)
- Do NOT modify any task besides the three named mutations (remove no-id Zubey; tag-add on B19; create D12).
- Do NOT touch the 12 no-id Indian-family rolodex cards (Ronnie, Peter, Aarti, Tanvee & Aung, Deyvaansh, Abhinav, Urmi, Rumi Didi, Babu Mamu & Deepa Aunty); they stay in Stan's Rolodex with no changes.
- Do NOT issue live POSTs for batches other than C.1 + C.1b. Other batches are separate tickets.
- Do NOT modify any code file.
- Do NOT commit, push, or deploy.
- Do NOT apply the `master-only` tag to rolodex tasks — that is batch C.3b M40, a separate ticket.
- Do NOT re-pull live state more than once (at the beginning, for drift check, and once at the end for verification). Scrybal is the only operator this session.

---

## 2. Preconditions and Assumptions

Claude must assume all of the following are true before execution. If any assumption is false, Claude must fail deterministically (CLAUDE_GOVERNANCE §12.6).

- The local clone exists at `F:/Wedding Website/hanstan-wedding/`.
- The master token `stanshan` is valid for authenticated POST + GET to `https://hanstan.wedding/.netlify/functions/planner-state`.
- `_preUpdate_snapshots/state-current_2026-04-23.json` contains the live-state snapshot taken 2026-04-23 20:45 UTC; it is the ground-truth for the no-id Zubey task's current fields and for B19's existing fields.
- The capture file `capture_plannerUpdate_stage0_phaseC_2026-04-23.jsonl` is either absent (ticket creates it) or present with prior batch-C.5 entries (ticket appends).
- `node` is available on PATH for JSON parsing and HTTPS POST construction.
- Live state at ticket-execution time has not drifted from the 2026-04-23 20:45 UTC snapshot beyond what Scrybal has observed — if drift is detected during the pre-flight GET, fail deterministically with the drift detail.

**Ticket dependencies:** None. This is the first Phase C live-POST batch per spec §C execution order.

**File state verification:** Verified dynamically via the pre-flight GET, not via `file_state_hashes`.

---

## 3. Execution Constraints

Full `F:/.canonicals/CLAUDE_GOVERNANCE_claudeHandoffCanonicals_v4.2.md` constraint set applies at `strict` trust level. In particular: no clarifying questions, no optimization, no scope expansion, deterministic failure if blocked.

---

## 4. File Scope Lock

### 4.1 Files Claude May Modify
- `F:/Wedding Website/hanstan-wedding/_preUpdate_snapshots/capture_plannerUpdate_stage0_phaseC_2026-04-23.jsonl`

### 4.2 Files Claude May Read but NOT Modify
- `F:/Wedding Website/hanstan-wedding/_preUpdate_snapshots/state-current_2026-04-23.json`
- `F:/Wedding Website/hanstan-wedding/spec_plannerUpdate_26apr23.md` (restricted to whitelisted excerpts)

### 4.3 Files Claude Must NOT Touch
All files in `files_forbidden`.

Any modification outside Section 4.1 is invalid output.

### 4.4 Live Endpoints Claude Will Call
- `GET https://hanstan.wedding/.netlify/functions/planner-state` (Bearer stanshan) — pre-flight drift check + post-POST verification.
- `POST https://hanstan.wedding/.netlify/functions/planner-state` (Bearer stanshan) — the one state-mutation POST described by this ticket.

---

## 5. Placement and Change Mechanics

### 5.1 Placement Method
`new_file_create` for the capture JSONL (first-time creation if absent) OR append-to-existing if the file already exists from batch C.5. The JSONL append is idempotent at the file level only if the appended entries themselves are idempotent — they are not (a POST is one-shot), so the ticket is declared `one_shot` overall.

### 5.2 Idempotency Declaration
`one_shot`. The live POST creates task D12 with a fresh id and removes the no-id Zubey record — re-running would attempt to re-delete-already-deleted and re-create-already-existing, which would either no-op silently or duplicate D12 depending on whether the server validates uniqueness. Human reviewer must ensure this ticket is applied exactly once.

### 5.3 Encoding and Whitespace Warning
JSONL file uses LF line endings, UTF-8, one JSON object per line, no trailing comma, no trailing newline required but harmless. POST body is JSON, `Content-Type: application/json`, `Authorization: Bearer stanshan`.

### 5.4 Anchors
N/A.

### 5.5 Exact Block
N/A.

### 5.6 Whole File Replace
N/A.

### 5.7 New File Create
Target: `F:/Wedding Website/hanstan-wedding/_preUpdate_snapshots/capture_plannerUpdate_stage0_phaseC_2026-04-23.jsonl` — created if absent, appended to if present.

---

## 6. Step-by-Step Instructions

Claude must execute every step in order.

**Step 0 (mandatory):** Read `_preUpdate_snapshots/state-current_2026-04-23.json` in full. Confirm the no-id 'Zubey' task exists in `state.tasks[]` (match on `title === 'Zubey'` AND absence of `id` field OR `id === ''` OR `id === null`). Confirm task B19 exists with `id === 'B19'` and title containing 'Brother'. Record B19's current `tags` array verbatim.

**Step 1 — Emit pre-flight validation block** (required):
- `scope_lock_files_exist`: PASS if `state-current_2026-04-23.json` exists AND `spec_plannerUpdate_26apr23.md` exists AND the `_preUpdate_snapshots/` directory is writable.
- `anchors_found_in_files`: N/A.
- `steps_reference_valid_files`: PASS if all paths resolve.
- `no_step_contradictions`: PASS.
- `file_state_hashes_match`: N/A.
- `depends_on_acknowledged`: N/A.

If any check fails, emit the validation block with `result: FAIL` and emit a deterministic failure per §11 of this ticket. Do not proceed.

**Step 2 — Pre-flight drift check.** Issue `GET https://hanstan.wedding/.netlify/functions/planner-state` with `Authorization: Bearer stanshan`. Capture the response. Verify:
- `response.lastModified === "2026-04-23T20:45:28.719Z"` (unchanged from the snapshot).
- `response.tasks.length === 75`.
- The no-id Zubey task is still present.
- B19 is still present with the observed `tags` value.

If any verification fails, emit a deterministic failure (`=== FAILURE === Reason: Live state has drifted since 2026-04-23 snapshot ...`). Do not proceed.

**Step 3 — Construct the POST body.** Start from the live GET response from Step 2 (not from the static snapshot — always POST the freshest-observed full state back, per the planner-state.mjs contract). Mutate in-memory:
- Remove the no-id Zubey task from `tasks[]`. Match predicate: `t.title === 'Zubey' && (!t.id || t.id === '')`. Expect exactly 1 match; fail if 0 or >1.
- Find task with `id === 'B19'`. Set `tags = [...existingTags.filter(t => t !== 'organizers' && t !== 'guest-list'), 'organizers', 'guest-list']` (preserve existing tags, append the two new ones idempotently within this same POST — but the ticket as a whole is one-shot).
- Append to `tasks[]` a new task object with fields as listed in `definition_of_done` for D12, plus any other fields required by the schema (copy the shape of a known-good existing task such as B4 for required-field coverage; leave optional fields empty).

Build POST body: `{ state: <mutated-state>, by: "Hannah & Stan" }`. Include `Authorization: Bearer stanshan`, `Content-Type: application/json`.

**Step 4 — Issue the POST.** Expect 200 response with `{ok: true, lastModified: <newISO>, savedAs: <newSnapshotKey>, auditEntries: [...]}`. If non-200 or `ok !== true`, emit deterministic failure with the response body as `Blocked On`.

**Step 5 — Append capture entries to the JSONL.** Three entries, one per mutation:

Line 1 (Zubey removal):
```json
{"ts":"<POST-response-lastModified>","by":"Hannah & Stan","entity":"task","action":"archive","target":"zubey-noid","summary":"Archived no-id 'Zubey' task (duplicate of B4); final state captured pre-removal","source":"spec_plannerUpdate_26apr23.md §C.1","batch":"C.1"}
```
Line 2 (B19 tag-add):
```json
{"ts":"<POST-response-lastModified>","by":"Hannah & Stan","entity":"task","action":"update","target":"B19","field":"tags","from":<existing-tags-array>,"to":<new-tags-array>,"summary":"Added cross-surface tags ['organizers','guest-list'] to B19 per Rolodex Rule multi-parent workaround","source":"spec_plannerUpdate_26apr23.md §C.1","batch":"C.1"}
```
Line 3 (D12 create):
```json
{"ts":"<POST-response-lastModified>","by":"Hannah & Stan","entity":"task","action":"create","target":"D12","summary":"Created D12 'Coordinate with Lucas (Cassie's BF) — day-of setup helper + Colleen's tent' per Rolodex Rule (Lucas is a helper, belongs in Organizers not Rolodex)","source":"spec_plannerUpdate_26apr23.md §C.1b","batch":"C.1"}
```

Append these three lines to `capture_plannerUpdate_stage0_phaseC_2026-04-23.jsonl`, each a single line of valid JSON, LF-terminated.

**Step 6 — Post-POST verification GET.** Issue `GET https://hanstan.wedding/.netlify/functions/planner-state` again. Verify:
- `tasks[]` no longer contains any task matching the no-id Zubey predicate.
- Task B19 contains `'organizers'` and `'guest-list'` in its `tags` array.
- A task with `id === 'D12'` exists with the specified title, priority, status, assignee, group, and tags.
- `response.auditEntries` from the Step 4 POST response contains the expected 3 entries attributed to 'Hannah & Stan'.

If any verification fails, attempt a rollback via `POST https://hanstan.wedding/.netlify/functions/planner-snapshots` restore endpoint pointing to the pre-ticket snapshot key (capture from Step 2 response), then emit deterministic failure with the mismatch detail.

**Step 7 — Emit the output** per `output_mode: delta_blocks`: three delta blocks, one per mutation, using the Canonical Patch Template Section 7.1 below.

---

## 7. Canonical Patch / Delta Format

Three delta blocks, one per mutation. Each block uses the Section 7.1 full template.

```
/* =========================
   PATCH BLOCK: Remove no-id Zubey duplicate
   What it does: Archives the no-id 'Zubey' task from live state.tasks[] via authenticated POST
   Applies to: live Netlify blob planner/state-current.json
   Placement: exact_block_delete (the one matched task object)
   ========================= */

/* --- AUTHOR-PROVIDED CONTEXT --- */
/*
Problem:
- Stan's Rolodex group contains two Zubey entries: B4 (rich content, confirmation + ticket buying) and a no-id duplicate (bare name).

Symptoms:
- Duplicate planner card; confusing to any organizer viewing the Rolodex group.

Cause:
- Manual live-UI entry after B4 was already authored.

Attempted fixes:
- NotAFix 1: delete B4 → rejected; B4 has richer content (subtasks, ticket-buying workflow).
- NotAFix 2: merge the two → rejected; no-id card carries no additional info.

Current fix applied:
- Archive the no-id card via deletion from state.tasks[]. B4 remains. Capture the pre-deletion state in the JSONL for audit history per the "nothing truly gets deleted" rule.

What might potentially break this fix:
- If the predicate match returns >1 task (e.g., a third Zubey entry added since snapshot), the POST would archive the wrong one or fail the match. Mitigated by Step 2's drift check.
*/
/* Edge cases / safety considerations (NOT implemented in the delta):
- Snapshot rollback is available via planner-snapshots restore endpoint if verification fails.
*/
/* --- END AUTHOR-PROVIDED CONTEXT --- */

/* --- BEGIN DELTA (generated by Claude) --- */
<the POST body + the JSONL append line for the Zubey archive>
/* --- END DELTA --- */
```

```
/* =========================
   PATCH BLOCK: Add cross-surface tags to B19
   What it does: Appends ['organizers', 'guest-list'] to task B19's tags array, preserving existing tags
   Applies to: live Netlify blob planner/state-current.json
   Placement: exact_block_replace (task B19's tags array)
   ========================= */

/* --- AUTHOR-PROVIDED CONTEXT --- */
/*
Problem:
- B19 ('Brother's Guest List Input') lives in Stan's Rolodex but semantically also belongs to Organizers and Guest-List surfaces. The live schema's group field is single-string, so multi-parent membership is not natively expressible.

Symptoms:
- A user viewing the Organizers tab would not see B19, even though the task is about organizer guest-list input.

Cause:
- Single-string group field in the current PlannerState schema (see spec_plannerUpdate_26apr23.md §4.1).

Attempted fixes:
- NotAFix 1: move B19 to Organizers → rejected; Scrybal decision 2026-04-23 keeps B19 in Rolodex.
- NotAFix 2: extend schema to groups[] → rejected for Stage 0; that is parking-lot PL-01 for Stage 1 or Stage 2.

Current fix applied:
- Use the existing tags[] field as a cross-surface workaround. When PL-01 ships, a migration promotes these tags into the new secondaryGroups[] field.

What might potentially break this fix:
- If a future Stage 1 migration has not yet been written to recognize this tag convention, the workaround becomes orphan data. Captured in spec §C.3b M41.
*/
/* Edge cases / safety considerations:
- Idempotency: filter out duplicates before append so re-running this patch doesn't produce ['organizers', 'guest-list', 'organizers', 'guest-list'].
*/
/* --- END AUTHOR-PROVIDED CONTEXT --- */

/* --- BEGIN DELTA --- */
<the POST-body fragment showing B19.tags transformation + JSONL append line>
/* --- END DELTA --- */
```

```
/* =========================
   PATCH BLOCK: Create D12 for Lucas (Cassie's BF)
   What it does: Adds new task D12 to live state.tasks[] with full field population
   Applies to: live Netlify blob planner/state-current.json
   Placement: anchor_insert (append to end of tasks[] array)
   ========================= */

/* --- AUTHOR-PROVIDED CONTEXT --- */
/*
Problem:
- Lucas (Cassie's boyfriend) is a day-of setup helper (initial setup + Colleen's tent per Tasks+needs.docx.md) but has no planner presence. Scrybal's 2026-04-23 infodump says to add him to the rolodex, but the Rolodex Rule scopes rolodex to friends/family/guests who are NOT coordinators/PICs — and Lucas IS a helper.

Symptoms:
- Day-of setup coordination will miss Lucas entirely unless his role is tracked somewhere.

Cause:
- Infodump default was 'rolodex'; Rolodex Rule (formalized in Phase D §PU-6) reroutes to Organizers.

Attempted fixes:
- NotAFix 1: add Lucas to rolodex per infodump literal — rejected per Rolodex Rule.
- NotAFix 2: create a no-id rolodex card — rejected per 'every task gets an id' rule.

Current fix applied:
- Create D12 in Organizers with full field population including a desc that cites Tasks+needs.docx.md for traceability.

What might potentially break this fix:
- D12 might collide with a future D-series id if another chat has authored D12 in parallel. Verified: current live D-series stops at D11; D12 is next.
*/
/* Edge cases / safety considerations:
- If the server validates that only master-tokens may add tasks to Organizers, the POST will 4xx. Mitigated: master token stanshan is being used.
*/
/* --- END AUTHOR-PROVIDED CONTEXT --- */

/* --- BEGIN DELTA --- */
<the full D12 task object + JSONL append line>
/* --- END DELTA --- */
```

---

## 8. Output Contract Reference

Output mode `delta_blocks`. Three delta blocks emitted per §7. Plus the pre-flight validation block (required by `preflight_validation: true`). No other output permitted.

---

## 9. Definition of Done

All criteria in front-matter `definition_of_done` must be true.

---

## 10. Post-Execution Verification (Human-Run)

- Build command(s): N/A
- Test command(s): N/A
- Lint command(s): N/A
- Manual smoke steps:
  1. Open `https://hanstan.wedding/planner/` in Chrome (Scrybal session, logged in as `stanshan`).
  2. Navigate to the Tasks tab → Stan's Rolodex group. Confirm there is exactly ONE Zubey card (B4).
  3. Navigate to Organizers group. Confirm D12 'Coordinate with Lucas (Cassie's BF)' exists with the correct fields.
  4. Filter by tag 'organizers' — confirm B19 appears.
  5. Filter by tag 'guest-list' — confirm B19 appears.
  6. Open `_preUpdate_snapshots/capture_plannerUpdate_stage0_phaseC_2026-04-23.jsonl` and confirm three new entries with batch='C.1'.

---

## 11. Failure Semantics

- Ticket insufficiency on drift → revise ticket to include a newer snapshot.
- Live POST 4xx/5xx → emit deterministic failure with response body + request body for post-mortem.
- Predicate mismatch (0 or >1 Zubey matches) → emit deterministic failure with observed match count.
- If blocked mid-execution (e.g., POST succeeded but verification GET fails), attempt snapshot rollback, then emit partial completion block per CLAUDE_GOVERNANCE §12.7 describing what landed vs what didn't.

---

**End of ticket.**
---

# §4 — Ticket: phaseC batchC2 DseriesTasks

# BUILD_TICKET — Phase C Batch C.2: D-series Unify (D1–D11 POSTed with merge rules applied)

```yaml
ticket_id: "plannerUpdate_stage0_phaseC_batchC2_DseriesTasks_v1"
project_name: "plannerUpdate"
date: "2026-04-23"
change_type: "migration"
template_version: "v4.2"

output_mode: "delta_blocks"
placement_method: "new_file_create"
idempotency: "one_shot"

trust_level: "strict"
preflight_validation: true
structured_warnings: false

files_modify:
  - "F:/Wedding Website/hanstan-wedding/_preUpdate_snapshots/capture_plannerUpdate_stage0_phaseC_2026-04-23.jsonl"
files_readonly:
  - "F:/Wedding Website/hanstan-wedding/data/planner-seed.json"
  - "F:/Wedding Website/hanstan-wedding/spec_plannerUpdate_26apr23.md"
files_forbidden:
  - "F:/Wedding Website/hanstan-wedding/planner/planner.js"
  - "F:/Wedding Website/hanstan-wedding/planner/planner.css"
  - "F:/Wedding Website/hanstan-wedding/planner/index.html"
  - "F:/Wedding Website/hanstan-wedding/planner/hanstan-schedule-defaults.js"
  - "F:/Wedding Website/hanstan-wedding/netlify/functions/planner-state.mjs"
  - "F:/Wedding Website/hanstan-wedding/HANSTAN_WEDDING_SITE_SPEC.md"
  - "F:/Wedding Website/hanstan-wedding/spec_plannerUpdate_26apr23.md"
  - "F:/Wedding Website/hanstan-wedding/data/planner-seed.json"

modules_used: []

definition_of_done:
  - "One authenticated POST to https://hanstan.wedding/.netlify/functions/planner-state has been issued using master token 'stanshan', attributed 'Hannah & Stan'."
  - "The POST adds all 11 D-series tasks (D1–D11) to live state.tasks[], reading their definitions from data/planner-seed.json and applying the Phase C.2 merge rules verbatim from spec_plannerUpdate_26apr23.md §C.2."
  - "D3 absorbs the coordinator-schedules subtask from D10; D10 narrows to guest-programs-only (rename title; drop subtask s_prog_4)."
  - "D4 deadline reset from '2026-04-20' to '' (ASAP), with a comment preserving the original deadline and merge rationale."
  - "D6 retains its definition but gets an added comment absorbing it as subtask M1.2 of the new M1 (M1 itself is created in a separate ticket — this ticket only records the absorption comment on D6)."
  - "D7 unchanged on POST; a comment is added to live task B13 noting D7 resolves the playlist-owner conflict."
  - "D11 unchanged on POST; a note is added per spec §C.2 D11 paragraph."
  - "Every mutation (11 task creates + 3 comment/field-update mutations on D3/D4/D6/D7/D10/D11/B13) appends a capture entry to the Phase C JSONL."
  - "Post-POST verification: all 11 D-series ids present on live; D3 has 6 subtasks (original 5 + absorbed s_cas_coord_schedules); D10 has 3 subtasks (original 4 minus s_prog_4) and renamed title."

depends_on:
  - "plannerUpdate_stage0_phaseC_batchC1_rolodexFixes_v1"

revision: 1
supersedes: ""

spec_excerpts_whitelisted:
  - "spec_plannerUpdate_26apr23.md §A.2.1 (The 11 new D-series tasks — full field table)"
  - "spec_plannerUpdate_26apr23.md §C.2 (D-series unify — merge rules applied per-task)"
  - "spec_plannerUpdate_26apr23.md §C.X (Structured Capture Protocol format)"
  - "spec_plannerUpdate_26apr23.md §6.1 (Attribution rules)"
```

---

## 1. Purpose and Scope

### 1.1 Ticket Goal (one sentence, literal)
POST all 11 D-series task definitions from `data/planner-seed.json` to live state with the Phase C.2 merge rules applied (D3 absorbs D10 coordinator-schedules subtask; D4 deadline reset; D6 absorption comment; D7 link to B13; D10 narrows to programs-only; D11 notes added), and append corresponding Structured Capture entries.

### 1.2 Explicit Non-Goals
- Do NOT create task M1 (Wedding communications infrastructure via Zoho) — that is ticket `batchC3_MseriesTasks`.
- Do NOT touch `data/planner-seed.json`; it is read-only here (the D-series tasks live in the seed as authoring reference; they are promoted to live via POST, not by re-generating the seed).
- Do NOT apply master-only tags (that is batch C.3b M40, separate ticket).
- Do NOT commit or push any code.
- Do NOT verify sq-18 or sq-19 links (those belong to schedule-defaults; out of scope here).

---

## 2. Preconditions and Assumptions

- Ticket `plannerUpdate_stage0_phaseC_batchC1_rolodexFixes_v1` has already been applied — D12 exists on live, so the next D-id to collide with is D13+. This ticket uses D1–D11 exclusively.
- `data/planner-seed.json` contains complete definitions for D1–D11 (spec §A.2.1 asserts this).
- Master token `stanshan` is valid; live state is reachable.
- Capture JSONL from ticket batchC1 exists and is append-target.

**Ticket dependencies:** `plannerUpdate_stage0_phaseC_batchC1_rolodexFixes_v1` must be applied first (so live state already contains D12 and the B19 tag additions).

**File state verification:** Dynamic pre-flight GET.

---

## 3. Execution Constraints

Full strict trust level.

---

## 4. File Scope Lock

### 4.1 Files Claude May Modify
- `F:/Wedding Website/hanstan-wedding/_preUpdate_snapshots/capture_plannerUpdate_stage0_phaseC_2026-04-23.jsonl` (append)

### 4.2 Files Claude May Read but NOT Modify
- `data/planner-seed.json` (D-series task definitions)
- `spec_plannerUpdate_26apr23.md` (whitelisted §A.2.1, §C.2, §C.X, §6.1)

### 4.3 Files Claude Must NOT Touch
All files in `files_forbidden`.

### 4.4 Live Endpoints
- `GET https://hanstan.wedding/.netlify/functions/planner-state` (drift check + post-verify)
- `POST https://hanstan.wedding/.netlify/functions/planner-state` (single state-mutation POST)

---

## 5. Placement and Change Mechanics

### 5.1 Placement Method
`new_file_create` (JSONL append) / live POST is an out-of-repo mutation and does not map to a placement method for in-repo files.

### 5.2 Idempotency Declaration
`one_shot`. Re-running would create duplicate D-series tasks or fail uniqueness checks.

### 5.3 Encoding and Whitespace Warning
Same as batchC1: JSONL LF UTF-8, POST body JSON with `Authorization: Bearer stanshan`.

### 5.4–5.7
N/A.

---

## 6. Step-by-Step Instructions

**Step 0 (mandatory):** Read `data/planner-seed.json` in full. Extract the D1–D11 task objects. Record each task's complete field shape (id, title, priority, deadline, assignee, group, tags, subtasks[], desc, status, etc.).

**Step 1 — Pre-flight validation block** (required):
- `scope_lock_files_exist`: PASS if seed file, spec file, and JSONL directory are all present/writable.
- `depends_on_acknowledged`: PASS if live state contains task `D12` (confirming batchC1 was applied).
- Others: standard.

Fail-deterministic if any PASS condition misses.

**Step 2 — Pre-flight drift check.** GET live planner-state. Verify:
- Live contains D12 (batchC1 landed).
- Live does NOT already contain D1–D11 (otherwise this ticket is double-running).
- `response.lastModified` is fresher than the 2026-04-23 20:45 UTC snapshot by exactly one batchC1 POST (i.e., one lastModified increment). If more than one increment has occurred, additional edits happened between batches — fail and await Scrybal direction.

**Step 3 — Build POST body.** Start from the Step 2 live state. Apply in order:

(a) For each of D1, D2, D5, D7, D8, D9, D11: copy the seed definition verbatim into `tasks[]`. No merges.

(b) D3: copy seed definition. Then append to `subtasks[]` a new subtask `{id: 's_cas_coord_schedules', text: 'Print coordinator per-person schedules (absorbed from D10)', done: false}`. Result: D3 has 6 subtasks.

(c) D4: copy seed definition. Override `deadline` to `""`. Append to `comments[]` (or create the field if absent): `{ts: <POST-time>, by: 'Hannah & Stan', text: 'Original deadline 2026-04-20 per 2026-04-19 authoring. Reset to ASAP per 2026-04-23 recency-wins.'}`.

(d) D6: copy seed definition. Append to `comments[]`: `{ts: <POST-time>, by: 'Hannah & Stan', text: 'Absorbed as subtask of M1 (created in batch C.3). D6 = API integration specifically; M1 = full infrastructure (template + API + 2-way wiring).'}`.

(e) D10: copy seed definition. Rename title to `"Create + print guest programs"`. Remove subtask matching `id === 's_prog_4'` (if the id differs, match on text containing 'coordinator'). Result: D10 has 3 subtasks.

(f) D11: copy seed definition. Append to `notes` (or `comments[]` if no `notes` field): `'Conflict resolution is draft-liquid per 2026-04-23 supremacy rule. True resolution happens in Stage 4 task-audit stage. D11 captures the conflicts; resolution is Stage 4.'`.

(g) B13 (pre-existing live task): find it. Append to `comments[]`: `{ts: <POST-time>, by: 'Hannah & Stan', text: 'See D7 for playlist-owner conflict (Master Doc says Stan, Tasks+Needs says Shuba). B13 action is blocked on D7 resolution.'}`.

Build `{ state: <mutated>, by: 'Hannah & Stan' }`.

**Step 4 — POST.** Expect 200 + `ok: true`.

**Step 5 — Append JSONL entries.** 14 entries total:
- 11 `task.create` entries (one per D1–D11).
- 1 `task.update` entry for D4 (field=deadline, from='2026-04-20', to='').
- 1 `task.comment.add` entry for B13.
- (The D3 subtask addition, D6 comment, D10 rename+subtask-drop, D11 note addition are sub-records under their parent D-task's `task.create` entry — captured in the `summary` field. Alternatively, emit them as separate `subtask.add`/`rename`/`comment.add` entries if Scrybal prefers maximal granularity; default here is sub-record to keep the log readable.)

Ticket chooses granular: emit separate entries for the D3 subtask.add, D10 rename, D10 subtask.del, D6 comment.add, D11 note.add, D4 comment.add — total 14 entries from this ticket.

**Step 6 — Post-POST verification.** GET live. Verify:
- All 11 D-ids present in `tasks[]`.
- D3 has 6 subtasks.
- D10 title is 'Create + print guest programs'; has 3 subtasks.
- D4 deadline is empty string; has a comment with the recency-wins text.
- D6 has the M1-absorption comment.
- B13 has the D7-link comment.

On mismatch: restore-from-snapshot via `planner-snapshots` endpoint + deterministic failure.

**Step 7 — Emit delta blocks.**

---

## 7. Canonical Patch / Delta Format

One delta block per D-task (11 task.create blocks) + one per update-action (D3 subtask-add, D4 deadline-reset + comment, D6 comment-add, D10 rename + subtask-del, D11 note-add, B13 comment-add) = 17 delta blocks. Each uses §7.1 full template with author-provided context fields populated from spec §C.2.

Claude generates the DELTA sections only; the AUTHOR-PROVIDED CONTEXT is the Phase C.2 per-task paragraph from the spec, copied verbatim.

---

## 8. Output Contract Reference

`delta_blocks` + pre-flight validation block.

---

## 9. Definition of Done

Per front-matter.

---

## 10. Post-Execution Verification (Human-Run)

- Open `https://hanstan.wedding/planner/` as `stanshan`.
- Filter/search tasks for each D1–D11 id; confirm each exists with correct fields.
- Spot-check D3 (6 subtasks), D4 (empty deadline, comment visible), D10 (renamed, 3 subtasks), D6 (M1-absorption comment), B13 (D7-link comment).
- Open `capture_plannerUpdate_stage0_phaseC_2026-04-23.jsonl`; confirm 14 new entries with `batch: "C.2"`.

---

## 11. Failure Semantics

Same as batchC1: drift fail, 4xx/5xx fail, predicate-mismatch fail, post-verify-fail → snapshot-restore then fail.

---

**End of ticket.**
---

# §5 — Ticket: phaseC batchC3 MseriesTasks

# BUILD_TICKET — Phase C Batch C.3: M-series tasks M1–M35 (excluding retired M20, resolved M36, unassigned M38)

```yaml
ticket_id: "plannerUpdate_stage0_phaseC_batchC3_MseriesTasks_v1"
project_name: "plannerUpdate"
date: "2026-04-23"
change_type: "migration"
template_version: "v4.2"

output_mode: "delta_blocks"
placement_method: "new_file_create"
idempotency: "one_shot"

trust_level: "strict"
preflight_validation: true
structured_warnings: false

files_modify:
  - "F:/Wedding Website/hanstan-wedding/_preUpdate_snapshots/capture_plannerUpdate_stage0_phaseC_2026-04-23.jsonl"
files_readonly:
  - "F:/Wedding Website/hanstan-wedding/spec_plannerUpdate_26apr23.md"
files_forbidden:
  - "F:/Wedding Website/hanstan-wedding/planner/planner.js"
  - "F:/Wedding Website/hanstan-wedding/planner/planner.css"
  - "F:/Wedding Website/hanstan-wedding/planner/index.html"
  - "F:/Wedding Website/hanstan-wedding/planner/hanstan-schedule-defaults.js"
  - "F:/Wedding Website/hanstan-wedding/netlify/functions/planner-state.mjs"
  - "F:/Wedding Website/hanstan-wedding/HANSTAN_WEDDING_SITE_SPEC.md"
  - "F:/Wedding Website/hanstan-wedding/spec_plannerUpdate_26apr23.md"
  - "F:/Wedding Website/hanstan-wedding/data/planner-seed.json"

modules_used: []

definition_of_done:
  - "One authenticated POST to planner-state creates M1 (with subtasks M1.1, M1.2, M1.3), M2, M3, M4, M5, M6, M7, M8, M9, M10, M11, M15, M16, M17, M18, M19, M21, M23, M24, M25, M26, M27, M28, M29 (with subtasks s_tux_1/2/3), M30, M31, M32, M33, M34, M35 — total 30 new task creations."
  - "The same POST updates existing live tasks B9 (M12 comment), B21 (M13 title + status comment), the no-id 'Coordinate Grace & Thomas' task (M14 comment + assign id D13), B32 (M22 subtask.done)."
  - "M20 is NOT created (retired per spec §C.3 M20 entry). M36 is NOT created (already resolved by existing B42 per spec). M38 is NOT an id in use — next M-series id after M37 is M39, used in batch C.3b."
  - "Every M-task created uses the field shape declared in spec §C.3's per-M paragraph (priority, deadline, assignee, group, tags, desc verbatim)."
  - "Every mutation emits a capture JSONL entry with batch='C.3'."
  - "Post-POST verification: all 30 new M-ids present on live; B9/B21/D13/B32 updates present."

depends_on:
  - "plannerUpdate_stage0_phaseC_batchC2_DseriesTasks_v1"

revision: 1
supersedes: ""

spec_excerpts_whitelisted:
  - "spec_plannerUpdate_26apr23.md §C.3 (2026-04-23 infodump adds — full per-M-task paragraphs M1 through M36)"
  - "spec_plannerUpdate_26apr23.md §C.X (Structured Capture Protocol format)"
  - "spec_plannerUpdate_26apr23.md §6.1 (Attribution rules)"
  - "spec_plannerUpdate_26apr23.md §A.9 (rolodex state — context for M14's assignment of D13 to the Grace-Thomas coordinate task)"
```

---

## 1. Purpose and Scope

### 1.1 Ticket Goal (one sentence, literal)
POST 30 new M-series tasks (M1–M35 excluding M12/M13/M14/M20/M22/M36/M38 which are update actions or non-creates) plus 4 update-actions on existing tasks (B9, B21, D13 assignment + comment, B32) in a single authenticated POST, with capture JSONL entries for each.

### 1.2 Explicit Non-Goals
- Do NOT create M37 (pairing-principle note — that is batch C.4, separate ticket).
- Do NOT create M39, M40, M41, M42 (those are batch C.3b, separate ticket).
- Do NOT create M43 (that is batch C.3c-p1/p2, separate tickets — M43 requires a code change).
- Do NOT create M44 (that is batch C.3c-p2 prerequisite).
- Do NOT create M45 (Stage 1 smoke token — that is batch C.3c-p2).
- Do NOT create M46 or M47 (moved to Phase D §PU-9/§PU-10).
- Do NOT assign `master-only` tags to HanStan Logistics tasks here (that is batch C.3b M40).
- Do NOT modify `data/planner-seed.json`.

---

## 2. Preconditions and Assumptions

- Previous tickets (batchC1, batchC2) have been applied.
- Live state after batchC2 contains D1–D12. D13 id is available for assignment to the no-id 'Coordinate Grace & Thomas' task.
- Master token valid; live state reachable.
- Capture JSONL exists and is append-target.

**Ticket dependencies:** batchC1, batchC2.

---

## 3. Execution Constraints

Strict trust level.

---

## 4. File Scope Lock

### 4.1 Files Claude May Modify
- `_preUpdate_snapshots/capture_plannerUpdate_stage0_phaseC_2026-04-23.jsonl` (append)

### 4.2 Files Claude May Read but NOT Modify
- `spec_plannerUpdate_26apr23.md` (whitelisted §C.3, §C.X, §6.1, §A.9)

### 4.3 Files Claude Must NOT Touch
All files in `files_forbidden`.

### 4.4 Live Endpoints
- `GET` + `POST` to planner-state, Bearer stanshan.

---

## 5. Placement and Change Mechanics

### 5.1 Placement Method
`new_file_create` (JSONL append). Live POST out-of-scope for in-repo placement.

### 5.2 Idempotency
`one_shot`.

### 5.3 Encoding
Standard — UTF-8 LF.

---

## 6. Step-by-Step Instructions

**Step 0 (mandatory):** Read spec §C.3 in full for the per-M paragraph definitions.

**Step 1 — Pre-flight validation block.** Verify:
- `depends_on_acknowledged`: live has D1–D12 from prior batches.
- Live does NOT already contain M1 through M35.

**Step 2 — Pre-flight drift check.** GET live; verify lastModified matches the expected post-batchC2 value; verify absence of all planned M-ids.

**Step 3 — Build POST body.** Start from live GET response. Apply:

**M-series creates (30 tasks):** For each of M1, M2, M3, M4, M5, M6, M7, M8, M9, M10, M11, M15, M16, M17, M18, M19, M21, M23, M24, M25, M26, M27, M28, M29, M30, M31, M32, M33, M34, M35 — construct task object with the fields declared in spec §C.3's per-M paragraph. Append to `tasks[]`.

Subtask-bearing M-tasks:
- **M1** has subtasks M1.1 (draft Zoho email template, id `s_m1_1`), M1.2 (D6 API integration absorbed, id `s_m1_2`), M1.3 (wire Zoho ↔ planner message board, id `s_m1_3`).
- **M29** has subtasks `s_tux_1` (Get Stan measured), `s_tux_2` (Email measurements to parents), `s_tux_3` (Hannah updates Dad about Indian-finery-for-ceremony decision).

**Blocked-by relationships** (populate `blockedBy` field if present in schema, otherwise add to `desc` or `notes`):
- M2 blockedBy 'Quick Edits + Edit Mode UX (parking-lot Stage 2)'
- M3 blockedBy same
- M4 blockedBy same
- M9 blockedBy M10

**Update actions on existing tasks:**

(a) **M12 on B9:** find task with `id === 'B9'`. Append to `comments[]`: `{ts, by: 'Hannah & Stan', text: 'Wes dropped out as officiant per 2026-04-23. Stan+Hannah continuing counseling+Bible discussion independently via M10. Find new officiant via M11.'}`.

(b) **M13 on B21:** find `id === 'B21'`. Set `title = 'Grace deVries — 2nd Photographer BOOKED (contract signed + $625 retainer sent 2026-04-23)'`. Keep status='done'. Append comment: `'Status corrected: Grace is fully booked as 2nd photographer. Previous title said coordinator role declined which referred to a different role. Contracted 2026-04-23 per retainer payment confirmation.'`.

(c) **M14 assigns D13 + comment:** find the live task whose title is `'Coordinate Grace & Thomas (Photographers)'` and which has no id (or empty id). Set `id = 'D13'`. Keep status='in-progress'. Append comment: `'Grace contracted + $625 retainer paid 2026-04-23. Grace has reached out to Daniel Thomas directly per her 2026-04-23 Zoom. Next: 3-way Zoom (M17). Assigned id D13 during batch C.3 per every-task-gets-an-id rule.'`.

(d) **M22 on B32:** find `id === 'B32'`. Find or create subtask 'Hannah applies for marriage licence' (match on text containing 'Hannah appli' + 'licence'); set `done = true`. Append comment: `'Hannah has applied for the marriage licence per 2026-04-23 infodump.'`.

Build `{ state: <mutated>, by: 'Hannah & Stan' }`.

**Step 4 — POST.** Expect 200.

**Step 5 — Append JSONL entries.** 34 entries total (30 creates + 4 updates).

Each entry uses the Structured Capture Protocol format with `batch: "C.3"` and `source: "spec_plannerUpdate_26apr23.md §C.3"`.

**Step 6 — Post-POST verification GET.** Verify every new M-id present; verify the 4 update-action side-effects on B9/B21/D13/B32.

**Step 7 — Emit delta blocks.** 34 delta blocks — one per mutation. Each uses §7.1 full template; AUTHOR-PROVIDED CONTEXT is copied from the corresponding spec §C.3 paragraph.

---

## 7. Canonical Patch / Delta Format

Standard §7.1 per mutation. 34 blocks.

---

## 8. Output Contract Reference

`delta_blocks` + pre-flight block.

---

## 9. Definition of Done

Per front-matter.

---

## 10. Post-Execution Verification (Human-Run)

- Load live planner as `stanshan`.
- Count tasks in each group:
  - Organizers: +M2 +M3 +M4 +M5 +M6 +M8 +M9 +M10 +M11 +M15 +M16 +M17 +M19 +M21 +M35 (16 new).
  - Wedding Day: +M18 +M24 +M25 (3 new).
  - Website: +M1 +M33 +M34 (3 new).
  - Guests: +M7 (1 new).
  - HanStan Logistics: +M26 +M27 +M28 (3 new).
  - Procurement: +M29 (1 new, with 3 subtasks).
  - Guest List: +M30 (1 new — will be merged to Guests group in batchC3b M39).
  - All: +M31 +M32 (2 new).
  - Wedding Week: +M23 (1 new — CRITICAL priority, 2026-05-07 deadline).
  Total creates: 30.
- Confirm B9, B21, D13, B32 show their update side-effects.
- Confirm M20 is NOT on live.
- `capture_plannerUpdate_stage0_phaseC_2026-04-23.jsonl` has 34 new entries with `batch: "C.3"`.

---

## 11. Failure Semantics

Standard: drift fail, 4xx/5xx fail, post-verify-fail → snapshot-restore + deterministic failure.

---

**End of ticket.**
---

# §6 — Ticket: phaseC batchC4 pairingPrincipleNote

# BUILD_TICKET — Phase C Batch C.4: M37 Elsie + Fen Pairing Principle Note (Master-Token-Only)

```yaml
ticket_id: "plannerUpdate_stage0_phaseC_batchC4_pairingPrincipleNote_v1"
project_name: "plannerUpdate"
date: "2026-04-23"
change_type: "migration"
template_version: "v4.2"

output_mode: "delta_blocks"
placement_method: "new_file_create"
idempotency: "one_shot"

trust_level: "strict"
preflight_validation: true
structured_warnings: false

files_modify:
  - "F:/Wedding Website/hanstan-wedding/_preUpdate_snapshots/capture_plannerUpdate_stage0_phaseC_2026-04-23.jsonl"
files_readonly:
  - "F:/Wedding Website/hanstan-wedding/spec_plannerUpdate_26apr23.md"
files_forbidden:
  - "F:/Wedding Website/hanstan-wedding/planner/planner.js"
  - "F:/Wedding Website/hanstan-wedding/planner/planner.css"
  - "F:/Wedding Website/hanstan-wedding/planner/index.html"
  - "F:/Wedding Website/hanstan-wedding/planner/hanstan-schedule-defaults.js"
  - "F:/Wedding Website/hanstan-wedding/netlify/functions/planner-state.mjs"
  - "F:/Wedding Website/hanstan-wedding/HANSTAN_WEDDING_SITE_SPEC.md"
  - "F:/Wedding Website/hanstan-wedding/spec_plannerUpdate_26apr23.md"
  - "F:/Wedding Website/hanstan-wedding/data/planner-seed.json"

modules_used: []

definition_of_done:
  - "One authenticated POST creates task M37 on live with fields: priority='high', deadline=null/empty, assignee='Stan', group='Wedding Day', tags=['constraint','elsie','fen','day-of','master-only','pairing-principle'], status='not-started', desc populated verbatim from spec §C.4."
  - "No schedule-event mutations. Schedule is draft-liquid; people-placement stays untouched per B-DEC-3/B-DEC-5."
  - "JSONL entry appended: {entity: 'note', action: 'create', target: 'M37', batch: 'C.4', source: 'spec_plannerUpdate_26apr23.md §C.4', summary: 'Pairing principle captured as master-token-only task-note'}."
  - "Post-POST verification: M37 exists on live with the correct tags array, assignee, group, priority, and desc."

depends_on:
  - "plannerUpdate_stage0_phaseC_batchC3_MseriesTasks_v1"

revision: 1
supersedes: ""

spec_excerpts_whitelisted:
  - "spec_plannerUpdate_26apr23.md §C.4 (M37 pairing principle task definition — full desc)"
  - "spec_plannerUpdate_26apr23.md §C.X (Structured Capture Protocol format)"
  - "spec_plannerUpdate_26apr23.md §6.1 (Attribution rules)"
```

---

## 1. Purpose and Scope

### 1.1 Ticket Goal (one sentence, literal)
Create one live task M37 capturing the Elsie + Fen day-of pairing principle as a master-token-only note, with no schedule-event mutations.

### 1.2 Explicit Non-Goals
- Do NOT modify any schedule event (se-001, se-013, se-021, se-023, se-082 all remain unchanged — spec B-DEC-5 defers people-placement to Schedule-Solidification stage).
- Do NOT create tasks for Bonnie or Sarah Reese scope-moderation (those are captured in M3, M4 via batch C.3).
- Do NOT implement constraint-tooltip rendering (parking-lot PL-03).
- Do NOT modify contact records for Elsie/Fen (batch C.3b M42 does that).

---

## 2. Preconditions and Assumptions

- batchC3 has been applied; M1–M35 (minus M20/M36/M38) exist on live.
- M37 id is next available after M35; M36 is a provenance-only non-existent id (resolved as B42 already existed per spec §C.3 M36); M38 is deliberately unassigned per spec.
- Master token valid.

**Ticket dependencies:** batchC3.

---

## 3. Execution Constraints

Strict.

---

## 4. File Scope Lock

### 4.1 Files Claude May Modify
- Capture JSONL (append).

### 4.2 Files Claude May Read
- spec (whitelisted).

### 4.3 Files Claude Must NOT Touch
All files in `files_forbidden`.

### 4.4 Live Endpoints
- GET + POST planner-state.

---

## 5. Placement and Change Mechanics

`new_file_create` (JSONL append). `one_shot`. UTF-8 LF.

---

## 6. Step-by-Step Instructions

**Step 0 (mandatory):** Read spec §C.4 for M37's full desc text.

**Step 1 — Pre-flight validation.** Verify: live contains M1–M35 (minus M20); live does NOT contain M37.

**Step 2 — Drift check.** GET live. Confirm lastModified matches expected post-batchC3 value.

**Step 3 — Build POST body.** Start from live state. Append new task:

```
{
  id: "M37",
  title: "Constraint: Elsie + Fen day-of pairing principle (master-token-only)",
  priority: "high",
  deadline: "",
  assignee: "Stan",
  group: "Wedding Day",
  tags: ["constraint", "elsie", "fen", "day-of", "master-only", "pairing-principle"],
  status: "not-started",
  desc: "<verbatim from spec §C.4>",
  subtasks: [],
  comments: []
}
```

Build `{ state: <mutated>, by: 'Hannah & Stan' }`.

**Step 4 — POST.** Expect 200.

**Step 5 — Append JSONL entry.**

```json
{"ts":"<POST-lastModified>","by":"Hannah & Stan","entity":"note","action":"create","target":"M37","summary":"Pairing principle captured as master-token-only task-note (Fen's day-of primary role is as Elsie's helper/assistant/caretaker/boyfriend; pattern also applies to Bonnie and Sarah Reese moderated scope)","source":"spec_plannerUpdate_26apr23.md §C.4","batch":"C.4"}
```

**Step 6 — Post-POST verification GET.** Verify M37 present with correct tags, assignee, group, priority, desc.

**Step 7 — Emit one delta block** using §7.1 template.

---

## 7. Canonical Patch / Delta Format

One block, §7.1 full template. AUTHOR-PROVIDED CONTEXT copied from spec §C.4.

---

## 8. Output Contract Reference

`delta_blocks` + pre-flight block.

---

## 9. Definition of Done

Per front-matter.

---

## 10. Post-Execution Verification (Human-Run)

- Load planner as `stanshan`. Navigate Wedding Day group. Confirm M37 card visible with tag `pairing-principle`.
- Click the card; confirm desc contains both "Fen's day-of primary role is as Elsie's helper/assistant/caretaker/boyfriend" and a reference to Bonnie + Sarah Reese.
- `capture_plannerUpdate_stage0_phaseC_2026-04-23.jsonl` has a new entry with `batch: "C.4"`.

---

## 11. Failure Semantics

Standard.

---

**End of ticket.**
---

# §7 — Ticket: phaseC batchC3b dataTagsAndGroupMerge

# BUILD_TICKET — Phase C Batch C.3b: M39 Group Merge + M40 Master-Only Tags + M41 Cross-Surface Tags + M42 Contact Constraints

```yaml
ticket_id: "plannerUpdate_stage0_phaseC_batchC3b_dataTagsAndGroupMerge_v1"
project_name: "plannerUpdate"
date: "2026-04-23"
change_type: "migration"
template_version: "v4.2"

output_mode: "delta_blocks"
placement_method: "new_file_create"
idempotency: "one_shot"

trust_level: "strict"
preflight_validation: true
structured_warnings: false

files_modify:
  - "F:/Wedding Website/hanstan-wedding/_preUpdate_snapshots/capture_plannerUpdate_stage0_phaseC_2026-04-23.jsonl"
files_readonly:
  - "F:/Wedding Website/hanstan-wedding/spec_plannerUpdate_26apr23.md"
files_forbidden:
  - "F:/Wedding Website/hanstan-wedding/planner/planner.js"
  - "F:/Wedding Website/hanstan-wedding/planner/planner.css"
  - "F:/Wedding Website/hanstan-wedding/planner/index.html"
  - "F:/Wedding Website/hanstan-wedding/planner/hanstan-schedule-defaults.js"
  - "F:/Wedding Website/hanstan-wedding/netlify/functions/planner-state.mjs"
  - "F:/Wedding Website/hanstan-wedding/HANSTAN_WEDDING_SITE_SPEC.md"
  - "F:/Wedding Website/hanstan-wedding/spec_plannerUpdate_26apr23.md"
  - "F:/Wedding Website/hanstan-wedding/data/planner-seed.json"

modules_used: []

definition_of_done:
  - "One authenticated POST to planner-state applies four coordinated data operations per spec §C.3b: M39 merges Guest List group into Guests; M40 tags master-only content; M41 adds cross-surface tags; M42 adds constraints metadata to 4 contacts."
  - "M39: the 3 tasks currently in group='Guest List' (B2, B8, B17) are reassigned to group='Guests'; string 'Guest List' is removed from the top-level state.groups[] array."
  - "M40: every task in group='HanStan Logistics' (B1, M26, M27, M28), every Wes/officiant task (B9, M9, M10, M11), and every task in group='Stan's Rolodex' (B4, B19, and the 10 no-id Indian-family rolodex cards) gets 'master-only' appended to its tags[] array (deduplicated)."
  - "M41: B4 + the 10 no-id Indian-family rolodex cards get tags=[...existing, 'rolodex', 'guests'] appended (deduplicated). B19 already has 'organizers' and 'guest-list' from batch C.1; this ticket confirms they remain."
  - "M42: the 4 contact records for Elsie, Fen, Bonnie, and Sarah Reese each gain a 'constraints' field (new field, schema-extensible) with the text specified in spec §C.3b M42."
  - "Every mutation emits a capture JSONL entry with batch='C.3b'."
  - "Post-POST verification: state.groups[] no longer contains 'Guest List'; B2/B8/B17 now group='Guests'; every named task in M40's scope has 'master-only' in tags; B4 + Indian-family rolodex cards have 'rolodex' + 'guests' in tags; Elsie/Fen/Bonnie/Sarah Reese contacts each have a constraints[] array."

depends_on:
  - "plannerUpdate_stage0_phaseC_batchC4_pairingPrincipleNote_v1"

revision: 1
supersedes: ""

spec_excerpts_whitelisted:
  - "spec_plannerUpdate_26apr23.md §C.3b (M39, M40, M41, M42 per-operation paragraphs)"
  - "spec_plannerUpdate_26apr23.md §C.X (Structured Capture Protocol format)"
  - "spec_plannerUpdate_26apr23.md §6.1 (Attribution)"
  - "spec_plannerUpdate_26apr23.md §A.9 (rolodex membership — identifies the 10 no-id Indian-family cards)"
```

---

## 1. Purpose and Scope

### 1.1 Ticket Goal (one sentence, literal)
Apply four coordinated data mutations in one POST — Guest-List → Guests group merge (M39), master-only tagging (M40), cross-surface tagging (M41), and contact-level constraints metadata for Elsie/Fen/Bonnie/Sarah Reese (M42) — all pure data, no code changes.

### 1.2 Explicit Non-Goals
- Do NOT implement render-path filtering on the `master-only` tag (parking-lot PL-24/25/26/27; Stage 2).
- Do NOT implement constraint-tooltip rendering on the new contact constraints field (parking-lot PL-03; Stage 1/2).
- Do NOT implement multi-parent group schema (parking-lot PL-01; Stage 1/2).
- Do NOT touch schedule events or schedule phases.

---

## 2. Preconditions and Assumptions

- All prior batch tickets applied (C.1, C.2, C.3, C.4).
- Live state contains: B2, B8, B17 in group='Guest List'; B1/M26/M27/M28 in group='HanStan Logistics'; B9, M9, M10, M11 as officiant-related tasks; B4 + 10 no-id Indian-family rolodex cards + B19 in Stan's Rolodex; the 4 contact records for Elsie, Fen, Bonnie, Sarah Reese in state.contacts[].
- Master token valid.

---

## 3. Execution Constraints

Strict.

---

## 4. File Scope Lock

### 4.1 Files Claude May Modify
- Capture JSONL.

### 4.2 Files Claude May Read
- spec (whitelisted).

### 4.3 Files Claude Must NOT Touch
All in `files_forbidden`.

### 4.4 Live Endpoints
- GET + POST planner-state.

---

## 5. Placement and Change Mechanics

`new_file_create` (JSONL append). `one_shot`.

---

## 6. Step-by-Step Instructions

**Step 0 (mandatory):** Read spec §C.3b for per-operation paragraphs. Read spec §A.9 to identify the 10 no-id Indian-family rolodex cards by title.

**Step 1 — Pre-flight validation.** Verify live contains: all prior-batch M-series tasks; 'Guest List' in groups[]; the 10 no-id Indian-family rolodex cards; 4 named contacts.

**Step 2 — Drift check.** GET live.

**Step 3 — Build POST body.** Starting from the live state, apply ALL mutations atomically:

**M39 — Group merge:**
- For each task with `group === 'Guest List'`, set `group = 'Guests'`. Expect exactly 3 matches (B2, B8, B17).
- Remove the string `'Guest List'` from `state.groups[]` array.

**M40 — Master-only tagging:**
- For each task `t` matching ANY of these predicates, add `'master-only'` to `t.tags` (dedupe):
  - `t.group === 'HanStan Logistics'`
  - `t.group === 'Stan's Rolodex'`
  - `t.id === 'B9'` OR title contains 'Wes' OR title contains 'officiant' — i.e., B9, M9, M10, M11.

**M41 — Cross-surface tagging:**
- For B4 and each of the 10 no-id Indian-family rolodex cards: add `'rolodex'` and `'guests'` to `tags` (dedupe).
- For B19: confirm `'organizers'` and `'guest-list'` are present (from batchC1). If either missing, re-append.

**M42 — Contact constraints:**
- For each of the 4 contacts by name match (Elsie, Fen, Bonnie, Sarah Reese) in `state.contacts[]`, set `constraints` to the array specified in spec §C.3b M42:
  - Elsie: `["Day-of pairing with Fen: when not actively working, should be near Fen."]`
  - Fen: `["Day-of pairing with Elsie: primary role is Elsie's helper/assistant/caretaker/boyfriend. When not actively working, should be near Elsie."]`
  - Bonnie: `["Scope moderated: keep tasks small, infrequent touchpoints. Elsie + Fen absorb overflow."]`
  - Sarah Reese: `["Scope moderated: flowers only, pre-assembled 1–2 days out. Don't expand role."]`

Build `{ state: <mutated>, by: 'Hannah & Stan' }`.

**Step 4 — POST.** Expect 200.

**Step 5 — Append JSONL entries.** One entry per atomic mutation. Estimated count: 3 (M39 group reassign) + 1 (M39 groups-array edit) + ~15 (M40 tag-adds across HanStan/officiant/rolodex scope — count depends on live rolodex population) + ~11 (M41 tag-adds across B4 + 10 Indian-family + B19 verify) + 4 (M42 constraints field set). Exact count computed at execution time from the set of matched targets. Each entry has `batch: "C.3b"`.

**Step 6 — Post-POST verification GET.** Verify:
- 'Guest List' NOT in groups[]; B2/B8/B17 now group='Guests'.
- Every task in M40 scope has 'master-only' in tags.
- B4 and the 10 no-id Indian-family cards have 'rolodex' and 'guests' in tags.
- Elsie, Fen, Bonnie, Sarah Reese contacts each have constraints[] populated per spec.

**Step 7 — Emit delta blocks.** One block per operation (M39, M40, M41, M42) = 4 delta blocks using §7.1 template. AUTHOR-PROVIDED CONTEXT copied from spec §C.3b.

---

## 7. Canonical Patch / Delta Format

4 blocks.

---

## 8. Output Contract Reference

`delta_blocks` + pre-flight.

---

## 9. Definition of Done

Per front-matter.

---

## 10. Post-Execution Verification (Human-Run)

- Load planner as `stanshan`.
- Confirm Guest List tab is GONE; Guests tab now contains B2, B8, B17 in addition to prior content.
- Filter tasks by tag 'master-only'; confirm HanStan Logistics + officiant + rolodex tasks all appear.
- Open Elsie's contact card in the People tab; confirm constraints field visible (may not render yet; that's PL-03).
- Confirm capture JSONL has new entries with `batch: "C.3b"`.

---

## 11. Failure Semantics

Standard.

---

**End of ticket.**
---

# §8 — Ticket: phaseC batchC3cPart1 auditExtension

# BUILD_TICKET — Phase C Batch C.3c Part 1: planner-state.mjs Accept `syntheticAuditEntries` Field

```yaml
ticket_id: "plannerUpdate_stage0_phaseC_batchC3cPart1_auditExtension_v1"
project_name: "plannerUpdate"
date: "2026-04-23"
change_type: "feature"
template_version: "v4.2"

output_mode: "delta_blocks"
placement_method: "anchor_insert"
idempotency: "one_shot"

trust_level: "strict"
preflight_validation: true
structured_warnings: true

files_modify:
  - "F:/Wedding Website/hanstan-wedding/netlify/functions/planner-state.mjs"
  - "F:/Wedding Website/hanstan-wedding/HANSTAN_WEDDING_SITE_SPEC.md"
files_readonly:
  - "F:/Wedding Website/hanstan-wedding/spec_plannerUpdate_26apr23.md"
files_forbidden:
  - "F:/Wedding Website/hanstan-wedding/planner/planner.js"
  - "F:/Wedding Website/hanstan-wedding/planner/planner.css"
  - "F:/Wedding Website/hanstan-wedding/planner/index.html"
  - "F:/Wedding Website/hanstan-wedding/planner/hanstan-schedule-defaults.js"
  - "F:/Wedding Website/hanstan-wedding/spec_plannerUpdate_26apr23.md"
  - "F:/Wedding Website/hanstan-wedding/data/planner-seed.json"

modules_used:
  - "MODULE_API_CHANGE"

definition_of_done:
  - "netlify/functions/planner-state.mjs POST handler accepts an optional `syntheticAuditEntries: [...]` field in the request body."
  - "When present, each entry is validated to have minimum fields ts+by+action+target+summary. Missing required fields cause a 400 response with a specific error describing which field is missing on which entry index."
  - "Valid synthetic entries are appended to audit-log.json via the existing appendAudit() helper, preserving ts+by+entity+field+from+to as provided."
  - "When the field is absent, POST behavior is unchanged from pre-ticket. Backwards-compatible."
  - "A git commit lands on the Scryble/hanstan-wedding main branch with message: 'planner-state: accept syntheticAuditEntries field for Phase C.3c Elsie backfill migration (spec_plannerUpdate_26apr23.md §C.3c Part 1)'. Commit is pushed. Netlify build goes green."
  - "HANSTAN_WEDDING_SITE_SPEC.md gets an additive section documenting the new optional field, its validation, its purpose, and its expected lifecycle (used for one-shot migrations like the Elsie backfill; not a long-lived API)."
  - "Post-deploy: a diagnostic POST with a single throwaway syntheticAuditEntries payload confirms the field is accepted by live Netlify. Diagnostic entry must be immediately removed from audit-log.json via the snapshot-restore endpoint, OR tagged `test-artifact` and removed in batchC3cPart2."

depends_on:
  - "plannerUpdate_stage0_phaseC_batchC5_elsieHistoricalBackfill_v1"

revision: 1
supersedes: ""

spec_excerpts_whitelisted:
  - "spec_plannerUpdate_26apr23.md §C.3c (M43 Part 1 code change — syntheticAuditEntries accept)"
  - "spec_plannerUpdate_26apr23.md §C.3c Part 1 + Part 2 (execution order; backwards-compat requirement)"
  - "spec_plannerUpdate_26apr23.md 'Stage 0 non-goal revision' paragraph (explicit exception for the narrow planner-state.mjs change)"
```

---

## 1. Purpose and Scope

### 1.1 Ticket Goal (one sentence, literal)
Extend `netlify/functions/planner-state.mjs` to accept an optional `syntheticAuditEntries` array in the POST body, validate each entry's minimum fields, and append them to the audit log via `appendAudit()` — backwards-compatible, one-shot ticket, deployed via a single git commit + push.

### 1.2 Explicit Non-Goals
- Do NOT extend `diffStates()` coverage (Stage 1 item #1).
- Do NOT modify any other file in `netlify/functions/`.
- Do NOT modify the audit-log shape (`{ts, by, action, target, summary, entity?, field?, from?, to?}` stays the same; synthetic entries use the same shape).
- Do NOT modify `planner.js` or any client-side code.
- Do NOT issue bulk Elsie backfill POST — that is batch C.3c Part 2.
- Do NOT commit any uncommitted hunks from the 1,162-line local-clone modification set — this commit contains ONLY the planner-state.mjs delta + the HANSTAN_WEDDING_SITE_SPEC.md co-update.

---

## 2. Preconditions and Assumptions

- batch C.5 applied (Elsie JSONL entries exist locally — Part 2 of this ticket pair will POST them).
- All prior live-POST batches applied (C.1, C.2, C.3, C.3b, C.4).
- `netlify/functions/planner-state.mjs` currently has an `appendAudit()` helper function and a POST handler that processes `{state, by}` body shape.
- `HANSTAN_WEDDING_SITE_SPEC.md` is writable (not frozen yet — that happens in phaseD).
- git is on PATH; the local clone has a clean working tree except for the 1,162-line set which is explicitly not part of this commit.

**CRITICAL precondition:** the 1,162-line modification set must be staged-out of this commit. Either:
- (a) Stash it: `git stash push -u -- planner/planner.js planner/planner.css planner/index.html planner/hanstan-schedule-defaults.js data/planner-seed.json` before making the planner-state.mjs edit, then `git stash pop` after commit.
- (b) Use `git commit -- netlify/functions/planner-state.mjs HANSTAN_WEDDING_SITE_SPEC.md` to commit only the two scoped files.

Ticket uses (b) — path-limited commit.

**Ticket dependencies:** batch C.5 (Elsie JSONL must exist before Part 2; Part 1 can technically run without it, but the dependency preserves spec execution order).

---

## 3. Execution Constraints

Strict.

---

## 4. File Scope Lock

### 4.1 Files Claude May Modify
- `F:/Wedding Website/hanstan-wedding/netlify/functions/planner-state.mjs`
- `F:/Wedding Website/hanstan-wedding/HANSTAN_WEDDING_SITE_SPEC.md`

### 4.2 Files Claude May Read but NOT Modify
- `spec_plannerUpdate_26apr23.md` (whitelisted)

### 4.3 Files Claude Must NOT Touch
All in `files_forbidden`. **Specifically: no touching the 1,162-line modification set files** — even though they have uncommitted changes, this ticket does NOT pull them into the commit.

### 4.4 Live Operations
- `git add -- netlify/functions/planner-state.mjs HANSTAN_WEDDING_SITE_SPEC.md`
- `git commit -m '<message>'`
- `git push origin main`
- Post-deploy diagnostic POST to `/.netlify/functions/planner-state` (tagged as test).

---

## 5. Placement and Change Mechanics

### 5.1 Placement Method
`anchor_insert` — insert validation+append block after the existing `diffStates()` call in the POST handler; insert the spec-doc section after the existing API-contract section in HANSTAN_WEDDING_SITE_SPEC.md.

### 5.2 Idempotency
`one_shot`. Re-execution would attempt to commit the same delta twice.

### 5.3 Encoding
UTF-8, LF. `planner-state.mjs` is an ES module; preserve ESM import/export syntax.

### 5.4 Anchors
**File 1:** `netlify/functions/planner-state.mjs`
**Anchor (exact):** the first line after the existing `appendAudit(by, diffEntries)` call in the POST handler. Ticket executor must read the file at execution time to capture the exact anchor text (the live handler structure may have evolved since spec authoring).
**Directive:** insert immediately after ANCHOR.

**File 2:** `HANSTAN_WEDDING_SITE_SPEC.md`
**Anchor (exact):** end of §14 "API Contract" section (or wherever the planner-state.mjs POST body shape is documented — executor reads file to find exact anchor).
**Directive:** insert immediately after ANCHOR.

### 5.5–5.7
N/A.

---

## 6. Step-by-Step Instructions

**Step 0 (mandatory):** Read `netlify/functions/planner-state.mjs` in full. Identify: (a) the POST handler's body-parsing logic, (b) the `appendAudit()` helper signature, (c) the existing `diffStates()` call site.

**Step 1 — Emit pre-flight validation block.** Verify:
- `netlify/functions/planner-state.mjs` exists and contains `appendAudit` + POST handler.
- `HANSTAN_WEDDING_SITE_SPEC.md` exists and is writable.
- `git status` shows clean working tree for `netlify/functions/planner-state.mjs` and `HANSTAN_WEDDING_SITE_SPEC.md` specifically (i.e., no prior uncommitted edits on these two files); the 1,162-line set on other files is expected and OK.
- `git remote get-url origin` returns a URL matching Scryble/hanstan-wedding.
- Netlify token / connector not required for this ticket (deploy is triggered by push).

**Step 2 — Emit structured warnings block** per `structured_warnings: true` if any of the following conditions hold:
- `ANCHOR_PROXIMITY_RISK` if the anchor text for either file matches more than once.
- `SCOPE_BOUNDARY_ADJACENT` if the delta touches code within 3 lines of the `diffStates()` call site — the delta DOES touch adjacent lines, so this warning is expected.
- `LARGE_DELTA` N/A (delta is ~20 LoC).
- `POSSIBLE_TYPE_MISMATCH` N/A.
- `ENCODING_ANOMALY` N/A unless detected.

**Step 3 — Construct the `planner-state.mjs` delta.** The insertion block:

```javascript
// === syntheticAuditEntries acceptance (added per spec_plannerUpdate_26apr23.md §C.3c Part 1) ===
// Used by one-shot migrations (e.g. Phase C.3c Elsie backfill) to inject historical
// audit entries with their original ts+by values. When the field is absent, behavior is unchanged.
if (Array.isArray(body.syntheticAuditEntries)) {
  for (let i = 0; i < body.syntheticAuditEntries.length; i++) {
    const e = body.syntheticAuditEntries[i];
    const missing = ['ts', 'by', 'action', 'target', 'summary'].filter(f => !e[f]);
    if (missing.length) {
      return new Response(
        JSON.stringify({ ok: false, error: `syntheticAuditEntries[${i}] missing required fields: ${missing.join(', ')}` }),
        { status: 400, headers: { 'content-type': 'application/json' } }
      );
    }
  }
  // All valid — append via the same helper that handles diffStates output.
  await appendAudit(body.by, body.syntheticAuditEntries);
}
// === end syntheticAuditEntries acceptance ===
```

Insert this block immediately after the existing `await appendAudit(by, diffEntries)` (or equivalent) call site.

**Step 4 — Construct the `HANSTAN_WEDDING_SITE_SPEC.md` delta.** The insertion section (append after the §14 API Contract section or the nearest planner-state.mjs API docs block):

```markdown
### §14.X — `syntheticAuditEntries` optional POST field (added 2026-04-23, Phase C.3c Part 1)

The `/.netlify/functions/planner-state` POST handler accepts an optional `syntheticAuditEntries: [...]` field alongside the standard `state` + `by` fields. When present, each entry must contain at minimum `ts`, `by`, `action`, `target`, and `summary`; may optionally contain `entity`, `field`, `from`, `to`. Valid entries are appended to `audit-log.json` via the same `appendAudit()` helper that handles `diffStates()` output.

**Purpose:** one-shot migrations that inject historical audit entries with their original timestamps (e.g., the Elsie 2026-04-22 backfill from Phase C.3c Part 2, which replays the 8 reconstructed schedule-tab mutations captured in `_preUpdate_snapshots/capture_plannerUpdate_stage0_phaseC_2026-04-23.jsonl`).

**Lifecycle:** not intended as a long-lived API. Callers outside of explicit migrations should not use this field. Future `diffStates()` extensions (Stage 1 scope) will subsume the need for synthetic injection for all new entity types.

**Validation failure:** a single missing-required-field in any entry causes a 400 response with the specific offending entry index and the missing field names.

**Backwards compatibility:** absent this field, POST behavior is unchanged.
```

**Step 5 — Apply the deltas.** Write both files.

**Step 6 — Commit + push.** Execute:
```
git add -- netlify/functions/planner-state.mjs HANSTAN_WEDDING_SITE_SPEC.md
git commit -m "planner-state: accept syntheticAuditEntries field for Phase C.3c Elsie backfill migration (spec_plannerUpdate_26apr23.md §C.3c Part 1)"
git push origin main
```

Verify `git status` shows the 1,162-line set still uncommitted (unchanged by this ticket).

**Step 7 — Monitor Netlify deploy.** Via Chrome connector or Netlify API: confirm the triggered deploy completes successfully (status=ready). Expected runtime: 1–2 minutes.

**Step 8 — Diagnostic smoke test.** Issue:
```
POST https://hanstan.wedding/.netlify/functions/planner-state
Authorization: Bearer stanshan
Content-Type: application/json

{
  "state": <current-live-state-unchanged>,
  "by": "Hannah & Stan",
  "syntheticAuditEntries": [
    {"ts": "2026-04-23T23:59:59Z", "by": "Hannah & Stan", "action": "test", "target": "test-artifact", "summary": "Smoke test for syntheticAuditEntries acceptance (to be removed)", "entity": "note"}
  ]
}
```

Expect 200 + `ok: true` + response.auditEntries containing the test entry.

**Step 9 — Clean up diagnostic entry.** Immediately issue a second POST restoring the audit-log to pre-test state via `planner-snapshots` restore endpoint, OR if the test entry is clearly identifiable by target='test-artifact', leave it and document that batch C.3c Part 2 should remove it first.

Ticket chooses: leave the test entry with target='test-artifact'; Part 2 removes it before replaying the real 8 Elsie entries.

---

## 7. Canonical Patch / Delta Format

Two delta blocks (one per modified file) using §7.1 full template. AUTHOR-PROVIDED CONTEXT fields:

**Problem:** Elsie's 2026-04-22 schedule-tab edits produced zero audit entries because `diffStates()` doesn't cover schedule. 8 mutations are lost to attribution until backfilled.

**Symptoms:** audit-log.json shows only 45 entries (all task-level); zero schedule activity despite Elsie's 19 POSTs on 2026-04-22.

**Cause:** `diffStates()` scope is narrow; Stage 1 extends it, but that's weeks away. A backfill needs to land sooner.

**Attempted fixes:**
- NotAFix 1: wait for Stage 1 unified `diffStates()` — rejected; Stage 1 is weeks out.
- NotAFix 2: Netlify CLI one-off script against production blob — rejected; bypasses the existing auth + audit-helper code paths.
- NotAFix 3: reset Elsie's 2026-04-22 state + re-replay the POSTs — rejected; schedule `diffStates()` still wouldn't fire.

**Current fix applied:** add a narrow optional `syntheticAuditEntries` field to the existing POST handler. ~20 LoC. Reuses `appendAudit()`. Backwards-compatible. Lifecycle-scoped to one-shot migrations.

**What might potentially break this fix:**
- If a coordinator-token (non-master) caller discovers the field, they could inject fake history. Mitigated: token-validation remains at the top of the handler; the field is still subject to master-token gate if existing guards already scope state-writes to master tokens. If they don't, add a master-only check on this field specifically — the delta above assumes the existing guard suffices; executor must verify and add if needed.

**Edge cases (not implemented):** time-ordering of synthetic vs. organic entries (the Activity-tab Stage 1 renderer sorts by ts anyway, so append order doesn't matter).

---

## 8. Output Contract Reference

`delta_blocks` + pre-flight validation + structured warnings (if triggered).

---

## 9. Definition of Done

Per front-matter.

---

## 10. Post-Execution Verification (Human-Run)

- Netlify dashboard shows the new deploy as Ready.
- `curl -s https://hanstan.wedding/.netlify/functions/planner-state -H 'Authorization: Bearer stanshan' | head -c 500` works (live endpoint still healthy).
- Commit visible on GitHub Scryble/hanstan-wedding main branch with the specified message.
- `git log -1 --stat` shows exactly 2 files changed: `netlify/functions/planner-state.mjs` and `HANSTAN_WEDDING_SITE_SPEC.md`. No other files in the commit.
- Diagnostic test entry with target='test-artifact' visible in audit-log.json.

---

## 11. Failure Semantics

- Netlify deploy fails → revert commit, debug locally, re-push when clean.
- 4xx on diagnostic POST → acceptance logic has a bug; amend commit, re-push.
- `git status` shows unintended files staged → reset and re-stage with path-limited `git add`.
- If blocked mid-execution (e.g., commit succeeded, push failed), emit partial completion block with the commit hash so human can retry the push manually.

---

**End of ticket.**
---

# §9 — Ticket: phaseC batchC3cPart2 elsieBackfillAndStageOneEnablers

# BUILD_TICKET — Phase C Batch C.3c Part 2: M44 scheduleSeedVersion=0 + M45 stage1smoke Token + M43 Part 2 Elsie Backfill POST

```yaml
ticket_id: "plannerUpdate_stage0_phaseC_batchC3cPart2_elsieBackfillAndStageOneEnablers_v1"
project_name: "plannerUpdate"
date: "2026-04-23"
change_type: "migration"
template_version: "v4.2"

output_mode: "delta_blocks"
placement_method: "new_file_create"
idempotency: "one_shot"

trust_level: "strict"
preflight_validation: true
structured_warnings: false

files_modify:
  - "F:/Wedding Website/hanstan-wedding/_preUpdate_snapshots/capture_plannerUpdate_stage0_phaseC_2026-04-23.jsonl"
files_readonly:
  - "F:/Wedding Website/hanstan-wedding/_preUpdate_snapshots/capture_plannerUpdate_stage0_phaseC_2026-04-23.jsonl"
  - "F:/Wedding Website/hanstan-wedding/spec_plannerUpdate_26apr23.md"
files_forbidden:
  - "F:/Wedding Website/hanstan-wedding/planner/planner.js"
  - "F:/Wedding Website/hanstan-wedding/planner/planner.css"
  - "F:/Wedding Website/hanstan-wedding/planner/index.html"
  - "F:/Wedding Website/hanstan-wedding/planner/hanstan-schedule-defaults.js"
  - "F:/Wedding Website/hanstan-wedding/netlify/functions/planner-state.mjs"
  - "F:/Wedding Website/hanstan-wedding/HANSTAN_WEDDING_SITE_SPEC.md"
  - "F:/Wedding Website/hanstan-wedding/spec_plannerUpdate_26apr23.md"
  - "F:/Wedding Website/hanstan-wedding/data/planner-seed.json"

modules_used: []

definition_of_done:
  - "Execution order: M44 → M45 → M43 Part 2. Each operation confirmed before proceeding to the next."
  - "M44: one authenticated POST to planner-state sets prefs.scheduleSeedVersion = 0 (live currently has it undefined). JSONL entry with batch='C.3c' appended."
  - "M45: one authenticated POST to planner-coordinators adds {token: 'stage1smoke', name: 'Stage 1 Smoke Test', isMaster: false, addedBy: 'Hannah & Stan'}. JSONL entry with batch='C.3c' appended."
  - "M43 Part 2 precondition: the diagnostic test-artifact entry from batchC3cPart1 Step 8 is removed from audit-log.json via snapshot-restore OR via a minimal state-current POST that does not contain test-artifact."
  - "M43 Part 2: one authenticated POST to planner-state with syntheticAuditEntries containing the 8 Elsie entries (read from the capture JSONL, filtered by by='Elsie' + batch='C.5'). Live audit-log.json gains the 8 entries with their original 2026-04-22 timestamps."
  - "Every ticket mutation produces capture JSONL entries with batch='C.3c'."
  - "Post-POST verification: audit-log.json contains 8 entries with by='Elsie' and 2026-04-22 timestamps; prefs.scheduleSeedVersion === 0; coordinators blob contains stage1smoke."

depends_on:
  - "plannerUpdate_stage0_phaseC_batchC3cPart1_auditExtension_v1"
  - "plannerUpdate_stage0_phaseC_batchC5_elsieHistoricalBackfill_v1"

revision: 1
supersedes: ""

spec_excerpts_whitelisted:
  - "spec_plannerUpdate_26apr23.md §C.3c (M43 Part 2 data action, M44 prefs set, M45 token create)"
  - "spec_plannerUpdate_26apr23.md §C.X (Structured Capture Protocol format)"
  - "spec_plannerUpdate_26apr23.md §A.3 + §C.5 (Elsie 8-entry source data)"
```

---

## 1. Purpose and Scope

### 1.1 Ticket Goal (one sentence, literal)
After the planner-state.mjs synthetic-audit-entries extension has deployed (batch C.3c Part 1), execute three coordinated live operations in strict order: M44 sets prefs.scheduleSeedVersion=0; M45 creates the stage1smoke test coordinator token; M43 Part 2 POSTs the 8 Elsie historical entries as synthetic audit entries via the newly-accepted field.

### 1.2 Explicit Non-Goals
- Do NOT modify any code. Part 1 already did.
- Do NOT run without confirming the Netlify deploy of Part 1 is green.
- Do NOT replay Elsie's schedule-event mutations against live state — those already landed on live 2026-04-22 via Elsie's original POSTs. This ticket ONLY injects audit entries, not state mutations.
- Do NOT revoke the stage1smoke token here — Stage 1's exit criteria revokes it after Stage 1 smoke-testing completes.
- Do NOT write the test-artifact cleanup if batch C.3c Part 1 Step 9 already removed it (skip Step 3 below if absent).

---

## 2. Preconditions and Assumptions

- batchC3cPart1 has deployed successfully; Netlify status=Ready; the new field is accepted by live.
- batchC5 has appended the 8 Elsie entries to the capture JSONL.
- Master token valid.
- Live state is otherwise unchanged since batch C.3b (the C.3c Part 1 commit does not mutate state, only adds a new accepted field).

---

## 3. Execution Constraints

Strict.

---

## 4. File Scope Lock

### 4.1 Files Claude May Modify
- Capture JSONL (append).

### 4.2 Files Claude May Read but NOT Modify
- Capture JSONL (read to extract the 8 Elsie entries).
- spec (whitelisted).

### 4.3 Files Claude Must NOT Touch
All in `files_forbidden`.

### 4.4 Live Endpoints
- `GET` + `POST` planner-state (for M44 + M43-Part-2).
- `POST` planner-coordinators (for M45).

---

## 5. Placement and Change Mechanics

`new_file_create` (JSONL append). `one_shot`.

---

## 6. Step-by-Step Instructions

**Step 0 (mandatory):** Read spec §C.3c for M43 Part 2 + M44 + M45 definitions. Read the capture JSONL; extract the 8 lines where by='Elsie' and batch='C.5'; parse each into a JSON object.

**Step 1 — Pre-flight validation block.** Verify:
- Part 1 deploy landed: `git log origin/main -1 --format=%s` contains 'syntheticAuditEntries' AND the commit is reachable via `git fetch origin` + log comparison.
- Chrome connector can resolve Netlify status or a GET smoke works: `curl -s -o /dev/null -w '%{http_code}' https://hanstan.wedding/.netlify/functions/planner-state -H 'Authorization: Bearer stanshan'` returns 200.
- 8 Elsie entries present in capture JSONL.
- Live state reachable.

**Step 2 — Drift check.** GET live. Capture `lastModified`. Verify prefs.scheduleSeedVersion is absent/undefined (if it's 0 already, skip M44 and log "M44 skipped — already at 0").

**Step 3 — M44 POST.** Build POST body from live GET state + mutation: set `state.prefs.scheduleSeedVersion = 0`. `{state: <mutated>, by: 'Hannah & Stan'}`. POST. Expect 200. Append JSONL entry with batch='C.3c' summary='M44: prefs.scheduleSeedVersion set explicitly to 0 to remove undefined-vs-zero branch for Stage 1 SEED_VERSION top-up logic'.

**Step 4 — M45 POST.** Build `POST https://hanstan.wedding/.netlify/functions/planner-coordinators` with body `{action: 'add', token: 'stage1smoke', name: 'Stage 1 Smoke Test', isMaster: false, addedBy: 'Hannah & Stan'}`. Auth Bearer stanshan. Expect 200. Append JSONL entry: `{entity: 'coordinator', action: 'create', target: 'stage1smoke', ...}`.

**Step 5 — Pre-M43-Part-2: test-artifact cleanup.** GET audit-log.json via `planner-audit` endpoint; check if any entry has `target === 'test-artifact'`. If yes, use `planner-snapshots` restore to roll back the audit log to just before Part 1's Step 8 smoke test, then replay M44 + M45 on the restored state. If no, proceed directly to Step 6.

**Step 6 — M43 Part 2 POST.** Build POST body: `{state: <current-live-state-post-M44-M45>, by: 'Hannah & Stan', syntheticAuditEntries: [<the 8 parsed Elsie entries from Step 0>]}`. POST to planner-state. Expect 200 + response.auditEntries contains 8 Elsie entries.

**Step 7 — Post-POST verification.** GET audit-log.json. Verify:
- 8 entries with `by === 'Elsie'` and `ts` in 2026-04-22 range exist.
- No entry with `target === 'test-artifact'` remains.
- prefs.scheduleSeedVersion === 0.
- coordinators blob contains stage1smoke.

**Step 8 — Append remaining JSONL entries.** The M44 + M45 entries were appended in Steps 3+4. For M43 Part 2, append one JSONL entry summarizing the batch injection: `{entity: 'note', action: 'update', target: 'audit-log', summary: 'Injected 8 Elsie 2026-04-22 schedule-tab historical entries via syntheticAuditEntries field', source: 'spec_plannerUpdate_26apr23.md §C.3c Part 2', batch: 'C.3c'}`.

**Step 9 — Emit delta blocks** per §7.1. 3 blocks (M44, M45, M43-Part-2) + 1 cleanup block if Step 5 ran.

---

## 7. Canonical Patch / Delta Format

3 or 4 delta blocks.

---

## 8. Output Contract Reference

`delta_blocks` + pre-flight block.

---

## 9. Definition of Done

Per front-matter.

---

## 10. Post-Execution Verification (Human-Run)

- Load planner as `stanshan`. Open browser devtools → Network → GET /planner-audit → confirm 8 Elsie entries visible with 2026-04-22 timestamps.
- Check Netlify blob `planner/coordinators.json` contains stage1smoke (via Chrome connector → Netlify dashboard → blob view).
- Load planner once with browser devtools open; in console, confirm `PREFS.scheduleSeedVersion === 0` (NOT undefined).
- Capture JSONL has new entries with `batch: "C.3c"`.

---

## 11. Failure Semantics

- If Part 1 deploy is not green at Step 1 pre-flight → deterministic failure. Do not proceed. Human must debug Part 1 first.
- 4xx on the syntheticAuditEntries POST → Part 1 acceptance logic has a bug; revise Part 1 and re-deploy.
- Partial completion: if M44 lands but M45 fails, emit partial completion block describing the state-current audit increment + missing stage1smoke token.

---

**End of ticket.**
---

# §10 — Ticket: phaseC batchC7 weddingFolderTasqReminder

# BUILD_TICKET — Phase C Batch C.7: Wedding-Folder tasQ.md Reach-Out-To-Elsie Reminder

```yaml
ticket_id: "plannerUpdate_stage0_phaseC_batchC7_weddingFolderTasqReminder_v1"
project_name: "plannerUpdate"
date: "2026-04-23"
change_type: "docs"
template_version: "v4.2"

output_mode: "full_files"
placement_method: "new_file_create"
idempotency: "idempotent"

trust_level: "strict"
preflight_validation: true
structured_warnings: false

files_modify:
  - "F:/Wedding Website/hanstan-wedding/tasQ.md"
files_readonly:
  - "F:/Wedding Website/hanstan-wedding/spec_plannerUpdate_26apr23.md"
files_forbidden:
  - "F:/Wedding Website/hanstan-wedding/planner/planner.js"
  - "F:/Wedding Website/hanstan-wedding/planner/planner.css"
  - "F:/Wedding Website/hanstan-wedding/planner/index.html"
  - "F:/Wedding Website/hanstan-wedding/planner/hanstan-schedule-defaults.js"
  - "F:/Wedding Website/hanstan-wedding/netlify/functions/planner-state.mjs"
  - "F:/Wedding Website/hanstan-wedding/HANSTAN_WEDDING_SITE_SPEC.md"
  - "F:/Wedding Website/hanstan-wedding/spec_plannerUpdate_26apr23.md"
  - "F:/Wedding Website/hanstan-wedding/data/planner-seed.json"

modules_used: []

definition_of_done:
  - "F:/Wedding Website/hanstan-wedding/tasQ.md exists (created if absent, appended-to if present)."
  - "The file contains a new reminder entry under a clearly-labeled section: 'Reach out to Elsie once the entire 2026-04-23 planner update has been applied to live. See M35 on live planner for the planner-side tracker of this reminder.'"
  - "If the file was newly created, it uses the standard tasQ format (YAML frontmatter + markdown sections per CLAUDE.md tasQ Protocol)."
  - "No live POST. No network activity. No code changes. No git operations."

depends_on: []

revision: 1
supersedes: ""

spec_excerpts_whitelisted:
  - "spec_plannerUpdate_26apr23.md §C.7 (Reminder append to wedding folder tasQ)"
  - "spec_plannerUpdate_26apr23.md §C.3 M35 (planner-side counterpart of this reminder)"
```

---

## 1. Purpose and Scope

### 1.1 Ticket Goal (one sentence, literal)
Append a post-update reach-out-to-Elsie reminder to `F:/Wedding Website/hanstan-wedding/tasQ.md`, creating the file with standard tasQ format if absent.

### 1.2 Explicit Non-Goals
- Do NOT modify M35 on live (that was created in batch C.3).
- Do NOT touch `C:/Users/ranji/.claude/projects/f--/memory/tasQ.md` (that is the F-drive project tasQ, different file).
- Do NOT commit or push.
- Do NOT modify any code.

---

## 2. Preconditions and Assumptions

- Working directory `F:/Wedding Website/hanstan-wedding/` exists.
- `tasQ.md` at the repo root either exists (append target) or does not exist (create target).

---

## 3. Execution Constraints

Strict.

---

## 4. File Scope Lock

### 4.1 Files Claude May Modify
- `F:/Wedding Website/hanstan-wedding/tasQ.md`

### 4.2 Files Claude May Read but NOT Modify
- spec (whitelisted).

### 4.3 Files Claude Must NOT Touch
All in `files_forbidden`.

### 4.4 Live Endpoints
None.

---

## 5. Placement and Change Mechanics

`new_file_create` if absent, append if present. `idempotent`: re-running detects the existing reminder and does not duplicate.

UTF-8 LF.

---

## 6. Step-by-Step Instructions

**Step 0 (mandatory):** Check whether `F:/Wedding Website/hanstan-wedding/tasQ.md` exists. If it does, read it in full. If it does not, plan to create it with standard tasQ format.

**Step 1 — Pre-flight validation block.** Verify parent directory writable.

**Step 2 — Idempotency check.** If the file exists AND contains the literal string 'Reach out to Elsie once the entire 2026-04-23 planner update has been applied', emit success with `entry_already_present: true` and skip the append.

**Step 3 — If the file does NOT exist**, create it with this content:

```markdown
---
name: hanstan-wedding repo tasQ
description: Repo-local tasQ for the hanstan-wedding wedding website repository. Separate from the F-drive project tasQ at C:/Users/ranji/.claude/projects/f--/memory/tasQ.md — this file tracks repo-scoped reminders that belong with the repo itself.
type: tasq
---

# tasQ — hanstan-wedding repo
Last updated: 2026-04-23

## Where We Are

The 2026-04-23 planner update is mid-execution per `spec_plannerUpdate_26apr23.md`. Stage 0 Phases A, B, C are in progress; Phase D pending; Stage 1 scope-locked but not yet drafted in detail.

## Active Reminders

| # | Reminder | Trigger | Source |
|---|----------|---------|--------|
| 1 | Reach out to Elsie once the entire 2026-04-23 planner update has been applied to live. | Update complete (all Stage 0 + Stage 1 batches shipped). | spec_plannerUpdate_26apr23.md §C.7; also tracked as M35 on live planner |

## Session Log

| # | Date | Summary |
|---|------|---------|
| 1 | 2026-04-23 | tasQ created during batch C.7 execution of plannerUpdate Stage 0. |
```

**Step 4 — If the file DOES exist but does NOT have the reminder**, append the reminder to the "Active Reminders" section (create the section if absent), preserving all other content verbatim. Update the "Last updated" line to 2026-04-23 if it is older.

**Step 5 — Emit output** (`full_files`): the complete final content of `tasQ.md`.

---

## 7. Canonical Patch / Delta Format

N/A — `full_files` output. Use §7.2 lightweight format.

---

## 8. Output Contract Reference

`full_files` + pre-flight block.

---

## 9. Definition of Done

Per front-matter.

---

## 10. Post-Execution Verification (Human-Run)

- Open `F:/Wedding Website/hanstan-wedding/tasQ.md` in VS Code.
- Confirm the reminder text is present.
- Confirm the file structure follows the CLAUDE.md tasQ Protocol format (YAML frontmatter + Where We Are + sections).

---

## 11. Failure Semantics

Standard.

---

**End of ticket.**
---

# §11 — Ticket: phaseD batchNone frozenSpecAndGovernance

# BUILD_TICKET — Phase D: Frozen Pre-Update Site Spec + §PU-1 through §PU-11 + Baseline Metrics + Stage 1 Commit Plan + Integrity Check + Local Commit

```yaml
ticket_id: "plannerUpdate_stage0_phaseD_batchNone_frozenSpecAndGovernance_v1"
project_name: "plannerUpdate"
date: "2026-04-23"
change_type: "docs"
template_version: "v4.2"

output_mode: "full_files"
placement_method: "new_file_create"
idempotency: "one_shot"

trust_level: "strict"
preflight_validation: true
structured_warnings: false

files_modify:
  - "F:/Wedding Website/hanstan-wedding/HANSTAN_WEDDING_SITE_SPEC_preUpdate_plannerUpdate_stage0_26apr23.md"
  - "F:/Wedding Website/hanstan-wedding/_preUpdate_snapshots/baseline_plannerUpdate_stage0_phaseD_postStage0.json"
  - "F:/Wedding Website/hanstan-wedding/_preUpdate_snapshots/stageOneCommitPlan_plannerUpdate_stage0_phaseD_v1.md"
  - "F:/Wedding Website/hanstan-wedding/_preUpdate_snapshots/integrityCheck_plannerUpdate_stage0_phaseD_v1.md"
files_readonly:
  - "F:/Wedding Website/hanstan-wedding/HANSTAN_WEDDING_SITE_SPEC.md"
  - "F:/Wedding Website/hanstan-wedding/spec_plannerUpdate_26apr23.md"
  - "F:/Wedding Website/hanstan-wedding/_preUpdate_snapshots/"
files_forbidden:
  - "F:/Wedding Website/hanstan-wedding/planner/planner.js"
  - "F:/Wedding Website/hanstan-wedding/planner/planner.css"
  - "F:/Wedding Website/hanstan-wedding/planner/index.html"
  - "F:/Wedding Website/hanstan-wedding/planner/hanstan-schedule-defaults.js"
  - "F:/Wedding Website/hanstan-wedding/netlify/functions/planner-state.mjs"
  - "F:/Wedding Website/hanstan-wedding/spec_plannerUpdate_26apr23.md"
  - "F:/Wedding Website/hanstan-wedding/data/planner-seed.json"

modules_used: []

definition_of_done:
  - "Four new local files created in the specified paths."
  - "HANSTAN_WEDDING_SITE_SPEC_preUpdate_plannerUpdate_stage0_26apr23.md is a copy of the current HANSTAN_WEDDING_SITE_SPEC.md plus appended sections §PU-1 through §PU-11 per spec_plannerUpdate_26apr23.md §Stage 0 Phase D."
  - "baseline_plannerUpdate_stage0_phaseD_postStage0.json contains integer counts of every entity type in live state after all Phase C batches (tasks, contacts, groups, tags, schedule events, phases, questions, audit entries, snapshots, coordinators)."
  - "stageOneCommitPlan_plannerUpdate_stage0_phaseD_v1.md contains a per-file per-hunk KEEP/DROP/MODIFY staging plan for the 1,162-line local-clone modification set, referencing hunkCatalogue outputs from the Phase A ticket."
  - "integrityCheck_plannerUpdate_stage0_phaseD_v1.md contains the result of a one-time pass verifying every existing audit entry has non-empty ts+by+action and every snapshot-manifest entry points to a real blob. Any orphans logged."
  - "One local git commit lands on the currently-checked-out branch of the local clone with message: 'plannerUpdate stage0 phaseD: freeze pre-update site spec + baseline metrics + Stage 1 commit plan + integrity check (spec_plannerUpdate_26apr23.md §Stage 0 Phase D)'. The commit contains ONLY the 4 new files. It is NOT pushed."
  - "The 1,162-line local-clone modification set remains uncommitted after this ticket."
  - "No live POST. No git push. No Netlify deploy."

depends_on:
  - "plannerUpdate_stage0_phaseC_batchC7_weddingFolderTasqReminder_v1"
  - "plannerUpdate_stage0_phaseA_batchNone_hunkCatalogue_v1"

revision: 1
supersedes: ""

spec_excerpts_whitelisted:
  - "spec_plannerUpdate_26apr23.md §Stage 0 Phase D (frozen spec + §PU-1 through §PU-11 definitions)"
  - "spec_plannerUpdate_26apr23.md §PU-6 (governance rules formalized: Rolodex Rule, Pairing Principle, Supremacy Rule, Recency-wins Rule, M-series taskId convention)"
  - "spec_plannerUpdate_26apr23.md §PU-7 (Structured Capture Protocol formalized)"
  - "spec_plannerUpdate_26apr23.md §PU-8 (entity-schema map)"
  - "spec_plannerUpdate_26apr23.md §PU-9 (baseline metrics spec)"
  - "spec_plannerUpdate_26apr23.md §PU-10 (Stage 1 commit plan spec)"
  - "spec_plannerUpdate_26apr23.md §PU-11 (integrity check spec)"
  - "spec_plannerUpdate_26apr23.md §Stage 0 acceptance criteria S0-AC-5 (Phase D deliverable requirements)"
```

---

## 1. Purpose and Scope

### 1.1 Ticket Goal (one sentence, literal)
Produce four Phase D artifacts locally — the frozen pre-update site spec with §PU-1 through §PU-11, the baseline metrics JSON, the Stage 1 commit plan, and the integrity check record — and commit them together to the local clone without pushing.

### 1.2 Explicit Non-Goals
- Do NOT modify `HANSTAN_WEDDING_SITE_SPEC.md` (the working-copy spec). That gets rewritten in Stage 1, not Phase D.
- Do NOT modify `spec_plannerUpdate_26apr23.md` (this update's own spec). Frozen by virtue of being the authoritative spec for the work being done.
- Do NOT push the commit. Stage 1 pushes the first commit that contains the hunks from the 1,162-line set.
- Do NOT touch the 1,162-line modification set files — this commit only contains the 4 new files.
- Do NOT issue any live POST.

---

## 2. Preconditions and Assumptions

- All prior Phase C batches (C.1, C.2, C.3, C.3b, C.4, C.5, C.3c-Part-1, C.3c-Part-2, C.7) have been applied successfully.
- Phase A hunk catalogues (from the Phase A ticket) exist in `_preUpdate_snapshots/`.
- Live state is reachable for the baseline metrics pull.
- Local clone working tree has the 1,162-line set still uncommitted.
- `HANSTAN_WEDDING_SITE_SPEC.md` has been updated by batch C.3c Part 1 to include the §14.X syntheticAuditEntries section.

---

## 3. Execution Constraints

Strict.

---

## 4. File Scope Lock

### 4.1 Files Claude May Modify
- `F:/Wedding Website/hanstan-wedding/HANSTAN_WEDDING_SITE_SPEC_preUpdate_plannerUpdate_stage0_26apr23.md` (new file, created as copy-plus-appends)
- `F:/Wedding Website/hanstan-wedding/_preUpdate_snapshots/baseline_plannerUpdate_stage0_phaseD_postStage0.json` (new file)
- `F:/Wedding Website/hanstan-wedding/_preUpdate_snapshots/stageOneCommitPlan_plannerUpdate_stage0_phaseD_v1.md` (new file)
- `F:/Wedding Website/hanstan-wedding/_preUpdate_snapshots/integrityCheck_plannerUpdate_stage0_phaseD_v1.md` (new file)

### 4.2 Files Claude May Read but NOT Modify
- `HANSTAN_WEDDING_SITE_SPEC.md` (source for the frozen copy)
- `spec_plannerUpdate_26apr23.md` (whitelisted §Stage 0 Phase D + §PU-1..11 + S0-AC-5)
- `_preUpdate_snapshots/` directory contents (hunk catalogues from Phase A; state-current + audit + snapshots + coordinators JSON pulls from 2026-04-23; capture JSONL)

### 4.3 Files Claude Must NOT Touch
All in `files_forbidden`.

### 4.4 Live Endpoints
- `GET` planner-state (for baseline metrics).
- `GET` planner-audit (for integrity check).
- `GET` planner-snapshots (for integrity check).

### 4.5 Git Operations
- `git add -- <the 4 new file paths>`
- `git commit -m '<message>'`
- NO `git push`.

---

## 5. Placement and Change Mechanics

`new_file_create` × 4. `one_shot` (git commit). UTF-8 LF. JSON files use standard JSON (no trailing commas). Markdown files use standard markdown.

---

## 6. Step-by-Step Instructions

**Step 0 (mandatory):** Read `HANSTAN_WEDDING_SITE_SPEC.md` in full. Read spec §Stage 0 Phase D + §PU-1..11 definitions. Read the Phase A hunk catalogues. Read the capture JSONL.

**Step 1 — Pre-flight validation block.** Verify:
- `HANSTAN_WEDDING_SITE_SPEC.md` readable; has been updated by batch C.3c Part 1 (contains '§14.X' or 'syntheticAuditEntries').
- `_preUpdate_snapshots/` directory writable.
- Phase A hunk catalogues exist.
- git working tree contains only the 1,162-line set + (if Part 1 ran) the two Part-1 files committed and pushed — the Part 1 files should NOT appear in `git status` (already committed).

**Step 2 — Copy HANSTAN_WEDDING_SITE_SPEC.md → HANSTAN_WEDDING_SITE_SPEC_preUpdate_plannerUpdate_stage0_26apr23.md.** Byte-for-byte copy first, then append the new sections.

**Step 3 — Append §PU-1 through §PU-11 to the frozen spec.** Content per spec_plannerUpdate_26apr23.md §Stage 0 Phase D paragraph. Specifically:

- **§PU-1** — canonical live state JSON: embed the full contents of `_preUpdate_snapshots/state-current_2026-04-23.json` inside a fenced block labeled 'Canonical live state as of 2026-04-23 20:45 UTC (pre-Phase-C)'. Also embed a second fenced block with the post-Phase-C live state pulled fresh in Step 4 below, labeled 'Canonical live state as of post-Phase-C 2026-04-23'.
- **§PU-2** — both themes: embed `data/theme.tokens.json` contents + reference the Rivendell design doc at `F:/.skills/visualDesign_Rivendell.html` (v1.1 per memory).
- **§PU-3** — implicit plannerSpec reconstruction: from reading `planner.js` + `planner-state.mjs` + the seed JSON, enumerate the state schema + function signatures + data flow. Target length: 2–4 pages.
- **§PU-4** — known gaps: schedule-diffStates gap, multi-parent group gap, master-only render-path gap, FAB menu gap, Activity-tab gap — each with a pointer to the parking-lot PL-id.
- **§PU-5** — retroactive audit migration record: embed the 8 Elsie JSONL entries verbatim and document the M43 Part 2 injection that landed them in the audit log.
- **§PU-6** — governance rules formalized: copy verbatim from spec §PU-6 (Rolodex Rule, Pairing Principle, Supremacy Rule, Recency-wins Rule, M-series taskId convention).
- **§PU-7** — Structured Capture Protocol formalized: copy verbatim from spec §PU-7.
- **§PU-8** — entity-schema map: enumerate every entity type currently in live state (task, contact, group, tag, scheduleEvent, schedulePhase, scheduleQuestion, materialsCheck, coordinator, auditEntry, snapshot) with each entity's full field shape derived from state-current_2026-04-23.json. Use JSON Schema-lite format.
- **§PU-9** — baseline metrics snapshot: reference the separate file at `_preUpdate_snapshots/baseline_plannerUpdate_stage0_phaseD_postStage0.json` (written in Step 5 below).
- **§PU-10** — Stage 1 commit plan: reference the separate file at `_preUpdate_snapshots/stageOneCommitPlan_plannerUpdate_stage0_phaseD_v1.md` (written in Step 6 below).
- **§PU-11** — audit-log + snapshots-manifest integrity check: reference the separate file at `_preUpdate_snapshots/integrityCheck_plannerUpdate_stage0_phaseD_v1.md` (written in Step 7 below).

**Step 4 — GET live planner-state** for the post-Phase-C state snapshot embedded in §PU-1. Include in the frozen spec.

**Step 5 — Compose baseline_plannerUpdate_stage0_phaseD_postStage0.json.** Shape:

```json
{
  "snapshotTs": "<current-ISO>",
  "lastModified": "<live-state-lastModified>",
  "counts": {
    "tasks": <count>,
    "taskIds_Aseries": <count>, "taskIds_Bseries": <count>, "taskIds_Cseries": <count>,
    "taskIds_Dseries": <count>, "taskIds_Mseries": <count>,
    "tasks_noId": <count>,
    "contacts": <count>,
    "groups": <count>,
    "groupNames": [<list>],
    "tags": <count>,
    "scheduleEvents": <count>, "schedulePhases": <count>, "scheduleQuestions": <count>,
    "coordinatorTokens": <count>,
    "coordinatorTokenNames": [<list>],
    "auditEntries": <count>,
    "auditEntries_byElsie": <count>, "auditEntries_byHannahAndStan": <count>,
    "snapshots": <count>
  },
  "expectations_postPhaseC": {
    "tasks_Dseries_min": 13,
    "tasks_Mseries_min": 30,
    "groupNames_mustExclude": ["Guest List"],
    "coordinatorTokenNames_mustInclude": ["stanshan", "shipsie", "everfindingbeauty", "stage1smoke"],
    "auditEntries_byElsie_min": 8
  },
  "deltaFromExpectations": "<pass|specific-delta-list>"
}
```

Populate `counts` from the Step-4 live-state pull.

**Step 6 — Compose stageOneCommitPlan_plannerUpdate_stage0_phaseD_v1.md.** Read the Phase A hunk catalogues. For each hunk:
- Record hunkId, file, line range, Phase-A-recommended disposition (KEEP/DROP/MODIFY), and proposed Stage 1 commit grouping.
- Propose Stage 1 commit boundaries: commit-1 = SEED_VERSION top-up + schedule-defaults additions (low risk; non-destructive merge); commit-2 = FAB scaffold (additive UI); commit-3 = People-tab print + role-filter (additive); commit-4 = new planner.js helper functions (`buildNewTask`, `fullAdd`, `schedOpenMaterials`, etc.).
- Proposed commit messages for each.
- Push order: all 4 commits pushed together at Stage 1 item #4 execution time.

**Step 7 — Compose integrityCheck_plannerUpdate_stage0_phaseD_v1.md.** Run three checks:

(a) GET `/.netlify/functions/planner-audit`. For each entry, verify `ts` is non-empty ISO, `by` is non-empty string, `action` is non-empty string. Log any offenders.

(b) GET `/.netlify/functions/planner-snapshots`. For each snapshot in the manifest, verify the manifest key is non-empty and references a blob with a matching timestamp/uuid pattern. Log any orphans (manifest entries with no backing blob OR blobs with no manifest entry — the latter requires Netlify blob-list access; if not available via Chrome connector, flag as 'deferred' with justification).

(c) Confirm no audit entry has `target === 'test-artifact'` (residue from batch C.3c Part 1 diagnostic smoke test).

Record results in a structured report: total entries checked, pass count, fail count, list of failures with entry IDs, recommended remediation.

**Step 8 — Write all 4 files.**

**Step 9 — Git commit.**

```
git add -- "HANSTAN_WEDDING_SITE_SPEC_preUpdate_plannerUpdate_stage0_26apr23.md" \
           "_preUpdate_snapshots/baseline_plannerUpdate_stage0_phaseD_postStage0.json" \
           "_preUpdate_snapshots/stageOneCommitPlan_plannerUpdate_stage0_phaseD_v1.md" \
           "_preUpdate_snapshots/integrityCheck_plannerUpdate_stage0_phaseD_v1.md"

git commit -m "plannerUpdate stage0 phaseD: freeze pre-update site spec + baseline metrics + Stage 1 commit plan + integrity check (spec_plannerUpdate_26apr23.md §Stage 0 Phase D)"
```

Verify `git status` shows the 1,162-line modification set STILL UNCOMMITTED on its original files.

Do NOT push.

**Step 10 — Emit output per `full_files` mode:** the complete final content of each of the 4 new files, each prefixed with `=== FILE: <path> ===`.

---

## 7. Canonical Patch / Delta Format

N/A — `full_files` output, 4 new files.

---

## 8. Output Contract Reference

`full_files` + pre-flight block.

---

## 9. Definition of Done

Per front-matter.

---

## 10. Post-Execution Verification (Human-Run)

- `git log -1 --stat` shows exactly 4 files in the Phase D commit.
- `git log -1 --format=%H` returns a commit hash; verify with `git show <hash> --stat` that none of the 1,162-line-set files appear.
- Open the frozen spec; confirm §PU-1 through §PU-11 all present.
- Open the baseline metrics JSON; confirm `deltaFromExpectations: "pass"` (or read the specific delta if failures surfaced).
- Open the Stage 1 commit plan; confirm per-file hunk disposition is populated from Phase A catalogues (no TBD placeholders).
- Open the integrity check report; confirm no unexpected failures.
- `git status` shows the 1,162-line modification set still uncommitted.

---

## 11. Failure Semantics

- If §PU-8 entity-schema map is incomplete → emit partial completion with the missing entities listed; Scrybal revises ticket with authoritative schema source.
- If integrity check finds failures → emit the commit + the failure report; Scrybal decides whether to proceed to Stage 1 or remediate first.
- If the Phase A hunk catalogues are missing or incomplete → deterministic failure; the Phase A ticket must be (re-)run first.

---

**End of ticket.**
---

# §12 — Verify Stub: stage0 allBatches

# VERIFY_STUB — plannerUpdate Stage 0, All Batches (Human-Run Verification)

> **Conditional file:** created because Stage 0 has 11 tickets with overlapping verification needs; a per-ticket Section 10 would be repetitive. This stub consolidates all post-execution human verification into one reference.
> **Rule:** Claude does not run these steps unless a Build Ticket explicitly instructs it. These are for Scrybal (or a future Claude driven by Scrybal) to execute after Claude delivers each ticket's output.

---

## 1. Environment and Setup

- OS / platform: Windows 11 (Scrybal's machine).
- Runtime / version: `node` on PATH via `F:/p_toolDeck/tools/nodejs/` (per memory reference_tooldeck_path.md).
- Shell: Git Bash (`CLAUDE_CODE_GIT_BASH_PATH=C:\Program Files\Git\bin\bash.exe`).
- Master token: `stanshan` — valid for all authenticated GET/POST to `https://hanstan.wedding/.netlify/functions/`.
- Chrome connector: active; Scrybal logged in to Netlify dashboard.
- Package manager / tooling: `git` on PATH; no build step (Netlify auto-builds on push).

---

## 2. Build / Compile

N/A for Stage 0. No code build.

Batch C.3c Part 1 is the only Stage 0 ticket that pushes code; the Netlify build happens automatically after push.

- Expected result (C.3c Part 1 only): Netlify dashboard shows the new deploy with status=Ready, build time ~1-2 min, no build errors.

---

## 3. Tests

No automated tests in this repo. Verification is manual smoke + endpoint checks.

---

## 4. Lint / Format / Static Checks

N/A.

---

## 5. Manual Smoke Test (Per Batch)

### After Phase A ticket (hunk catalogue)

1. Open `_preUpdate_snapshots/hunkCatalogue_plannerUpdate_stage0_phaseA_plannerJS_v1.md` in VS Code.
2. Confirm the table renders in Markdown Preview Enhanced with clean columns.
3. Confirm Reconciliation section at the bottom shows either "matches spec" or a specific delta.
4. Open the CSS catalogue; same visual checks.
5. Spot-check one HIGH-confidence hunk against its function in `planner.js`.
6. `git status` shows only the two new catalogue files untracked; the 1,162-line set is unchanged.

### After batch C.1 ticket

1. Load `https://hanstan.wedding/planner/` as `stanshan`.
2. Stan's Rolodex group: confirm exactly ONE Zubey card (B4).
3. Organizers group: confirm D12 'Coordinate with Lucas (Cassie's BF)' visible with correct fields.
4. Filter by tag 'organizers' — confirm B19 appears.
5. Filter by tag 'guest-list' — confirm B19 appears.
6. Open `_preUpdate_snapshots/capture_plannerUpdate_stage0_phaseC_2026-04-23.jsonl` — confirm 3 new entries with `batch: "C.1"`.

### After batch C.2 ticket

1. Load planner. Search/filter for each D1–D11 id. Confirm each exists with expected fields.
2. D3: confirm 6 subtasks.
3. D4: confirm deadline empty string; comment visible mentioning the recency-wins reset.
4. D10: confirm title is 'Create + print guest programs'; 3 subtasks.
5. D6: confirm M1-absorption comment.
6. B13: confirm D7-link comment.
7. Capture JSONL: 14 new entries with `batch: "C.2"`.

### After batch C.3 ticket

1. Count new tasks per group against the batch-C.3 ticket's human-verify list.
2. Confirm M20 is NOT present. Confirm M36 is NOT a new task (B42 already exists).
3. B9 / B21 / D13 (reassigned from no-id) / B32: verify update side-effects (comments, title changes, subtask.done).
4. Capture JSONL: 34 new entries with `batch: "C.3"`.

### After batch C.4 ticket

1. Wedding Day group: M37 card visible with tag `pairing-principle`.
2. Click M37; confirm desc contains both "Fen's day-of primary role is as Elsie's helper/assistant/caretaker/boyfriend" AND references Bonnie + Sarah Reese.
3. No schedule events changed (se-001/013/021/023/082 unchanged).
4. Capture JSONL: 1 new entry with `batch: "C.4"`.

### After batch C.3b ticket

1. Guest List tab is GONE; Guests tab contains B2, B8, B17 in addition to prior content.
2. Filter by tag 'master-only' — HanStan Logistics + officiant + rolodex tasks all appear.
3. Elsie contact card: `constraints` field populated (may not render visibly yet — PL-03 blocked).
4. Fen, Bonnie, Sarah Reese contacts: same.
5. B4 + Indian-family rolodex cards: `rolodex` + `guests` tags present.
6. B19: `organizers` + `guest-list` tags still present.
7. Capture JSONL: new entries with `batch: "C.3b"`.

### After batch C.5 ticket (JSONL only, no live change)

1. `capture_plannerUpdate_stage0_phaseC_2026-04-23.jsonl`: grep `"by":"Elsie"` returns exactly 8 matches.
2. Grep `"batch":"C.5"` returns exactly 8 matches.
3. Spot-check one entry (e.g. sq-10 resolution) against spec §C.5.
4. No live state changed (confirm `lastModified` on live unchanged).

### After batch C.3c Part 1 ticket (CODE CHANGE — first git push)

1. Netlify dashboard: new deploy shows Ready. Build log has no errors.
2. GitHub: Scryble/hanstan-wedding main branch has a new commit with the specified message.
3. `git log -1 --stat` (in local clone): exactly 2 files changed (`planner-state.mjs` + `HANSTAN_WEDDING_SITE_SPEC.md`). No other files.
4. `git status`: 1,162-line modification set still uncommitted.
5. Diagnostic: `curl -s -w '%{http_code}' https://hanstan.wedding/.netlify/functions/planner-state -H 'Authorization: Bearer stanshan' -X POST -H 'Content-Type: application/json' -d '{"state":<current>,"by":"Hannah & Stan","syntheticAuditEntries":[{"ts":"...","by":"test","action":"test","target":"test-artifact","summary":"smoke"}]}'` returns 200.

### After batch C.3c Part 2 ticket

1. GET `/.netlify/functions/planner-audit`: 8 entries with `by === 'Elsie'` and 2026-04-22 timestamps visible.
2. No entry with `target === 'test-artifact'` present (cleaned up in Step 5 of Part 2).
3. Load planner; in devtools console: `window.PREFS?.scheduleSeedVersion === 0` (not undefined).
4. Netlify blob `planner/coordinators.json` (via Chrome connector → Netlify dashboard → blob view): contains `stage1smoke` entry with `isMaster: false`.
5. Capture JSONL: new entries with `batch: "C.3c"`.

### After batch C.7 ticket

1. Open `F:/Wedding Website/hanstan-wedding/tasQ.md`; confirm reach-out-to-Elsie reminder present under Active Reminders.
2. Confirm file follows CLAUDE.md tasQ Protocol format (YAML frontmatter + Where We Are + standard sections).
3. No live POST happened; `lastModified` on live unchanged.

### After Phase D ticket

1. `git log -1 --stat`: exactly 4 files changed (frozen spec + baseline JSON + Stage 1 commit plan + integrity check).
2. `git log -1 --format=%H` + `git show <hash> --stat`: confirm no 1,162-line-set files in the commit.
3. Open `HANSTAN_WEDDING_SITE_SPEC_preUpdate_plannerUpdate_stage0_26apr23.md`: §PU-1 through §PU-11 all present; content matches spec §Stage 0 Phase D.
4. Open `baseline_plannerUpdate_stage0_phaseD_postStage0.json`: `deltaFromExpectations: "pass"` (or specific delta if failures surfaced).
5. Open `stageOneCommitPlan_plannerUpdate_stage0_phaseD_v1.md`: per-file per-hunk dispositions populated from Phase A catalogues, no TBD placeholders.
6. Open `integrityCheck_plannerUpdate_stage0_phaseD_v1.md`: no unexpected failures.
7. `git status`: 1,162-line modification set still uncommitted.
8. `git log origin/main..HEAD`: exactly 1 commit ahead (the Phase D commit — Part 1's commit was already pushed). NOT pushed.

---

## 6. Regression Watchlist

Areas that could regress across any Stage 0 ticket:

- **SEED_VERSION top-up merge on next-load.** After C.3c Part 2 sets scheduleSeedVersion=0, a reload could fire the top-up prematurely if Stage 1 code lands before expected. Watch: browser console on planner load after each batch — confirm no unexpected top-up fires.
- **Guest List group gone after C.3b M39.** Watch: any client code that hardcodes 'Guest List' will break. None found in audit; confirm via planner load.
- **Coordinator tokens.** stanshan / shipsie / everfindingbeauty must still work after every batch. After C.3c Part 2, stage1smoke must also work (non-master). Test each with a quick GET planner-state and observe 200.
- **Audit log append order.** After C.3c Part 2 injects 2026-04-22 entries, the log should sort-by-ts to show them correctly. If any consumer uses file-order-only, entries will appear out of chronological sequence.
- **1,162-line modification set untouched.** After every ticket, `git status` must show these 5 files (planner.js, planner.css, planner/index.html, hanstan-schedule-defaults.js, planner-seed.json) still modified-but-uncommitted.
- **HANSTAN_WEDDING_SITE_SPEC.md lifecycle.** Working copy gets modified in C.3c Part 1 (syntheticAuditEntries section). Frozen copy created in Phase D. Working copy rewritten in Stage 1 (not Stage 0).

What to re-check if any regression is suspected:

- GET live state, diff against prior batch's post-POST GET — any unexpected field diff surfaces drift.
- GET audit log, count entries, check newest few for by + action + target shape.
- GET snapshots manifest, count snapshots, confirm the most recent matches the latest POST.
- `git status` + `git log -5 --oneline`.

---

## 7. Sign-Off

| Ticket | Verified by | Date | Result | Notes |
|--------|------------|------|--------|-------|
| phaseA hunkCatalogue | | | | |
| phaseC batchC1 rolodexFixes | | | | |
| phaseC batchC2 DseriesTasks | | | | |
| phaseC batchC3 MseriesTasks | | | | |
| phaseC batchC4 pairingPrincipleNote | | | | |
| phaseC batchC3b dataTagsAndGroupMerge | | | | |
| phaseC batchC5 elsieHistoricalBackfill | | | | |
| phaseC batchC3cPart1 auditExtension | | | | |
| phaseC batchC3cPart2 elsieBackfillAndStageOneEnablers | | | | |
| phaseC batchC7 weddingFolderTasqReminder | | | | |
| phaseD frozenSpecAndGovernance | | | | |

Fill in as each ticket completes. Result: `pass` / `fail` / `pass-with-notes`.

---

**End of verify stub.**
---

# §13 — Linter Report v1: stage0 allTickets (pre-consolidation static lint)

# TICKET LINTER REPORT — plannerUpdate Stage 0, all 11 tickets

> Applied: `F:/.canonicals/TICKET_LINTER_CHECKLIST_claudeHandoffCanonicals_v4.2.md` (v4.2) L0–L13.
> Date: 2026-04-23.
> Linter operator: claudeCode (Opus 4.7).
> Reject-by-default: any REJECT must be corrected before Claude executes the ticket.

---

## Ticket 1 — `ticket_plannerUpdate_stage0_phaseA_batchNone_hunkCatalogue_v1.md`

| # | Check | Result | Notes |
|---|-------|--------|-------|
| L0 | Authority + coupling (ADR-1..5) | PASS | Ticket declares itself sole executable authority; self-sufficient; spec excerpts whitelisted per ADR-3; no ad-hoc sections; no modules used. |
| L1 | Scope-lock completeness | PASS | Files modify (2) + readonly (3) + forbidden (7) all listed; invalid-output clause present. |
| L2 | Placement mechanics | PASS | `new_file_create` in front matter; encoding clause present; N/A items acknowledged. |
| L3 | Steps deterministic | PASS | 10 numbered steps; mandatory Step 0 read-and-confirm present; no branching language; steps do not require implementation-strategy decisions. |
| L4 | Output contract compliance | PASS | `full_files` declared; references CLAUDE_GOVERNANCE §12; preflight_validation=true with block expected; no granting of commentary. |
| L5 | Definition of Done | PASS | 6 observable + testable criteria; match ticket goal; §10 has manual smoke steps, build/test/lint N/A. |
| L6 | Module usage | PASS | `modules_used: []` — no modules used. |
| L7 | Front matter validity | PASS | All required fields present; `trust_level: relaxed` declared and acknowledged in §3; `template_version: v4.2`. |
| L8 | File-state freshness | PASS | Anchors N/A (method is new_file_create); Step 0 mandates reading readonly files at invocation time; no file_state_hashes used. |
| L9 | Self-consistency | PASS | Steps do not contradict; placement_method = new_file_create matches §5; output_mode = full_files matches §7.2 lightweight format use; files_modify match the Write targets in Step 10; no supersedes/depends_on. |
| L10 | Encoding + line-ending | PASS | UTF-8 LF declared; pipe-escape guidance in §5.3 for markdown tables. |
| L11 | Idempotency classification | PASS | `idempotent` for new_file_create re-runs overwrites with deterministic regeneration. |
| L12 | Context window budget | PASS | planner.js (~4000 lines) + planner.css (~2000 lines) + PROJECT_SPEC excerpts ~100 lines + output ~200 rows. Within 80% budget. |
| L13 | Micro-ticket fast-path | N/A | Not a micro-ticket. |
| **L_Final** | **PASS / REJECT** | **PASS** | Ready to execute on Scrybal greenlight. |

---

## Ticket 2 — `ticket_plannerUpdate_stage0_phaseC_batchC1_rolodexFixes_v1.md`

| # | Check | Result | Notes |
|---|-------|--------|-------|
| L0 | Authority + coupling | PASS | Spec excerpts whitelisted; modules empty; self-sufficient. |
| L1 | Scope-lock | PASS | 1 modify, 2 readonly, 8 forbidden; §4.4 documents live endpoints separately. |
| L2 | Placement | PASS | `new_file_create` for capture JSONL append. Live POST is out-of-repo and correctly not in placement_method. |
| L3 | Steps deterministic | PASS | 7 numbered steps; Step 0 mandatory; explicit failure branches cite §11. |
| L4 | Output contract | PASS | `delta_blocks` + preflight block declared; 3 blocks per §7.1. |
| L5 | DoD | PASS | 7 observable criteria; match ticket goal. |
| L6 | Modules | PASS | `[]`. |
| L7 | Front matter | PASS | All required fields; `strict` trust; `one_shot` idempotency. |
| L8 | File-state freshness | PASS | Dynamic pre-flight GET takes the place of static hashes. |
| L9 | Self-consistency | PASS | `depends_on: []` in front matter — note this is Phase C's first live batch. |
| L10 | Encoding | PASS | JSONL LF UTF-8; POST body JSON. |
| L11 | Idempotency | PASS | `one_shot` correct (POST creates D12 with fresh id; re-run would double-create). |
| L12 | Context budget | PASS | state-current_2026-04-23.json ~500 KB within budget; POST body similar size. |
| L13 | Micro-ticket | N/A | Full ticket. |
| **L_Final** | **PASS** | | |

---

## Ticket 3 — `ticket_plannerUpdate_stage0_phaseC_batchC2_DseriesTasks_v1.md`

| # | Check | Result | Notes |
|---|-------|--------|-------|
| L0 | Authority | PASS | |
| L1 | Scope-lock | PASS | |
| L2 | Placement | PASS | |
| L3 | Steps | PASS | 7 steps; granular JSONL choice documented in Step 5; Step 3 sub-operations (a)–(g) enumerated. |
| L4 | Output | PASS | 17 delta blocks declared in §7. |
| L5 | DoD | PASS | 8 criteria incl. D3 subtask count, D10 rename, D4 deadline-reset. |
| L6 | Modules | PASS | |
| L7 | Front matter | PASS | `depends_on` cites batchC1 correctly. |
| L8 | Freshness | PASS | |
| L9 | Consistency | PASS | depends_on stated in §2 preconditions. |
| L10 | Encoding | PASS | |
| L11 | Idempotency | PASS | one_shot. |
| L12 | Context | PASS | seed JSON + live state within budget. |
| L13 | Micro | N/A | |
| **L_Final** | **PASS** | | |

---

## Ticket 4 — `ticket_plannerUpdate_stage0_phaseC_batchC3_MseriesTasks_v1.md`

| # | Check | Result | Notes |
|---|-------|--------|-------|
| L0 | Authority | PASS | |
| L1 | Scope-lock | PASS | |
| L2 | Placement | PASS | |
| L3 | Steps | PASS | 7 steps; 30 task-create + 4 update-action sub-operations enumerated; blockedBy relationships explicit. |
| L4 | Output | PASS | 34 delta blocks. |
| L5 | DoD | PASS | 6 criteria incl. exclusions (M20/M36/M38). |
| L6 | Modules | PASS | |
| L7 | Front matter | PASS | depends_on cites batchC2. |
| L8 | Freshness | PASS | |
| L9 | Consistency | PASS | |
| L10 | Encoding | PASS | |
| L11 | Idempotency | PASS | one_shot. |
| L12 | Context | PASS | 30 creates + 4 updates in one POST body; still within budget (~50 KB post body). |
| L13 | Micro | N/A | |
| **L_Final** | **PASS** | | |

---

## Ticket 5 — `ticket_plannerUpdate_stage0_phaseC_batchC4_pairingPrincipleNote_v1.md`

| # | Check | Result | Notes |
|---|-------|--------|-------|
| L0 | Authority | PASS | |
| L1 | Scope-lock | PASS | |
| L2 | Placement | PASS | |
| L3 | Steps | PASS | 7 steps; single-task create is minimal. |
| L4 | Output | PASS | 1 delta block. |
| L5 | DoD | PASS | 4 criteria; no-schedule-event-mutation assertion explicit. |
| L6 | Modules | PASS | |
| L7 | Front matter | PASS | depends_on cites batchC3. |
| L8 | Freshness | PASS | |
| L9 | Consistency | PASS | |
| L10 | Encoding | PASS | |
| L11 | Idempotency | PASS | one_shot. |
| L12 | Context | PASS | minimal. |
| L13 | Micro | ESCALATED | Ticket is close to micro-format but uses full template for consistency with sibling Phase C tickets. Acceptable per L13 last-line ("If any micro-ticket fast-path item fails, either fix the micro-ticket or escalate to the full template"). |
| **L_Final** | **PASS** | | |

---

## Ticket 6 — `ticket_plannerUpdate_stage0_phaseC_batchC3b_dataTagsAndGroupMerge_v1.md`

| # | Check | Result | Notes |
|---|-------|--------|-------|
| L0 | Authority | PASS | |
| L1 | Scope-lock | PASS | |
| L2 | Placement | PASS | |
| L3 | Steps | PASS | 7 steps; 4 sub-operations (M39, M40, M41, M42) enumerated inside Step 3. |
| L4 | Output | PASS | 4 delta blocks. |
| L5 | DoD | PASS | 8 criteria incl. constraints-field additions on 4 contacts. |
| L6 | Modules | PASS | |
| L7 | Front matter | PASS | depends_on cites batchC4. |
| L8 | Freshness | PASS | |
| L9 | Consistency | PASS | |
| L10 | Encoding | PASS | |
| L11 | Idempotency | PASS | one_shot. |
| L12 | Context | PASS | |
| L13 | Micro | N/A | |
| **L_Final** | **PASS** | | |

---

## Ticket 7 — `ticket_plannerUpdate_stage0_phaseC_batchC5_elsieHistoricalBackfill_v1.md`

| # | Check | Result | Notes |
|---|-------|--------|-------|
| L0 | Authority | PASS | |
| L1 | Scope-lock | PASS | Only 1 modify file (capture JSONL); readonly includes a directory (`elsie_snaps/`) which is acceptable per the linter — directory-read is fine. |
| L2 | Placement | PASS | new_file_create with append semantics. |
| L3 | Steps | PASS | 4 steps; idempotency check in Step 1 prevents double-append. |
| L4 | Output | PASS | `full_files` — emits the full final JSONL. |
| L5 | DoD | PASS | 3 criteria. |
| L6 | Modules | PASS | |
| L7 | Front matter | PASS | depends_on empty — this is a pure local-file ticket independent of live-POST order. |
| L8 | Freshness | PASS | |
| L9 | Consistency | PASS | |
| L10 | Encoding | PASS | LF UTF-8 explicit. |
| L11 | Idempotency | PASS | `idempotent` with dedup check correctly declared. |
| L12 | Context | PASS | 8 lines, minimal. |
| L13 | Micro | N/A | |
| **L_Final** | **PASS** | | |

---

## Ticket 8 — `ticket_plannerUpdate_stage0_phaseC_batchC3cPart1_auditExtension_v1.md`

| # | Check | Result | Notes |
|---|-------|--------|-------|
| L0 | Authority | PASS | Uses `MODULE_API_CHANGE` module slot (M3) correctly per ADR-5. |
| L1 | Scope-lock | PASS | 2 modify files (planner-state.mjs + HANSTAN_WEDDING_SITE_SPEC.md). Forbidden list includes the 1,162-line-set files explicitly. |
| L2 | Placement | PASS | `anchor_insert`. §5.4 acknowledges that the executor reads the file at invocation time to capture exact anchor text, since the handler structure may have evolved. |
| L3 | Steps | PASS | 9 steps; diagnostic smoke test in Step 8 explicit; Step 9 cleanup acknowledges the residual test-artifact handling. |
| L4 | Output | PASS | `delta_blocks` + preflight + structured warnings enabled. |
| L5 | DoD | PASS | 7 criteria incl. commit message + push + deploy-green + spec co-update + diagnostic smoke result. |
| L6 | Modules | PASS | M3 slot used. |
| L7 | Front matter | PASS | `strict`; `one_shot`; `structured_warnings: true`. |
| L8 | Freshness | ⚠️ SOFT-FLAG | Anchor text is not pre-captured in the ticket because live planner-state.mjs may have drifted from spec-authoring snapshots. §5.4 delegates the exact capture to execution time. This is acceptable per the template's own note about "encoding/whitespace sensitivity" being handled by executor at invocation — but it means the linter cannot statically verify anchor existence at lint time. Recommendation: human verifier runs a quick `grep -n appendAudit F:/Wedding\ Website/hanstan-wedding/netlify/functions/planner-state.mjs` before invoking the ticket to confirm the anchor exists. |
| L9 | Consistency | PASS | depends_on chain: batchC5 + (implicit) all prior live-POST batches. |
| L10 | Encoding | PASS | UTF-8 LF ESM. |
| L11 | Idempotency | PASS | one_shot; re-run would re-commit. |
| L12 | Context | PASS | planner-state.mjs is small (~200 lines); delta is ~20 LoC. |
| L13 | Micro | N/A | |
| **L_Final** | **PASS (with L8 soft-flag requiring one-line human pre-check before invocation)** | | |

---

## Ticket 9 — `ticket_plannerUpdate_stage0_phaseC_batchC3cPart2_elsieBackfillAndStageOneEnablers_v1.md`

| # | Check | Result | Notes |
|---|-------|--------|-------|
| L0 | Authority | PASS | |
| L1 | Scope-lock | PASS | capture JSONL in both modify AND readonly (it is read to extract Elsie entries, written to append capture records). This dual-role is acceptable — the ticket reads historical entries and appends new ones, on the same file. Alternatively the readonly entry could be removed since "may modify" supersedes "may read"; leaving it keeps intent explicit. |
| L2 | Placement | PASS | new_file_create (append). |
| L3 | Steps | PASS | 9 steps; execution order M44 → M45 → M43-Part-2 strictly enforced; Step 5 test-artifact cleanup conditional on observing it. |
| L4 | Output | PASS | delta_blocks + preflight. 3 or 4 blocks. |
| L5 | DoD | PASS | 7 criteria; execution order explicit. |
| L6 | Modules | PASS | |
| L7 | Front matter | PASS | depends_on cites batchC3cPart1 + batchC5. |
| L8 | Freshness | PASS | Dynamic GET verification. |
| L9 | Consistency | PASS | |
| L10 | Encoding | PASS | |
| L11 | Idempotency | PASS | one_shot. |
| L12 | Context | PASS | |
| L13 | Micro | N/A | |
| **L_Final** | **PASS** | | |

---

## Ticket 10 — `ticket_plannerUpdate_stage0_phaseC_batchC7_weddingFolderTasqReminder_v1.md`

| # | Check | Result | Notes |
|---|-------|--------|-------|
| L0 | Authority | PASS | |
| L1 | Scope-lock | PASS | 1 modify, 1 readonly, 8 forbidden. |
| L2 | Placement | PASS | new_file_create if absent, append if present — explicitly documented. |
| L3 | Steps | PASS | 5 steps; Step 2 idempotency check; Step 3/4 branch on file existence. |
| L4 | Output | PASS | full_files + preflight. |
| L5 | DoD | PASS | 4 criteria. |
| L6 | Modules | PASS | |
| L7 | Front matter | PASS | depends_on empty; `idempotent`. |
| L8 | Freshness | PASS | |
| L9 | Consistency | PASS | |
| L10 | Encoding | PASS | |
| L11 | Idempotency | PASS | `idempotent` with dedup check; re-running produces same file. |
| L12 | Context | PASS | trivial. |
| L13 | Micro | ESCALATED to full | Could have been a micro-ticket; used full template for consistency with sibling tickets. |
| **L_Final** | **PASS** | | |

---

## Ticket 11 — `ticket_plannerUpdate_stage0_phaseD_batchNone_frozenSpecAndGovernance_v1.md`

| # | Check | Result | Notes |
|---|-------|--------|-------|
| L0 | Authority | PASS | Non-modify of working-copy HANSTAN_WEDDING_SITE_SPEC.md explicitly stated. |
| L1 | Scope-lock | PASS | 4 modify files; 3 readonly (spec + working-spec + snapshots dir); 8 forbidden including working-spec (in both readonly AND forbidden — clarify below). |
| L2 | Placement | PASS | new_file_create × 4. |
| L3 | Steps | PASS | 10 steps; git add path-limited; §5.5 `git add -- <paths>` correct. |
| L4 | Output | PASS | full_files + preflight. |
| L5 | DoD | PASS | 7 criteria; no-push and no-1,162-line-set explicit. |
| L6 | Modules | PASS | |
| L7 | Front matter | ⚠️ MINOR | `files_readonly` includes `HANSTAN_WEDDING_SITE_SPEC.md` (source for the frozen copy), but `files_forbidden` ALSO includes it. Intent is "readable, not modifiable" — the linter can treat `forbidden` as superseded by `readonly` since the file IS read (to copy from). Recommend clarifying in a future revision: remove `HANSTAN_WEDDING_SITE_SPEC.md` from `files_forbidden` OR clarify that forbidden means "not for write, and read is OK because scope-readonly takes precedence." Ticket executor should interpret as: readable, not writable. PASS with this interpretive note. |
| L8 | Freshness | PASS | |
| L9 | Consistency | PASS | depends_on cites batchC7 + phaseA-ticket. |
| L10 | Encoding | PASS | |
| L11 | Idempotency | PASS | one_shot (git commit). |
| L12 | Context | PASS | 4 new files + 1 copy-with-appends. Largest artifact is the frozen spec (~60 KB). Within budget. |
| L13 | Micro | N/A | |
| **L_Final** | **PASS (with L7 minor-flag to resolve readonly/forbidden overlap in a v2 revision)** | | |

---

## Summary

| Ticket | Result | Flags |
|--------|--------|-------|
| 1 — phaseA hunkCatalogue | PASS | none |
| 2 — batchC1 rolodexFixes | PASS | none |
| 3 — batchC2 DseriesTasks | PASS | none |
| 4 — batchC3 MseriesTasks | PASS | none |
| 5 — batchC4 pairingPrincipleNote | PASS | none |
| 6 — batchC3b dataTagsAndGroupMerge | PASS | none |
| 7 — batchC5 elsieHistoricalBackfill | PASS | none |
| 8 — batchC3cPart1 auditExtension | PASS | L8 soft-flag: human should `grep -n appendAudit` before invocation to confirm anchor |
| 9 — batchC3cPart2 elsieBackfillAndStageOneEnablers | PASS | none |
| 10 — batchC7 weddingFolderTasqReminder | PASS | none |
| 11 — phaseD frozenSpecAndGovernance | PASS | L7 minor-flag: readonly/forbidden overlap on HANSTAN_WEDDING_SITE_SPEC.md; interpret as readable-not-writable |

**All 11 tickets PASS the linter.** Two minor flags require a one-line human pre-check (ticket 8) or a v2 revision (ticket 11). Neither blocks execution.

---

**End of linter report.**

---

# §14 — Full Audit Report v1: stage0 allTickets (comprehensive, 5-section)

**Date:** 2026-04-24.
**Auditor:** claudeCode (Opus 4.7).
**Method:** per "Standard practices for auditing build tickets" reply (2026-04-24): §1 Pre-execution static lint (L0–L13), §2 Execution-time audit readiness, §3 Post-execution audit readiness, §4 Failure-classification readiness, §5 Multi-ticket stage-level audit.
**Scope:** every ticket in §1–§11 of this document, including the verify stub (§12).
**Reject-by-default:** any REJECT blocks execution of that ticket until corrected.

---

## Audit §1 — Pre-execution static lint (L0–L13)

Already run in §13 (v1 linter report). Re-verified post-consolidation: no regressions. All 11 tickets PASS with the same two flags:

- Ticket 8 (batchC3cPart1): L8 soft-flag — executor runs `grep -n appendAudit netlify/functions/planner-state.mjs` at invocation to confirm anchor exists.
- Ticket 11 (phaseD): L7 minor-flag — `HANSTAN_WEDDING_SITE_SPEC.md` appears in both `files_readonly` and `files_forbidden`; interpret as readable-not-writable; resolve in v2 revision.

**§1 result: 11 PASS. 0 REJECT.**

---

## Audit §2 — Execution-time audit readiness

Execution-time audit is what Claude emits WHILE running a ticket. It cannot be performed before the ticket runs; this section verifies the tickets are equipped to be audited at execution time. Per CLAUDE_GOVERNANCE §10 + §11.

### §2.1 Pre-flight validation readiness (CLAUDE_GOVERNANCE §10)

| Ticket | `preflight_validation` | Pre-flight block specified in §6? | All 6 sub-checks addressed (scope_lock / anchors / steps / contradictions / hashes / depends_on)? | Result |
|---|---|---|---|---|
| §1 phaseA hunkCatalogue | `true` | yes (Step 1) | all 6 addressed; anchors_found and file_state_hashes = N/A (method is new_file_create) | PASS |
| §2 batchC5 | `true` | yes (Step 1) | all 6 addressed; hashes/anchors/depends_on all marked N/A or standard | PASS |
| §3 batchC1 | `true` | yes (Step 1) | all 6 addressed | PASS |
| §4 batchC2 | `true` | yes (Step 1) | all 6 addressed; depends_on explicitly verifies D12 presence on live | PASS |
| §5 batchC3 | `true` | yes (Step 1) | all 6 addressed; depends_on verifies D1–D12 presence | PASS |
| §6 batchC4 | `true` | yes (Step 1) | all 6 addressed | PASS |
| §7 batchC3b | `true` | yes (Step 1) | all 6 addressed | PASS |
| §8 batchC3cPart1 | `true` | yes (Step 1) | all 6 addressed; anchor-found check explicitly delegated to executor at invocation time per §5.4 | PASS (with the §13 L8 soft-flag) |
| §9 batchC3cPart2 | `true` | yes (Step 1) | all 6 addressed; depends_on verifies both batchC3cPart1 commit-landed AND batchC5 JSONL exists | PASS |
| §10 batchC7 | `true` | yes (Step 1) | all 6 addressed | PASS |
| §11 phaseD | `true` | yes (Step 1) | all 6 addressed; depends_on verifies all prior batches + Phase A hunk catalogues exist | PASS |

**§2.1 result: 11 PASS. 0 REJECT.**

### §2.2 Structured warnings readiness (CLAUDE_GOVERNANCE §11)

Only one ticket enables `structured_warnings: true` — ticket §8 (batchC3cPart1). All others set `false`.

| Ticket | Warnings enabled? | Expected codes addressed? | Result |
|---|---|---|---|
| §8 batchC3cPart1 | `true` | `ANCHOR_PROXIMITY_RISK`, `SCOPE_BOUNDARY_ADJACENT` (expected because delta sits adjacent to existing appendAudit call) are called out in Step 2. `LARGE_DELTA` + `POSSIBLE_TYPE_MISMATCH` + `ENCODING_ANOMALY` addressed as N/A-unless-detected. | PASS |

**Recommendation:** ticket §4 (batchC3, 34 mutations in one POST) and ticket §7 (batchC3b, ~33 mutations across 4 operations) could benefit from `structured_warnings: true` to flag `LARGE_DELTA` if the POST body size crosses a threshold. Not blocking — the governance rule says warnings are observations, not decisions, so their absence does not invalidate execution. Flag for v2 revision.

**§2.2 result: 11 PASS (with v2 flag on §4 + §7 for optional warnings enablement).**

### §2.3 Trust-level appropriateness

Per CLAUDE_GOVERNANCE §13. `strict` = default / mechanical code. `standard` = complex multi-file with step-outcome logging. `relaxed` = documentation / bounded-reasoning tasks.

| Ticket | Declared trust | Task nature | Appropriate? | Result |
|---|---|---|---|---|
| §1 phaseA | `relaxed` | Documentary reconstruction — Claude narrates hunk purpose in table cells | YES — relaxed allows bounded reasoning inside the catalogue cells, explicit in §3 of that ticket | PASS |
| §2 batchC5 | `strict` | Verbatim copy of 8 JSONL entries from spec | YES — no reasoning needed, pure transcription | PASS |
| §3 batchC1 | `strict` | Live state mutation (3 operations) | YES — state mutation demands strict | PASS |
| §4 batchC2 | `strict` | Live state mutation (~14 operations) | YES | PASS |
| §5 batchC3 | `strict` | Live state mutation (34 operations) | YES. But see §2.2 recommendation: could additionally benefit from `trust_level: standard` to enable single-line step-outcome logging per CLAUDE_GOVERNANCE §13. Not blocking. | PASS (v2 flag) |
| §6 batchC4 | `strict` | Single-task live mutation | YES | PASS |
| §7 batchC3b | `strict` | Live state mutation (~33 operations) | YES (same v2 flag as §5) | PASS (v2 flag) |
| §8 batchC3cPart1 | `strict` | Code change + git push + deploy | YES — strictest operation in the stage | PASS |
| §9 batchC3cPart2 | `strict` | Live state + audit-log injection | YES | PASS |
| §10 batchC7 | `strict` | Local-file write | YES | PASS |
| §11 phaseD | `strict` | 4 local-file writes + local git commit | YES — git operation warrants strict despite being local-only | PASS |

**§2.3 result: 11 PASS (2 v2 flags on §5 + §7 for optional `standard` trust-level upgrade).**

---

## Audit §3 — Post-execution audit readiness

Post-execution audit runs AFTER Claude delivers a ticket. This section verifies each ticket is equipped to be audited after execution.

### §3.1 Output-contract compliance readiness (CLAUDE_GOVERNANCE §12)

| Ticket | `output_mode` | §7 + §8 consistent? | §12.3 forbidden-content suppression relied on? | Result |
|---|---|---|---|---|
| §1 phaseA | `full_files` | §7 uses §7.2 lightweight (appropriate for new_file_create); §8 references CLAUDE_GOVERNANCE §12 | yes, no commentary-granting language | PASS |
| §2 batchC5 | `full_files` | §7 N/A + §7.2 fallback; §8 references §12 | yes | PASS |
| §3 batchC1 | `delta_blocks` | §7 provides 3 §7.1 full templates with all author-context fields populated | yes | PASS |
| §4 batchC2 | `delta_blocks` | §7 declares 17 blocks using §7.1 with context from spec §C.2 | yes | PASS (soft-flag: 17 full-template blocks may exceed output budget; see §3.4 below) |
| §5 batchC3 | `delta_blocks` | §7 declares 34 blocks | yes | PASS (same soft-flag — 34 full templates is heavy; v2 could use §7.2 lightweight for creates) |
| §6 batchC4 | `delta_blocks` | §7 declares 1 block | yes | PASS |
| §7 batchC3b | `delta_blocks` | §7 declares 4 blocks (one per operation) | yes | PASS |
| §8 batchC3cPart1 | `delta_blocks` | §7 declares 2 blocks with full author-context populated | yes | PASS |
| §9 batchC3cPart2 | `delta_blocks` | §7 declares 3 or 4 blocks | yes | PASS |
| §10 batchC7 | `full_files` | §7 N/A; §7.2 fallback | yes | PASS |
| §11 phaseD | `full_files` | §7 N/A; 4 new files with §7.2 fallback | yes | PASS |

**§3.1 result: 11 PASS (v2 flag on §4 + §5 for output-budget economization).**

### §3.2 Definition-of-Done observability

Every DoD criterion must be testable by a human running a specific check, not a subjective judgement.

| Ticket | DoD criteria count | All observable/testable? | Specific failures on non-observable criteria | Result |
|---|---|---|---|---|
| §1 phaseA | 6 | yes — files exist, rows cover every git-diff hunk, reconciliation section present, no-code-modification, no-git-operations | none | PASS |
| §2 batchC5 | 3 | yes — 8 entries with specific attributes; no live POST; verbatim match against spec §C.5 | none | PASS |
| §3 batchC1 | 7 | yes — POST issued, Zubey removed, B19 tags, D12 created with specific fields, JSONL appended, post-verify GET confirms all 3 | none | PASS |
| §4 batchC2 | 8 | yes — 11 POST creates, 6 merge side-effects (D3/D4/D6/D7/D10/D11/B13), 14 JSONL entries, post-verify counts | none | PASS |
| §5 batchC3 | 6 | yes — 30 new ids present, 4 update side-effects visible, M20/M36/M38 exclusions verified, JSONL count | none | PASS |
| §6 batchC4 | 4 | yes — M37 fields, no schedule mutations, JSONL entry, post-verify | none | PASS |
| §7 batchC3b | 8 | yes — per-operation observable checks: Guest List gone, tasks reassigned, master-only applied, cross-surface applied, constraints[] present on 4 contacts | none | PASS |
| §8 batchC3cPart1 | 7 | yes — field accepted, validation behaves, backwards-compat preserved, commit+push+deploy green, spec co-updated, diagnostic smoke result | none | PASS |
| §9 batchC3cPart2 | 7 | yes — execution order enforced, M44/M45/M43-P2 side-effects observable via GETs, JSONL entries | none | PASS |
| §10 batchC7 | 4 | yes — file exists with specific text, standard format, no POST, no git | none | PASS |
| §11 phaseD | 7 | yes — 4 files exist, specific contents per file, commit landed locally with exactly 4 files and not pushed, 1,162-line set remains uncommitted | none | PASS |

**§3.2 result: 11 PASS.**

### §3.3 Scope-lock verification readiness

Every ticket declares the exact files in `files_modify`. Post-execution, a human (or Claude-via-hook) can run `git status` + file-listing to verify no out-of-scope writes occurred.

| Ticket | files_modify count | Out-of-scope writes possible? | Backout of unintended writes documented? | Result |
|---|---|---|---|---|
| §1 phaseA | 2 | no (pure file-create) | N/A | PASS |
| §2 batchC5 | 1 | no | N/A | PASS |
| §3 batchC1 | 1 (local) + live state (out-of-repo) | live state rollback via planner-snapshots restore (§11 of ticket) | yes | PASS |
| §4 batchC2 | 1 (local) + live state | yes — snapshot restore | yes | PASS |
| §5 batchC3 | 1 (local) + live state | yes — snapshot restore | yes | PASS |
| §6 batchC4 | 1 (local) + live state | yes — snapshot restore | yes | PASS |
| §7 batchC3b | 1 (local) + live state | yes — snapshot restore | yes | PASS |
| §8 batchC3cPart1 | 2 (local) + git-push-to-remote + Netlify-deploy | yes — but git-revert is the backout; §11 documents "revert commit, debug locally, re-push when clean" | yes | PASS |
| §9 batchC3cPart2 | 1 (local) + live state + coordinators blob | yes — coordinators-blob rollback via removing stage1smoke; state rollback via snapshot restore | yes | PASS |
| §10 batchC7 | 1 (local) | no (trivial rollback: delete the file) | yes (implicit) | PASS |
| §11 phaseD | 4 (local) + 1 local git commit (not pushed) | yes — `git reset --soft HEAD~1` reverts the commit, local files remain | partial — §11 of ticket doesn't explicitly document `git reset`; recommend v2 add this to §11 Failure Semantics | PASS (with v2 flag on ticket §11's §11 Failure Semantics) |

**§3.3 result: 11 PASS (1 v2 flag on §11 for explicit local-commit-revert documentation).**

### §3.4 Context-window budget sanity (repeat of L12 with tighter view)

| Ticket | Inputs (approximate tokens) | Outputs (approximate tokens) | Total as % of 1M context | Result |
|---|---|---|---|---|
| §1 phaseA | ~30K (planner.js+css) + 2K (spec excerpts) | ~5K (catalogue tables) | <5% | PASS |
| §2 batchC5 | ~2K (spec §C.5) | ~3K (8 JSONL entries + full file output) | <1% | PASS |
| §3 batchC1 | ~8K (state-current snapshot) + 1K (spec) | ~5K (3 delta blocks) | ~1.5% | PASS |
| §4 batchC2 | ~8K (live state) + ~4K (planner-seed.json D-tasks) + 2K (spec) | ~15K (17 delta blocks) | ~3% | PASS |
| §5 batchC3 | ~8K + ~4K (spec §C.3) | ~25K (34 delta blocks, full template) | ~4% | PASS (v2 flag: could use §7.2 lightweight for pure creates to drop to ~10K output) |
| §6 batchC4 | ~8K + 1K | ~1K | <1% | PASS |
| §7 batchC3b | ~8K + 2K | ~6K (4 blocks, many mutations per block) | ~1.5% | PASS |
| §8 batchC3cPart1 | ~3K (planner-state.mjs) + 2K (spec) + ~60K (HANSTAN_WEDDING_SITE_SPEC.md — full read for anchor identification) | ~3K (2 delta blocks, small diff) | ~7% | PASS |
| §9 batchC3cPart2 | ~8K (live state) + 2K (spec) + ~2K (capture JSONL extraction) | ~4K (3-4 delta blocks) | ~1.5% | PASS |
| §10 batchC7 | ~1K | ~1K | <1% | PASS |
| §11 phaseD | ~60K (HANSTAN_WEDDING_SITE_SPEC.md) + ~5K (hunk catalogues) + ~8K (live state) + ~5K (capture JSONL) + 3K (spec excerpts) | ~80K (frozen spec rewrite + 3 new files, the frozen spec dominates) | ~16% | PASS (high end of Stage 0, still within 80% threshold) |

**§3.4 result: 11 PASS. §11 (phaseD) is the most budget-intensive at ~16%; §5 and §4 could be economized via lightweight delta template in v2.**

---

## Audit §4 — Failure-classification readiness

Every ticket must equip both the human and Claude to classify a failure as (a) ticket insufficiency or (b) Claude violation, per CLAUDE_GOVERNANCE §9.

| Ticket | §11 Failure Semantics present? | Deterministic-failure format referenced (§12.6)? | Partial-completion format referenced (§12.7)? | Rollback/backout documented? | Result |
|---|---|---|---|---|---|
| §1 phaseA | yes | implicit via §11 wording | §11 explicitly references §12.7 partial completion | rollback trivial (delete 2 new files) | PASS |
| §2 batchC5 | yes | yes | implicit | rollback trivial | PASS |
| §3 batchC1 | yes | yes | yes | snapshot-restore + deterministic failure | PASS |
| §4 batchC2 | yes | yes | yes | snapshot-restore | PASS |
| §5 batchC3 | yes | yes | yes | snapshot-restore | PASS |
| §6 batchC4 | yes | yes | yes | snapshot-restore | PASS |
| §7 batchC3b | yes | yes | yes | snapshot-restore | PASS |
| §8 batchC3cPart1 | yes — itemizes deploy-fail, 4xx on diagnostic, git-status unintended files, partial-completion on push-fail-after-commit | yes | yes | git-revert documented | PASS |
| §9 batchC3cPart2 | yes — Part-1-not-green pre-flight fail; 4xx on synthetic-audit POST; partial completion if M44 lands but M45 fails | yes | yes | multi-step rollback (coordinators + state) | PASS |
| §10 batchC7 | yes | yes | implicit | trivial | PASS |
| §11 phaseD | yes — §PU-8 incompleteness partial-completion; integrity-check failures non-blocking (report but proceed); missing Phase A catalogues → deterministic fail | yes | yes | v2 flag: explicit `git reset --soft HEAD~1` | PASS (with v2 flag) |

**§4 result: 11 PASS (1 v2 flag on §11 for explicit commit-revert syntax).**

### §4.1 Two-category classification guidance

Governance §9 requires distinguishing ticket-insufficiency from Claude-violation. Each ticket's §11 should orient the auditor toward the right category.

| Ticket | §11 names likely ticket-insufficiency causes? | §11 names likely Claude-violation causes? | Result |
|---|---|---|---|
| §1 phaseA | yes (git-diff-empty, path mismatch, existing-file conflict) | implicit (out-of-scope writes, commentary in output) | PASS |
| §2 batchC5 | partial — only file-system errors listed | implicit | PASS (v2 could call out Claude-violation modes explicitly) |
| §3 batchC1 | yes (drift, predicate mismatch, 4xx) | implicit | PASS |
| §4–§9 | similar structure | similar | PASS |
| §10 batchC7 | yes (permissions, idempotency-conflict) | implicit | PASS |
| §11 phaseD | yes (missing catalogues, integrity failures, §PU-8 incompleteness) | implicit | PASS |

**§4.1 result: 11 PASS (universal v2 flag: every ticket's §11 could be enhanced by explicitly separating "if this fails, revise the ticket" vs "if this fails, tighten Claude's invocation prompt" — matching CLAUDE_GOVERNANCE §9's two-category taxonomy. Not blocking.)**

---

## Audit §5 — Multi-ticket stage-level audits

### §5.1 Dependency graph — topological sort

Extracted from each ticket's `depends_on` front-matter field:

```
§1 phaseA           → (no deps)
§2 batchC5          → (no deps)
§3 batchC1          → (no deps in ticket front-matter — first live batch)
§4 batchC2          → §3 (batchC1)
§5 batchC3          → §4 (batchC2)
§6 batchC4          → §5 (batchC3)
§7 batchC3b         → §6 (batchC4)
§8 batchC3cPart1    → §2 (batchC5)   — can also run in parallel with §3–§7 technically, but spec order places it after
§9 batchC3cPart2    → §8 AND §2
§10 batchC7         → (no deps)
§11 phaseD          → §10 AND §1
```

**Sort order:** {§1, §2, §3, §10} (all independent) → §4 → §5 → §6 → §7 → §8 → §9 → §11.

No cycles detected. Spec §C execution order (C.X → C.5 → C.1+C.1b → C.2 → C.3 → C.4 → C.3b → C.3c-P1 → C.3c-P2 → C.7 → Phase D) is consistent with this sort.

**§5.1 result: PASS. No cycles. Topologically sortable.**

### §5.2 Shared-file conflict check

No two tickets in the SAME execution batch simultaneously modify the same file unless one explicitly depends on the other.

| File | Tickets modifying | Conflict? |
|---|---|---|
| `_preUpdate_snapshots/capture_plannerUpdate_stage0_phaseC_2026-04-23.jsonl` | §2, §3, §4, §5, §6, §7, §9 (all append) | SERIALIZED via dependency chain (§3→§4→§5→§6→§7→§8→§9); §2 independent but append-only so no ordering conflict. **PASS** |
| `netlify/functions/planner-state.mjs` | §8 only | no conflict |
| `HANSTAN_WEDDING_SITE_SPEC.md` | §8 (write) and §11 (read only, via files_readonly) | §11's `files_forbidden` also includes this file (the v1 linter L7 minor flag); interpretation is readable-not-writable. No write-write conflict. **PASS** |
| `tasQ.md` (repo-local) | §10 only | no conflict |
| `HANSTAN_WEDDING_SITE_SPEC_preUpdate_plannerUpdate_stage0_26apr23.md` | §11 only (new file) | no conflict |
| `_preUpdate_snapshots/baseline_plannerUpdate_stage0_phaseD_postStage0.json` | §11 only (new file) | no conflict |
| `_preUpdate_snapshots/stageOneCommitPlan_...` | §11 only (new file) | no conflict |
| `_preUpdate_snapshots/integrityCheck_...` | §11 only (new file) | no conflict |
| `_preUpdate_snapshots/hunkCatalogue_*_plannerJS_v1.md` + `_plannerCSS_v1.md` | §1 only (new files) | no conflict |
| Live Netlify blob `planner/state-current.json` | §3, §4, §5, §6, §7, §9 (all POST mutations) | SERIALIZED via dependency chain. **PASS** |
| Live Netlify blob `planner/coordinators.json` | §9 only (M45 token add) | no conflict |
| Live Netlify blob `planner/audit-log.json` | §8 (appendAudit code path — diagnostic), §9 (synthetic entries), plus every mutation ticket implicitly (via server-side appendAudit). | Server-side appends are atomic per-POST; no conflict. **PASS** |

**§5.2 result: PASS. All shared-file interactions are serialized via explicit dependencies or are append-only.**

### §5.3 Capture/ledger continuity

The Phase C capture JSONL (`capture_plannerUpdate_stage0_phaseC_2026-04-23.jsonl`) is written across 7 tickets (§2–§7 plus §9). Cumulative entries must be coherent — no gaps, no duplicates, correct batch labels.

| Ticket | Entries appended | Batch label | Cumulative entry count after |
|---|---|---|---|
| §2 batchC5 | 8 | `C.5` | 8 |
| §3 batchC1 | 3 (archive+tag+create) | `C.1` | 11 |
| §4 batchC2 | 14 (11 creates + 3 granular updates) | `C.2` | 25 |
| §5 batchC3 | 34 (30 creates + 4 updates) | `C.3` | 59 |
| §6 batchC4 | 1 (pairing note) | `C.4` | 60 |
| §7 batchC3b | ~33 (3 group reassigns + 1 groups-array edit + ~15 master-only + ~11 cross-surface + 4 constraints) | `C.3b` | ~93 |
| §9 batchC3cPart2 | 3+ (M44, M45, M43-P2 batch summary) | `C.3c` | ~96 |

**Observations:**
- Chronological order: entries within batch=C.5 have 2026-04-22 timestamps (historical); all others have POST-time timestamps from 2026-04-23 or 2026-04-24. This is explicitly correct per spec §C.X (backfill preserves original timestamps).
- Batch labels are unique per ticket; no overlap.
- No deduplication cross-batch concerns: each mutation has a unique `target` + `action` + `ts` combination.
- Dependency chain ensures batches append in the correct order.

**Soft-flag:** ticket §7 (batchC3b) estimates the entry count as "exact count computed at execution time from the set of matched targets." The dependence on live-state-at-execution-time means the capture ledger's final size is non-deterministic from the tickets alone. This is acceptable (the count depends on how many live rolodex cards exist, which is itself captured in snapshot §A.9) but could be tightened in v2 by pre-computing the expected count from `state-current_2026-04-23.json`.

**§5.3 result: PASS (1 v2 flag on §7 for pre-computing entry count).**

### §5.4 Backout path — per-ticket and stage-level

**Per-ticket backout:** covered in §3.3 above. All tickets have documented rollback.

**Stage-level backout:** what happens if the whole Stage 0 needs to be reverted?

| Layer | Backout mechanism |
|---|---|
| Live Netlify blob state (tasks, contacts, coordinators, audit-log, prefs) | `POST /.netlify/functions/planner-snapshots` with the earliest snapshot key from `_preUpdate_snapshots/state-current_2026-04-23.json` (taken at session start, 2026-04-23 20:45 UTC). Restores state-current to pre-Stage-0 baseline. |
| Live `planner/audit-log.json` | Restore via the same snapshot mechanism — audit log is snapshotted alongside state. |
| Live `planner/coordinators.json` | stage1smoke removal via `POST /.netlify/functions/planner-coordinators` with `{action: 'remove', token: 'stage1smoke'}`. Other tokens (stanshan, shipsie, everfindingbeauty) predate Stage 0 and are untouched. |
| GitHub `Scryble/hanstan-wedding` main branch | `git revert <ticket-§8-commit-hash>` + force-push OR a follow-up "revert" commit. §8's commit is the only Stage 0 push. |
| Netlify deployment | Will auto-redeploy from the reverted commit. |
| Local clone — the Phase D commit | `git reset --soft HEAD~1` (local-only, never pushed). |
| Local clone — the 1,162-line uncommitted modification set | UNCHANGED by Stage 0. No backout needed. |
| Local new files (catalogues, JSONL, 4 Phase D artifacts) | `rm <paths>` OR `git clean` if committed. |

**Stage-level backout result: PASS.** Complete and documented. The bridge between local and remote state is entirely contained in ticket §8's single commit, making Stage 0 highly revertible.

### §5.5 Cross-ticket consistency — vocabulary and data references

| Check | Result |
|---|---|
| All tickets reference `spec_plannerUpdate_26apr23.md` (not the deprecated `PROJECT_SPEC_plannerUpdate_2026Q2.md`) | PASS — spec rename propagated during consolidation |
| All tickets use `Hannah & Stan` attribution consistently (per spec §6.1) | PASS |
| All tickets use master token `stanshan` (not a typo variant) | PASS |
| All tickets target the same Netlify function endpoints (`planner-state`, `planner-audit`, `planner-coordinators`, `planner-snapshots`) | PASS |
| Naming schema compliance (per CLAUDE.md) | PASS — all 11 tickets + verify stub + linter report use `<artifactType>_<project>_<stage>_<phase>_<batch>_<slug>_v<rev>.<ext>` |
| No abbreviations outside approved list | PASS — full words used throughout ("phaseA", "phaseC", "batchNone") |

**§5.5 result: PASS.**

---

## Overall Audit Summary

| Audit section | Tickets passed | Tickets rejected | Flags |
|---|---|---|---|
| §1 Static lint (L0–L13) | 11/11 | 0 | 2 v1 flags (ticket §8 L8, ticket §11 L7) — still unresolved, non-blocking |
| §2 Execution-time readiness | 11/11 | 0 | 2 v2 flags (§4 + §7 for structured_warnings; §5 + §7 for trust_level=standard) |
| §3 Post-execution readiness | 11/11 | 0 | 3 v2 flags (§4 + §5 for output-budget economization; §11 for explicit commit-revert syntax) |
| §4 Failure-classification readiness | 11/11 | 0 | 1 v2 flag (§11 commit-revert) + universal soft-flag to enhance ticket-insufficiency-vs-Claude-violation separation in §11 sections |
| §5 Multi-ticket stage-level | 11/11 | 0 | 1 v2 flag (§7 pre-compute entry count) |

**All 11 tickets PASS every audit section.** Zero REJECTs.

**v1 flags (from §13 linter report) still to address:**
1. Ticket §8 L8: human executor should `grep -n appendAudit netlify/functions/planner-state.mjs` at invocation time.
2. Ticket §11 L7: `HANSTAN_WEDDING_SITE_SPEC.md` appears in both `files_readonly` and `files_forbidden`; interpret as readable-not-writable.

**v2 flags surfaced by this audit (non-blocking, consolidate into a v2 revision when convenient):**
1. Ticket §4 + §7: consider `structured_warnings: true` to surface `LARGE_DELTA` observations.
2. Ticket §5 + §7: consider `trust_level: standard` to enable step-outcome logging for multi-mutation batches.
3. Ticket §4 + §5: economize output via §7.2 lightweight template for pure-create mutations; reduces output tokens ~60%.
4. Ticket §11: document `git reset --soft HEAD~1` explicitly in §11 Failure Semantics.
5. Ticket §7 (batchC3b): pre-compute exact capture-entry count from `state-current_2026-04-23.json` rather than leaving "count computed at execution time."
6. Universal: every ticket's §11 Failure Semantics could explicitly separate ticket-insufficiency causes from Claude-violation causes per CLAUDE_GOVERNANCE §9.

**Execution verdict:** all 11 tickets are ready to invoke. No REJECTs. v2 flags are convenience improvements, not blockers.

---

**End of full audit report.**
