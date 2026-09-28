# Spec: Agent attention in the ccmux tmux dashboard

- **Work ID:** `work-20260926-codex-attention`
- **Status:** Approved design; ready for orchestration preparation.
- **Approval:** User: “approve. prepare prompt for new orchestration to do the spec” (2026-09-27).
- **Execution readiness:** Reference Screens and comparison setup are approved through Vizquiry Revision 54bcc150. Fork dependencies and all three Setup Check baselines are prepared. Hybrid phase briefs still need review before any builder starts; the separate dashboard execution directory preserves the prior attempt.

## Purpose

When you return after being away, you cannot reliably tell which Runtime Sessions need your attention. You want to see the state of all Runtime Sessions, identify those needing your input, and return to their conversations so work can continue.

## Brainstorming Visual Record

- **Vizquiry Visual Session:** unavailable: its identifier is missing from the original-work handoff.
- **Vizquiry Library Session ID:** `d6bd499947f0caf6d2ec5f2473f6892ec003c08b055c5a5fb7edba401eea4171`.
- **Open:** `vizquiry --library --open d6bd499947f0caf6d2ec5f2473f6892ec003c08b055c5a5fb7edba401eea4171`.
- **Visual Document:** Workspace Kind and Revision unavailable: the handoff records neither.
- **Availability:** Library locator retained; current availability is unverified.
- **Scope:** Original Codex attention design only; it does not approve dashboard layout or interaction.
- **Evidence trace:** Incomplete: no verified Evidence Links at a known Revision are retained. Revalidate material claims before implementation reliance.
- **Update during implementation:** disabled (default).

Native Markdown Specification review is separate from that Visual Session. Eight dashboard Reference Screens are approved in the separate native review at Revision 54bcc150; the original Visual Session remains unchanged.

## Constraints

- Preserve Ghostty, existing tmux sessions, and host-owned Workbench isolation.
- Use the user-selected maintained ccmux fork, initially pinned to upstream v1.4.2, and its existing daemon and terminal interface.
- Keep ccmux's existing Mac agent support and integrate native Codex inside owned detached Workbenches. Other Workbench agent types are excluded.
- Use `infra/orchestrator/codex-app-server-proxy.mjs` and native Codex app-server status. Terminal patterns cannot substitute for native detection; directory/time heuristics cannot establish exact navigation identity.
- Keep pending items durable. Viewing, seen marking, and navigation do not clear them. Clearing affects records only; it never answers, approves, interrupts, or stops an agent.
- Mac notifications are excluded by the user; both collector and ccmux notification paths must disable delivery.
- Follow AGENTS.md secret, generated-asset, and scratch rules. Do not publish a collection port or mount a host control socket into a Workbench.
- Proceed through hybrid orchestration preparation and its phase-review gates. Scoped build dependencies and user-local delivery follow the approved design; commit, push, and upstream publication remain unauthorized.

`Runtime Session` follows `UBIQUITOUS_LANGUAGE.md`, Session & Lifecycle: a Claude or Codex conversation with its native ID. Other ccmux agent rows retain upstream terminology. The glossary does not define pending item, collector, or cached snapshot; these are literal descriptions, not new domain concepts. Durable native pending guarantees apply to Codex; other Mac providers retain upstream detection limitations.

## Requirements Traceability

The source named **notification spec** is the immutable `specs/doing/work-20260926-codex-attention/spec.md` in the retained notification checkout, not this candidate. Its headings identify inherited requirements. **Dashboard proposal** means the previously presented `ccmux-dashboard-review.md` assumptions. The user approved the candidate and its stated settings. A Preserve disposition defines an obligation, not proof that it is implemented.

### REQ-1: Preserve the terminal environment
- **Source:** notification spec REQ-1; user: preserve tmux and use only Ghostty.
- **Obligation:** Keep existing tmux sessions; collection is independent of attached clients.
- **Disposition:** Preserve
- **Maps to:** AC-14, AC-16, AC-20, QF-1, QF-4, QF-6
- **Required proof classes:** structural, integration, accessibility, exercise

### REQ-2: Observe host input and approval
- **Source:** notification spec REQ-2 and REQ-15.
- **Obligation:** Native host Codex waitingOnUserInput or waitingOnApproval creates a pending item with the correct native ID while clients are detached.
- **Disposition:** Preserve
- **Maps to:** AC-1, QF-1, QF-2
- **Required proof classes:** integration, exercise

### REQ-3: Observe Workbench input and approval
- **Source:** notification spec REQ-3 and REQ-15.
- **Obligation:** An owned detached Workbench Codex wait creates a host-visible item scoped to its source and native ID.
- **Disposition:** Preserve
- **Maps to:** AC-2, QF-1, QF-2, QF-3
- **Required proof classes:** integration, exercise

### REQ-4: Distinguish failures from replies
- **Source:** notification spec REQ-4; user: stop because of an error is definitly a MUST.
- **Obligation:** Native failed turns create error-stop items; lost processes or sources report unavailable coverage, never successful completion.
- **Disposition:** Preserve
- **Maps to:** AC-3, AC-8, QF-1, QF-2
- **Required proof classes:** integration, exercise

### REQ-5: Include completed replies
- **Source:** notification spec REQ-5 and D-10.
- **Obligation:** Every newly observed completed Codex reply, including a prose question, creates a lower-priority Reply ready item without prose classification.
- **Disposition:** Preserve
- **Maps to:** AC-4, QF-1, QF-2
- **Required proof classes:** integration, exercise

### REQ-6: Persist and deduplicate
- **Source:** notification spec REQ-7.
- **Obligation:** Pending items survive collector and daemon restart; repeating observation of one event cannot duplicate it.
- **Disposition:** Preserve
- **Maps to:** AC-5, QF-1, QF-2
- **Required proof classes:** integration, exercise

### REQ-7: Clear manually without changing work
- **Source:** notification spec REQ-8; user: i need to be able to clear items myself as well; dashboard proposal clearing assumption.
- **Obligation:** Retain single-item CLI clearing and selected-row clearing; cleared unresolved events remain suppressed across observation and restart without affecting agent work.
- **Disposition:** Preserve
- **Maps to:** AC-6, QF-1, QF-2, QF-4
- **Required proof classes:** integration, interaction, exercise

### REQ-8: Clear on work rather than viewing
- **Source:** notification spec REQ-9; settled navigation choice.
- **Obligation:** Native resumed work clears that Codex Runtime Session's items; popup opening, seen events, and navigation preserve them.
- **Disposition:** Preserve
- **Maps to:** AC-7, QF-1, QF-2, QF-4
- **Required proof classes:** integration, interaction, exercise

### REQ-9: Retain unavailable-source evidence
- **Source:** notification spec REQ-12 and REQ-15; dashboard proposal availability assumption.
- **Obligation:** Retain last-success rows and pending items during unavailable or incompatible coverage, label unavailable plus age, and recover without undoing acknowledgement; never-observed sources show Not yet checked.
- **Disposition:** Preserve
- **Maps to:** AC-8, QF-1, QF-2, QF-3
- **Required proof classes:** integration, exercise

### REQ-10: Publish independently
- **Source:** dashboard proposal timing assumption; scripts/agent-attention.mjs:1137.
- **Obligation:** Attempts run per source every five seconds without overlap, with fifteen-second native timeout; publish each result without losing other reports.
- **Disposition:** Preserve
- **Maps to:** AC-9, QF-1, QF-2, QF-5
- **Required proof classes:** integration, exercise

### REQ-11: Import tracked state
- **Source:** user: see all agent sessions; settled combined scope; dashboard proposal default-list assumption.
- **Obligation:** Show tracked active and retained-pending rows, including metadata on non-pending rows; deduplicate host Codex by native ID and distinguish Workbench rows by source plus native ID.
- **Disposition:** Preserve
- **Maps to:** AC-10, QF-1, QF-3
- **Required proof classes:** integration, exercise

### REQ-12: Open promptly from cache
- **Source:** user reopening-delay report; dashboard proposal performance assumption.
- **Obligation:** Opening triggers no Workbench query; twenty populated warm openings have median at most 200 milliseconds and nearest-rank p95 at most 300 milliseconds, with first partial list within one second.
- **Disposition:** Preserve
- **Maps to:** AC-11, QF-1, QF-5
- **Required proof classes:** integration, exercise

### REQ-13: Navigate to a verified existing pane
- **Source:** settled Enter choice; notification spec REQ-10.
- **Obligation:** Enter revalidates native identity, source, tmux server, current process and pane ownership, then selects the existing host or Workbench pane for the invoking client.
- **Disposition:** Preserve
- **Maps to:** AC-12, QF-1, QF-3, QF-4
- **Required proof classes:** integration, interaction, exercise

### REQ-14: Provide exact fallback recovery
- **Source:** settled recovery choice; notification spec REQ-10.
- **Obligation:** Failed or unavailable verification retains selection and exact source, directory and native-ID recovery steps without automatically starting a second agent.
- **Disposition:** Preserve
- **Maps to:** AC-13, QF-1, QF-3, QF-4
- **Required proof classes:** integration, interaction, exercise

### REQ-15: Show required information
- **Source:** notification spec REQ-10; dashboard proposal row assumption; skills/brainstorming/references/ui-conformance.md.
- **Obligation:** Show project, agent, Mac or named Workbench, work state, reason/count, elapsed wait, and source availability/observation age, with separate pending reasons and the native Runtime Session identity accessible in details.
- **Disposition:** Preserve
- **Maps to:** AC-14, AC-18, QF-1, QF-4
- **Required proof classes:** structural, reviewed visual, exercise, failure proof

### REQ-16: Support list interactions
- **Source:** dashboard proposal controls and ordering assumptions; ccmux v1.4.2 src/tui/App.tsx.
- **Obligation:** Attention mode uses arrows/jk selection, / search, f all/pending toggle, c row-record clearing and Escape close; input/errors precede replies, longest wait breaks ties, and updates retain selected identity.
- **Disposition:** Preserve
- **Maps to:** AC-15, QF-1, QF-4
- **Required proof classes:** interaction, exercise

### REQ-17: Preserve focus and usable size
- **Source:** notification spec REQ-11; dashboard proposal popup assumption; UI conformance reference.
- **Obligation:** Prefix-g opens an 80%-width, 75%-height popup on the invoking client; required actions and information remain keyboard-accessible at reviewed sizes and enlarged text, with focus restored on close.
- **Disposition:** Preserve
- **Maps to:** AC-16, AC-17, AC-18, QF-1, QF-4
- **Required proof classes:** accessibility, responsive, reviewed visual, exercise

### REQ-18: Retain the tmux count
- **Source:** notification spec REQ-11.
- **Obligation:** tmux-status and dashboard pending-item totals agree with persistent records after events and clearing; preserve the user's status-right configuration.
- **Disposition:** Preserve
- **Maps to:** AC-22, QF-1, QF-4, QF-6
- **Required proof classes:** integration, exercise

