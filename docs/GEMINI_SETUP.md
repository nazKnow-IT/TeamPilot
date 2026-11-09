# Connect Gemini to TeamPilot

Google Gemini is the selected provider. The local code and connection form are ready; real key/quota/model access must still be verified.

1. Open <https://aistudio.google.com/apikey> in your browser and sign in to your Google account.
2. Complete any Google onboarding or terms steps yourself. New users may already have a default project and key. Otherwise choose **Create API key** and select or create a project you control.
3. Check the project's billing tier in AI Studio. Use a **Free tier** project for this trial. Do not select **Set up billing** or enter payment details to try this path. If your account cannot access a free tier, stop and report the exact non-secret message.
4. Copy the Gemini key. Do not paste it into chat or a project brief.
5. Open <http://127.0.0.1:4173> and select **Connect Gemini**.
6. Paste the key into the password field, keep the default listed model initially, and acknowledge that you selected a Free tier project.
7. Select **Save & test connection**. The server saves the key in ignored `.env.local`, preserves existing unrelated settings and sends a short test request only to Google's fixed API endpoint.
8. A success message verifies that short connection test. Next run a full sample planning and delay-recovery workflow before claiming the agent works end to end.

The form never returns the saved key to the browser and never includes it in project backups, reports or task exports. Leave the key field blank on a later visit to keep a previously saved Gemini key while changing the model. The key is still stored as a local server credential; protect the computer and configuration file.

## Limits and errors

- A free tier is limited, not unlimited. Project/model quota and regional eligibility can vary.
- A 429 error indicates a Google quota/rate constraint. It does not require buying OpenAI credits or creating more keys to evade the limit.
- A 404/model-access error may require selecting another listed model available to that project.
- An invalid-key or permissions error requires checking the key, API enablement and project access in AI Studio.
- A saved key is not the same as verified inference. The UI identifies an unverified connection and shows errors honestly.
- Do not enable paid Google billing just to bypass a free-tier failure without reviewing the costs yourself.
- Google documents that free-tier content may be used for product improvement. Use the synthetic sample project for the competition demo.

Sources checked for implementation:

- <https://ai.google.dev/gemini-api/docs/openai>
- <https://ai.google.dev/gemini-api/docs/api-key>
- <https://ai.google.dev/gemini-api/docs/pricing>
- <https://ai.google.dev/gemini-api/docs/billing>

No Gemini key was supplied or real Gemini inference verified at the initial delivery of this migration.
