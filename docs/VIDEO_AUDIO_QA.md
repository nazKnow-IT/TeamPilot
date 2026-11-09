# Narration QA

Checked on 9 November 2026 for the final six-scene TeamPilot demonstration.

The source voice is Gemini `gemini-3.8-flash-lite-tts`, prebuilt voice `Sulafat`, directed to speak warm conversational English. This is synthetic narration. The video discloses AI narration; no real person is impersonated.

## Results

All six narration WAV files passed the format and signal checks: 24 kHz, mono, 16-bit PCM; nonempty speech signal; no samples at the digital clipping threshold. Total narration duration is **160.44 seconds** before the renderer adds scene lead and tail intervals.

| Scene | Seconds | Peak amplitude (of 32768) | Clipped samples |
| --- | ---: | ---: | ---: |
| 1 | 22.92 | 24834 | 0 |
| 2 | 24.04 | 25458 | 0 |
| 3 | 21.96 | 26805 | 0 |
| 4 | 35.56 | 26972 | 0 |
| 5 | 27.28 | 27538 | 0 |
| 6 | 28.68 | 27570 | 0 |

An independent Gemini `gemini-3.1-flash-lite` request transcribed the combined generated audio without being given the expected script. Normalized comparison found 424 expected and transcribed words, with two spelling/punctuation variants: **Sara → Sarah** and **Agents SDK → agent's SDK**. These do not change the spoken meaning. Word error rate was approximately **0.47%**. There was no evidence of an omitted sentence, added introduction, or spoken voice-direction text.

This automatic transcription supports script fidelity. It does not assess voice pleasantness, pronunciation nuance, or caption synchronization. No human listening review was performed by the agent; the user can review the finished video's voice before submission.

## Reproduction

Run technical checks without an API request:

```powershell
node scripts/check_narration.mjs
```

To repeat the optional independent transcription using the already configured Gemini key:

```powershell
node --env-file=.env.local scripts/check_narration.mjs --transcribe
```

The optional check sends only the synthetic demo audio to Google's Gemini API. The script never writes the key to logs or reports. Generated evidence is in ignored local artifacts:

- `artifacts/video/audio-transcript-qa.json`
- `artifacts/video/audio-transcript.txt`
