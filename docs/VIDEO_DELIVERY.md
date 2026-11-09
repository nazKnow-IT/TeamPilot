# TeamPilot narrated demo

The revised male Malay version is documented in [VIDEO_MALAY_DELIVERY.md](VIDEO_MALAY_DELIVERY.md) and stored in `artifacts/video-malay/TeamPilot-demo-malay-male.mp4`.

The video follows a fictional campus recycling project through a real Gemini delay-recovery run. It shows the existing brief and capacity, Ali's three-day absence, actual application tool results, a staged proposal, human approval, the updated board, and export options.

The final export is **2 minutes 45.38 seconds**, 1920×1080 at 24 fps, H.264 video with AAC audio, and 6,245,582 bytes. Complete-file decoding passed. Opening, middle, proposal, and ending frames were visually inspected for caption legibility, faithful screenshots, and disclosure labels. The six narration files contain no clipped samples; an independent automatic transcription confirmed the script apart from two spelling variants. Voice pleasantness and exact caption synchronization still benefit from presenter review.

## Files

The local deliverables are in `artifacts/video/`:

- `TeamPilot-demo.mp4` — narrated 1080p demonstration.
- `TeamPilot-demo.srt` — English phrase captions, also burned into the video.
- `TeamPilot-demo.render.json` — actual scene durations and composition information.
- `TeamPilot-demo.validation.json` — codec, resolution, duration, and complete-file decode result.
- `manifest.json`, `narration.json`, `frames/`, and `audio/` — editable local production inputs.

The production scripts and narration are versioned in Git. Generated media, screenshots, and audio remain local under the ignored `artifacts/` directory. API credentials are not included in Git or video footage.

## Voice and editing

The English narration uses Google's prebuilt Sulafat voice with `gemini-3.8-flash-lite-tts`. Its direction is warm, clear, and conversational, with natural pauses and restrained expression. It does not imitate a named person. AI-generated narration is disclosed on screen in the opening and ending scenes.

This is an edited sequence of authentic application captures, with phrase captions and scene changes. The live agent sequence is labeled as a recorded run with waiting time shortened. No fabricated cursor, simulated successful result, or account/key screen is included. Background music is omitted to keep the speech clear.

The application itself uses `gemini-3.1-flash-lite`; this is distinct from the speech-generation model. Actual tool calls during capture were `read_project`, `evaluate_delay`, and `propose_plan`. All five tasks and fourteen estimated hours were preserved. The survey task moved from Ali to Sara only after approval was captured.

## Reproduce the edit

With the existing captured frames and narration WAVs, run these commands from the TeamPilot project directory:

```powershell
python scripts/build_video_manifest.py
python scripts/render_video.py --manifest artifacts/video/manifest.json --output artifacts/video/TeamPilot-demo.mp4
python scripts/check_video.py artifacts/video/TeamPilot-demo.mp4 --full
```

Python requires Pillow and FFmpeg; `imageio-ffmpeg` can supply the encoder. The scripts do not upload or submit the result.

To deliberately regenerate speech after editing the script, first rebuild the manifest, then run the following with the locally saved Gemini key. This makes new requests to Google:

```powershell
node --env-file=.env.local scripts/generate_voice.mjs
```

The final voice style, names, pacing, and competition submission details should be reviewed by the presenter before upload. No competition submission has been made.
