# TeamPilot — male Malay narration revision

The revised video uses male Malaysian Malay narration, conversational Malay wording, Malay chapter titles, and Malay captions. It reuses the authentic application captures from the verified demonstration. The previous English video remains available separately.

The completed export is **3 minutes 3.63 seconds**, 1920×1080 at 24 fps, H.264 video with AAC audio, and 7,121,914 bytes. Complete-file decoding passed. Opening, agent, approval, and ending frames were checked for readable Malay captions, retained application captures, correct approval order, and disclosure labels.

## Local files

- `artifacts/video-malay/TeamPilot-demo-malay-male.mp4` — revised video.
- `artifacts/video-malay/TeamPilot-demo-malay-male.srt` — Malay captions, also burned into the video.
- `artifacts/video-malay/TeamPilot-demo-malay-male.render.json` — actual export information.
- `artifacts/video-malay/TeamPilot-demo-malay-male.validation.json` — complete-file decode and format checks.
- `artifacts/video-malay/audio-transcript-qa.json` — signal checks and independent automatic transcription comparison.
- `docs/VIDEO_SCRIPT_MALAY.md` — versioned Malay script and visual cues.

## Voice

The revised narration uses **Achird** with **Gemini 3.8 Flash TTS**. Google's prebuilt voice catalog identifies Achird as male, low pitched, friendly, and intended for conversational or educational use. The delivery instruction requests standard Malaysian Malay, a relaxed lower-middle male register, natural conversational rhythm, short pauses, and restrained emphasis. This is synthetic speech; a named real person is not imitated. The opening and closing disclose AI narration in Malay.

The script is adapted for spoken Malay rather than translated word for word. It retains the actual project facts: Ali unavailable on 9–11 November, analysis reassigned to Sara, five tasks and fourteen estimated hours retained, and approval before the board changes.

The earlier Flash-Lite speech model reached its daily free quota during the revision. The final six sections consistently use Flash TTS, which Google's [official pricing page](https://aistudio.google.com/docs/pricing#gemini-3.8-flash-tts) lists as available on the free tier. No billing change was needed. The generator now spaces requests and can retry a short minute quota once; it does not retry a daily quota or automatically switch models.

## Reproduction

From the project directory, with the existing authentic frames retained in `artifacts/video/frames`:

```powershell
python scripts/build_video_manifest.py --source docs/VIDEO_SCRIPT_MALAY.md --language ms-MY --frames-dir ../video/frames --output-dir artifacts/video-malay
node --env-file=.env.local scripts/generate_voice.mjs --language ms-MY --voice Achird --model gemini-3.8-flash-tts --production-dir artifacts/video-malay
python scripts/build_video_manifest.py --source docs/VIDEO_SCRIPT_MALAY.md --language ms-MY --frames-dir ../video/frames --output-dir artifacts/video-malay
python scripts/render_video.py --manifest artifacts/video-malay/manifest.json --output artifacts/video-malay/TeamPilot-demo-malay-male.mp4
python scripts/check_video.py artifacts/video-malay/TeamPilot-demo-malay-male.mp4 --full
```

The second manifest build scales screenshot transitions to the actual Malay WAV lengths. To resume an interrupted generation at a specific section, add `--start-scene scene-5`, for example. `--scene scene-5` generates only that section. Speech generation makes API requests; rebuilding the manifest, encoding, and decoding are local operations.

Optional independent transcription verification:

```powershell
node --env-file=.env.local scripts/check_narration.mjs --production-dir artifacts/video-malay --language ms-MY --transcribe
```

## Audio checks

All six final WAV files are valid 24 kHz mono 16-bit PCM, with no clipped samples or empty sections. Narration totals **178.68 seconds** before scene padding. Independent transcription preserved the core script content; normalized word error rate was approximately **1.62%**, including Sara/Sarah spelling, “ini/ni,” Ali/ahli, “dikemas kini/dikemaskini,” and the spoken rendering of Agents SDK. Automatic transcription supports completeness; it does not establish voice pleasantness or precise caption synchronization. The presenter can assess voice style while reviewing the video.

Generated video/audio and local evidence remain outside Git under ignored `artifacts/`. The script and production utilities are versioned. No competition submission is made by these utilities.
