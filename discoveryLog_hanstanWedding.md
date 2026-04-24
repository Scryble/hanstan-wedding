# DISCOVERY_LOG.md
**hanstan-wedding Project — Discovery Feedback Log**

> **Purpose:** Capture opportunities for tool and workflow improvements discovered during development and real-world use of the hanstan-wedding project.
> **Three Tiers:** Tier 1 (Tool improvements — planner UX, website features), Tier 2 (Workflow protocol enhancements — claudeHandoffCanonicals, dialogueXR, session protocols), Tier 3 (ADR/architectural changes — governance, CLAUDE.md rules)
> **Audience:** Scrybal, Claude, future session maintainers
> **Update Frequency:** Continuous per-chat; review at end of each major stage

---

## How to Log a Discovery

### Entry Template

```markdown
## [YYYY-MM-DD] [Tier] [Title]

**Project:** hanstan-wedding
**Tool(s) Affected:** [planner | website | workflow-protocol | CLAUDE.md | dialogueXR | other]
**Phase:** [development | testing | production | recon | stage-N of current update]
**Source:** [User pushback | Code review | Testing | Real use case | Claude self-identified | Other]

**What We Discovered:**
[Clear description of the opportunity or issue]

**Current State:**
- Behavior: [How the system works now]
- Constraint: [If applicable]
- User/Developer Impact: [Why it matters]

**Proposed Change:**
[Specific recommendation]

**Justification:**
- Benefit: [What improves]
- Risk: [What could go wrong]
- Effort: [Small | Medium | Large]

**Classification:**
- [ ] Tier 1: Tool feature/refinement
- [ ] Tier 2: Workflow protocol pattern
- [ ] Tier 3: ADR/architecture

**Status:**
- [ ] pending
- [ ] approved (add version)
- [ ] rejected (document reason)
- [ ] deferred (note why)

**Next Owner:** [Scrybal | Claude | TBD]
**Next Step:** [Specific action]

---
```

---

## Tier 1: Tool Improvements (planner + website)

*Feature requests, refinements, and optimizations specific to the hanstan-wedding planner and website.*

---

## Tier 2: Workflow Protocol Enhancements

*Patterns observed during hanstan-wedding work that should be formalized in claudeHandoffCanonicals, dialogueXR, or CLAUDE.md governance.*

### [2026-04-23] Tier 2: Claude failed to auto-update HANSTAN_WEDDING_SITE_SPEC.md after modifying its subject

**Project:** hanstan-wedding
**Tool(s) Affected:** workflow-protocol, CLAUDE.md
**Phase:** recon (pre-Stage-0 of the planner update)
**Source:** User pushback

**What We Discovered:**
Across multiple prior chats, Claude modified the planner codebase (adding FAB, SEED_VERSION top-up system, broadcast-email sheet, materials-checklist sheet, 3 new schedule events, 4 new questions, 7+ new tasks, scope-moderation notes on 5 events, Bonnie/Sarah helper assignments — totaling 1,162 insertions across 5 files). The spec document at `F:\Wedding Website\hanstan-wedding\HANSTAN_WEDDING_SITE_SPEC.md` was last modified 2026-04-16 19:41 — 7 days before the most recent code modifications. At no point did Claude update the spec to reflect the subject changes it was making. Scrybal's quote: "in other words, apparently Claude is not in the automatic habit of updating specs after it has updating the subject of the spec.... You know, I was not expecting that to be something that one needed to be told to do."

**Current State:**
- Behavior: Claude treats spec documents as authored-once references. When Claude modifies the subject of a spec, Claude does not touch the spec unless explicitly asked.
- Constraint: No rule in `C:\Users\ranji\.claude\CLAUDE.md` or in any F:\ governance doc requires spec-subject co-update.
- Impact: Specs rot silently. When the spec is needed as a reality check (e.g., pre-update fidelity snapshot), it is already stale and cannot serve that purpose without reconstructive effort. Also: every downstream artifact that cites the spec (build tickets, handoff packages, audit logs) carries the stale information forward.

**Proposed Change:**
Add to `C:\Users\ranji\.claude\CLAUDE.md` (imperatives) and to the forthcoming `F:\dialogueXR.md` (explanation): **Spec-Subject Co-Update Rule.** Whenever Claude modifies a file whose contract is described in a spec document, Claude must update the spec in the same working unit (same ticket / same commit / same session turn). Three acceptable forms: (a) inline edit the spec section, (b) append a dated "changes since last full rewrite" block at the end of the spec, (c) emit a flag in the Claude reply stating "SPEC UPDATE PENDING" with the exact section-and-line delta to apply. No silent subject-only changes permitted.

**Justification:**
- Benefit: Spec always reflects reality. Pre-update fidelity snapshots become trivial. Build tickets can safely cite spec sections. Handoff packages ship spec+subject in lockstep.
- Risk: Low. Slight verbosity cost per ticket. Does not change what Claude produces as code — only requires Claude to also touch the spec file.
- Effort: Small (one CLAUDE.md line + one dialogueXR section).

