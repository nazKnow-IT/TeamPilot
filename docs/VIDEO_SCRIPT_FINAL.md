# TeamPilot — final demo script and storyboard

Production script for the encoded **2 minute 45.38 second** competition video. All six narration WAVs and the real application capture are complete. The audio-based assembly estimate was **165.24 seconds**, including a 0.35-second lead and 0.45-second tail for each scene. The final render metadata reports **165.375 seconds** (165.38 rounded), at 24 frames per second; the small difference comes from frame quantization. The captured live configuration is Google Gemini `gemini-3.1-flash-lite`.

The new capture shows actual `read_project` → `evaluate_delay` → `propose_plan` tool calls. Ali is unavailable on **9–11 November**; the agent proposes Sara for survey analysis while retaining all five tasks and their total 14-hour estimate. The proposal review and explicit approval were newly captured, followed by the visibly updated board. Final export playback/quality verification is recorded separately by the video owner.

## Voice direction

- Warm, clear, conversational English. The generated narration averages approximately 157 words per minute, with natural pauses.
- Use natural contractions, short pauses, and gentle emphasis. Avoid a sales-announcer delivery or exaggerated excitement.
- Pronounce TeamPilot as “Team Pilot,” and read AI as separate letters. Put the exact model identifier and framework names on screen rather than rushing through technical names aloud.
- Use a natural synthetic voice; do not imitate or claim to be a real person. No invented presenter name.
- Keep narration prominent. Background music is optional; omit it if it makes speech less clear.

## Storyboard

The scene ranges below are audio-based production cues. Frame rounding can shift an encoded boundary slightly; the final encoded total is 2:45.38.

### Scene 1 — 0:00.00–0:23.72 — the daily problem

**Visual:** Clean TeamPilot title over the real dashboard. Keep the app's DEMO watermark visible. Show no account, billing, or key setup screens.

**Narration:**

> Group projects can be difficult for a simple reason: everyone's work is connected. One delayed task can hold up the slides, the rehearsal, and the final submission. But keeping track of that usually falls to one person. This is TeamPilot, an AI coordinator that helps student teams see what needs to happen next, and recover when their plans change.

**Caption:** “TeamPilot — clearer responsibilities, practical recovery plans”

### Scene 2 — 0:23.72–0:48.56 — establish the facts

**Visual:** Brief & notes, then Team & capacity. Highlight the four fictional members and declared daily hours. Return to the task board. Use subtle zooms only where text would otherwise be unreadable.

**Narration:**

> Let's look at a fictional campus recycling project. The team needs research, survey analysis, a poster, a slide deck, and a rehearsal. The leader provides the assignment brief, meeting notes, and each person's skills and available hours. TeamPilot uses those details to check the plan. The figures here are estimates for review, and all student information in this demonstration is synthetic.

**Caption:** “Five deliverables · four fictional students · declared availability”

### Scene 3 — 0:48.56–1:11.32 — introduce the disruption

**Visual:** Show the existing schedule. Enter Ali's unavailability for 9–11 November in the synthetic sample. Start the real agent run.

**Narration:**

> Now a normal student-life problem appears. Ali won't be available for three days, and he owns the survey analysis. The slides depend on that analysis, so simply moving his task could affect the rest of the project. I ask TeamPilot to find a recovery plan while keeping the deadline, the required work, and any recorded progress intact.

**Caption:** “Goal: recover from a change in availability”

### Scene 4 — 1:11.32–1:47.68 — demonstrate the agent

**Visual:** Captured activity panel and actual tool results. Expand the relevant tool records, then show the generated proposal. The captured real tool sequence is `read_project`, `evaluate_delay`, `propose_plan`.

**Narration:**

> The agent first reads the project. It then calls the delay-evaluation tool, which checks the remaining capacity and the tasks affected by Ali's absence. The model uses those results to choose its next action. In this example, it proposes moving the survey analysis to Sara, who has capacity to take it on. The planning engine checks the resulting schedule against the dependencies and available hours. All five original tasks remain, and the total estimate stays at fourteen hours. This is the agent's practical role: investigating a change, using tools, and turning the results into a proposal I can inspect.

