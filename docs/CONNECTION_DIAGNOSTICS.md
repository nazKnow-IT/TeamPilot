# Gemini connection diagnosis — 9 November 2026

The user reported a saved key followed by a generic connection-test failure. No secret values are recorded here.

## Observed results

- The saved key was accepted by Google's native model-list endpoint (HTTP 200).
- The model list included Gemini 3.8 Flash and Gemini 3.1 Flash-Lite. Listing alone does not establish working generation.
- A short Gemini 3.8 Flash generation request returned HTTP 503 with Google's message that the model was experiencing high demand.
- Other short generation requests timed out before an answer was received.
- Gemini 2.5 Flash returned HTTP 404 stating that it was no longer available to new users. The compatibility endpoint wrapped that error in a JSON array.
- A Gemini 3.1 Flash-Lite test timed out; it is not a verified working fallback.

## Fixes

- Preserve the upstream HTTP status and safe error details, including array-wrapped errors.
- Redact saved credentials from error text before it can be displayed.
- Explain overload (503), other transient service failures, timeouts and model retirement separately from credential errors.
- Add **Retry saved connection** so a temporary service failure does not require entering or replacing a key.
- Keep the selected Gemini 3.8 Flash model and preserve the saved key. No paid billing or automatic provider fallback was enabled.

35 deterministic tests pass. These include regressions for wrapped errors, overload, timeouts, retired models and non-JSON upstream failures. A valid key/model-list result is not claimed as a successful generation or a completed autonomous agent workflow.
