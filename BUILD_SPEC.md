# TeamPilot — Group Project Coordination Agent

Status: build specification. The application and live model connection have not yet been implemented.

## Product outcome

Help an IPT student team turn assignment requirements and meeting notes into a feasible plan, identify work that blocks other work, and recover when a member or task is delayed.

The first version is a browser application for one team leader and one project. It uses fictional demo participants. It does not contact classmates, submit coursework, or access institutional systems.

## Core demonstration

1. Enter a project brief, deadline, four team members, their skills, and their explicit available work hours.
2. Paste meeting notes identifying agreed work and unresolved decisions.
3. Ask the agent to prepare the project plan.
4. The agent extracts candidate deliverables with evidence from the supplied text, identifies missing information, and calls planning tools.
5. The scheduler checks dependencies, working time, and deadlines. The agent revises the proposal if the tool reports conflicts.
6. The team leader reviews the proposed tasks, owners, estimates, and dates. Estimated and inferred values are labelled.
7. Approve the proposal to update the task board.
8. Report that one member is unavailable on a particular date.
9. The agent investigates the impact, proposes a recovery plan, and explains the changes using tool results.
10. Review and approve the revised plan. Export the updated task list and report.

## First-version inputs

- Project title, start date, deadline, and timezone (Asia/Kuala_Lumpur by default).
- Assignment brief pasted as text.
- Meeting notes pasted as text.
- Team member display names and skills.
- Availability as dates with available work hours. Zero means unavailable.
- Existing tasks, owners, effort estimates, dependencies, progress, and blockers when available.
- Human confirmation of missing or ambiguous requirements.

Skills and availability are self-reported. The agent must not invent them or infer sensitive traits. It must label estimated task duration and proposed ownership rather than present them as facts from the assignment.

## First-version screens

### Project setup

Project details, brief, notes, members, skills, and availability. A complete synthetic example is available as an explicit Load sample project action.

### Project workspace

- Summary: deadline, progress, blocked tasks, remaining work, and capacity warnings.
- Task board: To do, In progress, Blocked, Done.
- Schedule: task allocations by date and member, including dependency warnings.
- Team view: planned hours versus declared available hours; this is a capacity measure, not a performance ranking.
- Agent panel: goal, concise status, actual tool calls and results, unresolved questions, and proposed changes.
- Proposal review: compare old and proposed owners, dates, and task details; approve or reject.

The application displays DEMO prominently for the competition version. It identifies whether a live AI connection is available. Deterministic scheduling and sample data are never represented as live AI reasoning.

## Agent execution

The model interprets natural language and chooses tool calls. A deterministic scheduler validates time and dependency constraints. Neither the model's prose nor its self-assessment can bypass validation.

Execution loop:

1. Receive a bounded goal and a snapshot of project state.
2. Read relevant requirements, task state, availability, and the latest human update.
3. Request missing essential information or choose a tool.
4. Validate the tool name and arguments against the allowed schema.
5. Execute the permitted tool server-side and return structured results.
6. Let the model select a follow-up action based on the result.
7. Stop when a validated proposal is ready, human input is needed, the user cancels, or a run limit is reached.

Initial run limits: at most 12 tool calls, 60 seconds per run, and one active run per workspace. Failed tools return explicit errors. Cancellation must prevent later application of that run's proposal.

## Tool contracts

| Tool | Input | Result and allowed effect |
| --- | --- | --- |
| read_project | Project ID and revision | Brief, notes, members, availability, tasks; read-only |
| inspect_dependencies | Candidate task graph | Missing references, cycles, blocked descendants; read-only |
| calculate_schedule | Candidate tasks, capacities, start and deadline | Work allocations, overloads, unscheduled work, deadline conflicts; read-only |
| evaluate_delay | Task/member update and project revision | Affected tasks, lost capacity, feasible alternatives; read-only |
| propose_plan | Task additions/changes and evidence | Validated staged proposal and human-readable comparison; no board mutation |
| prepare_status_report | Current project snapshot | Summary of completed, outstanding and blocked work; read-only |

Applying a proposal is a separate human action. The application verifies the proposal's project revision and constraints again before committing it. A stale proposal is rejected and must be recalculated.

## Scheduling rules

