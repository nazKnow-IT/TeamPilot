# TeamPilot — English with the approved Malaysian male voice

This version retains **Achird**, the male voice approved in the Malay revision, with the same friendly lower-middle register and relaxed presentation style. The transcript, chapter titles, captions, and disclosure text are in English. The voice direction requests a natural Malaysian Malay-influenced English accent and explicitly keeps the spoken language English.

The completed video is **2 minutes 37.33 seconds**, 1920×1080 at 24 fps, H.264 video with AAC audio, and 6,146,227 bytes.

## Local deliverables

- `artifacts/video-english-malaysian/TeamPilot-demo-english-malaysian-male.mp4`
- `artifacts/video-english-malaysian/TeamPilot-demo-english-malaysian-male.srt`
- Adjacent `.render.json` and `.validation.json` reports.
- `audio/narration-full.wav` and `audio/narration-full.json` — the continuous source narration and exact voice/style settings.
- `audio/scene-1.wav` through `audio/scene-6.wav` — reviewed chapter splits.
- `audio/split-report.json` — quiet boundary levels, times, durations, and sample-preservation result.
- `audio-transcript-qa.json`, `audio-transcript.txt`, and `chapter-edges-transcript.txt` — automatic audio verification.

The original English and Malay versions remain separately available. The app captures and the verified demonstration facts are unchanged. AI-generated narration remains disclosed.

## Production and verification

Gemini `gemini-3.8-flash-tts` generated the full English script in one request using Achird and Malaysian English delivery instructions. Long pauses separate chapters. The combined request maintains one continuous voice and reduces the number of speech API requests.

The source contains 152.40 seconds of narration. Five reviewed quiet cuts at **20.38, 43.61, 63.77, 97.95, and 123.20 seconds** produce six chapters without removing samples. Boundary RMS amplitudes range from 3.76 to 33.37 out of 32768. Independent transcription of chapter opening/ending excerpts confirmed that every split begins and ends with the intended paragraph.

All six WAV files are valid 24 kHz mono 16-bit PCM, contain nonempty speech, and have zero clipped samples. Independent full-script transcription found four word edits across 424 normalized words, approximately **0.94%**: ask/asked, Sara/Sarah, reviewed/review, and Agents/agent's. No missing paragraph or spoken pause tag was detected.

Complete-file video decoding passed. Opening, agent, approval, and ending frames were inspected for readable English captions, authentic captures, correct approval sequence, and disclosure labels. Caption timing is approximate phrase timing. Automatic checks do not assess accent nuance or voice pleasantness; the presenter can review these in the finished video.

## Reproduce the delivered edit

With the delivered WAVs and existing authentic screenshots present:

```powershell
python scripts/build_video_manifest.py --source docs/VIDEO_SCRIPT_FINAL.md --language en-MY --frames-dir ../video/frames --output-dir artifacts/video-english-malaysian
python scripts/render_video.py --manifest artifacts/video-english-malaysian/manifest.json --output artifacts/video-english-malaysian/TeamPilot-demo-english-malaysian-male.mp4
python scripts/check_video.py artifacts/video-english-malaysian/TeamPilot-demo-english-malaysian-male.mp4 --full
```

To deliberately generate a new source narration through the configured Gemini connection:

```powershell
node --env-file=.env.local scripts/generate_voice.mjs --language en-MY --voice Achird --model gemini-3.8-flash-tts --production-dir artifacts/video-english-malaysian --combined
```

A newly generated take needs newly reviewed quiet boundaries. The delivered track used this split command:

```powershell
python scripts/split_video_narration.py --production-dir artifacts/video-english-malaysian --boundaries 20.38,43.61,63.77,97.95,123.2
```

Rebuild the manifest after splitting so capture transitions scale to the actual chapter lengths. The splitting utility validates quiet cuts and preserves every PCM sample. No credentials are stored in source control or included in the video. Generated media remain in the ignored local artifacts directory.
