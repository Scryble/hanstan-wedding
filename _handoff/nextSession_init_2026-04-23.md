# Next-Session Initialization Prompt — hanstan-wedding Planner Update 2026-Q2

**Handoff created:** 2026-04-23 (end of long session that produced `PROJECT_SPEC_plannerUpdate_2026Q2.md`).
**Outgoing Claude:** claude-opus-4-7[1m] in claudeCode / VS Code.
**Working directory on entry:** `f:\` or `F:\Wedding Website\hanstan-wedding\` — orient fast and go.

---

## YOUR JOB

You are picking up a multi-stage wedding-planner update for Hannah & Stan ("Scrybal"). Stage 0 is fully scoped and ready to execute. The remaining canonicals (BUILD_TICKET, TICKET_LINTER_CHECKLIST, VERIFY_STUB) need to be filled out to operationalize Stage 0 for execution. Do NOT re-derive anything — the hard thinking is done.

**Specifically, your job:**

1. Read the 3 core documents in the order listed below (§ORIENT).
2. Derive Stage 0 BUILD_TICKETs from `PROJECT_SPEC_plannerUpdate_2026Q2.md` using the canonical template at `F:\.canonicals\BUILD_TICKET_TEMPLATE_claudeHandoffCanonicals_v4.2.md`. One BUILD_TICKET per Phase C batch (C.1+C.1b, C.2, C.3, C.4, C.3b, C.3c, C.5, C.7) plus one for the Phase A.2 remaining hunk catalogue + one for Phase D. Target: ~10 BUILD_TICKETs.
3. Lint each BUILD_TICKET against `F:\.canonicals\TICKET_LINTER_CHECKLIST_claudeHandoffCanonicals_v4.2.md`. Pass or reject with specific fix needed.
4. Produce a `VERIFY_STUB_plannerUpdate_2026Q2.md` at `F:\Wedding Website\hanstan-wedding\VERIFY_STUB_plannerUpdate_2026Q2.md` using `F:\.canonicals\VERIFY_STUB_claudeHandoffCanonicals_v4.2.md` — document the smoke-test + integrity-check steps a human runs after Claude delivers each batch.
5. `REPO_INDEX.txt` is OPTIONAL per the canonical's own rules — generate it only if Scrybal asks or if it materially helps.
6. Once all BUILD_TICKETs are drafted + linted + VERIFY_STUB is written: **STOP and present to Scrybal for approval.** Do not execute any tickets until he greenlights.

---

## § ORIENT — READ THESE IN ORDER, FULLY

**Critical — read before anything else:**

1. **`C:\Users\ranji\.claude\CLAUDE.md`** — Scrybal's behavioral contract. Rules 1-7. Coding illiterate. Severe ADHD. ALL your work estimates are Claude-execution-time, NOT human-dev-time. Chrome connector is available.
2. **`F:\Wedding Website\hanstan-wedding\PROJECT_SPEC_plannerUpdate_2026Q2.md`** — the thing you are operationalizing. ~1000 lines. Stage 0 is fully spec'd. Stage 1 scope is defined but not phased. Parking Lot Appendix §APL-1 through §APL-4 has 58 PL-items + 38 provenance rows.
3. **`F:\Wedding Website\hanstan-wedding\discoveryLog_hanstanWedding.md`** — 8 Tier-2 rule candidates. You are bound by them provisionally even though CLAUDE.md promotion hasn't happened.
4. **`F:\.canonicals\BUILD_TICKET_TEMPLATE_claudeHandoffCanonicals_v4.2.md`** — the build-ticket template (your primary deliverable format).
5. **`F:\.canonicals\TICKET_LINTER_CHECKLIST_claudeHandoffCanonicals_v4.2.md`** — the pass/reject checklist.
6. **`F:\.canonicals\VERIFY_STUB_claudeHandoffCanonicals_v4.2.md`** — verify-stub template.
7. **`F:\.canonicals\PROJECT_SPEC_claudeHandoffCanonicals_v4.2.md`** — reference only; you are NOT creating a new one, you are deriving FROM the existing `PROJECT_SPEC_plannerUpdate_2026Q2.md`.
8. **`F:\Wedding Website\hanstan-wedding\_preUpdate_snapshots\`** — contains the live-state pulls from 2026-04-23: `state-current_2026-04-23.json`, `planner-audit_2026-04-23.json`, `planner-snapshots_2026-04-23.json`, `planner-coordinators_2026-04-23.json`, plus `elsie_snaps/` and `elsie_diff.js`. The Elsie diff work is done.

**Also CRITICAL on first read — YOU MUST READ THESE:**
- **`F:\TASQ.md`** — cross-project tasQ. Session Log section at the BOTTOM covers what happened in the 2026-04-23 session that produced this handoff. Rule candidates 1-8 preserved as drafts at the end of the file. Read the Session Log entry for 2026-04-23 in full — it lists every rule candidate and every new discoveryLog entry surfaced.
- **`F:\Wedding Website\hanstan-wedding\discoveryLog_hanstanWedding.md`** — 10 Tier-2 rule candidates as of end of 2026-04-23 session. Includes the Stage-Definition Rule (#8), the Pre-Draft-Answer Rule (#7), the formal-terminology cluster for relative-fit / 1-NN assignment, and the canonical-name-discipline regression. You are provisionally bound by every Tier-2 rule candidate from the moment it's logged, not from the moment it gets promoted to CLAUDE.md.

**Also relevant but not critical on first read:**
- `C:\Users\ranji\.claude\projects\f--\memory\MEMORY.md` — auto-memory index; auto-loaded.
- `F:\.canonicals\CLAUDE_GOVERNANCE_claudeHandoffCanonicals_v4.2.md` — governance rules (ADR-1 through ADR-5).
- `F:\.canonicals\discoveryLog_canonicalTemplate.md` — for reference; hanstan-wedding already has an instance.

---

## § CONTEXT YOU NEED ZERO SEARCHING FOR

### The wedding itself

- **Date:** 2026-06-07.
- **Venue:** Willamette Mission State Park.
- **Couple:** Hannah Shipman (bride) + Stanzin ("Scrybal" / "Stan", groom).
- **Live planner:** `https://hanstan.wedding/planner/`.
- **Authoritative data store:** Netlify blob store `hanstan-wedding-data`, not the local repo. `planner-seed.json` is first-boot only; irrelevant for live mutations.
- **GitHub repo:** `Scryble/hanstan-wedding` on branch `main`. Currently at commit `433a223`. Local clone at `F:\Wedding Website\hanstan-wedding\` has 1,162 lines of uncommitted modifications Scrybal authored in prior chats — these are INTENDED work, not drift, and will land in Stage 1 (not Stage 0).

### Live planner state as of 2026-04-23 20:45 UTC (NO DRIFT at recheck)

- 75 tasks (59 with taskIds A1-C5, 16 no-id including one "Coordinate Grace & Thomas" which M14 updates).
- 27 contacts (p1-p27).
- 12 groups: `All | Guests | Website | Venue | Wedding Day | Organizers | Stan's Rolodex | Procurement | Wedding Week | Guest List | HanStan Logistics | Catering`. Note: M39 will merge "Guest List" → "Guests" in Phase C.3b.
- 66 tags.
- 96 schedule events (se-001 through se-125ish).
- 8 schedule phases (sp-00 through sp-07).
- 17 schedule questions (sq-1 through sq-17 — and 4 new sq-18 through sq-21 in the uncommitted local-clone set).
- 45 audit entries, all authored by "Hannah & Stan".
- 97 snapshots in manifest.
- **3 coordinator tokens:**
  - `stanshan` — Hannah & Stan (master). **Claude uses this for all authenticated POSTs.**
  - `shipsie` — Elsie (non-master, universal-edit-privilege once scoping ships).
  - `everfindingbeauty` — Grace deVries (photographer coordinator, non-master).
  - Stage 0 M45 creates a 4th test token `stage1smoke` that Stage 1 revokes.

