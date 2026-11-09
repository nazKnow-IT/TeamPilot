# TeamPilot — competition demo video plan

Status: script and capture checklist prepared. Final video capture is deferred until the user inspects the application and the live AI workflow is verified. Do not record the offline planner as if it were a live AI run.

Target length: 4 minutes 30 seconds to 4 minutes 50 seconds, below the official five-minute limit. Use a clear DEMO watermark throughout. Use synthetic participants and fictional assignment information. The proposed script is a production recommendation, not an additional competition rule.

## Storyboard and draft English narration

### 0:00–0:25 — the problem

Visual: title, then the project overview.

Narration: "Student group projects often lose momentum because tasks depend on one another, availability changes, and nobody has a clear picture of the consequences. TeamPilot helps a team turn assignment requirements into a workable plan and respond when that plan breaks."

### 0:25–0:55 — the supplied facts

Visual: Brief & notes, then Team & capacity. Show the fictional team and explicitly declared hours.

Narration: "The team leader provides the assignment brief, meeting notes, members' skills and available work hours. These are the facts the agent can use. Estimates and proposed assignments are labelled for review. Our demonstration uses fictional students and synthetic data."

### 0:55–1:50 — live initial planning

Visual: start with the sample brief and members but no task plan. Run the agent with the goal below. Show actual tool activity and the proposal.

Goal: "Create a complete project plan from the brief and meeting notes. Label effort estimates, keep all required deliverables, inspect dependencies and verify the schedule before proposing changes."

Narration: "The agent reads the requirements, identifies deliverables and breaks the work into tasks. It calls tools to inspect dependencies and calculate a schedule against the available hours. When a tool reports a conflict, the agent can revise its proposal. The team leader reviews the proposed owners, estimates and allocations before anything changes."

Capture requirement: use a real successful live-model run, not the scripted test adapter. Preserve evidence of the tool calls. If a run takes time, edit the waiting interval honestly with a visible time-cut label.

### 1:50–2:15 — approve and inspect

Visual: review the proposal, approve it, show the board and schedule.

Narration: "Approving applies the reviewed changes. Each task now has an owner, an estimate and prerequisites. The schedule shows daily work allocations. These are planning blocks, not booked calendar appointments."

### 2:15–3:25 — introduce a disruption

Visual: enter the delay goal using the exact dates visible in the loaded project. Show the impact calculation, proposed owner change and new schedule.

Goal template: "Ali is unavailable from [first project date] through [third project date], inclusive. Set his available hours to zero on those dates. Find a recovery plan while preserving completed work and the project deadline. Stage the changes for my review."

Narration: "Now Ali becomes unavailable. The agent checks the lost capacity and identifies the downstream work at risk. It evaluates a recovery using the team's declared skills and remaining availability. It proposes changes and explains their effect, while preserving completed work and locked decisions. If the tools cannot find a schedule, the app reports the conflict instead of silently moving the deadline."

### 3:25–4:00 — evidence and control

Visual: compare old and proposed owners; inspect actual tool results; approve or reject; export status report.

Narration: "The activity panel exposes the actual tool calls and results. Source quotations are checked against the supplied brief or notes. Changes remain proposals until the leader approves them. A project revision check prevents an older proposal from overwriting later human edits."

### 4:00–4:40 — value, disclosure and limits

Visual: final overview plus a simple technology/limitations card.

Narration: "TeamPilot supports project-based learning by making responsibilities, dependencies and capacity visible. It uses the OpenAI Agents SDK, [actual configured model], Zod, and a custom JavaScript scheduling engine. This version is a single-team-leader browser prototype. The greedy scheduler does not guarantee the best possible plan, and all estimates need human review. Next steps include authenticated team sharing and calendar integration."

Replace the model placeholder with the actual model successfully used. Omit any feature not present in the inspected build.

## Capture and editing checklist

- Obtain user inspection feedback and incorporate agreed changes before final capture.
- Finish secure API setup and verify initial planning and delay recovery with a real model.
- Record only the app tab. Keep API-key setup, account pages and secrets out of the recording.
- Keep the DEMO watermark visible. Do not display real participant contact information.
- Capture readable text at a consistent landscape resolution, preferably 1920×1080 if supported by the recording setup.
- Use English or Bahasa Melayu narration. Malay subtitles are encouraged for English videos by the competition rules.
- Add truthful captions for edited waiting periods; do not fabricate agent actions or tool results.
- Export MP4 if the available recording/transcoding tools support it. Verify duration, audio and legibility in the actual exported file.
- Watch the entire exported file before delivery. Check the first and last frames and each cut.
- Upload only after the user approves the final video and destination. Verify the judges can access the shared video link.

## Submission text draft

Project title: TeamPilot: AI Coordination for Student Group Projects

Problem: Student teams coordinate assignments through scattered notes and informal updates. Changes in availability can block dependent tasks, while unclear ownership and unrealistic workloads put deadlines at risk. Teams need a shared, capacity-aware plan that adapts to changes.

Solution: TeamPilot reads assignment briefs and meeting notes, proposes tasks and owners, and uses tools to validate dependencies and available work hours. When a member is delayed, the agent evaluates the impact and stages a revised plan. A team leader reviews changes before applying them.

Framework/tool disclosure: OpenAI Agents SDK; Google Gemini through Google's OpenAI-compatible endpoint (confirm actual model used); Zod; custom JavaScript scheduler; Node.js; HTML/CSS/JavaScript.

These are drafts. Verify the final form's character limits and the actual completed implementation before submission.