### REQ-19: Preserve collection authority
- **Source:** notification spec REQ-13; AGENTS.md Secrets; scripts/agent-attention.mjs:203.
- **Obligation:** Collect only saved running Workbenches with matching owner, identity and role labels; observation/import are passive and private, with no secrets or unrestricted transcripts in records or evidence.
- **Disposition:** Preserve
- **Maps to:** AC-19, QF-1, QF-3
- **Required proof classes:** security, integration, exercise

### REQ-20: Deliver silent login startup
- **Source:** notification spec REQ-6 startup clause; dashboard proposal install assumption; user: no more mac notification.
- **Obligation:** User-local collector starts at Mac login independently of terminal clients; both notification paths remain disabled.
- **Disposition:** Preserve
- **Maps to:** AC-20, QF-1, QF-6
- **Required proof classes:** integration, exercise

### REQ-21: Install canonically and document truth
- **Source:** notification spec REQ-14 non-notification clauses; AGENTS.md generated ownership; metadata/runtime-asset-map.json.
- **Obligation:** Use canonical generated runtime assets; preserve unrelated configuration and deliver truthful list, clear, recovery, availability, startup, rollback and pinned-fork guidance.
- **Disposition:** Preserve
- **Maps to:** AC-21, QF-1, QF-6
- **Required proof classes:** structural, contract review, integration, exercise

### REQ-22: Preserve provider and action boundaries
- **Source:** settled provider scope; dashboard proposal remote action restriction.
- **Obligation:** Keep general ccmux Mac behavior outside attention mode; remote rows cannot invoke unsupported send/restart/kill/Git/transcript/preview actions against Mac targets, and survive local process reconciliation.
- **Disposition:** Preserve
- **Maps to:** AC-23, QF-1, QF-3
- **Required proof classes:** integration, contract review, exercise

### REQ-23: Remove Mac notification delivery
- **Source:** notification spec REQ-6 delivery clause, REQ-7 alert clause, REQ-14 permission guidance, and REQ-16 notification clause.
- **Obligation:** Deliver required and lower-priority Mac notifications and follow their content for recovery.
- **Disposition:** Exclude
- **Exclusion decision:** Use the tmux dashboard instead; retain native collection, persistence, startup and recovery through REQ-1 through REQ-22.
- **Exclusion authority:** User: “to open a dashboard to see all agent sessions, and check which one need my attentions, no more mac notification”.

### REQ-24: Replace the Codex-only Mac scope
- **Source:** notification spec D-2 and Out of Scope / Claude support.
- **Obligation:** Limit initial Mac support to Codex.
- **Disposition:** Exclude
- **Exclusion decision:** Retain existing ccmux Mac support; Workbench integration and durable native pending guarantees remain Codex-only.
- **Exclusion authority:** User accepted the presented existing-Mac-support plus Workbench-Codex choice.

### REQ-25: Replace notification receipt in the personal exercise
- **Source:** notification spec REQ-16 and D-13.
- **Obligation:** Receive a question-ready notification after switching away and follow it back.
- **Disposition:** Exclude
- **Exclusion decision:** Notification receipt is excluded under REQ-23; long-document, switch-away and exact-conversation outcomes are retained as the approved D-9 dashboard exercise.
- **Exclusion authority:** User's dashboard/no-notification instruction; the user also approved the revised exercise with this specification.

## Decisions

Status records the user-approved design. Concrete preparation artifacts and unresolved execution locations remain distinguishable from settled product behavior.

### D-1: Use the maintained ccmux fork
- **Status:** settled by user.
- **Decision:** Start from upstream v1.4.2 in a maintained local fork, retaining its daemon and terminal interface.
- **Why:** The inspected dispatcher lacks an import route, adapters are static, and activation targets local panes. The user selected the fork after these limits were presented.
- **Consequences:** Keep the upstream pin and patch boundary documented. Fork location, update procedure and long-term maintenance acceptance remain open; no upstream publication is requested.

### D-2: Combine Mac support and Workbench Codex
- **Status:** settled by user.
- **Decision:** Keep existing Mac support and integrate Codex inside owned detached Workbenches.
- **Why:** Machine-local process and tmux discovery do not cover another container's server.
- **Consequences:** Other Workbench agent types are excluded; other Mac providers retain upstream limitations.

### D-3: Keep native Codex records authoritative
- **Status:** settled by user through specification approval.
- **Decision:** Reuse native observation and persistence, expose a private cached snapshot, and import via the ccmux daemon event stream.
- **Why:** describeRuntimeSession omits all-row project metadata; reconcileAttentionState replaces sourceReports wholesale. Independent publishing must change both boundaries.
- **Consequences:** Merge reports per source, protect imported rows from local removal, deduplicate native identities, and preserve records through seen events.

### D-4: Verify Enter navigation and retain fallback
- **Status:** settled by user.
- **Decision:** Navigate to the verified existing pane; otherwise retain selection and exact recovery steps.
- **Why:** ccmux activation is local; workbench open/attach selects main/editor sessions without native-ID verification.
- **Consequences:** Revalidate source/container/server/process/pane identity. Target the invoking Mac client only. Any necessary identity hooks are metadata-only; their installation scope needs review.

### D-5: Define popup and controls
- **Status:** settled by user through specification approval.
- **Decision:** Prefix-g opens an 80% by 75% attention popup, with controls in REQ-13 through REQ-17.
- **Why:** Existing ccmux keyboard selection and search are reusable; ordinary f hides idle rather than filtering pending.
- **Consequences:** Change f only in attention mode; c clears all pending records on the selected row, while the CLI retains one-event clear. Recheck g at installation and preserve any intervening binding and unrelated settings.

### D-6: Present attention and coverage
- **Status:** settled by user through specification approval.
- **Decision:** Show tracked active plus retained-pending rows; input/errors precede replies, longest wait first within priority, with stable selected identity.
- **Why:** Several pending events can belong to one Runtime Session; stale work state cannot establish current coverage.
- **Consequences:** Expose separate reasons/count, location and age. Exact placement follows the eight approved Reference Screens in `reference-review/APPROVAL.md`. Archived-history enumeration is excluded by the approved default-list scope.

### D-7: Publish independently and open from cache
- **Status:** settled by user through specification approval.
- **Decision:** Five-second per-source scheduling without overlap, fifteen-second native timeout, immediate publication, and cached opening with previews/GitHub enrichment disabled.
- **Why:** Current collection awaits all sources; one stalled source can delay publication. The user accepted the unmodified reopening measurement with enrichment disabled.
- **Consequences:** No five-second end-to-end guarantee. Approved warm median/p95 targets are 200/300 milliseconds; first labelled partial list is within one second. No patched measurement exists.

### D-8: Install silent startup reversibly
- **Status:** settled by user through specification approval.
- **Decision:** User-local silent collector starts at login, independent of clients, with reversible binary/config/identity-hook changes and ccmux's own daemon lifecycle.
- **Why:** Current monitor collection also invokes notification delivery; terminal attachment cannot own detached observation.
- **Consequences:** Preserve unrelated config/status-right, disable both notification paths, and prove rollback. Manual logout/login remains a user action.

### D-9: Agree the revised personal exercise
- **Status:** settled by user through specification approval.
- **Decision:** Retain the user's long-document and switch-away exercise, replacing banner recovery with dashboard shortcut and Enter/recovery, and include closing/reopening the dashboard.
- **Why:** The user supplied the original sequence and reported delay on every reopening.
- **Consequences:** The user approved the presented adaptation and technical Proof plans. Keep the original user quotations distinct from the approved technical setup. Obtain scheduling and availability for human observations when needed; do not fabricate them or perform logout/login for the user.

### D-10: Preserve lineage while staging the replacement
- **Status:** preservation requirement settled by user; collision-free staging is prepared. The new thread organization remains subject to hybrid phase-brief approval.
- **Decision:** Keep Work ID work-20260926-codex-attention; preserve the immutable notification spec and existing observe/pending/mac-delivery attempt before staging the candidate.
- **Why:** Work ID spans attempts; started phases cannot be casually rerendered, and the staged spec path is occupied.
- **Consequences:** The immutable historical notification bundle remains in place. The dashboard uses a nested bundle and separate execution directory under the same Work ID. Separate collection and delivery threads share the retained native checkout so their Runners can run in dependency order. No historical phase, baseline or manifest is replaced. Reference Screen approval is recorded in `reference-review/APPROVAL.md`; rendering precedes the required hybrid phase-brief approval.

### Verified source boundaries

These observations describe existing code, not an implemented dashboard:

