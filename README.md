# TeamPilot

A local browser workspace for IPT group projects, with a capacity-aware planning engine and an Agents SDK coordinator. Google Gemini is the selected provider, using Google's documented OpenAI-compatible endpoint. The model can investigate and stage proposals; the team leader reviews changes before applying them.

## Current delivery state

- Working: project setup, brief/notes, team skills and daily availability, task editing/progress, dependency checks, schedule previews, local recovery proposals, review/apply/reject, browser persistence, JSON backups/import, CSV and Markdown exports.
- Implemented: server-side SDK coordinator, six tools, structured results, tool activity stream, source-quote validation, cancellation, run and tool limits.
- Gemini is connected and a real recovery workflow passed on `gemini-3.1-flash-lite`: the agent called `read_project`, `evaluate_delay` and `propose_plan`, moved survey analysis from Ali to Sara, and produced a feasible staged schedule without changing the board. See [live verification](docs/LIVE_VERIFICATION.md). The prior OpenAI key remains ignored and inactive; no automatic fallback occurs.
- Pending by user request: inspection feedback, followed by final demo-video capture. No public hosting or Git remote has been created.

## Run locally

Requires Node.js 22 or newer. Development used Node 24 and npm.

```powershell
cd 'D:\project system all\TeamPilot'
npm.cmd ci
npm.cmd run dev
```

Open <http://127.0.0.1:4173>. The local server binds to loopback only. `PORT` can select a different local port. Select **Connect Gemini** and follow [the Gemini setup guide](docs/GEMINI_SETUP.md). Never paste a secret into chat or commit it. The local form saves the Gemini key in ignored `.env.local` and updates the running server; no restart is needed after using the form.

The currently configured and live-verified model is `gemini-3.1-flash-lite`. The initial code default remains `gemini-3.8-flash`; the form also offers legacy 2.5 models. The 3.8 test reported overload, and Google's response for this new user's project says 2.5 Flash is no longer available to new users, despite appearing in model listing. Preserve the working 3.1 Flash-Lite selection. Google lists free-tier availability for selected models, but actual availability and quota depend on the user's project. The app cannot determine the project's billing tier; choose a Free tier project in AI Studio and do not enable paid billing for this trial. Google's free-tier content may be used to improve its products, so use synthetic demonstration data. See [Google pricing](https://ai.google.dev/gemini-api/docs/pricing).

`AI_PROVIDER=gemini` selects Google; it is also the default when unspecified. `GEMINI_MODEL` and `GEMINI_API_KEY` configure it. An explicitly selected `AI_PROVIDER=openai` can use the existing OpenAI configuration; the app never switches providers automatically.

## Inspection walkthrough

1. Select **Load sample**, then confirm. All names and survey data are fictional.
2. Inspect **Task board**, **Schedule**, **Team & capacity**, and **Brief & notes**.
3. Select **Preview a recovery**. Choose Ali and set the first three project dates to zero available hours.
4. Inspect the proposed owner change and daily allocations. Nothing is committed yet.
5. Reject the proposal to preserve the project, or approve it to apply precisely the reviewed changes.
6. Edit a task's progress, then reload. The saved data should persist.
7. Export a JSON backup or a readable report. Export before clearing browser storage or loading another project.

After API setup, select a suggested agent goal or enter a request. Project text is sent to the selected provider only when a live run is started. Saving Gemini configuration also sends one short connection-test prompt to Google. Tool arguments/results appear in the activity panel. SDK trace collection is disabled. Do not use confidential information in the competition demonstration.

## Architecture

- `public/`: dependency-free HTML/CSS/JavaScript interface and shared planning rules.
- `public/planner.js`: validated data contracts, topological dependency checks, half-hour scheduling, staged proposals and revision checks.
- `src/agent.mjs`: one Agents SDK agent, six narrowly scoped tools, verified source evidence and structured output.
- `src/providers.mjs`: explicit provider selection, Google-compatible SDK model and bounded connection test. Gemini uses ordinary final text while proposal data stays schema-validated through tools.
- `src/secrets.mjs`: fixed-destination local key storage, input validation, atomic updates and preservation of unrelated configuration.
- `server.mjs`: localhost static server and NDJSON agent endpoint; key stays server-side.
- `tests/`: planner, HTTP/security and deterministic SDK integration checks.
- `docs/VIDEO_PLAN.md`: narration and capture checklist for the post-inspection demo.
- `BUILD_SPEC.md`: original build specification and acceptance criteria.

JavaScript is shared between the browser and server to keep scheduling and validation consistent. No framework build step is needed. The SDK and Zod versions are pinned in `package-lock.json`.

## Planning assumptions and limits

- One team leader, one browser, one active project. This is not live multi-user editing.
- Projects support 1–12 members, up to 80 tasks and a maximum 90-day planning window. Competition team size remains at most four.
- Availability is explicit daily capacity in 0.5-hour increments, not calendar appointment times.
- Half-hour planning blocks are aligned from the start of each member's declared work window. Dependencies are respected within those abstract blocks. Actual meetings need separate coordination.
- The greedy scheduler can miss alternative feasible arrangements. A failed schedule is a warning under this planner, not proof that no mathematical solution exists.
- Completed tasks, progress and started-work owners are preserved by the agent. Existing tasks cannot be deleted through proposals. Locked owners stay fixed.
- A proposal is recalculated on approval and rejected if the project revision changed or work remains unscheduled.
- No email, WhatsApp, calendars, assignment submission, portal access or background notifications.
- Browser storage is not a backup. Use project exports.
- AI runs have a 60-second deadline, at most 12 runner turns and at most 12 tool calls. Errors/cancellation never apply a proposal automatically.

## Checks

```powershell
npm.cmd run check
npm.cmd test
```

Optional explicit live check, after key setup (uses real provider quota):

```powershell
node --env-file=.env.local scripts/smoke-agent.mjs
```

35 automated checks pass at the latest checkpoint. They cover planning, the SDK runner, the Google-compatible model adapter, fixed-endpoint routing, secret preservation/redaction, configuration injection rejection, local endpoint protection, provider-specific quota errors, wrapped/non-JSON upstream errors, overload, timeout and model-retirement messages. Tests use scripted models, fake keys or mocked transport and are explicitly **not live AI inference**. HTTP tests require localhost access. Browser QA covered sample loading, review/apply recovery, task progress, reload persistence, backup download, responsive layout, the Gemini connection form and the absence of browser console errors.

## Version control

The project has its own local Git repository on `main`. Checkpoints separate the specification, planner and application delivery. `.env*` secrets, `node_modules`, logs and generated artifacts are ignored. No remote is configured. Normal daily use:

```powershell
git status
git log --oneline
git diff
```

## API implementation references

- [Agents SDK overview](https://developers.openai.com/api/docs/guides/agents/sdk)
- [Agent definitions and structured output](https://developers.openai.com/api/docs/guides/agents/define-agents)
- [Running agents](https://developers.openai.com/api/docs/guides/agents/running-agents)
- [Google's OpenAI compatibility and function calling](https://ai.google.dev/gemini-api/docs/openai)
- [Google AI Studio API keys](https://ai.google.dev/gemini-api/docs/api-key)

These references inform implementation. They are not claims that a live API request has succeeded.