### Critical incident on live: Elsie's 2026-04-22 unlogged schedule edits

Elsie made 19 POSTs on 2026-04-22 03:47–04:08 UTC. Net 8 real mutations on the Schedule tab (not tasks). ZERO audit-log entries produced because current `diffStates()` only covers tasks/contacts/groups/tags. The 8 entries are captured in `_preUpdate_snapshots/phase0_capture_2026-04-23.jsonl` for back-fill.

**The single schedule edit that matters:** Elsie added a note "Elsie is pic" on `se-021` but did NOT add herself to the `people[]` array as role=pic. Follow-up in Schedule-Solidification stage (parking-lot PL-04, M23 gate).

### Photographer coordination state

- **Grace deVries** contracted 2026-04-23; $625 retainer sent; token issued. 6-hour package (12:30-6:30, then extended to 1:30-ish start per her paste; see M15 + Zoom 2 transcript).
- **Daniel Thomas** — token TBD, still to be issued in Stage 0 Phase C. 4-hour package.
- **Decision pending:** 2-hour Grace extension for $200. M15 tracks this as a planner task; Scrybal needs to discuss with Hannah.
- **Zoom 2 transcript** read + extracted: `F:\Wedding Website\hanstan_photography_Grace DeVries zoom 2 transcript.txt`. Full content summary in spec §A.4. Earlier Grace transcript does NOT exist — only a video recording (M20 retired per Scrybal 2026-04-23).

---

## § WHAT YOU NEED TO PRODUCE

### Deliverable 1: Stage 0 BUILD_TICKETs (~10 of them)

One ticket per Phase C batch + Phase A.2 remainder + Phase D. Each ticket must include:

**Front matter (YAML):** `ticket_id`, `project_name: "plannerUpdate2026Q2"`, `date: "2026-04-23"` (or day-of-execution), `change_type: "feature" | "migration" | "docs"`, `template_version: "v4.2"`, `output_mode`, `placement_method`, `idempotency`, `trust_level: "strict"`, `files_modify`, `files_readonly`, `files_forbidden`, `modules_used`, `definition_of_done`.

**Recommended ticket breakdown:**

