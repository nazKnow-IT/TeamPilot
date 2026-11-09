# Live Gemini verification

Verified on 9 November 2026 at approximately 22:27 Malaysia time.

Provider: Google Gemini. Active model: `gemini-3.1-flash-lite`.

The app's connection status reported a saved key and a successful connection test. A separate bounded live test then exercised the real agent SDK with Google's model, the real application tools, and a synthetic five-task project.

## Scenario and observed outcome

Goal: Ali is unavailable on 10–12 November inclusive. Preserve the project deadline, deliverables and recorded progress, and stage a feasible recovery for human review.

Real tool calls:

1. `read_project`
2. `evaluate_delay`
3. `propose_plan`

The agent proposed moving the survey analysis from Ali to Sara. All three unavailable dates were set to zero available hours in the staged proposal. All five original tasks and the total 14-hour effort estimate were preserved. The final schedule passed dependency and capacity validation. The original project object and browser project board were unchanged; no proposal was applied automatically.

The machine-readable synthetic result is in ignored `artifacts/live-agent-smoke.json`. It contains no API credentials. The reproducible live test is `scripts/smoke-agent.mjs`; it is an explicitly invoked real API test, not part of the deterministic unit-test suite.

One successful sample run establishes this workflow under the tested conditions. It does not guarantee future provider capacity, every possible planning request, or model availability. The earlier Gemini 3.8 Flash overload remains part of the diagnostic history; no paid billing or automatic OpenAI fallback was enabled.

Next user step: inspect the application. Final demo-video capture remains pending that inspection, as requested.