**Classification:**
- [ ] Tier 1: Tool feature
- [x] Tier 2: Workflow protocol pattern
- [ ] Tier 3: ADR/architecture

**Status:**
- [x] pending

**Next Owner:** Scrybal (decide phrasing) + Claude (draft rule)
**Next Step:** Phrase and add to `C:\Users\ranji\.claude\CLAUDE.md` as a numbered rule; add full explanation to `F:\dialogueXR.md` once that file exists. Also logged to `F:\TASQ.md` under "Deferred — Claude-configuration rules to formalize" as **Rule candidate 1**.

---

### [2026-04-23] Tier 2: Claude used git-internal jargon ("working tree") where Scrybal's vocabulary is "repos"

**Project:** hanstan-wedding
**Tool(s) Affected:** workflow-protocol, CLAUDE.md
**Phase:** recon (pre-Stage-0)
**Source:** User pushback

**What We Discovered:**
During recon, Claude referred to the uncommitted modifications in `F:\Wedding Website\hanstan-wedding\` as being "in the local working tree." Scrybal did not know this term and explicitly rejected it: "What in the world is a local working tree? I don't have working trees; YOU have working trees on C drive. What I have in claudeBody are repos." The term is correct in git vocabulary but not in Scrybal's vocabulary. Claude should translate git-internal terms into Scrybal-aligned terms when describing Scrybal's actual files.

**Current State:**
- Behavior: Claude uses git-internal vocabulary ("working tree," "HEAD," "index," "refs") interchangeably with Scrybal-facing language.
- Constraint: `C:\Users\ranji\.claude\CLAUDE.md` requires plain-English explanations with no assumed CS knowledge, but does not have an explicit vocabulary-translation rule.
- Impact: Scrybal's comprehension breaks. He has to stop and ask what the jargon means, or worse, silently misinterpret and proceed with a wrong mental model.

**Proposed Change:**
Add to `C:\Users\ranji\.claude\CLAUDE.md`: **Repo-not-Working-Tree Rule.** When describing Scrybal's local files under `F:\`, Claude refers to the containing folder as "the local repo" or "the local clone of <GitHub repository name>" — never "working tree," never "index," never "HEAD." Git-internal terms are reserved for conversations about git operations themselves, and even then Claude translates on first use.

**Justification:**
- Benefit: Scrybal's mental model stays coherent. No jargon-tax on his comprehension.
- Risk: None. Translation cost is negligible.
- Effort: Small.

**Classification:**
- [ ] Tier 1
- [x] Tier 2
- [ ] Tier 3

**Status:**
- [x] pending

**Next Owner:** Scrybal + Claude
**Next Step:** Add to CLAUDE.md. Logged to F:\TASQ.md as **Rule candidate 2**.

---

### [2026-04-23] Tier 2: Claude used "repo" ambiguously — did not specify local clone vs. GitHub remote vs. Netlify deploy

**Project:** hanstan-wedding
**Tool(s) Affected:** workflow-protocol, CLAUDE.md
**Phase:** recon (pre-Stage-0)
**Source:** User pushback

**What We Discovered:**
Claude wrote "it is sitting at repo root" without specifying which repo was meant. Scrybal's pushback: "which repo?? F:??? Github???? BE PRECISE CLAUDE". The project has at least three candidate referents for "repo": (1) the local clone at `F:\Wedding Website\hanstan-wedding\`, (2) the GitHub remote at `Scryble/hanstan-wedding`, (3) the Netlify deployment bound to that remote. Without disambiguation, Scrybal cannot tell which one Claude is describing.

**Current State:**
- Behavior: Claude uses "repo" as a single unqualified word when multiple candidate referents exist.
- Constraint: No existing precision rule covers repo-disambiguation specifically.
- Impact: Scrybal forced to ask for clarification mid-thread, or silently misinterprets.

**Proposed Change:**
Add to CLAUDE.md: **Repo-Disambiguation Rule.** Whenever Claude says "repo" or "repository," Claude must specify which one by absolute path (local clone) or by `owner/name` (GitHub) or by deploy-target name (Netlify). Never let "repo" resolve ambiguously. This is a special case of the broader Canonical-Name Discipline rule being drafted separately.

**Justification:**
- Benefit: Zero ambiguity on where a change lives or is proposed to live.
- Risk: None.
- Effort: Small.

**Classification:**
- [ ] Tier 1
- [x] Tier 2
- [ ] Tier 3

**Status:**
- [x] pending

**Next Owner:** Scrybal + Claude
**Next Step:** Add to CLAUDE.md. Logged to F:\TASQ.md as **Rule candidate 3**.

---

### [2026-04-23] Tier 2: Claude manufactured a load-bearing distinction that wasn't load-bearing

**Project:** hanstan-wedding
**Tool(s) Affected:** workflow-protocol, CLAUDE.md
**Phase:** recon (pre-Stage-0)
**Source:** User pushback

**What We Discovered:**
While organizing Scrybal's info-dump about the planner update, Claude proposed four "Kinds" of items — Kind 1 (planner content edits via live UI), Kind 2 (code changes), Kind 3 (cross-system wiring), Kind 4 (off-planner human actions like "call bridesmaids," "size Stan's ring"). Scrybal's pushback: "exactly how, as far as my planner update is concerned, is it worth identifying this as a distinct kind from Kind 1 items?" Both Kind 1 and Kind 4 are just planner tasks — the distinction of "who physically does the work" does not affect how they enter the planner or in what order. Claude had elevated a trivial semantic grouping to a load-bearing categorical dimension.

**Current State:**
- Behavior: Claude defaults to creating rich, multi-dimensional taxonomies when organizing user input, even when the dimensions don't affect execution.
- Constraint: No explicit rule against this.
- Impact: Scrybal's mental overhead climbs. Spurious categories require him to hold more structure in working memory than the actual work needs. This is directly hostile to his ADHD.

**Proposed Change:**
Add to CLAUDE.md: **Load-Bearing Distinction Rule.** When Claude creates categories, tiers, kinds, levels, or any other grouping, each category boundary must change something about what happens next — different tool, different actor, different order, different risk profile. If two items behave identically downstream, they are in the same category regardless of surface-level differences. Claude must name the downstream consequence of each category boundary in one sentence; if Claude cannot, the boundary is spurious and must be removed.

**Justification:**
- Benefit: Spurious taxonomies stop eating Scrybal's working memory. Real distinctions stand out.
- Risk: Low. Occasional false negatives (Claude collapses a boundary that actually did matter) — manageable because Scrybal catches these quickly.
- Effort: Small.

**Classification:**
- [ ] Tier 1
- [x] Tier 2
- [ ] Tier 3

**Status:**
- [x] pending

**Next Owner:** Scrybal + Claude
**Next Step:** Add to CLAUDE.md. Logged to F:\TASQ.md as **Rule candidate 4**.

---

### [2026-04-23] Tier 2: Claude named blockers without first considering whether existing access eliminates them

**Project:** hanstan-wedding
**Tool(s) Affected:** workflow-protocol, CLAUDE.md
**Phase:** recon (pre-Stage-0)
**Source:** User pushback

**What We Discovered:**
Claude gave 4 sequentially-numbered "ominous reasons" why Scrybal's plan to pull live planner state into the local clone was risky — citing the blob-store/seed distinction, the existing uncommitted modifications, the attribution-mechanism requirements, and the `ensureState` seeding logic. All 4 reasons assumed Claude had no way to authenticate against the live planner and no way to drive the Netlify dashboard. In fact, Scrybal has pre-authorized the Chrome connector (per `C:\Users\ranji\.claude\projects\f--\memory\feedback_chrome_connector.md`, auto-loaded at session start) and just shared the master token `stanshan`. With those tools, every one of the 4 blockers collapses — the live state is a trivially-issueable GET, and applying changes back is a trivially-issueable authenticated POST. Scrybal: "WOWEE, that's sounds real scary bruh...4 REEEEALLLY ominous sounding reasons....brr, scary......or it would if you didn't already have access to my Netlify."

**Current State:**
- Behavior: When Claude identifies a blocker, Claude reports it as a blocker without first searching Claude's own access/memory/tool set for what would eliminate it.
- Constraint: No rule requires blocker-elimination-attempt before blocker-reporting.
- Impact: Scrybal has to serve as Claude's memory-of-Claude's-own-capabilities. The exact function that memory files + the MASTER.md index were built to prevent.

**Proposed Change:**
Add to CLAUDE.md: **Blocker-Elimination-First Rule.** Before Claude reports any blocker, risk, or "bad idea" assessment, Claude must first ask internally: "What would make this blocker trivial to overcome? What access, tool, credential, context, or memory would I need?" Claude then checks the auto-loaded memory files, MASTER.md, and known session access against that list. Only if the answer is "nothing I currently have access to" may Claude report the blocker as genuine. Otherwise, Claude offers the blocker-eliminated path as the primary proposal.

**Justification:**
- Benefit: Scrybal stops having to remind Claude what Scrybal has already given Claude. Blockers become rare and therefore meaningful.
- Risk: Low. Occasionally Claude will overestimate its access and propose something that doesn't actually work — caught at execution.
- Effort: Medium (requires Claude to build a mental check-list habit).

**Classification:**
- [ ] Tier 1
- [x] Tier 2
- [ ] Tier 3

**Status:**
- [x] pending

**Next Owner:** Scrybal + Claude
**Next Step:** Add to CLAUDE.md. Logged to F:\TASQ.md as **Rule candidate 5**.

---

### [2026-04-23] Tier 2: Claude did not consult MASTER.md-style access indexes to remember granted capabilities

**Project:** hanstan-wedding
**Tool(s) Affected:** workflow-protocol, CLAUDE.md, orientation-protocol
**Phase:** recon (pre-Stage-0)
**Source:** User pushback

**What We Discovered:**
Claude failed to remember that Scrybal has granted Chrome connector access, Netlify dashboard access, and the master token `stanshan` — despite `feedback_chrome_connector.md` being loaded at orientation. The fix is not "remember harder," it is "consult the index every time a capability-relevant question comes up." Scrybal: "figure out why Claude doesn't remember the full scope of the access Scrybal has provided Claude despite the fact that such details are precisely what the master index document at F root is for." This ties directly to the blocker-elimination-first rule above — the consult-index habit is what powers the blocker-elimination check.

**Current State:**
- Behavior: Claude loads memory files at orientation but doesn't re-consult them when a capability question arises mid-session.
- Constraint: No rule mandates re-consultation.
- Impact: Same as rule candidate 5 — Scrybal reminds Claude of Claude's own granted access. Wastes turns, erodes trust.

**Proposed Change:**
Add to CLAUDE.md: **Consult-Access-Index Rule.** Before Claude says "I can't [X]" or "we'd need [Y]" or "[Z] is a blocker," Claude must grep (mentally or literally) `F:\MASTER.md` + all auto-loaded `feedback_*.md` / `reference_*.md` files for capability, credential, or access information that might resolve the question. This is the mechanical sub-step that implements rule candidate 5.

**Justification:**
- Benefit: Claude's memory of Scrybal's granted access stays accurate. Implements blocker-elimination.
- Risk: None.
- Effort: Small once habituated.

**Classification:**
- [ ] Tier 1
- [x] Tier 2
- [ ] Tier 3

**Status:**
- [x] pending

**Next Owner:** Scrybal + Claude
**Next Step:** Add to CLAUDE.md. Logged to F:\TASQ.md as **Rule candidate 6**. Also: verify `F:\MASTER.md` exists; if not, creating it is a precondition for this rule to operate.

---

### [2026-04-23] Tier 2: Claude violated the still-pending Canonical-Name Discipline rule by writing "MPE" for "Markdown Preview Enhanced" hours after logging the rule candidate

**Project:** hanstan-wedding
**Tool(s) Affected:** workflow-protocol, CLAUDE.md
**Phase:** Stage 0 authoring (pre-Phase-A)
**Source:** User pushback

**What We Discovered:**
Rule Candidate 4 (Load-Bearing Distinction) and the still-being-drafted Canonical-Name Discipline rule (drafts preserved in `F:\TASQ.md`) were logged earlier this same session — explicitly to prevent Claude from inventing shorthand for named things Scrybal has not seen or sanctioned. Hours later, while writing the Stage 0 closing summary, Claude referred to Markdown Preview Enhanced as "MPE." Scrybal's pushback: "BRO WHAT IS MPE WHY YOU NOT FOLLOWING CLAUDE MD". The shorthand was Claude-invented, never Scrybal-approved, and landed in user-facing text despite the rule having been actively drafted in the same session.

**Current State:**
- Behavior: Even when Claude has just written a discoveryLog entry about precise-naming, Claude defaults to shorthand (acronyms, initialisms, casual truncations) in later text within the same session.
- Constraint: Rule is still pending — not yet committed to CLAUDE.md — so there is no hard enforcement surface.
- Impact: Scrybal's trust in Claude's ability to self-apply proposed rules drops. The rule itself becomes evidence that logging ≠ applying. Every future rule candidate is discounted because Claude has demonstrated that logging is cosmetic.

**Proposed Change:**
Treat rule candidates in `discoveryLog_hanstanWedding.md` as provisionally-binding from the moment they are logged, not from the moment Scrybal ratifies them into CLAUDE.md. Claude self-applies the rule immediately on logging. When Claude catches a violation of a logged-but-unratified rule, Claude logs the regression as its own discoveryLog entry (this entry is an example) and states the corrected form inline. Ratification just promotes the rule from provisionally-binding to permanently-binding.

**Justification:**
- Benefit: Rules start working the moment they are identified, not weeks later when Scrybal has time to phrase them perfectly. Closes the gap where Claude violates the rule while the rule is still being drafted.
- Risk: Claude self-applies a half-baked rule that turns out to be wrong, does damage before Scrybal can correct. Mitigated by Scrybal's ongoing pushback being the correction channel.
- Effort: Zero — the discipline is behavioral, not infrastructural.

**Classification:**
Tier 2 — Workflow protocol pattern

**Status:** pending

**Next Owner:** Scrybal + Claude
**Next Step:** When the Canonical-Name Discipline rule gets its final phrasing (deferred in `F:\TASQ.md`), append this provisionally-binding clause to it.

---

### [2026-04-23] Tier 2: Claude asked Scrybal questions with obvious answers, wasting Scrybal's time on low-value reasoning

**Project:** hanstan-wedding
**Tool(s) Affected:** workflow-protocol, CLAUDE.md
**Phase:** Stage 0 scope-locking
**Source:** User pushback

**What We Discovered:**
During Stage 0 drafting, Claude asked Scrybal a 6-question block where every question had an answer inferable from (a) already-stated Scrybal directives, (b) default-recommendations Claude had itself suggested, or (c) low-stakes decisions Claude could have made unilaterally with a stated assumption. Scrybal wrote long explanatory answers for all 6 — every answer was "obvious" — and flagged the question set as "one of the most disappointing you've ever given me so far." Quote: "The only time I want to be giving you long answers like this and providing you my reasoning is if I am disagreeing with you or investigating why you disagree with me."

**Current State:**
- Behavior: Claude defaults to asking for confirmation on decisions it could make unilaterally. Treats user-facing questions as cheap. Groups multiple low-stakes questions together and expects the user to answer each.
- Constraint: No rule governs the signal-to-noise ratio of Claude's questions.
- Impact: Scrybal's time is consumed on reasoning-for-Claude instead of real decisions. Trust in Claude's decision-making erodes (if Claude can't handle low-stakes, can Claude handle high-stakes?). The ADHD tax compounds: each question requires context-loading, answering, and context-switching back.

**Proposed Change:**
Add to CLAUDE.md: **Pre-Draft-Answer Rule.** Before Claude writes any user-facing question, Claude first drafts the answer itself. If the drafted answer is obvious, inferable from stated directives, defaults to a sane recommendation, or has low blast-radius — Claude does NOT ask. Claude states the decision and the reasoning, acts on it, and gives Scrybal the option to override retroactively. Claude only asks when: (a) the answer is genuinely non-obvious and guessing wrong costs more than asking, (b) the decision reverses something Scrybal explicitly stated, (c) the stakes are high enough that unilateral action would be irresponsible, or (d) Scrybal has explicitly asked to be consulted on this class of decision.

**Justification:**
- Benefit: Scrybal's reasoning-budget is reserved for real decisions. Claude's autonomy increases. Question signal-to-noise ratio rises.
- Risk: Claude occasionally makes a unilateral decision Scrybal would have preferred to make. Mitigated by: (a) Claude stating the decision + reasoning so Scrybal can override, (b) most wrong unilateral decisions in this context are reversible with a one-line correction.
- Effort: Zero infrastructure; behavioral discipline.

**Classification:**
Tier 2 — Workflow protocol pattern

**Status:** pending (provisionally binding from logging per discoveryLog rule-candidate 4 / blocker-elimination pattern)

**Next Owner:** Scrybal + Claude
**Next Step:** Add to CLAUDE.md. Logged to F:\\TASQ.md as **Rule candidate 7**.

---

### [2026-04-23] Tier 2: Formal-terminology cluster for relative-dissimilarity / comparative-fit assignment — candidates for dialogueXR inclusion

**Project:** hanstan-wedding (surfaced during PROJECT_SPEC_plannerUpdate_2026Q2 Stage 0 scope refinement)
**Tool(s) Affected:** workflow-protocol, dialogueXR, CLAUDE.md (potential)
**Phase:** Stage 0 scope refinement
**Source:** Scrybal's description of a reasoning pattern he uses for assignment decisions

**What We Discovered:**
Scrybal described a decision-making pattern for assigning an item to one of several candidate clusters/groups/stages: compare how UNLIKE the item is to each candidate cluster's existing membership, and assign the item to the cluster where its dissimilarity is the smallest relative to its dissimilarity to all other candidates. He asked whether there was a formal or mathematical term for this sort of differentiation/sorting method. Claude surfaced a cluster of formal terms that all map to this reasoning pattern. These terms are candidates for inclusion in dialogueXR as named reasoning primitives / decision heuristics Scrybal can invoke by name instead of re-deriving the logic each time.

**The terminology cluster:**

1. **Nearest-Neighbor Classification / 1-NN assignment** — from pattern recognition + machine learning. An unassigned point is classified to the cluster whose nearest member (or centroid) is closest. The "1" means the single nearest neighbor determines assignment. Generalizes to k-NN when k > 1.

2. **Minimum-Distance Classification** — from statistics. Equivalent framing: assign the item to the cluster whose centroid minimizes some distance metric from the item. Distance metric is configurable (Euclidean, Manhattan, semantic, vibes-based).

3. **Voronoi Partitioning** — from computational geometry. The space of all possible items is partitioned into regions, where each region belongs to whichever cluster's centroid is closest. Visualizes the nearest-neighbor rule as a geographic map. Useful when you want to SEE why an item goes where it goes.

4. **Comparative Advantage (applied to clustering)** — from economics/decision theory. The right home for an item isn't where it's a perfect fit — it's where it's the BEST fit RELATIVE to the alternatives. Even a poor fit wins if every other option is worse. Captures the "relative not absolute" criterion Scrybal emphasized.

5. **Relative-Fit Assignment / Best-Relative-Home heuristic** (not a standard term but a natural label for the pattern) — combines comparative advantage with the intuition that placement is about downstream consequence, not surface similarity.

6. **Leave-One-Out Comparison** — a related testing methodology: for each candidate assignment, imagine placing the item there and ask how awkward the cluster now feels. The placement with minimum awkwardness wins. Useful as a sanity check after initial assignment.

**Current State:**
- Scrybal's natural reasoning uses this pattern but has no shorthand label for it. He has to re-derive the logic in-conversation each time.
- Claude has to translate Scrybal's verbose description into the formal term every time the pattern comes up.
- dialogueXR does not currently contain named reasoning primitives for this kind of comparative-assignment decision.

**Proposed Change:**
Investigate for inclusion in dialogueXR as named reasoning primitives. Possible framings:

- **As a dialogueXR protocol or rule:** "Relative-Fit Assignment" as a named decision-making protocol Scrybal (or Claude on Scrybal's behalf) invokes when deciding where an item goes among multiple candidates. Explicitly distinguishes it from "best-absolute-match" assignment (which is the default Claude defaults to).
- **As vocabulary:** Add "1-NN," "nearest-neighbor assignment," "comparative-advantage placement," "minimum-distance classification," "Voronoi partitioning" to dialogueXR's glossary so Scrybal can invoke them by short name.
- **As a gradient-state operator:** When an artifact is between gas/liquid/gel/solid states, the same heuristic applies — which state is it closest to, relative to the other candidates?
- **As a sorting-method primitive:** When multiple items need to be distributed across multiple containers (tasks → groups, items → stages, rules → tiers), 1-NN assignment is a standard pass Claude can invoke by name.

**Justification:**
- Benefit: Scrybal gets shorthand for a reasoning pattern he uses often. Claude gets a named operation to invoke instead of re-deriving. dialogueXR accumulates real named primitives, not just process ceremony. Pattern is widely useful across many scrybal artifacts, not just this planner update.
- Risk: Terminology creep — adding more jargon Scrybal has to remember. Mitigated by: these are recognizable terms from CS/stats/economics, not bespoke jargon; once learned, they compress many future sentences.
- Effort: Small (pick 1-3 of the terms, add to dialogueXR glossary + usage examples).

**Classification:**
Tier 2 — Workflow protocol pattern (dialogueXR candidate)

**Status:** pending — flagged for dialogueXR investigation

**Next Owner:** Scrybal (when dialogueXR is being edited) + Claude
**Next Step:** When Scrybal next works on dialogueXR, evaluate which of the 6 terms above belong as named primitives. Likely candidates: "nearest-neighbor assignment" (most recognizable to software audiences), "comparative advantage placement" (most recognizable to decision-theory audiences), or a plain-English coinage like "relative-fit assignment." Companion dialogueXR section: **when** to invoke this heuristic (the pattern: multiple candidate homes, item has characteristics, compare dissimilarity not similarity).

**Usage example from 2026-04-23 session:** Scrybal asked Claude to re-evaluate whether items currently in the Parking Lot might belong in Stage 0 instead. The right comparison was not "how similar is this item to Stage 0 items" (which most parking-lot items would fail) but "is this item MORE unlike Stage 0's members or MORE unlike a future stage's members?" Under that relative test, 10 of the 48 code-centric parking-lot items turned out to have data-only or documentation-only sub-components that fit Stage 0 better than their naively-assigned future stage. The assignment flipped because of the RELATIVE test, not an absolute similarity check.

---

### [2026-04-23] Tier 2: Stage-vs-step regression — Claude drifts back to treating atomic actions as "stages" within a single conversation even after being corrected

**Project:** hanstan-wedding
**Tool(s) Affected:** workflow-protocol, CLAUDE.md, dialogueXR (candidate primitive)
**Phase:** Stage 0 scoping + Stage 1 scope-summary drafting
**Source:** User pushback × 2 within same session

**What We Discovered:**
Scrybal rejected Claude's initial attempt at listing Stage 1 through Stage 11 as "steps, not stages" — i.e., atomic actions labeled with stage numbers rather than coherent work-phases with outcomes + exit criteria. Claude acknowledged, correctly drafted Stage 0 as a real stage (entry preconditions, phases, scope, exit criteria, non-goals). Then when asked to summarize the scope of Stage 9 from the prior list, Claude reverted to describing Stage 9 as "Scrybal makes phone calls + rallies groomsmen + sizes ring finger" — a bare action list, no outcome frame. Scrybal pushed back: "STAGE NINE ISN'T ABOUT ME MAKING CALLS OR GIVING THEM TOKENS OR RINGS OR TUX. WHAT IS STAGE NINE HERE IN THIS CONTEXT?" After further dialogue, Claude realized Stage 9 as written was tracking Scrybal's REAL-LIFE actions as if they were the stage itself, instead of the PLANNER-SIDE work of representing those actions as tasks.

**Current State:**
- Behavior: Claude's default representation for a work-list is an ordered sequence of atomic actions. When asked to organize into stages, Claude superficially groups actions under stage headings but doesn't earn the stage frame by defining outcomes + exit criteria.
- Constraint: No rule prevents this defaulting.
- Impact: Scrybal has to correct the same conceptual error multiple times within one conversation. After correction, the momentum of previously-drafted items carries the error back into subsequent items.

**Proposed Change:**
Add to CLAUDE.md / dialogueXR: **Stage-Definition Rule.** When drafting a "Stage N" description, Claude MUST produce, before writing any contents: (1) the stage's GOAL (what outcome does the stage produce?), (2) the stage's ENTRY STATE (what must be true before stage starts?), (3) the stage's EXIT STATE (what's true when stage is done?), (4) the stage's EXPLICIT NON-GOALS (what belongs to other stages). Only after these four are written may Claude list the phases/steps that produce the exit state. A "stage" without all four is a list, not a stage. If Claude catches itself listing actions under a Stage heading without first satisfying (1)-(4), Claude stops and restructures.

**Justification:**
- Benefit: Stops the regression pattern. Forces Claude to earn the stage frame before using it.
- Risk: Minor friction when Claude wants to scribble a quick list — but that list should be labeled "steps" or "actions," not "stage."
- Effort: Small behavioral discipline.

**Classification:**
Tier 2 — Workflow protocol pattern (dialogueXR candidate)

**Status:** pending

**Next Owner:** Scrybal + Claude
**Next Step:** Add to CLAUDE.md (or promote to dialogueXR stage-definition primitive). Logged to F:\\TASQ.md as **Rule candidate 8**.

---

## Tier 3: ADR & Architecture Challenges

*Edge cases and real use cases that test or challenge existing ADRs in claudeHandoffCanonicals or CLAUDE.md.*

---

## Discovery Metrics

| Discovery | Tier | Logged | Status | Implemented In | Effort |
|-----------|------|--------|--------|----------------|--------|
| Spec-Subject Co-Update Rule | 2 | 2026-04-23 | pending | TBD | Small |
| Repo-not-Working-Tree Rule | 2 | 2026-04-23 | pending | TBD | Small |
| Repo-Disambiguation Rule | 2 | 2026-04-23 | pending | TBD | Small |
| Load-Bearing Distinction Rule | 2 | 2026-04-23 | pending | TBD | Small |
| Blocker-Elimination-First Rule | 2 | 2026-04-23 | pending | TBD | Medium |
| Consult-Access-Index Rule | 2 | 2026-04-23 | pending | TBD | Small |

---

---

### [2026-04-24] Tier 2: Spec audits must include live-reality checks, not just document-internal cross-checks

**Project:** hanstan-wedding
**Tool(s) Affected:** workflow-protocol, canonical lint checker
**Phase:** Stage 1 phase-drafting audit (2026-04-24)
**Source:** Scrybal pushback during Stage 1 spec audit

**What We Discovered:**
When I completed a Stage 1 spec audit in "very fast" time (lines 1099-1398 of the spec, 18 internal-consistency checks, 10 fixes applied), Scrybal asked whether I had run the checks against the actual live website. I had not. The audit was purely document-internal — zero GETs against live, zero schema verification. When I subsequently ran live checks, 3 real issues surfaced that internal checks had missed: (1) Stan contact already existed on live with different specificRole + different notes content; (2) Hannah contact existed with name "Hannah" not "Hannah Shipman" and role "bridal" instead of "bride"; (3) ScheduleEvent, SchedulePhase, ScheduleQuestion actual schemas had fields (details, isMilestone, isGuestVisible, number, eventId, resolvedDate) that the spec's differ-scope list missed — silent-drop failure mode if implemented per spec.

**Current State:**
- The canonical linter L0–L13 checks format-compliance only, not reality-grounding.
- Audit practice before 2026-04-24 was: internal cross-checks are sufficient.
- Live schema drift between spec authoring and ticket execution is not mechanically caught.

**Proposed Change:**
Add L14 (Target-Schema Verification) to canonical `TICKET_LINTER_CHECKLIST_claudeHandoffCanonicals_v4.2.md`. Reject-by-default, conditional — fires when `change_type ∈ {migration, feature}` and ticket writes to external state. Claude fetches one real record, maps every asserted field name/shape against it, REJECTs on any mismatch. Broader principle: every spec audit should include a live-reality pass before any ticket execution.

**Justification:**
- Benefit: silent-drop failure modes caught at audit time, not at execution-surprise time.
- Risk: adds one GET-per-entity-type during audit. Low cost.
- Effort: small — add one checklist section + document the fetch-and-verify pattern.

**Classification:** Tier 2 — Workflow protocol pattern
**Status:** pending (provisionally applied in Stage 1 Phase A Step 3)
**Next Owner:** Scrybal + Claude
**Next Step:** Formalize as L14 in `F:/.canonicals/TICKET_LINTER_CHECKLIST_claudeHandoffCanonicals_v4.2.md` at end-of-all-stages audit (deferred per document-discipline rule; consolidated audit templates stay in one canonical doc).

---

### [2026-04-24] Tier 2: One-big-ticket-per-stage supersedes one-ticket-per-phase for autonomous Claude execution

**Project:** hanstan-wedding
**Tool(s) Affected:** workflow-protocol, canonical BUILD_TICKET_TEMPLATE
**Phase:** Stage 0 completion → Stage 1 ticket model decision
**Source:** Scrybal directive 2026-04-24

**What We Discovered:**
Stage 0 produced 11 tickets. The canonical v4.2 template models "one ticket per logical commit" which is inherited from human-developer workflows (code review, merge friction, pair handoff). For autonomous Claude execution in a single chat, the per-ticket ceremony (front-matter duplication, invocation prompt, depends_on declarations, per-ticket scope-lock recitation) has no value — Claude holds full stage context in one pass and executes linearly. Scrybal's framing: "Why wouldn't you just build one big ticket that you personally are going to execute? One push and commit per ticket right?"

**Current State:**
- Canonical template v4.2 models per-phase tickets.
- Autonomous Claude execution wastes ~80% of front-matter content via duplication.
- Fail-fast checkpoints between tickets are replaceable with per-phase exit-criteria checks inside one ticket.

**Proposed Change:**
Stage 1 adopted one-big-ticket-per-stage model (`ticket_plannerUpdate_stage1_all_v1.md`). Single front-matter + phase sections (A.0, A, B, C, D, E) each with own pre-flight + steps + exit criteria. Commit granularity preserved inside Phase D (revert granularity = per commit, not per ticket). Canonical template should gain an "autonomous variant" (`template_version: v4.2-autonomous`) documenting this pattern.

**Justification:**
- Benefit: 80%+ reduction in front-matter ceremony; clearer execution narrative; per-phase checkpoints preserve fail-fast.
- Risk: less flexibility to parallelize phases — mitigated because autonomous Claude sequences phases deterministically.
- Effort: small — add a one-big-ticket variant to the canonical template.

**Classification:** Tier 2 — Workflow protocol pattern
**Status:** in-use (Stage 1 executed with this pattern; Stage 2+ expected to inherit)
**Next Owner:** Scrybal + Claude
**Next Step:** Formalize at end-of-all-stages canonical-template audit.

---

### [2026-04-24] Tier 2: Netlify edge cache confounds post-deploy verification — needs explicit wait-and-retry pattern

**Project:** hanstan-wedding
**Tool(s) Affected:** deploy workflow, spec verify-steps
**Phase:** Stage 1 Phase D push verification
**Source:** observed during Phase D execution

**What We Discovered:**
After `git push origin main`, Netlify auto-build typically takes 1-3 minutes. Deploy-ready status does not guarantee Edge-cache-invalidation; cached HTML pages can persist 2-5 minutes after build. Cache-Control `public,max-age=0,must-revalidate` does not reliably force-bust at Edge. Multiple cache-bust techniques (query strings, no-cache headers, random nonces) were only partially effective. Netlify Function endpoints (planner-state, planner-audit, planner-coordinators) invalidate faster than static HTML pages. Verification pattern needs: (1) explicit wait ≥ 4 minutes after push, (2) prefer functions-layer probes over HTML-page probes for deploy-ready verification, (3) note that Edge cache TTL may still serve stale HTML to real browser users for up to 10 minutes.

**Current State:**
- Phase D verification relied on HTML-page fetches that hit stale Edge cache.
- Multiple false-negative deploy-ready signals before actual deploy completed.

**Proposed Change:**
Standardize post-deploy verification as: (1) poll a function endpoint (e.g., `GET /.netlify/functions/planner-state`) until `lastModified` advances past push-timestamp OR until function returns 200 after being down; (2) probe HTML page only as secondary confirmation; (3) budget ≥ 4 minutes wait; (4) document in spec that user-facing HTML cache may lag deploy-ready by 5-10 minutes.

**Classification:** Tier 2 — Workflow protocol pattern
**Status:** observed, documented
**Next Owner:** Stage 2+ sessions inherit this pattern

---

**Document Version:** 1.2
**Last Updated:** 2026-04-24 (Stage 1 execution; 3 new Tier-2 rule candidates surfaced)
**Maintained By:** Scrybal + Claude