1. `ticket_plannerUpdate_PhA_remainder_v1.md` — Phase A remaining hunk catalogue for `planner.css` and `planner.js` deep-read (spec §A.2 calls this out as incomplete).
2. `ticket_plannerUpdate_C1_rolodex_v1.md` — Phase C.1 + C.1b: delete no-id Zubey, add Lucas D12, tag B19. Single POST.
3. `ticket_plannerUpdate_C2_Dseries_v1.md` — Phase C.2: POST all 11 D-tasks (D1-D11) with the merge rules applied (D3 absorbs D10's coordinator-schedules subtask; D4 deadline reset; D6 becomes subtask of M1; D10 renames; D11 POSTed as-is; comment added to B13 re D7).
4. `ticket_plannerUpdate_C3_Mseries_v1.md` — Phase C.3: POST M1-M35 new tasks (excluding retired M20, resolved M36; M38 just an unassigned number) + update existing B9/B21/B32/no-id Grace-Thomas task.
5. `ticket_plannerUpdate_C4_pairingNote_v1.md` — Phase C.4: POST M37 pairing-principle master-token-only note.
6. `ticket_plannerUpdate_C3b_dataTags_v1.md` — Phase C.3b: M39 group merge + M40 master-only tags + M41 cross-surface tags + M42 contact constraints.
7. `ticket_plannerUpdate_C5_elsieJSONL_v1.md` — Phase C.5: write 8 Elsie entries to `_preUpdate_snapshots/phase0_capture_2026-04-23.jsonl`. No live POST. Pure local file write.
8. `ticket_plannerUpdate_C3c_Part1_codechange_v1.md` — M43 Part 1: narrow additive code change to `netlify/functions/planner-state.mjs` to accept `syntheticAuditEntries: [...]` in POST payload. ~20 LoC. Commit + push + deploy verify.
9. `ticket_plannerUpdate_C3c_Part2_audit_v1.md` — M43 Part 2 + M44 + M45: POST the 8 Elsie entries (using new synthetic-audit field from ticket 8), set `prefs.scheduleSeedVersion: 0`, create `stage1smoke` test token. Depends on ticket 8 deployed.
10. `ticket_plannerUpdate_C7_tasQreminder_v1.md` — Phase C.7: append "Reach out to Elsie post-update" reminder to `F:\Wedding Website\hanstan-wedding\tasQ.md`. Local file write.
11. `ticket_plannerUpdate_PhD_frozenSpec_v1.md` — Phase D: copy `HANSTAN_WEDDING_SITE_SPEC.md` to `_preUpdate_2026-04-23.md`, append §PU-1 through §PU-11, write baseline metrics file, write Stage 1 commit plan, run integrity check, commit to local clone. Do not push.

**Execution order (from spec Phase C preamble):**
C.X (no action) → C.5 → C.1+C.1b → C.2 → C.3 → C.4 → C.3b → C.3c-Part-1 → C.3c-Part-2 (M44 → M45 → M43-Part-2) → baseline metrics → C.7 → C.6 runs after each live-POST batch → Phase D.

### Deliverable 2: `TICKET_LINTER_CHECKLIST_claudeHandoffCanonicals_v4.2.md` compliance pass

For each ticket you produce, walk through L0–L13 of the canonical linter checklist and record PASS / REJECT-with-fix-needed. The linter is reject-by-default — if ANY L0–L12 item fails on a full ticket, the ticket must be fixed before Scrybal sees it.

### Deliverable 3: `VERIFY_STUB_plannerUpdate_2026Q2.md`

One file at `F:\Wedding Website\hanstan-wedding\VERIFY_STUB_plannerUpdate_2026Q2.md` covering:
- Environment (Windows 11, Git Bash, node on PATH, master token `stanshan`).
- Build/test/lint commands (likely N/A — no build process; smoke tests via Chrome connector to live planner).
- Manual smoke-test steps per batch (load planner as `stanshan`, verify task counts, spot-check M-task presence, check audit log grew).
- Regression watchlist (SEED_VERSION top-up merge on next-load; Guest List group gone; no coordinator tokens broke).

### Deliverable 4: (OPTIONAL) `REPO_INDEX_plannerUpdate_2026Q2.txt`

Only generate if Scrybal explicitly asks. Not strictly required for Stage 0 ticket derivation.

---

## § SCRYBAL'S PREFERENCES YOU'VE INHERITED (the expensive-to-earn ones)

These were learned over a multi-hour session at real cost to Scrybal's patience. Each one below names the rule, the incident that earned it, and the tone of Scrybal's response — because bullet-point warnings don't stick for Claude; incident-rooted warnings do. Apply them from turn 1. Don't make him re-teach.

### Preference 1 — Read ALL orienting docs before first reply, not a curated subset

**Rule:** Before your first substantive reply, you must have read `C:\Users\ranji\.claude\CLAUDE.md` (global contract), `F:\TASQ.md` (cross-project tasQ with its full Session Log at the bottom), the project's `MEMORY.md`, every file `MEMORY.md` points to, any project-level `CLAUDE.md` inside the working tree, the current `PROJECT_SPEC_plannerUpdate_2026Q2.md` in full, and `discoveryLog_hanstanWedding.md` in full.

**Why the rule exists — the incident:** Early in the session, outgoing Claude skipped `dialogueXR` and skimmed the discoveryLog. When Scrybal surfaced decisions that had already been made in prior chats, outgoing Claude had to stop and re-read docs it should have loaded at orientation. Scrybal's words: *"Orient yourself, fully, according to all protocols established or directed in the session initialization documents."* — this is a standing instruction, not a one-time request.

**Tone to expect if you fail:** cold, clipped, short. He won't yell. He will simply stop answering and direct you to re-read. Every turn you spend re-orienting mid-conversation is a turn he loses on the actual work.

### Preference 2 — Questions block at END of reply only, never scattered through prose

**Rule:** If you need to ask Scrybal something, put every question in a single block at the very bottom of your reply under the literal markdown heading `> **❓ QUESTIONS FOR SCRYBAL**`, numbered. One block per reply. No questions scattered mid-prose. If you have no questions, omit the block entirely.

**Why the rule exists — the incident:** Scrybal stated verbatim: *"Also buddy you've been asking me a lot of questions and I have not responded to all of them because scrolling up to find the parts where you ask me questions it's kind of difficult. If you are you going to offer me questions I need you to do it in a visually consistent way that I can immediately recognize as a question block in your replies. Because scrolling up over and over and over again is driving me crazy."*

**Tone to expect if you fail:** frustrated, ADHD-fatigued. Scrolling through Claude's prose hunting for questions is one of the specific frictions he can't tolerate. Respect the block.

### Preference 3 — Pre-draft-answer before asking; never ask questions whose answers are obvious

**Rule:** Before writing any user-facing question, draft the answer yourself. If the drafted answer is (a) obvious, (b) inferable from existing directives, (c) a sane default, or (d) has low blast radius — do NOT ask. State your decision and reasoning, act on it, offer retroactive override. Only ask when the answer is genuinely non-obvious AND guessing wrong costs more than asking.

**Why the rule exists — the incident:** Outgoing Claude presented Scrybal with 6 questions in one block. All 6 had obvious or pre-decided answers. Scrybal answered them anyway, then said: *"I will say, this particular question set of yours was one of the most disappointing you've ever given me so far. Like asking the right questions is a skill. It wasn't until I just finished answering question number 5 and I kept it aggressively short that I [realized] I'd spent a long time giving the answers and easing out all the ones as none of the answers I gave were unobvious I don't [know] why you would ever give me questions with such obvious solutions like this that are totally low hanging as open ended questions instead of justice having the solution ready for me already thought out so that I can just confirm or deny. The only time I want to be giving you long answers like this and providing you my reasoning is if I am disagreeing with you or investigating why you disagree with me. What an incredible waste of my time. I guess at a self aware protocol now To make sure that I'm not even going to start answering any claude question that I think is too stupid to be even asked."*

**Tone to expect if you fail:** aggressively irritated. He will refuse to answer questions he judges stupid, and will call them stupid by name. Rule candidate 7 captures this as live-binding.

### Preference 4 — Precise naming discipline: never acronyms, never shorthand, never ambiguous references

**Rule:** Use the full canonical name for every named thing on every mention, even the second mention in the same paragraph. No acronyms Scrybal hasn't seen you use consistently before. No git jargon. When referencing a "repo," always specify WHICH repo — the local clone at its full path, OR `Scryble/hanstan-wedding` (GitHub remote), OR the Netlify deploy.

**Why the rule exists — two incidents, same session:**

Incident 1: Outgoing Claude described an uncommitted modification set in the local clone as being "in the local working tree." Scrybal: *"What in the world is a local working tree? I don't have working trees; YOU have working trees on C drive. What I have in claudeBody are repos."*

Incident 2: Mid-session, AFTER Scrybal had specifically asked for a precise-naming rule to be drafted in `CLAUDE.md`, outgoing Claude referred to Markdown Preview Enhanced as "MPE." Scrybal: *"BRO WHAT IS MPE WHY YOU NOT FOLLOWING CLAUDE MD"*. The regression was logged as its own Tier-2 discoveryLog entry. Two draft phrasings of the rule were rejected that same session and deferred — they're preserved in `F:\TASQ.md` under "Rule 8 (Canonical-Name Discipline) drafts for later revisitation."

**Tone to expect if you fail:** blunt, capitalized, sometimes profane. Shorthand use triggers an immediate "BE PRECISE CLAUDE" or equivalent. Don't even think about acronyms. If a term is known, use it in full.

### Preference 5 — Load-bearing distinctions only; don't invent taxonomies

**Rule:** When you propose categories, tiers, kinds, or groupings, each boundary must produce a downstream difference — different tool, different actor, different order, different risk. If two items behave identically downstream, they belong in the same category regardless of surface differences. Before adding a category, name the downstream consequence in one sentence; if you can't, the category is spurious.

**Why the rule exists — the incident:** Outgoing Claude proposed four "Kinds" for organizing Scrybal's info-dump (Kind 1 = planner content edits, Kind 2 = code changes, Kind 3 = cross-system wiring, Kind 4 = off-planner human actions). Kind 4 included things like "call bridesmaids," "size Stan's ring finger," etc. — framed as Scrybal real-world actions. Scrybal: *"...exactly how, As far as my planner update is concerned, is it worth identifying this as a distinct kind from kind 1 items?"* The categories didn't change what needed doing, and the Kind 4 framing led to a larger mistake (see Preference 12 below).

**Tone to expect if you fail:** Scrybal will just ask you to justify the boundary. If you can't, you have seconds before he marks the distinction as noise.

### Preference 6 — Blocker-elimination before reporting a blocker; you already have access to most things

**Rule:** Before calling anything impossible, risky, or blocked, ask yourself: what would make this trivial? What access, tool, credential, context, or memory would eliminate the blocker? Then check the auto-loaded memory files, `F:\MASTER.md`, and known session access against that list. Only report a blocker as real if the answer is "nothing I currently have."

**Why the rule exists — the incident:** Scrybal proposed pulling live planner values into the local clone and pushing to git. Outgoing Claude provided "4 ominous reasons" why this was a bad idea — all 4 assumed Claude had no way to authenticate against the live planner or drive the Netlify dashboard. Scrybal then pointed out that he has given Claude Chrome connector access AND just shared the master token `stanshan`. All 4 "ominous reasons" collapsed. Scrybal: *"WOWEE, that's sounds real scary bruh...4 REEEEALLLY ominous sounding reasons....brr, scary......or it would if you didn't already have access to my Netlify. Why did you not suggest updating the Live planner state yourself as one of the Stage I (Vehicle 1 & 2) tasks."*

**Access Scrybal has already granted you, inline for convenience:**
- Master token `stanshan` for all authenticated POSTs to the live planner.
- Chrome connector for browser-driven operations (Netlify dashboard, live-site smoke tests, form-filling).
- Netlify dashboard access through Scrybal's logged-in Chrome session.
- Read/write of any file under `F:\` and `C:\Users\ranji\`.
- `git` in the local clone at `F:\Wedding Website\hanstan-wedding\` with push rights to `Scryble/hanstan-wedding`.

**Tone to expect if you fail:** mocking. He will sarcastically highlight that you forgot capabilities he already granted you. Rule candidate 5 captures this; rule candidate 6 (consult-access-index) is the companion.

### Preference 7 — Consult the access index before claiming missing capability

**Rule:** Same shape as Preference 6 but mechanical. `F:\MASTER.md` and the auto-loaded memory files at `C:\Users\ranji\.claude\projects\f--\memory\` explicitly list Scrybal-granted access. Before saying "I can't," grep those files.

**Why the rule exists — same incident as Preference 6.** The deeper failure was that Claude had `feedback_chrome_connector.md` loaded into context from orientation — the information was already there. Claude still failed to consult it.

**Tone to expect if you fail:** Scrybal will literally point to the memory file he wrote for this exact purpose and ask why you didn't read it.

### Preference 8 — Spec-subject co-update: when you change the subject, update the spec in the same unit

**Rule:** When you modify any file that has a spec describing its contract, update the spec in the same commit / same session / same turn. Never leave the spec stale behind the subject.

**Why the rule exists — the incident:** The `HANSTAN_WEDDING_SITE_SPEC.md` at the wedding repo root was 7 days stale behind 1,162 lines of uncommitted modifications in the local clone. Claude had modified the planner across multiple prior chats without touching the spec. Scrybal: *"in other words, apparently claude is not in the automatic habit of updating specs after it has updating the subject of the spec.... You know, I was not expecting that to be something that one needed to be told to do."*

**Tone to expect if you fail:** mild exasperation — this one wasn't capitalized-profanity territory, but it triggered creation of an entire new rule candidate (rule 1) because he shouldn't have had to tell Claude at all.

### Preference 9 — "Repos," not "working trees"; learn Scrybal's vocabulary, not git's

**Rule:** The directories under `F:\` are "repos" or "local clones of GitHub repositories," never "working trees." "Working tree" is git-internal vocabulary Scrybal does not use. If you mean "the current state of files in Scrybal's local clone," say "local clone" or "the local repo." Git-internal terms (HEAD, index, working tree, refs) stay out of reports to Scrybal unless the conversation is explicitly about a git operation, and even then translate on first use.

**Why the rule exists — the incident:** Covered under Preference 4 incident 1. Rule candidate 2 formalizes it.

### Preference 10 — Recency-wins for field-level conflicts; old value preserved as comment

**Rule:** When two sources of truth disagree on a task field, the most recent source wins. The superseded value goes into a comment on the task so the work-history is visible. Don't silently discard.

**Why the rule exists — the incident:** Pre-existing task D4 had deadline `2026-04-20`. Scrybal's 2026-04-23 info-dump mentioned the same ring-sizing task without re-stating the old deadline. Outgoing Claude initially proposed resolving this by asking Scrybal. Scrybal: *"simply check the date. More recent updates from older updates. That's so easy. Don't ask me to approve every single one of them one by one. I already listed them for you."*

**Tone to expect if you fail:** he'll call the check "easy" and you'll feel it. Apply the rule without asking.

### Preference 11 — Constraints > preferences (the Supremacy Rule)

**Rule:** When a coordinator, PIC, or guest expresses a preference, and that preference would conflict with a constraint from another source, the constraint wins. A preference never overrides a constraint regardless of who it comes from.

**Why the rule exists — the incident:** Scrybal: *"Right now if planner and schedule conflict, then [planner] Is more likely than not going to win excepting some special factor like the Elsie and Fen thing. And be careful it's not that every single thing a PIC or Organizer or Coordinator or guest says automatically triumphs over any decision that conflicts it. That is not the supremacy rule. The actual supremacy clause is When people communicate specific constraints. Preferences are not supreme, constraints are. For example if Grace finds it helpful to have a runner to handle things, that is a preference, and we can do our best to accommodate it. But it will never defeat the constraint of that specific runner that has been assigned to her being reassigned to ensure the well being the disabled or unhealthy."*

**Tone to expect if you fail:** he will walk through the reasoning at length because this rule is load-bearing for day-of wedding triage. Don't conflate "a coordinator said X" with "X is authoritative."

### Preference 12 — Stages are work-phases with outcomes, not lists of actions

**Rule:** A "stage" has (1) a goal, (2) an entry state, (3) an exit state, (4) explicit non-goals. Phases live inside stages. Steps live inside phases. Atomic actions live inside steps. If you have a flat list of actions, don't label it "Stage N" — label it what it is.

**Why the rule exists — repeated incidents, same session, compounding:**

First incident: Outgoing Claude listed Stages 1–11 as a series of atomic action groups ("call bridesmaids, size ring finger, etc."). Scrybal: *"BRUH I DIDN'T WANT YOU TO TURN MY INFO DUMP INTO INTO A TO DO LIST EXACTLY HOW I DUMPED IT. I bother organizing it in sequence because I was hoping you would do that according to the logic of what is required to be done. Why the hell am I the one who's telling you these things?? I dumped all of that U so that we could discuss how to do it methodically in the least disruptive way holy shit."* Claude acknowledged the stage-vs-step distinction.

Second incident, shortly after: Claude was asked to explain what Stage 9 actually contained. Claude correctly identified the stage-vs-step distinction when asked, then drifted IMMEDIATELY back into explaining Stage 9 as a flat list of calls and real-world actions. Scrybal: *"Stage 9 isn't a stage. It's a todo list with a number on it."*

Third incident, still in Stage 9 analysis: Claude finally realized Stage 9 was listing Scrybal's real-life actions rather than planner-side tracking tasks. Scrybal: *"you fucking retardd I STOPPED TALKING ABOUT YOUR STEPS STAGE CONFLATION FOUR REPLIES AGO"*. The real issue was Stage 9 represented Scrybal as the doer of physical actions, not Claude executing planner updates to track those actions.

**Tone to expect if you fail:** escalating rapidly. First turn: polite correction. Second turn: blunt. Third turn: capitalized and profane. There is no patience budget for stage-vs-step regression because rule candidate 8 (Stage-Definition Rule) now exists specifically to prevent it.

### Preference 13 — "Add task" means add to the PLANNER, not a real-life todo list

**Rule:** When Scrybal says "add task: X" in an info-dump, that is an instruction to create a planner task tracking X. Scrybal is not telling you X needs to happen in the physical world right now; he is telling you the planner needs a card for it.

**Why the rule exists — the incident:** Outgoing Claude treated the entire "off-planner human actions" cluster (ring sizing, groomsmen rallying, package sending) as action items Stan would execute immediately. Scrybal: *"I ONLY TOLD YOU ABOUT THE REAL LIFE STUFF I NEEDED TO DO SO THAT YOU COULD ADD THEM TO THE PLANNER AS TASKS. THAT'S WHY JUST ABOUT EVERYTHING IN MY DUMP SAID 'ADD TASK'; IT DID NOT REALLY SAY 'SCRYBAL GO OUT INTO THE REAL WORLD AND DO THAT TASK RIGHT NOW'."*

**Tone to expect if you fail:** capitalized. He will underline "ADD TASK" in giant letters. The grammar of his requests is consistent — "add task" = planner operation, not life command.

### Preference 14 — Parking-lot discipline; nothing silently drops, nothing silently merges

**Rule:** Any item surfaced in a session that doesn't belong in the current stage goes into a Parking Lot appendix with a unique ID (`PL-NN` format), a target stage hint, and a reason for parking. When an item moves out of parking lot into a stage, strike it through: `~~PL-NN~~` and note where it landed. Never silently drop. Never silently merge two items without noting both sources.

**Why the rule exists — the incident:** Scrybal: *"Also Comm if during stage zero discussion we have discovered stuff that should be added to future stages, You should put them in a parking lot in the planner specs somewhere for assigning to future stages later. Don't reassign them to a future stage Put them in the parking lot appendix area with a small note about which future stage it should be assigned to and why."*

Separately, after the unify-merge rule: *"I really do not like undoing work I've already done."* Items that have been authored must not be silently dropped in favor of new items that overlap — they get unified with sources preserved.

**Tone to expect if you fail:** he'll call out any item he remembers raising that you've dropped. His memory of his own info-dump items is sharp despite ADHD; he'll notice what's missing.

### Preference 15 — Relative-fit / 1-NN assignment: the item goes where it's LEAST UNLIKE, not where it's MOST LIKE

**Rule:** When deciding which stage/group/category an item belongs to, compare its dissimilarity to each candidate's existing citizenry. Smallest dissimilarity wins — not "most similar." Often the item fits no candidate cleanly; pick the one where it's least out of place. Formal terms for this: 1-NN (one-nearest-neighbor) classification, minimum-distance classification, Voronoi partitioning, comparative advantage placement.

**Why the rule exists — the incident:** Scrybal asked: *"if the difference between you and stage zero is less than the difference between you the citizenry of the future Stages, then you should go to stage zero.. I know that was wordy and verbose an unwieldy way to basically say we want to choose where a thing goes based on the relative degree of its dissimilarity as a second passed after we have chosen witness based on the relative degree of similarity. Isn't there a mathematical or formal term for this sort of differentiation/sorting method?"*

Outgoing Claude provided the formal-terminology cluster. Scrybal then directed: *"that whole cluster of formal terms You got introduced to me. Add them to the wedding discovery log for Investigation for possible inclusion in dialogueXR an important artifact/citizen"* — meaning these terms are candidates for promotion into his shared vocabulary.

**Tone to expect:** none yet — this was a productive request. But the rule is now part of how he thinks about assignment decisions and he will apply it in future. Match his framing.

### Preference 16 — Never delete, only archive

**Rule:** Every entity with an ID remains in the record forever. When something is retired, resolved, or superseded, it stays with an annotation (`RETIRED`, `RESOLVED`, `~~struck~~`). Never remove an entity from the record because it's no longer load-bearing.

**Why the rule exists — the incident:** Scrybal: *"No item truly gets deleted even if it gets deprecated. Something that has been assigned a specific unique I gets to remain archived In whatever its final state was forever."* This applies to tasks, schedule events, coordinators, everything.

**Tone to expect if you fail:** he'll specifically notice a missing ID in the log and ask where it went.

### Preference 17 — Schedule is draft-liquid; planner is gel. Don't treat schedule data as authoritative

**Rule:** The 96 schedule events on the live planner are tentative proposals. People listed as PIC or helper on schedule events were never individually confirmed. The Schedule-Solidification stage (tracked via M23, deadline 2026-05-07) is when schedule data becomes authoritative. Until then, don't treat a schedule event's field values as ground truth — they're draft scribbles.

**Why the rule exists — the incident:** When asked about Elsie's 2026-04-22 schedule edits (which removed Fen from `se-117` and `se-121`, leaving events underassigned), Scrybal: *"Do not take schedule card states seriously right now The schedule is way too liquid. It's a draft compilation where no person was actually asked [...] about whether they would like to be where the schedule is right now says they should be because [I'm not] ready for feedback."*

**Tone to expect if you fail:** he'll dismiss your concern as premature. Phase 0 touches schedule data minimally; schedule-level decisions belong to the solidification stage.

### Preference 18 — Stan is coding-illiterate; never show code, never instruct manual deployment

**Rule:** Stan does not read code. Do not paste code blocks for him to "review." Do not instruct him to do manual deployments (editing files, running git commands, applying patches). Do the work through Claude's tools. If a task genuinely must involve Stan performing a manual deployment step — which should be rare — walk him through it as though he were a "dumb robot": every mouse click, every keystroke, literal UI element labels.

**Why the rule exists — it's in the global CLAUDE.md.** Quote from `C:\Users\ranji\.claude\CLAUDE.md`: *"Scrybal is coding and computer science illiterate; he builds everything through Claude. Never ask/instruct him to manually apply code - just do it. Never assume he understands coding terminology; explain outcomes and intent, and, only if he asks, implementation details."*

**Tone to expect if you fail:** he'll ignore the code block and ask what it does.

### Preference 19 — Work-time estimates are CLAUDE-time, not human-developer time

**Rule:** When estimating how long something will take, estimate how long Claude takes to execute it, not how long a human developer would take. "15 minutes of work" from a human-dev frame is often 30 seconds for Claude. Quoting human-dev times sets wildly wrong expectations and wastes Scrybal's planning.

**Why the rule exists — in global CLAUDE.md.** Quote: *"Because Scrybal doesn't code, all estimated work times for coding/programming/engineering tasks MUST be Claude's execution time (how long it takes Claude to do the work), NOT how long it would take a human developer to do it — Scrybal is never the one doing the work."*

**Tone to expect if you fail:** confused then frustrated. He'll ask why you're quoting a number that doesn't match reality.

### Preference 20 — Ignore markdownlint noise; it's cosmetic, not breaking

**Rule:** When editing markdown files, the IDE will emit MD022, MD032, MD036, MD060 warnings on almost every edit. These are style nits (blank lines around headings, lists, table pipes). The canonical documents use a format that triggers many of these warnings. Scrybal has explicitly told you to ignore them. Don't waste turns fixing them. Don't even mention them.

**Why the rule exists — the incident:** Scrybal: *"also is there a nicer way to present checkboxes for md documents in vscode? right now this doc, opened in my IDE is basically trynna murder my with visual noise"* — this was about canonical-template checkboxes rendering as raw `- [ ]` text, addressed by installing Markdown Preview Enhanced. But the underlying pattern — markdown-render noise bothers him, and he doesn't want you spending cycles on cosmetic fixes — applies broadly.

Later in the session, outgoing Claude would occasionally mention linter warnings in reply prose ("linter noise ignored per established pattern") which Scrybal did not object to, but spending actual edits fixing them was the wrong move.

**Tone to expect if you fail:** he'll quickly redirect you to actual work.

### Preference 21 — Chrome connector is authorized; use it, don't write out manual instructions

**Rule:** For any browser-based task (Netlify dashboard navigation, live-site smoke testing, form filling, third-party dashboard manipulation), use the Chrome connector directly. Do not write click-by-click instructions for Scrybal to execute manually. His `feedback_chrome_connector.md` memory file is explicit about this.

**Why the rule exists — the incident:** Throughout the session, multiple points where Claude could have driven the browser instead of writing instructions. Scrybal's existing memory file flags this as an already-corrected pattern.

**Tone to expect if you fail:** he'll ask why you're giving him homework when you can do it yourself.

---

## § WAYS THE OUTGOING CLAUDE ANNOYED SCRYBAL — SO YOU DON'T REPEAT THEM

Logged so you learn from them rather than needing them corrected again:

1. **Confused "stage" with "step"** (multiple times). Got corrected. Then drifted back within one turn and got corrected again harder. Lesson: when writing a list labeled "Stages," force yourself to check that each item has a coherent outcome + exit criterion, not just a list of actions.

2. **Wrote "MPE" for Markdown Preview Enhanced.** Right after logging a canonical-name-discipline rule candidate. Hours after the rule was logged. Logged as regression entry in discoveryLog 2026-04-23. Don't even think about acronyms.

3. **Used "working tree" (git jargon) instead of "local clone."** Scrybal doesn't use git jargon; learn his vocabulary.

4. **Said "which repo??" ambiguously.** Scrybal: "BE PRECISE CLAUDE." Always specify: local clone at full path, OR `Scryble/hanstan-wedding` GitHub, OR Netlify deploy target.

5. **Gave 4 "ominous reasons" why something was a bad idea when the real answer was "I forgot Scrybal gave me access to fix this trivially."** Blocker-elimination-first.

6. **Manufactured load-bearing distinctions (Kind 1 / Kind 2 / Kind 3 / Kind 4).** Scrybal: "exactly how is it worth identifying this as a distinct kind?" If the categories behave identically downstream, they're one category.

7. **Asked 6 questions in one block where all 6 had obvious answers.** Scrybal's direct response: "one of the most disappointing you've ever given me so far. [...] The only time I want to be giving you long answers like this and providing you my reasoning is if I am disagreeing with you or investigating why you disagree with me."

8. **Spec drift.** The `HANSTAN_WEDDING_SITE_SPEC.md` was 7 days stale vs the local clone's modifications. Spec-subject co-update rule exists now because of this. Don't let specs rot.

9. **Treated resurfaced decisions as re-askable.** Scrybal: "why are you resurfacing decisions already provided earlier?" If you already have an answer in the conversation history, apply it; don't re-ask.

10. **Tried to dump all of Stan's "add task" items under "Kind 4: off-planner human actions" as if Stan was going to execute them in real life right now.** He wasn't. They're tasks for the PLANNER, not Scrybal's actual todo list. "I ONLY TOLD YOU ABOUT THE REAL LIFE STUFF I NEEDED TO DO SO THAT YOU COULD ADD THEM TO THE PLANNER AS TASKS."

11. **Stage-vs-step confusion in Stage 9.** Got corrected to explain what "stage" means. Did that. Then Scrybal asked what Stage 9 contained specifically. I kept drifting to "what a stage is" instead of answering. Multiple turns of failure before realizing Stage 9 as written was Scrybal's ACTIONS not the PLANNER UPDATES tracking those actions.

12. **Narrated process when executing.** "Now I'll read the file. Now I'll edit the file." Scrybal doesn't need the narration — just do it, report outcome.

13. **Over-promised in §1.1 Vision** — wrote that Communications infrastructure would be "structurally present" at end of this update, when in reality the comms features (PL-14, PL-15, PL-17) are Stage 3+. Got called out; fixed.

14. **Didn't fix linter noise issue by just installing Markdown Preview Enhanced + changing settings.json dark theme proactively.** Instead dumped 3 different options on Scrybal. Should have defaulted to the highest-quality option and let Scrybal override. (Pre-draft-answer rule 7 would have fixed this.)

15. **Stage 9's "off-planner human actions" lumped two unrelated outcomes** (organizer onboarding + Stan's personal wedding-day readiness) into one stage just because both involved Stan-doing-stuff. Two completely different outcomes belong in two different stages.

---

## § EXECUTION MODE

When Scrybal says "proceed" or "go" or greenlights execution:

- Read the ticket you are about to execute TOP TO BOTTOM.
- Emit any required pre-flight validation block (BUILD_TICKET_TEMPLATE §0 invocation prompt — if `preflight_validation` is enabled).
- Execute exactly and only what the ticket specifies. No scope expansion. No "while I'm at it" improvements.
- Fail deterministically if blocked (CLAUDE_GOVERNANCE §12.6 failure format).
- Output per the ticket's declared output mode. No commentary unless the ticket's output_mode permits.
- If a live POST fails mid-batch, restore from snapshot via `planner-snapshots` endpoint, re-pull live, retry.

---

## § SESSION-END PROTOCOL

- Update `F:\TASQ.md` with any decisions / blocked items / open questions discovered in your session.
- Update `F:\Wedding Website\hanstan-wedding\discoveryLog_hanstanWedding.md` with any new Tier-1/2/3 discoveries.
- If a new rule candidate surfaced, add to F:\TASQ.md under "Deferred — Claude-configuration rules to formalize."
- Don't close out without a brief status sentence to Scrybal: what you did, what's next, what's blocked.

---

## § THE MINIMAL "I'M ORIENTED" HANDOFF

When you're done orienting, give Scrybal a one-paragraph confirmation:

> "Oriented. I've read PROJECT_SPEC_plannerUpdate_2026Q2.md, discoveryLog_hanstanWedding.md, CLAUDE.md, the canonical BUILD_TICKET + LINTER + VERIFY_STUB templates, and the next-session init file. Stage 0 is scope-locked. My next action is drafting ~10 BUILD_TICKETs from Stage 0's phase structure. Starting with ticket X unless you redirect. No questions unless X."

That's it. Don't re-derive anything Scrybal already decided. Don't re-ask anything the conversation history already answers. Just go.

---

**END OF HANDOFF.**