**Captions, displayed in sequence:**

- “Real model request → actual application tools”
- “Read project → evaluate delay → propose plan”
- “Proposed change: survey analysis, Ali → Sara”
- “Five tasks retained · 14 estimated hours retained”

**Editing rule:** If a waiting interval is removed, display “Waiting time shortened” over the cut. Preserve enough real output to establish the tool calls. Do not fabricate a progress animation or insert a successful result from a failed run. If a new live run chooses a different valid owner, adjust this narration and caption to match the recorded evidence.

### Scene 5 — 1:47.68–2:15.76 — human review and useful output

**Visual:** Compare the proposal with the approved board. Show affected availability and daily allocations. The newly captured explicit approval applies the proposal only in the synthetic demonstration project; the following footage shows the visibly updated board and schedule. Briefly show the export options.

**Narration:**

> The team leader stays in control. Nothing is applied automatically. I can review the owner changes, the availability update, and the daily work allocations before accepting the proposal. Once I approve it, the board reflects the reviewed changes. If the project has changed since the proposal was created, TeamPilot requires a fresh plan. The leader can also export a project backup, task list, or readable status report to keep the team informed.

**Caption:** “Review first. Apply only after approval.”

### Scene 6 — 2:15.76–2:45.24 — value, disclosure and honest limits

**Visual:** Final project overview. Add a compact technology card: “Google Gemini 3.1 Flash-Lite · OpenAI Agents SDK · Zod · custom JavaScript scheduler · Node.js.” End on TeamPilot title and the DEMO mark.

**Narration:**

> TeamPilot supports project-based learning by making responsibilities, dependencies, and capacity visible. It combines Gemini with a custom scheduling engine and the Agents SDK. This prototype is managed by one team leader in one browser. Its scheduler does not guarantee the best possible plan, and estimates still need human judgment. But it gives students a clear way to investigate delays, review alternatives, and move their group project forward together.

**Caption:** “Educational innovation for everyday group work”

## Capture and evidence checklist

| Scene | Narration WAV | Estimated scene including lead/tail | Audio-based cumulative cue |
| --- | ---: | ---: | ---: |
| 1 | 22.92 s | 23.72 s | 0:23.72 |
| 2 | 24.04 s | 24.84 s | 0:48.56 |
| 3 | 21.96 s | 22.76 s | 1:11.32 |
| 4 | 35.56 s | 36.36 s | 1:47.68 |
| 5 | 27.28 s | 28.08 s | 2:15.76 |
| 6 | 28.68 s | 29.48 s | 2:45.24 |

- Capture only the local TeamPilot app and synthetic project. Never record API keys, account pages, real contact details, or payment screens.
- Keep DEMO or SAMPLE visible throughout all application footage.
- Use `gemini-3.1-flash-lite`, the currently verified configuration. Do not show a successful connection test as proof of an entire agent workflow.
- Actual live tool calls were newly captured for the video. Label shortened waiting time honestly. Never imply that playback is a newly executing request.
- The proposal was shown before applying, and explicit approval plus the changed board were newly captured using the synthetic project. This extends the earlier CLI verification, which only established staging without board changes.
- The initial plan-generation feature is implemented but was not the workflow documented in LIVE_VERIFICATION.md. This video focuses on the verified delay-recovery path.
- Use readable English captions. Optional Malay subtitles may be added separately after translation review.
- Final duration must remain below five minutes. Verify audio, legibility, cuts, and the first/last frames in the exported file.
- No claimed marks improvement, time savings, user adoption, or other unmeasured performance figures.
- Narration and application capture are complete, and final render metadata reports a 1920×1080 H.264/AAC file lasting 165.375 seconds. Automated transcript comparison reported 0.47% word error rate, limited to Sara/Sarah and apostrophe orthography. This document does not claim a listening assessment; any final export playback/quality verification is recorded separately by the video owner.