- Native checkout `scripts/agent-attention.mjs`: :203 ownership; :407 app-server observation; :664 classification; :677 row metadata; :737 combined collection; :1010 recovery; :1073 reconciliation; :1137 wholesale sourceReports replacement; :1257 notification-coupled cycle; :1409 interval after a complete cycle.
- `scripts/workbench.mjs:6334` attaches main/editor tmux sessions without exact native-pane selection. `infra/orchestrator/codex-app-server-proxy.mjs` is the mandatory passive transport; the full dispatcher controls work and is not the observer.
- ccmux v1.4.2 [server dispatcher](https://github.com/epilande/ccmux/blob/v1.4.2/src/daemon/server.ts#L1357) lacks import; [adapters](https://github.com/epilande/ccmux/blob/v1.4.2/src/daemon/adapters/index.ts) are static; [activation](https://github.com/epilande/ccmux/blob/v1.4.2/src/tui/App.tsx#L351) targets local panes.
- ccmux [marker binding](https://github.com/epilande/ccmux/blob/v1.4.2/src/daemon/binder/links.ts) relates native marker/process/pane; [Codex linking](https://github.com/epilande/ccmux/blob/v1.4.2/src/daemon/adapters/codex/link.ts) also uses directory/time heuristics, which alone are insufficient here.
- ccmux `src/types/session.ts:123` owns the row contract; `src/daemon/sessions.ts:329`, :529 and :941 create/update/remove rows; [session columns](https://github.com/epilande/ccmux/blob/v1.4.2/src/tui/components/session-columns.ts#L165) provide production row primitives.
- Retained unmodified benchmark: 15 warm openings, median 158.5 milliseconds, range 146.9–169.7; five populated runs verified seven Mac Claude/Codex rows. Two stopped-monitor openings reached initial partial lists at 316.9/636.7 milliseconds. Timing measures popup request to terminal bytes, not physical key press to Ghostty paint; it proves neither the patch nor combined Workbench coverage.

## Illustrative interaction path

1. Invoke the shortcut; read cached rows and source coverage.
2. Inspect pending reason/count and wait; input/errors precede replies.
3. Toggle all/pending with f, search with /, and select by keyboard.
4. Enter navigates only after exact existing-pane verification.
5. Failed verification keeps selection and displays exact recovery.
6. c clears selected-row records; CLI clearing retains one-event control.
7. Escape restores invoking-pane focus without clearing records.
8. Reopen from cache while independent collection, retained items and outage labels continue.

## Engineering Quality Contract

### QF-1: Always-on quality obligations
- **Activation:** Every implementation-bound design.
- **Activation evidence:** REQ-1 through REQ-22.
- **Obligation:** Intent fit, maintainable scope, traceable verification, independent review, and repository security baseline.
- **Required proof classes:** contract review, integration
- **Required response:** Keep one native state owner and the existing ccmux daemon/UI, with no provider registry or second dashboard. Independently review each phase and its Failure Proof.
- **Proof:** Declared suites, real-boundary artifacts and independent builder/reviewer/verifier records; orch-spec-check before staging.

### QF-2: Native observation and durable state
- **Activation:** Changed native observation and persistence.
- **Activation evidence:** REQ-2 through REQ-10.
- **Obligation:** Native identity/status, event deduplication, acknowledgement and recovery remain authoritative.
- **Required proof classes:** integration, exercise
- **Required response:** Exercise host and owned Workbench app-server, durable storage, input/approval/failure/completion, clear, restart and reconnect.
- **Proof:** AC-1 through AC-9; native suite plus installed-runtime witnesses.

### QF-3: External ownership and navigation
- **Activation:** Cross-container and tmux-server responsibilities.
- **Activation evidence:** REQ-3, REQ-9, REQ-11, REQ-13, REQ-14, REQ-19, REQ-22.
- **Obligation:** Scope source records, cache import and pane bindings to owned identities without granting agent control.
- **Required proof classes:** security, integration, interaction, contract review, exercise
- **Required response:** Verify collisions across sources, rejected ownership, unavailable Workbench, recycled pane, two clients and remote action eligibility.
- **Proof:** AC-2, AC-8, AC-10, AC-12, AC-13, AC-19, AC-23; scoped Podman/tmux and production-daemon artifacts.

### QF-4: Terminal UI conformance
- **Activation:** Changed user-visible regions and interactions.
- **Activation evidence:** REQ-1, REQ-7, REQ-8, REQ-13 through REQ-18.
- **Obligation:** Separate structural, interaction, keyboard/focus, responsive and reviewed-visual proof.
- **Required proof classes:** structural, interaction, accessibility, responsive, reviewed visual, exercise, failure proof
- **Required response:** Approve Reference Screens and sizes before the UI phase; retain production captures, keyboard evidence, masks, deviations and negative controls.
- **Proof:** AC-6, AC-7, AC-12 through AC-18, AC-22; screenshot comparison and orch-approve-screens. Reference Screens are approved; production comparisons and Screen Approval remain unproven.

### QF-5: Reopening and source isolation
- **Activation:** User-reported repeated opening delay.
- **Activation evidence:** REQ-10, REQ-12.
- **Obligation:** Slow sources cannot block healthy publication or cached opening.
- **Required proof classes:** integration, exercise
- **Required response:** Measure twenty populated openings per source condition, median and nearest-rank p95, first partial list, remote call counts and source timestamps.
- **Proof:** AC-9 and AC-11; timing harness and real-source isolation record. Thresholds are approved targets, not measured results.

### QF-6: Installation and rollback
- **Activation:** User-local runtime and login changes.
- **Activation evidence:** REQ-1, REQ-18, REQ-20, REQ-21.
- **Obligation:** Canonical delivery, silent independent startup, unrelated configuration preservation and reversibility.
- **Required proof classes:** structural, contract review, integration, exercise
- **Required response:** Verify generated assets, installed commands, before/after metadata, user logout/login, and task-owned rollback.
- **Proof:** AC-20 through AC-22; generated checks, installed smoke, login observation and rollback evidence.

## Acceptance Criteria

All criteria are Unproven. The user approved the settings and presented exercise plans. AC-18 remains Unproven: Reference Screens and comparison setup are approved, while production captures, comparison review and Screen Approval are still required. Approval of a reference or plan is not evidence that its exercise passed.

- [ ] AC-1: Detached host native input and approval produce correctly identified pending items.
- [ ] AC-2: Detached owned Workbench native input and approval appear in the host dashboard with correct source/native identity.
- [ ] AC-3: Native failed turns produce error-stop items.
- [ ] AC-4: Completed replies, including prose questions, produce lower-priority Reply ready items.
- [ ] AC-5: Pending events survive collector/daemon restart and repeated observation without duplicates.
- [ ] AC-6: Manual one-event and row clearing persist without changing agent work.
- [ ] AC-7: Native working clears its pending records while opening, seen and navigation preserve them.
- [ ] AC-8: Unavailable or incompatible sources retain last-success evidence and acknowledgement, then recover.
- [ ] AC-9: Independent scheduling publishes healthy updates without waiting for a stall or dropping reports.
- [ ] AC-10: ccmux imports active and retained-pending rows with metadata and source-scoped deduplication.
- [ ] AC-11: Cached openings meet approved latency targets with populated rows and detached/unavailable Workbench.
- [ ] AC-12: Enter selects the verified existing host/Workbench pane for the invoking client.
- [ ] AC-13: Failed or recycled binding retains selection and recovery without starting another agent.
- [ ] AC-14: Rendered structure exposes all required row fields, pending details and source coverage.
- [ ] AC-15: Attention-mode filtering, search, priority and selection work through updates.
- [ ] AC-16: Shortcut and keyboard path target the invoking client and Escape restores focus.
- [ ] AC-17: Required information/actions remain reachable at specified terminal sizes and enlarged text.
- [ ] AC-18: Production captures conform to approved fixed-viewport Reference Screens.
- [ ] AC-19: Collection/import are passive, private and limited to correctly owned sources.
- [ ] AC-20: Silent installed collector starts at login and observes without terminal attachment.
- [ ] AC-21: Canonical install and rollback preserve unrelated configuration and match guidance.
- [ ] AC-22: tmux-status and dashboard item totals match persistent pending transitions.
- [ ] AC-23: Mac baseline behavior remains while remote rows reject unsupported local actions and survive reconciliation.

## Verification

The plans below are not executed evidence. New integration tests and a timing harness are implementation deliverables, not claimed existing passing commands. Run native checks in the dev-autonomy owning checkout and Bun checks in the pinned ccmux owning checkout. Retain metadata/timing/captures in the configured Work scratch directory, without unrestricted transcripts.

### User exercise agreement

Original user exercise: “open codex, give it a 'long' doc, and instruct it to ask question about the doc. Then switch pane, tmux session or window, expect a notification when codex's question is ready, follow the notification content and go back to the correct codex's session with question”. The user delegated document selection and requested about a minute before the question.

Reopening complaint: “Then i see the dashboard, close it, do my work, open it again, i have to wait”. Desired path: “to open a dashboard to see all agent sessions, and check which one need my attentions, no more mac notification”.

The user approved this specification, including D-9 and the presented technical Proof plans. The Given/When/Then fields preserve the user's words as the workflow anchor; technical setup is the approved Proof plan, not a verbatim user quotation. Human observations, including actual logout/login, still require the user to be available and remain unproven until recorded.

### AC-1
- **Failure boundary:** Host app-server to durable records.
- **Required proof classes:** integration, exercise
- **Proof:** Run native suite, then create real host input/approval waits with all clients detached.
- **Expected witness/artifact:** Native flags, source/native/event IDs, durable item and host row.
- **Counterfactual sibling:** A terminal classifier missing detached selectable input.
- **Discriminating signal:** Require native waiting flags and matching persisted identity; screen strings alone fail.
- **Exercise agreement:** Approved with this specification on 2026-09-27; the technical Proof plan supplements the quoted user workflow. Execution and human observation remain unproven.
- **Given:** User: “open codex, give it a long doc, and instruct it to ask question about the doc”; this criterion's approved source/fault/lifecycle setup is stated in Proof.
- **When:** User: “Then switch pane, tmux session or window” and “close it, do my work, open it again”; specific installed actions follow the approved Proof plan.
- **Then:** User: “to open a dashboard to see all agent sessions, and check which one need my attentions”; this boundary's expected witness and return path are the approved criterion and Proof plan.

### AC-2
- **Failure boundary:** Owned container app-server to host state and import.
- **Required proof classes:** integration, exercise
- **Proof:** Produce real Workbench waits with no clients attached and inspect the imported row.
- **Expected witness/artifact:** Owner/container IDs, native flags, durable item and host-rendered remote row.
- **Counterfactual sibling:** A Mac-only picker.
- **Discriminating signal:** A real detached owned-container source/native ID is required, not a Mac substitute.
- **Exercise agreement:** Approved with this specification on 2026-09-27; the technical Proof plan supplements the quoted user workflow. Execution and human observation remain unproven.
- **Given:** User: “open codex, give it a long doc, and instruct it to ask question about the doc”; this criterion's approved source/fault/lifecycle setup is stated in Proof.
- **When:** User: “Then switch pane, tmux session or window” and “close it, do my work, open it again”; specific installed actions follow the approved Proof plan.
- **Then:** User: “to open a dashboard to see all agent sessions, and check which one need my attentions”; this boundary's expected witness and return path are the approved criterion and Proof plan.

### AC-3
- **Failure boundary:** Native failure event to durable reason.
- **Required proof classes:** integration, exercise
- **Proof:** Produce a controlled API failure through real host and Workbench Codex.
- **Expected witness/artifact:** Failed-turn identity and error reason, with no credential or transcript capture.
- **Counterfactual sibling:** A collector classifying every inactive turn as Reply ready.
- **Discriminating signal:** The native failure must have an error reason, not completed-reply classification.
- **Exercise agreement:** Approved with this specification on 2026-09-27; the technical Proof plan supplements the quoted user workflow. Execution and human observation remain unproven.
- **Given:** User: “open codex, give it a long doc, and instruct it to ask question about the doc”; this criterion's approved source/fault/lifecycle setup is stated in Proof.
- **When:** User: “Then switch pane, tmux session or window” and “close it, do my work, open it again”; specific installed actions follow the approved Proof plan.
- **Then:** User: “to open a dashboard to see all agent sessions, and check which one need my attentions”; this boundary's expected witness and return path are the approved criterion and Proof plan.

### AC-4
- **Failure boundary:** Completed-turn observation to pending reason.
- **Required proof classes:** integration, exercise
- **Proof:** Complete a reply and a document question on both source kinds.
- **Expected witness/artifact:** Completed-turn ID, exactly one item per event and priority relative to input/error.
- **Counterfactual sibling:** A question-keyword classifier or input-only monitor.
- **Discriminating signal:** Non-question completion also appears; prose questions remain replies, not native input.
- **Exercise agreement:** Approved with this specification on 2026-09-27; the technical Proof plan supplements the quoted user workflow. Execution and human observation remain unproven.
- **Given:** User: “open codex, give it a long doc, and instruct it to ask question about the doc”; this criterion's approved source/fault/lifecycle setup is stated in Proof.
- **When:** User: “Then switch pane, tmux session or window” and “close it, do my work, open it again”; specific installed actions follow the approved Proof plan.
- **Then:** User: “to open a dashboard to see all agent sessions, and check which one need my attentions”; this boundary's expected witness and return path are the approved criterion and Proof plan.

### AC-5
- **Failure boundary:** Installed durable storage across process restart.
- **Required proof classes:** integration, exercise
- **Proof:** Restart both processes with an unresolved event and observe repeatedly.
- **Expected witness/artifact:** Same event IDs, item count, reasons, first-observed time and private-state permissions.
- **Counterfactual sibling:** An in-memory store or one-item-per-poll generator.
- **Discriminating signal:** Restart cannot lose the item and repeated polls cannot increase its count.
- **Exercise agreement:** Approved with this specification on 2026-09-27; the technical Proof plan supplements the quoted user workflow. Execution and human observation remain unproven.
- **Given:** User: “open codex, give it a long doc, and instruct it to ask question about the doc”; this criterion's approved source/fault/lifecycle setup is stated in Proof.
- **When:** User: “Then switch pane, tmux session or window” and “close it, do my work, open it again”; specific installed actions follow the approved Proof plan.
- **Then:** User: “to open a dashboard to see all agent sessions, and check which one need my attentions”; this boundary's expected witness and return path are the approved criterion and Proof plan.

### AC-6
- **Failure boundary:** CLI/UI clear to durable state and original agent.
- **Required proof classes:** integration, interaction, exercise
- **Proof:** Use agent-attention clear EVENT_ID on an exercise item and c on a multi-item exercise row, then poll and restart.
- **Expected witness/artifact:** Suppressed IDs, unrelated row retained, original prompt still answerable.
- **Counterfactual sibling:** A volatile seen marker or clearing by answering the prompt.
- **Discriminating signal:** Persisted suppression and unchanged live prompt are required together.
- **Exercise agreement:** Approved with this specification on 2026-09-27; the technical Proof plan supplements the quoted user workflow. Execution and human observation remain unproven.
- **Given:** User: “open codex, give it a long doc, and instruct it to ask question about the doc”; this criterion's approved source/fault/lifecycle setup is stated in Proof.
- **When:** User: “Then switch pane, tmux session or window” and “close it, do my work, open it again”; specific installed actions follow the approved Proof plan.
- **Then:** User: “to open a dashboard to see all agent sessions, and check which one need my attentions”; this boundary's expected witness and return path are the approved criterion and Proof plan.
- **Interaction matrix:** Single-event CLI clear; multi-item row clear; unrelated row unchanged; repeat/restart suppression; original prompt still answerable.

### AC-7
- **Failure boundary:** Native reconciliation versus UI acknowledgement.
- **Required proof classes:** integration, interaction, exercise
- **Proof:** View/reopen/navigate a pending row, then actually resume its native work.
- **Expected witness/artifact:** Counts before/after viewing and after native working, scoped by source/native ID.
- **Counterfactual sibling:** Clear-on-Enter or never-clear-on-work.
- **Discriminating signal:** Viewing preserves counts; actual native working clears only the matching identity.
- **Exercise agreement:** Approved with this specification on 2026-09-27; the technical Proof plan supplements the quoted user workflow. Execution and human observation remain unproven.
- **Given:** User: “open codex, give it a long doc, and instruct it to ask question about the doc”; this criterion's approved source/fault/lifecycle setup is stated in Proof.
- **When:** User: “Then switch pane, tmux session or window” and “close it, do my work, open it again”; specific installed actions follow the approved Proof plan.
- **Then:** User: “to open a dashboard to see all agent sessions, and check which one need my attentions”; this boundary's expected witness and return path are the approved criterion and Proof plan.
- **Interaction matrix:** Open/reopen/seen/Enter retain counts; native working clears matching source/native ID only.

### AC-8
- **Failure boundary:** Real process/connection/protocol loss and reconnect.
- **Required proof classes:** integration, exercise
- **Proof:** Interrupt a source/process, reject an unsupported protocol and restore the recoverable source.
- **Expected witness/artifact:** Unavailable/Not yet checked labels, age, retained rows/items, cleared IDs and fresh timestamp.
- **Counterfactual sibling:** Drop-on-error, stale Working shown as current, or terminal fallback.
- **Discriminating signal:** Lost observation stays visibly unavailable; acknowledgement survives recovery and incompatibility is diagnosed.
- **Exercise agreement:** Approved with this specification on 2026-09-27; the technical Proof plan supplements the quoted user workflow. Execution and human observation remain unproven.
- **Given:** User: “open codex, give it a long doc, and instruct it to ask question about the doc”; this criterion's approved source/fault/lifecycle setup is stated in Proof.
- **When:** User: “Then switch pane, tmux session or window” and “close it, do my work, open it again”; specific installed actions follow the approved Proof plan.
- **Then:** User: “to open a dashboard to see all agent sessions, and check which one need my attentions”; this boundary's expected witness and return path are the approved criterion and Proof plan.

### AC-9
- **Failure boundary:** Source scheduler and atomic per-source publication.
- **Required proof classes:** integration, exercise
- **Proof:** Stall one real source beyond timeout while another changes; record attempts/results.
- **Expected witness/artifact:** Source starts/results/timeouts, no overlap, healthy update before stalled resolution and complete report set.
- **Counterfactual sibling:** Combined await-all publication or wholesale report replacement.
- **Discriminating signal:** Healthy results publish first; other reports remain; no source has overlapping requests.
- **Exercise agreement:** Approved with this specification on 2026-09-27; the technical Proof plan supplements the quoted user workflow. Execution and human observation remain unproven.
- **Given:** User: “open codex, give it a long doc, and instruct it to ask question about the doc”; this criterion's approved source/fault/lifecycle setup is stated in Proof.
- **When:** User: “Then switch pane, tmux session or window” and “close it, do my work, open it again”; specific installed actions follow the approved Proof plan.
- **Then:** User: “to open a dashboard to see all agent sessions, and check which one need my attentions”; this boundary's expected witness and return path are the approved criterion and Proof plan.

### AC-10
- **Failure boundary:** Private cache to daemon Session state/event stream.
- **Required proof classes:** integration, exercise
- **Proof:** Run production collector/daemon with host and remote rows; exercise equal native IDs in two source fixtures.
- **Expected witness/artifact:** GET /sessions and update stream, non-pending metadata, one host row and distinct remote identities.
- **Counterfactual sibling:** Pending-only import, duplicate host row or native-ID-only remote keys.
- **Discriminating signal:** Require a non-pending remote row, merged host identity and distinct equal-ID source fixture rows.
- **Exercise agreement:** Approved with this specification on 2026-09-27; the technical Proof plan supplements the quoted user workflow. Execution and human observation remain unproven.
- **Given:** User: “open codex, give it a long doc, and instruct it to ask question about the doc”; this criterion's approved source/fault/lifecycle setup is stated in Proof.
- **When:** User: “Then switch pane, tmux session or window” and “close it, do my work, open it again”; specific installed actions follow the approved Proof plan.
- **Then:** User: “to open a dashboard to see all agent sessions, and check which one need my attentions”; this boundary's expected witness and return path are the approved criterion and Proof plan.

### AC-11
- **Failure boundary:** Popup request to initial terminal list bytes.
- **Required proof classes:** integration, exercise
- **Proof:** Measure twenty warm openings per source condition and a stopped-daemon opening; trace Workbench calls.
- **Expected witness/artifact:** Raw milliseconds, population, median, nearest-rank p95, partial label, first-list time and zero opening-triggered remote calls.
- **Counterfactual sibling:** Fast empty paint followed by blocking remote discovery.
- **Discriminating signal:** Stop timing only on populated list bytes and reject opening-triggered calls; record human Ghostty responsiveness separately.
- **Exercise agreement:** Approved with this specification on 2026-09-27; the technical Proof plan supplements the quoted user workflow. Execution and human observation remain unproven.
- **Given:** User: “open codex, give it a long doc, and instruct it to ask question about the doc”; this criterion's approved source/fault/lifecycle setup is stated in Proof.
- **When:** User: “Then switch pane, tmux session or window” and “close it, do my work, open it again”; specific installed actions follow the approved Proof plan.
- **Then:** User: “to open a dashboard to see all agent sessions, and check which one need my attentions”; this boundary's expected witness and return path are the approved criterion and Proof plan.

### AC-12
- **Failure boundary:** UI activation across clients and tmux servers.
- **Required proof classes:** integration, interaction, exercise
- **Proof:** Activate competing same-directory host and remote conversations with two Mac clients.
- **Expected witness/artifact:** Before/after client targets, native markers, live owner/server/pane IDs and original question.
- **Counterfactual sibling:** Directory/time matching or switching the wrong client.
- **Discriminating signal:** Require exact native identity and unchanged other-client target in the existing conversation.
- **Exercise agreement:** Approved with this specification on 2026-09-27; the technical Proof plan supplements the quoted user workflow. Execution and human observation remain unproven.
- **Given:** User: “open codex, give it a long doc, and instruct it to ask question about the doc”; this criterion's approved source/fault/lifecycle setup is stated in Proof.
- **When:** User: “Then switch pane, tmux session or window” and “close it, do my work, open it again”; specific installed actions follow the approved Proof plan.
- **Then:** User: “to open a dashboard to see all agent sessions, and check which one need my attentions”; this boundary's expected witness and return path are the approved criterion and Proof plan.
- **Interaction matrix:** Verified host and remote activation; same-directory competitors; two clients; revalidation of live identity.

### AC-13
- **Failure boundary:** Activation refusal to rendered recovery/process boundary.
- **Required proof classes:** integration, interaction, exercise
- **Proof:** Recycle a pane ID, remove identity evidence and make a source unavailable; activate each.
- **Expected witness/artifact:** Selected row, exact source/directory/native-ID steps, unchanged processes and no injected input.
- **Counterfactual sibling:** Blind pane-number navigation or automatic resume.
- **Discriminating signal:** Verification fails before any switch; no new process or command is allowed.
- **Exercise agreement:** Approved with this specification on 2026-09-27; the technical Proof plan supplements the quoted user workflow. Execution and human observation remain unproven.
- **Given:** User: “open codex, give it a long doc, and instruct it to ask question about the doc”; this criterion's approved source/fault/lifecycle setup is stated in Proof.
- **When:** User: “Then switch pane, tmux session or window” and “close it, do my work, open it again”; specific installed actions follow the approved Proof plan.
- **Then:** User: “to open a dashboard to see all agent sessions, and check which one need my attentions”; this boundary's expected witness and return path are the approved criterion and Proof plan.
- **Interaction matrix:** Missing marker, recycled pane and unavailable source; retained selection/recovery; cancel/Escape; no new process/input.

### AC-14
- **Failure boundary:** Production terminal regions and row primitives.
- **Required proof classes:** structural, exercise, failure proof
- **Proof:** Inspect realistic Mac/Workbench multi-item renders at reviewed sizes.
- **Expected witness/artifact:** Annotated production capture showing required regions and reachable details.
- **Counterfactual sibling:** Stock status rows without location, count or coverage age.
- **Discriminating signal:** Each mandatory field/region must be located or reachable in production.
- **Exercise agreement:** Approved with this specification on 2026-09-27; the technical Proof plan supplements the quoted user workflow. Execution and human observation remain unproven.
- **Given:** User: “open codex, give it a long doc, and instruct it to ask question about the doc”; this criterion's approved source/fault/lifecycle setup is stated in Proof.
- **When:** User: “Then switch pane, tmux session or window” and “close it, do my work, open it again”; specific installed actions follow the approved Proof plan.
- **Then:** User: “to open a dashboard to see all agent sessions, and check which one need my attentions”; this boundary's expected witness and return path are the approved criterion and Proof plan.
- **Contract witnesses:** Ghostty with the preserved tmux popup/client boundary; ccmux production App and session-columns; source coverage region; row project/agent/location/state/reason/count/wait; pending-detail native identity and recovery regions.
- **Negative control:** Remove source coverage or multi-item details from a comparison render; structural review must fail AC-14 even if Enter works.

### AC-15
- **Failure boundary:** Keyboard input to real list state/daemon updates.
- **Required proof classes:** interaction, exercise
- **Proof:** Use f, /, arrows/jk with input/error/reply/non-pending rows and changing projects.
- **Expected witness/artifact:** Action ledger, rows, order and selected source/native identity after insert/reorder.
- **Counterfactual sibling:** Static rows, hide-idle f, or selection by shifting index.
- **Discriminating signal:** Observe each transition and stable identity; a screenshot alone fails.
- **Exercise agreement:** Approved with this specification on 2026-09-27; the technical Proof plan supplements the quoted user workflow. Execution and human observation remain unproven.
- **Given:** User: “open codex, give it a long doc, and instruct it to ask question about the doc”; this criterion's approved source/fault/lifecycle setup is stated in Proof.
- **When:** User: “Then switch pane, tmux session or window” and “close it, do my work, open it again”; specific installed actions follow the approved Proof plan.
- **Then:** User: “to open a dashboard to see all agent sessions, and check which one need my attentions”; this boundary's expected witness and return path are the approved criterion and Proof plan.
- **Interaction matrix:** All/pending/all; search enter/edit/cancel; arrows/jk; priority and wait ordering; insert/update/reorder retains selected source/native ID; separate reasons accessible.

### AC-16
- **Failure boundary:** Binding, popup focus and original pane.
- **Required proof classes:** accessibility, interaction, exercise
- **Proof:** Use prefix-g, search/filter/details/clear/navigation/cancel/Escape without mouse, with two clients.
- **Expected witness/artifact:** Binding metadata, visible focus/selection and restored invoking-pane focus.
- **Counterfactual sibling:** Mouse-only actions or active-client targeting.
- **Discriminating signal:** Other client remains unchanged and keyboard input returns to the original pane.
- **Exercise agreement:** Approved with this specification on 2026-09-27; the technical Proof plan supplements the quoted user workflow. Execution and human observation remain unproven.
- **Given:** User: “open codex, give it a long doc, and instruct it to ask question about the doc”; this criterion's approved source/fault/lifecycle setup is stated in Proof.
- **When:** User: “Then switch pane, tmux session or window” and “close it, do my work, open it again”; specific installed actions follow the approved Proof plan.
- **Then:** User: “to open a dashboard to see all agent sessions, and check which one need my attentions”; this boundary's expected witness and return path are the approved criterion and Proof plan.
- **Interaction matrix:** Shortcut to popup; keyboard search/filter/select/details/clear; recovery cancel; Escape to original pane; other client unchanged.
- **Keyboard/focus proof:** Keyboard-only path with visible selection/search focus and restoration to invoking pane/client.

### AC-17
- **Failure boundary:** Clipping, wrapping, scrolling and keyboard detail access.
- **Required proof classes:** responsive, accessibility, exercise
- **Proof:** Review 120x40 and 80x24 cells with long names/multiple reasons, at Ghostty 100%/150% text size.
- **Expected witness/artifact:** Actual cell/pixel dimensions, captures and keyboard reachability records.
- **Counterfactual sibling:** Fixed-wide layout hiding coverage or actions.
- **Discriminating signal:** All fields stay reachable and actions work at every reviewed condition.
- **Exercise agreement:** Approved with this specification on 2026-09-27; the technical Proof plan supplements the quoted user workflow. Execution and human observation remain unproven.
- **Given:** User: “open codex, give it a long doc, and instruct it to ask question about the doc”; this criterion's approved source/fault/lifecycle setup is stated in Proof.
- **When:** User: “Then switch pane, tmux session or window” and “close it, do my work, open it again”; specific installed actions follow the approved Proof plan.
- **Then:** User: “to open a dashboard to see all agent sessions, and check which one need my attentions”; this boundary's expected witness and return path are the approved criterion and Proof plan.
- **Viewports/zoom:** Specified 120x40 and 80x24 cell windows, Ghostty 100%/150% text size; record actual cell/pixel dimensions after scaling; approved PNG dimensions are recorded under AC-18; actual Ghostty dimensions and production comparison remain unproven.
- **Keyboard/focus proof:** Reach overflow/details/actions without mouse; selected identity/focus stays visible after resizing/scrolling.

### AC-18
- **Failure boundary:** Reviewed visual comparison and user Screen Approval.
- **Required proof classes:** reviewed visual, failure proof
- **Proof:** Compare each fixed-size production PNG against its corresponding user-approved Reference Screen and record every mandatory-region difference. Run `node reference-review/source/compare-reference-screens.mjs "$CCMUX_EXECUTION_CHECKOUT" reference-review/screen-inventory.json SCREEN SIZE "$PRODUCTION_PNG" "$DIFFERENCE_PNG"` from this staged dashboard bundle, using the logical screen and size from the inventory. The approved helper validates dimensions/masks, uses pixelmatch threshold 0.1, ignores antialias-only differences, and rejects every remaining unmasked difference. Review the difference PNG, then run `orch-approve-screens "$AGENT_SCRATCH_DIR/dev-autonomy/work-20260926-codex-attention/attempts/dashboard" ccmux dashboard-ui`; AGENT_SCRATCH_DIR must resolve to the configured scratch root. Approval does not perform the missing comparison.
- **Expected witness/artifact:** Approved PNGs, production captures, dimensions, deviations and current Screen Approval.
- **Counterfactual sibling:** Generic picker whose interactions work.
- **Discriminating signal:** Visual region fidelity must match the approved baseline independently of functionality.
- **Fixed viewport:** Wide list/recovery: 960x600 pixels at 100% and 1440x900 at 150%, mapping 120x40 client cells to a 96x30 popup. Compact list/recovery: 640x360 at 100% and 960x540 at 150%, mapping 80x24 client cells to a 64x18 popup. Artwork uses approved 10x20 and 15x30 pixel cell pitches; record actual Ghostty dimensions and report any mismatch.
- **Baseline owner:** User; approval text "approve all screens" on Vizquiry Revision 54bcc150, recorded in `reference-review/reference-screen-approval.json`.
- **Approval state:** Eight Reference Screens, sizes, masks and comparison setup approved. Production comparison and Screen Approval remain unproven; no deviations are approved.
- **Screenshot artifact:** Eight staged PNGs, exact dimensions and SHA-256 digests are indexed in `reference-review/screen-inventory.json`. The UI contract registers each fixed-size PNG separately. Production captures go to the dashboard Work scratch directory.
- **Masking rule:** Approved policy masks native IDs, project-identifying text and changing wait values only; keep location, reason, coverage, count and focus visible. Exact rectangles are retained in `reference-review/screen-inventory.json`; source observation ages and coverage remain unmasked.
- **Allowed deviations:** None approved.
- **Negative-control disposition:** Required under AC-18: coverage-region deletion must fail comparison review.
- **Negative control:** Alter coverage in a comparison-only copy; never update approved baselines.

### AC-19
- **Failure boundary:** Ownership verification and state exposure.
- **Required proof classes:** security, integration, exercise
- **Proof:** Reject a mismatched-label fixture and inspect production permissions/operation allowlist without secrets.
- **Expected witness/artifact:** Refusal metadata, owned-source success, private modes and allowed-operation review.
- **Counterfactual sibling:** Trusting container names or adding host control access.
- **Discriminating signal:** Reject before access; never answer/approve/interrupt or add control sockets/ports.
- **Exercise agreement:** Approved with this specification on 2026-09-27; the technical Proof plan supplements the quoted user workflow. Execution and human observation remain unproven.
- **Given:** User: “open codex, give it a long doc, and instruct it to ask question about the doc”; this criterion's approved source/fault/lifecycle setup is stated in Proof.
- **When:** User: “Then switch pane, tmux session or window” and “close it, do my work, open it again”; specific installed actions follow the approved Proof plan.
- **Then:** User: “to open a dashboard to see all agent sessions, and check which one need my attentions”; this boundary's expected witness and return path are the approved criterion and Proof plan.

### AC-20
- **Failure boundary:** User login LaunchAgent and installed lifetime.
- **Required proof classes:** integration, exercise
- **Proof:** User logs out/in; inspect service before manual start, detach/close Ghostty, then reopen after an event.
- **Expected witness/artifact:** Login/process timestamps, retained event, unchanged tmux identity and both disabled delivery paths.
- **Counterfactual sibling:** Popup-started monitor or notification-coupled collection.
- **Discriminating signal:** Service already runs before opening; event exists with terminal closed; both notification paths are disabled.
- **Exercise agreement:** Approved with this specification on 2026-09-27; the technical Proof plan supplements the quoted user workflow. Execution and human observation remain unproven.
- **Given:** User: “open codex, give it a long doc, and instruct it to ask question about the doc”; this criterion's approved source/fault/lifecycle setup is stated in Proof.
- **When:** User: “Then switch pane, tmux session or window” and “close it, do my work, open it again”; specific installed actions follow the approved Proof plan.
- **Then:** User: “to open a dashboard to see all agent sessions, and check which one need my attentions”; this boundary's expected witness and return path are the approved criterion and Proof plan.

### AC-21
- **Failure boundary:** Generated ownership and installed config/binary/hooks.
- **Required proof classes:** structural, contract review, integration, exercise
- **Proof:** Run generated checks, exercise approved installed components/documented commands, and perform scoped rollback.
- **Expected witness/artifact:** Checks, versions/pin, before/after metadata, guide evidence and rollback result.
- **Counterfactual sibling:** Edited generated wrappers, config overwrite or irreversible hooks.
- **Discriminating signal:** Generator detects drift; unrelated settings survive; task-owned changes restore correctly.
- **Exercise agreement:** Approved with this specification on 2026-09-27; the technical Proof plan supplements the quoted user workflow. Execution and human observation remain unproven.
- **Given:** User: “open codex, give it a long doc, and instruct it to ask question about the doc”; this criterion's approved source/fault/lifecycle setup is stated in Proof.
- **When:** User: “Then switch pane, tmux session or window” and “close it, do my work, open it again”; specific installed actions follow the approved Proof plan.
- **Then:** User: “to open a dashboard to see all agent sessions, and check which one need my attentions”; this boundary's expected witness and return path are the approved criterion and Proof plan.
- **Contract witnesses:** Canonical command registration, generated wrappers, silent login definition, installer ownership, upstream pin and operator guide.

### AC-22
- **Failure boundary:** Durable list to terminal count.
- **Required proof classes:** integration, exercise
- **Proof:** Compare agent-attention list, agent-attention tmux-status and dashboard after event/clear/work/outage.
- **Expected witness/artifact:** Counts with event/source/native IDs; unchanged status-right.
- **Counterfactual sibling:** Counting waiting rows or unavailable sources as zero.
- **Discriminating signal:** A two-item row distinguishes event and row counts; unavailable items remain counted.
- **Exercise agreement:** Approved with this specification on 2026-09-27; the technical Proof plan supplements the quoted user workflow. Execution and human observation remain unproven.
- **Given:** User: “open codex, give it a long doc, and instruct it to ask question about the doc”; this criterion's approved source/fault/lifecycle setup is stated in Proof.
- **When:** User: “Then switch pane, tmux session or window” and “close it, do my work, open it again”; specific installed actions follow the approved Proof plan.
- **Then:** User: “to open a dashboard to see all agent sessions, and check which one need my attentions”; this boundary's expected witness and return path are the approved criterion and Proof plan.

### AC-23
- **Failure boundary:** Adapter reconciliation and action eligibility.
- **Required proof classes:** integration, contract review, exercise
- **Proof:** Run pinned provider fixtures/fork suite; retain real remote row through local scans and try forbidden actions.
- **Expected witness/artifact:** Fixture results, retained row, rejection/disabled actions and unchanged Mac targets.
- **Counterfactual sibling:** Remote pane as Mac pane or local cleanup deleting imported rows.
- **Discriminating signal:** No unsupported action reaches Mac operations; remote rows persist and update.
- **Exercise agreement:** Approved with this specification on 2026-09-27; the technical Proof plan supplements the quoted user workflow. Execution and human observation remain unproven.
- **Given:** User: “open codex, give it a long doc, and instruct it to ask question about the doc”; this criterion's approved source/fault/lifecycle setup is stated in Proof.
- **When:** User: “Then switch pane, tmux session or window” and “close it, do my work, open it again”; specific installed actions follow the approved Proof plan.
- **Then:** User: “to open a dashboard to see all agent sessions, and check which one need my attentions”; this boundary's expected witness and return path are the approved criterion and Proof plan.

## Completion Gate

- **Initial handoff:** Ready for implementation.

## Out of Scope

- Mac notification delivery/settings, by explicit user instruction.
- Workbench providers other than Codex, by settled scope.
- Replacing tmux or other terminal-specific integration, by inherited constraints.
- Repeated reminders, by inherited scope.
- Automatic start/resume on verification failure, by settled recovery choice.
- Publication, commit and push, without user authorization.

Archived-history enumeration is excluded under approved D-6. Scheduling is not a five-second end-to-end guarantee.

## Phase proof boundaries

- **Standing:** Proposed execution organization for hybrid phase-brief review; product requirements and the complete Acceptance Criteria checklist remain unchanged.
- **Collection:** AC-2, AC-5, AC-6 and AC-7 first prove their native observation, persistence, suppression and working-state behavior. Their phase acceptance rows explicitly name that native portion. They do not require the unfinished ccmux daemon or UI, and they do not establish the complete product criterion.
- **Import and UI:** Import follows the reviewed collector contract. UI then proves the original full AC-2 and AC-5, including host dashboard presentation and daemon restart, as well as the original full AC-6 and AC-7 keyboard/reopening/navigation checks. All downstream evidence remains mandatory.
- **Execution order:** Collection to thread-complete, ccmux import and UI to thread-complete, then delivery. Do not run shared native checkouts concurrently.

## Phase plan data

The approved source specification retains its original Orchestrator Contract unchanged. This staged execution specification uses the supported authored-brief path for a correction before hybrid approval: the renderer refuses a second contract render with `phases-already-rendered` and refuses authored refresh while the active contract fence exists with `authored-contract-present`. The four existing phase rows remain planned; `authored-phases.tsv` indexes their builder and independent review briefs. The JSON below records the proposed phase plan for review and is not compiler input. Product requirements and full Acceptance Criteria are unchanged.

This is the approved design's hybrid phase split. Rendered phase briefs still require review before workers start; never render over started phases. Each thread owns its repository. The ccmux thread requires a separate upstream-derived checkout, pin, Bun toolchain and Setup Checks; the concrete checkout location and pin/upgrade procedure must be recorded during preparation; scoped build/install work follows phase approval. The two automated checks dispatch by the exact owning package name: dev-autonomy runs its native suite/generated validators, ccmux runs bun test/typecheck, and any unknown package fails with exit 64. Neither command executes another repository's suite. Their shell syntax is checked; the future implementation suites are not run or claimed passing here.

The staged-path citations below name the collision-free dashboard bundle. The collection and delivery thread split is proposed execution organization for the required hybrid review; the four phase responsibilities and product behavior are preserved. UI referenceScreens registers all eight approved fixed-size PNGs; `reference-review/APPROVAL.md` links the actual Vizquiry submission. Reference approval does not replace production comparison or Screen Approval. The JSON validator does not enforce that prose obligation.

```json
{
  "schemaVersion": 1,
  "specificationId": "work-20260926-codex-attention",
  "purpose": {
    "problem": "When you return after being away, you cannot reliably tell which Runtime Sessions need your attention.",
    "desiredOutcome": "You want to see the state of all Runtime Sessions, identify those needing your input, and return to their conversations so work can continue."
  },
  "automatedChecks": [
    {
      "shellCommand": "case \"$(node -p 'require(\"./package.json\").name')\" in dev-autonomy) node --test tests/agent-attention.test.mjs tests/agent-attention.integration.test.mjs ;; ccmux) bun test ;; *) exit 64 ;; esac"
    },
    {
      "shellCommand": "case \"$(node -p 'require(\"./package.json\").name')\" in dev-autonomy) node scripts/generate-runtime-assets.js --check && node scripts/ci/validate-runtime-assets.js ;; ccmux) bun run typecheck ;; *) exit 64 ;; esac"
    }
  ],
  "phases": [
    {
      "thread": "dev-autonomy-collection",
      "phase": "dashboard-collection",
      "title": "Publish native state and pending items silently",
      "scope": "AC-1 through AC-9 and AC-19; native state/metadata, independent source publication and persistence; no ccmux UI or install acceptance.",
      "implementationContext": [
        {
          "source": "specs/doing/work-20260926-codex-attention/dashboard/spec.md#d-3-keep-native-codex-records-authoritative",
          "standing": "accepted",
          "guidance": "scripts/agent-attention.mjs owns observation and records; describeRuntimeSession lacks project metadata and reconcileAttentionState replaces sourceReports."
        },
        {
          "source": "specs/doing/work-20260926-codex-attention/dashboard/spec.md#d-7-publish-independently-and-open-from-cache",
          "standing": "accepted",
          "guidance": "Merge per-source reports; no overlap; healthy sources must publish independently."
        },
        {
          "source": "specs/doing/work-20260926-codex-attention/dashboard/spec.md#constraints",
          "standing": "accepted",
          "guidance": "Preserve app-server-proxy transport and existing passive ownership checks."
        },
        {
          "source": "specs/doing/work-20260926-codex-attention/dashboard/spec.md#phase-proof-boundaries",
          "standing": "proposed",
          "guidance": "Review the native portion of AC-2/AC-5/AC-6/AC-7 before ccmux builds. Do not require the unfinished UI in this phase or mark the whole product criterion proven from native-only evidence."
        }
      ],
      "deliverables": [
        "scripts/agent-attention.mjs: silent collection, metadata, scheduling and persistence; native integration and AC-1 through AC-9 prove behavior.",
        "tests/agent-attention.test.mjs and tests/agent-attention.integration.test.mjs: failure-observing native/storage tests plus real-runtime witnesses.",
        "docs/agent-attention.md: source coverage and clear behavior checked against installed commands."
      ],
      "readingList": [
        {
          "documentPath": "specs/doing/work-20260926-codex-attention/dashboard/spec.md",
          "settles": "AC-1 through AC-9 and AC-19; native state/metadata, independent source publication and persistence; no ccmux UI or install acceptance."
        }
      ],
      "decisionsTaken": [
        {
          "decision": "Reuse native status and durable records.",
          "why": "They are the required state owner; terminal inference cannot substitute."
        }
      ],
      "docTruthDocuments": [
        "docs/agent-attention.md"
      ],
      "acceptanceCriteria": [
        {
          "acceptanceCriterionId": "AC-1",
          "input": "Run native suite, then create real host input/approval waits with all clients detached.",
          "expected": "Detached host native input and approval produce correctly identified pending items.",
          "expectedValueSource": {
            "kind": "author",
            "probe": "specs/doing/work-20260926-codex-attention/dashboard/spec.md#ac-1: Require native waiting flags and matching persisted identity; screen strings alone fail."
          }
        },
        {
          "acceptanceCriterionId": "AC-2",
          "input": "Produce real detached owned Workbench waits and inspect the native collector output; retain exact source/native identity.",
          "expected": "Native collector output contains the detached owned Workbench input and approval items with correct source/native identity. Host dashboard presentation remains required in dashboard-ui.",
          "expectedValueSource": {
            "kind": "author",
            "probe": "specs/doing/work-20260926-codex-attention/dashboard/spec.md#phase-proof-boundaries: Prove the native portion here; the complete product criterion remains unproven until its downstream UI evidence passes."
          }
        },
        {
          "acceptanceCriterionId": "AC-3",
          "input": "Produce a controlled API failure through real host and Workbench Codex.",
          "expected": "Native failed turns produce error-stop items.",
          "expectedValueSource": {
            "kind": "author",
            "probe": "specs/doing/work-20260926-codex-attention/dashboard/spec.md#ac-3: The native failure must have an error reason, not completed-reply classification."
          }
        },
        {
          "acceptanceCriterionId": "AC-4",
          "input": "Complete a reply and a document question on both source kinds.",
          "expected": "Completed replies, including prose questions, produce lower-priority Reply ready items.",
          "expectedValueSource": {
            "kind": "author",
            "probe": "specs/doing/work-20260926-codex-attention/dashboard/spec.md#ac-4: Non-question completion also appears; prose questions remain replies, not native input."
          }
        },
        {
          "acceptanceCriterionId": "AC-5",
          "input": "Restart the native collector with an unresolved event and observe repeatedly; retain records for the later daemon-restart exercise.",
          "expected": "Native pending events survive collector restart and repeated observation without duplicates. The complete collector/daemon restart criterion remains required in dashboard-ui.",
          "expectedValueSource": {
            "kind": "author",
            "probe": "specs/doing/work-20260926-codex-attention/dashboard/spec.md#phase-proof-boundaries: Prove the native portion here; the complete product criterion remains unproven until its downstream UI evidence passes."
          }
        },
        {
          "acceptanceCriterionId": "AC-6",
          "input": "Use agent-attention clear EVENT_ID on an exercise item and test native row-record clearing, then poll and restart; leave the live agent prompt unchanged.",
          "expected": "Native one-event and row-record suppression persist without changing agent work. The c keyboard path remains required in dashboard-ui.",
          "expectedValueSource": {
            "kind": "author",
            "probe": "specs/doing/work-20260926-codex-attention/dashboard/spec.md#phase-proof-boundaries: Prove the native portion here; the complete product criterion remains unproven until its downstream UI evidence passes."
          }
        },
        {
          "acceptanceCriterionId": "AC-7",
          "input": "Read the published native state repeatedly without resuming work, then actually resume the matching native Runtime Session.",
          "expected": "Native state reads preserve pending records; observed native working clears only the matching identity. Dashboard reopening and navigation remain required in dashboard-ui.",
          "expectedValueSource": {
            "kind": "author",
            "probe": "specs/doing/work-20260926-codex-attention/dashboard/spec.md#phase-proof-boundaries: Prove the native portion here; the complete product criterion remains unproven until its downstream UI evidence passes."
          }
        },
        {
          "acceptanceCriterionId": "AC-8",
          "input": "Interrupt a source/process, reject an unsupported protocol and restore the recoverable source.",
          "expected": "Unavailable or incompatible sources retain last-success evidence and acknowledgement, then recover.",
          "expectedValueSource": {
            "kind": "author",
            "probe": "specs/doing/work-20260926-codex-attention/dashboard/spec.md#ac-8: Lost observation stays visibly unavailable; acknowledgement survives recovery and incompatibility is diagnosed."
          }
        },
        {
          "acceptanceCriterionId": "AC-9",
          "input": "Stall one real source beyond timeout while another changes; record attempts/results.",
          "expected": "Independent scheduling publishes healthy updates without waiting for a stall or dropping reports.",
          "expectedValueSource": {
            "kind": "author",
            "probe": "specs/doing/work-20260926-codex-attention/dashboard/spec.md#ac-9: Healthy results publish first; other reports remain; no source has overlapping requests."
          }
        },
        {
          "acceptanceCriterionId": "AC-19",
          "input": "Reject a mismatched-label fixture and inspect production permissions/operation allowlist without secrets.",
          "expected": "Collection/import are passive, private and limited to correctly owned sources.",
          "expectedValueSource": {
            "kind": "author",
            "probe": "specs/doing/work-20260926-codex-attention/dashboard/spec.md#ac-19: Reject before access; never answer/approve/interrupt or add control sockets/ports."
          }
        }
      ]
    },
    {
      "thread": "ccmux",
      "phase": "dashboard-import",
      "title": "Import source-scoped Codex rows into the daemon",
      "scope": "AC-10 and AC-23; private cache, event propagation, host deduplication, imported lifecycle and action eligibility; no UI layout or install.",
      "implementationContext": [
        {
          "source": "specs/doing/work-20260926-codex-attention/dashboard/spec.md#d-1-use-the-maintained-ccmux-fork",
          "standing": "accepted",
          "guidance": "Pin v1.4.2; src/daemon/server.ts has no import and src/daemon/adapters/index.ts is static."
        },
        {
          "source": "specs/doing/work-20260926-codex-attention/dashboard/spec.md#d-3-keep-native-codex-records-authoritative",
          "standing": "accepted",
          "guidance": "src/types/session.ts and src/daemon/sessions.ts own rows; protect remote import from local process removal."
        },
        {
          "source": "specs/doing/work-20260926-codex-attention/dashboard/spec.md#d-2-combine-mac-support-and-workbench-codex",
          "standing": "accepted",
          "guidance": "Keep baseline Mac providers; only Workbench Codex receives native import."
        }
      ],
      "deliverables": [
        "src/daemon/server.ts and src/daemon/sessions.ts: import lifecycle/event updates; real daemon integration proves AC-10/AC-23.",
        "src/types/session.ts: explicit source/identity/coverage contract; typecheck and collision tests.",
        "src/daemon/adapters/codex: native-ID host deduplication; production host/import witness.",
        "ccmux tests in existing test layout: source collisions and action rejection; bun test plus live witnesses."
      ],
      "readingList": [
        {
          "documentPath": "specs/doing/work-20260926-codex-attention/dashboard/spec.md",
          "settles": "AC-10 and AC-23; private cache, event propagation, host deduplication, imported lifecycle and action eligibility; no UI layout or install."
        }
      ],
      "decisionsTaken": [
        {
          "decision": "Import through existing daemon events.",
          "why": "A local process scan cannot enumerate remote native agents."
        }
      ],
      "docTruthDocuments": [
        "README.md"
      ],
      "acceptanceCriteria": [
        {
          "acceptanceCriterionId": "AC-10",
          "input": "Run production collector/daemon with host and remote rows; exercise equal native IDs in two source fixtures.",
          "expected": "ccmux imports active and retained-pending rows with metadata and source-scoped deduplication.",
          "expectedValueSource": {
            "kind": "author",
            "probe": "specs/doing/work-20260926-codex-attention/dashboard/spec.md#ac-10: Require a non-pending remote row, merged host identity and distinct equal-ID source fixture rows."
          }
        },
        {
          "acceptanceCriterionId": "AC-23",
          "input": "Run pinned provider fixtures/fork suite; retain real remote row through local scans and try forbidden actions.",
          "expected": "Mac baseline behavior remains while remote rows reject unsupported local actions and survive reconciliation.",
          "expectedValueSource": {
            "kind": "author",
            "probe": "specs/doing/work-20260926-codex-attention/dashboard/spec.md#ac-23: No unsupported action reaches Mac operations; remote rows persist and update."
          }
        }
      ]
    },
    {
      "thread": "ccmux",
      "phase": "dashboard-ui",
      "title": "Open cached attention and return to the verified conversation",
      "scope": "AC-11 through AC-18 plus end-to-end AC-2/AC-5/AC-6/AC-7/AC-22; implement the approved Reference Screens and retain real-boundary interaction, timing and visual proof.",
      "implementationContext": [
        {
          "source": "specs/doing/work-20260926-codex-attention/dashboard/spec.md#d-4-verify-enter-navigation-and-retain-fallback",
          "standing": "accepted",
          "guidance": "src/tui/App.tsx activation is local; verify marker/process/source/server before host or remote switch."
        },
        {
          "source": "specs/doing/work-20260926-codex-attention/dashboard/spec.md#d-5-define-popup-and-controls",
          "standing": "accepted",
          "guidance": "Attention-mode f/c behavior; / and arrows/jk; restore invoking-client focus."
        },
        {
          "source": "specs/doing/work-20260926-codex-attention/dashboard/spec.md#d-6-present-attention-and-coverage",
          "standing": "accepted",
          "guidance": "Reuse src/tui/components/session-columns.ts; mandatory source/reason/count/age regions follow the approved references, including compact keyboard details and recovery."
        },
        {
          "source": "specs/doing/work-20260926-codex-attention/dashboard/spec.md#ac-18",
          "standing": "accepted",
          "guidance": "Match all eight staged Reference Screens. Use the staged inventory and comparison helper; require production capture review, coverage-deletion negative control and orch-approve-screens. Reference approval is not production Screen Approval."
        },
        {
          "source": "specs/doing/work-20260926-codex-attention/dashboard/spec.md#phase-proof-boundaries",
          "standing": "proposed",
          "guidance": "Complete the original end-to-end AC-2 and AC-5, alongside the existing full AC-6/AC-7 checks, using the reviewed collector and imported UI. Native-only earlier evidence does not substitute for dashboard or daemon behavior."
        }
      ],
      "deliverables": [
        "src/tui/App.tsx: attention controls and verified activation/fallback; real keyboard/client proof.",
        "src/tui/components/session-columns.ts: required regions; separate structural and visual reviews.",
        "src/tui/store.ts: filter/order/identity-stable selection; interaction matrix proof.",
        "ccmux integration tests and popup timing harness: production daemon/tmux, populated openings and negative controls."
      ],
      "readingList": [
        {
          "documentPath": "specs/doing/work-20260926-codex-attention/dashboard/spec.md",
          "settles": "AC-11 through AC-18 plus end-to-end AC-2/AC-5/AC-6/AC-7/AC-22, approved references and the already approved exercise agreement."
        },
        {
          "documentPath": "specs/doing/work-20260926-codex-attention/dashboard/reference-review/APPROVAL.md",
          "settles": "Actual Reference Screen approval, exact artifacts and comparison setup; excludes phase-brief and production Screen Approval."
        }
      ],
      "decisionsTaken": [
        {
          "decision": "Open cached data in ccmux attention mode.",
          "why": "Repeated remote discovery violates the reopening goal."
        }
      ],
      "docTruthDocuments": [
        "README.md"
      ],
      "acceptanceCriteria": [
        {
          "acceptanceCriterionId": "AC-11",
          "input": "Measure twenty warm openings per source condition and a stopped-daemon opening; trace Workbench calls.",
          "expected": "Cached openings meet approved latency targets with populated rows and detached/unavailable Workbench.",
          "expectedValueSource": {
            "kind": "author",
            "probe": "specs/doing/work-20260926-codex-attention/dashboard/spec.md#ac-11: Stop timing only on populated list bytes and reject opening-triggered calls; record human Ghostty responsiveness separately."
          }
        },
        {
          "acceptanceCriterionId": "AC-12",
          "input": "Activate competing same-directory host and remote conversations with two Mac clients.",
          "expected": "Enter selects the verified existing host/Workbench pane for the invoking client.",
          "expectedValueSource": {
            "kind": "author",
            "probe": "specs/doing/work-20260926-codex-attention/dashboard/spec.md#ac-12: Require exact native identity and unchanged other-client target in the existing conversation."
          }
        },
        {
          "acceptanceCriterionId": "AC-13",
          "input": "Recycle a pane ID, remove identity evidence and make a source unavailable; activate each.",
          "expected": "Failed or recycled binding retains selection and recovery without starting another agent.",
          "expectedValueSource": {
            "kind": "author",
            "probe": "specs/doing/work-20260926-codex-attention/dashboard/spec.md#ac-13: Verification fails before any switch; no new process or command is allowed."
          }
        },
        {
          "acceptanceCriterionId": "AC-14",
          "input": "Inspect realistic Mac/Workbench multi-item renders at reviewed sizes.",
          "expected": "Rendered structure exposes all required row fields, pending details and source coverage.",
          "expectedValueSource": {
            "kind": "author",
            "probe": "specs/doing/work-20260926-codex-attention/dashboard/spec.md#ac-14: Each mandatory field/region must be located or reachable in production."
          }
        },
        {
          "acceptanceCriterionId": "AC-15",
          "input": "Use f, /, arrows/jk with input/error/reply/non-pending rows and changing projects.",
          "expected": "Attention-mode filtering, search, priority and selection work through updates.",
          "expectedValueSource": {
            "kind": "author",
            "probe": "specs/doing/work-20260926-codex-attention/dashboard/spec.md#ac-15: Observe each transition and stable identity; a screenshot alone fails."
          }
        },
        {
          "acceptanceCriterionId": "AC-16",
          "input": "Use prefix-g, search/filter/details/clear/navigation/cancel/Escape without mouse, with two clients.",
          "expected": "Shortcut and keyboard path target the invoking client and Escape restores focus.",
          "expectedValueSource": {
            "kind": "author",
            "probe": "specs/doing/work-20260926-codex-attention/dashboard/spec.md#ac-16: Other client remains unchanged and keyboard input returns to the original pane."
          }
        },
        {
          "acceptanceCriterionId": "AC-17",
          "input": "Review 120x40 and 80x24 cells with long names/multiple reasons, at Ghostty 100%/150% text size.",
          "expected": "Required information/actions remain reachable at specified terminal sizes and enlarged text.",
          "expectedValueSource": {
            "kind": "author",
            "probe": "specs/doing/work-20260926-codex-attention/dashboard/spec.md#ac-17: All fields stay reachable and actions work at every reviewed condition."
          }
        },
        {
          "acceptanceCriterionId": "AC-18",
          "input": "Compare same-size production/baseline captures, review differences and run orch-approve-screens for UI phase.",
          "expected": "Production captures conform to approved fixed-viewport Reference Screens.",
          "expectedValueSource": {
            "kind": "author",
            "probe": "specs/doing/work-20260926-codex-attention/dashboard/spec.md#ac-18: Visual region fidelity must match the approved baseline independently of functionality."
          }
        },
        {
          "acceptanceCriterionId": "AC-6",
          "input": "Use agent-attention clear EVENT_ID on an exercise item and c on a multi-item exercise row, then poll and restart.",
          "expected": "Manual one-event and row clearing persist without changing agent work.",
          "expectedValueSource": {
            "kind": "author",
            "probe": "specs/doing/work-20260926-codex-attention/dashboard/spec.md#ac-6: Persisted suppression and unchanged live prompt are required together."
          }
        },
        {
          "acceptanceCriterionId": "AC-7",
          "input": "View/reopen/navigate a pending row, then actually resume its native work.",
          "expected": "Native working clears its pending records while opening, seen and navigation preserve them.",
          "expectedValueSource": {
            "kind": "author",
            "probe": "specs/doing/work-20260926-codex-attention/dashboard/spec.md#ac-7: Viewing preserves counts; actual native working clears only the matching identity."
          }
        },
        {
          "acceptanceCriterionId": "AC-22",
          "input": "Compare agent-attention list, agent-attention tmux-status and dashboard after event/clear/work/outage.",
          "expected": "tmux-status and dashboard item totals match persistent pending transitions.",
          "expectedValueSource": {
            "kind": "author",
            "probe": "specs/doing/work-20260926-codex-attention/dashboard/spec.md#ac-22: A two-item row distinguishes event and row counts; unavailable items remain counted."
          }
        },
        {
          "acceptanceCriterionId": "AC-2",
          "input": "Produce real Workbench waits with no clients attached and inspect the imported row.",
          "expected": "Detached owned Workbench native input and approval appear in the host dashboard with correct source/native identity.",
          "expectedValueSource": {
            "kind": "author",
            "probe": "specs/doing/work-20260926-codex-attention/dashboard/spec.md#ac-2: A real detached owned-container source/native ID is required, not a Mac substitute."
          }
        },
        {
          "acceptanceCriterionId": "AC-5",
          "input": "Restart both processes with an unresolved event and observe repeatedly.",
          "expected": "Pending events survive collector/daemon restart and repeated observation without duplicates.",
          "expectedValueSource": {
            "kind": "author",
            "probe": "specs/doing/work-20260926-codex-attention/dashboard/spec.md#ac-5: Restart cannot lose the item and repeated polls cannot increase its count."
          }
        }
      ],
      "referenceScreens": [
        {
          "screen": "ccmux-attention-wide-960x600",
          "reference": "specs/doing/work-20260926-codex-attention/dashboard/reference-review/screens/ccmux-attention-wide-960x600.png",
          "sizes": [
            "960x600"
          ]
        },
        {
          "screen": "ccmux-attention-wide-1440x900",
          "reference": "specs/doing/work-20260926-codex-attention/dashboard/reference-review/screens/ccmux-attention-wide-1440x900.png",
          "sizes": [
            "1440x900"
          ]
        },
        {
          "screen": "ccmux-attention-wide-recovery-960x600",
          "reference": "specs/doing/work-20260926-codex-attention/dashboard/reference-review/screens/ccmux-attention-wide-recovery-960x600.png",
          "sizes": [
            "960x600"
          ]
        },
        {
          "screen": "ccmux-attention-wide-recovery-1440x900",
          "reference": "specs/doing/work-20260926-codex-attention/dashboard/reference-review/screens/ccmux-attention-wide-recovery-1440x900.png",
          "sizes": [
            "1440x900"
          ]
        },
        {
          "screen": "ccmux-attention-compact-640x360",
          "reference": "specs/doing/work-20260926-codex-attention/dashboard/reference-review/screens/ccmux-attention-compact-640x360.png",
          "sizes": [
            "640x360"
          ]
        },
        {
          "screen": "ccmux-attention-compact-960x540",
          "reference": "specs/doing/work-20260926-codex-attention/dashboard/reference-review/screens/ccmux-attention-compact-960x540.png",
          "sizes": [
            "960x540"
          ]
        },
        {
          "screen": "ccmux-attention-compact-recovery-640x360",
          "reference": "specs/doing/work-20260926-codex-attention/dashboard/reference-review/screens/ccmux-attention-compact-recovery-640x360.png",
          "sizes": [
            "640x360"
          ]
        },
        {
          "screen": "ccmux-attention-compact-recovery-960x540",
          "reference": "specs/doing/work-20260926-codex-attention/dashboard/reference-review/screens/ccmux-attention-compact-recovery-960x540.png",
          "sizes": [
            "960x540"
          ]
        }
      ]
    },
    {
      "thread": "dev-autonomy-delivery",
      "phase": "dashboard-delivery",
      "title": "Install silent startup and the reversible shortcut",
      "scope": "AC-20 through AC-22 and integrated handoff; requires native collector and pinned ccmux artifact; no notification permission work.",
      "implementationContext": [
        {
          "source": "specs/doing/work-20260926-codex-attention/dashboard/spec.md#d-8-install-silent-startup-reversibly",
          "standing": "accepted",
          "guidance": "Use canonical runtime inputs/generator; monitorAttentionCycle currently couples collection to notification."
        },
        {
          "source": "specs/doing/work-20260926-codex-attention/dashboard/spec.md#d-5-define-popup-and-controls",
          "standing": "accepted",
          "guidance": "Recheck g and preserve config/status-right; target invoking client."
        },
        {
          "source": "specs/doing/work-20260926-codex-attention/dashboard/spec.md#d-10-preserve-lineage-while-staging-the-replacement",
          "standing": "open",
          "guidance": "Preserve immutable spec and started phase attempt; do not rerender old phases."
        }
      ],
      "deliverables": [
        "Canonical runtime/installer inputs: silent login and scoped delivery; installed AC-20/AC-21 proof.",
        "Generated runtime assets: match canonical source; generator and runtime validator.",
        "docs/agent-attention.md: recovery, provider limits, age, pin/upgrade ownership and rollback; installed-command review.",
        "Work scratch delivery evidence: user login, configuration preservation, rollback and count comparison."
      ],
      "readingList": [
        {
          "documentPath": "specs/doing/work-20260926-codex-attention/dashboard/spec.md",
          "settles": "AC-20 through AC-22 and integrated handoff; requires native collector and pinned ccmux artifact; no notification permission work."
        }
      ],
      "decisionsTaken": [
        {
          "decision": "Keep collection independent and both delivery paths disabled.",
          "why": "The user replaces transient banners with dashboard review."
        }
      ],
      "docTruthDocuments": [
        "docs/agent-attention.md",
        "README.md"
      ],
      "acceptanceCriteria": [
        {
          "acceptanceCriterionId": "AC-20",
          "input": "User logs out/in; inspect service before manual start, detach/close Ghostty, then reopen after an event.",
          "expected": "Silent installed collector starts at login and observes without terminal attachment.",
          "expectedValueSource": {
            "kind": "author",
            "probe": "specs/doing/work-20260926-codex-attention/dashboard/spec.md#ac-20: Service already runs before opening; event exists with terminal closed; both notification paths are disabled."
          }
        },
        {
          "acceptanceCriterionId": "AC-21",
          "input": "Run generated checks, exercise approved installed components/documented commands, and perform scoped rollback.",
          "expected": "Canonical install and rollback preserve unrelated configuration and match guidance.",
          "expectedValueSource": {
            "kind": "author",
            "probe": "specs/doing/work-20260926-codex-attention/dashboard/spec.md#ac-21: Generator detects drift; unrelated settings survive; task-owned changes restore correctly."
          }
        },
        {
          "acceptanceCriterionId": "AC-22",
          "input": "Compare agent-attention list, agent-attention tmux-status and dashboard after event/clear/work/outage.",
          "expected": "tmux-status and dashboard item totals match persistent pending transitions.",
          "expectedValueSource": {
            "kind": "author",
            "probe": "specs/doing/work-20260926-codex-attention/dashboard/spec.md#ac-22: A two-item row distinguishes event and row counts; unavailable items remain counted."
          }
        }
      ]
    }
  ]
}
```