- Store effort and available time in explicit work-hour units.
- Never schedule a member beyond declared daily capacity.
- A task starts after its required predecessors finish. Sequential tasks may use separate time slots on the same day if capacity permits.
- Reject dependency cycles, unknown task IDs, unknown owners, invalid dates, and non-positive effort estimates.
- Preserve completed work and locked human decisions.
- Allow unfinished work to be split over dates; preserve already completed effort.
- Consider stated skills when proposing owners; show the reason and request review.
- Report an infeasible deadline openly. Do not silently extend it, erase requirements, or pretend all work fits.
- Suggest scope changes only as explicit proposals requiring review.
- Identify tasks with missing information rather than manufacture requirements.

## Example project

Campus recycling awareness presentation with a four-person student team. Deliverables: research, a short survey analysis using synthetic responses, slides, prototype mockup, and rehearsal.

Example dependency: research and analysis must finish before the related slides; rehearsal depends on the completed slides. If the slide owner loses availability, the agent checks the effect on rehearsal, compares permitted reassignment options, and proposes a plan that fits the remaining capacity. If none fits, it reports the conflict.

## Architecture

- Browser frontend for setup, task board, schedule, agent activity, and proposal review.
- Server endpoint for model calls, schema validation, tool execution, and bounded run orchestration.
- Shared planning module for schedule calculations and dependency checks.
- Versioned project storage and proposal records.
- Export to JSON for backup and CSV/Markdown for task and status reports.
- One model agent with several narrow tools; multiple AI agents are not required for the first version.

For a private hosted version, keep runtime API credentials server-side in the platform's secret store. Use a protected API route, input-size limits, and bounded run costs. Do not expose a model key in client code or exports.

Persistence must be explicit: a single-device prototype may use browser storage; hosted team sharing requires authenticated user/project access and durable server storage. Browser storage alone must not be described as multi-user collaboration.

## Model connection dependency

The user initially reported no AI API account. OpenAI Developers is now available, a safe environment check found no usable API key, and the native setup choice returned create. The API project/organization picker and local secret destination have not yet been confirmed. No key has been created or written, and no model request has been made.

Interface, schedule calculations, tool schemas, fixtures, and deterministic validation can be built before model setup. The application is not a verified autonomous AI agent until a real model completes the tool workflow successfully.

## Scope boundaries

Included first: one project, team setup, text briefs/notes, editable tasks, availability, dependency checks, scheduling, delay recovery, proposal review, persistence, exports, live tool log, and one repeatable demonstration.

Deferred: WhatsApp, email, calendars, Teams, institutional portals, voice recording, PDF/OCR ingestion, live multi-user editing, automatic reminders, account administration, and autonomous external communications. These integrations are not needed to prove the initial agent workflow.

## Validation

1. A realistic project produces a schedule inside supplied capacity.
2. Tasks never run before their dependencies finish.
3. An unavailable member receives no new hours in the unavailable period.
4. An impossible deadline produces an explicit conflict.
5. Cyclic dependencies and invalid model arguments are rejected.
6. Reading and proposing do not change the approved task board.
7. Approving a valid current proposal applies precisely its reviewed changes.
8. A stale proposal cannot overwrite subsequent human edits.
9. Save/reload and export/import preserve a valid project.
10. A live model completes an initial planning run and a delay-recovery run using real tools.
11. UI labels distinguish sample data, estimates, proposals, and actual completed actions.
12. The primary workflow works on a laptop and a phone-sized viewport.

## Implementation order

1. Create the isolated project and shared data contracts.
2. Implement and test dependency checks, capacity calculations, and scheduling.
3. Build setup, task board, schedule, and proposal review screens.
4. Add project persistence and exports.
5. Implement tool dispatch and the bounded model loop.
6. Configure the approved model connection and test real runs.
7. Verify UI and error states and prepare the repeatable synthetic scenario.
8. Prepare competition title, short problem/solution text, tool disclosure, and video script.

## Suggested five-minute video

- 0:00–0:30: Explain the group coordination problem and target users.
- 0:30–1:00: Show the brief, team, and declared availability.
- 1:00–2:15: Run the agent; show actual tool calls and review the first plan.
- 2:15–3:30: Introduce a delay, show impact analysis and a proposed recovery plan.
- 3:30–4:15: Approve changes and show the updated board and export.
- 4:15–5:00: Explain educational value, tools used, limitations, and next steps.

Only claim features demonstrated in the actual application. The video script is a recommendation, not an additional official entry requirement.
