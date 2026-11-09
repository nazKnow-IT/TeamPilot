# Local video rendering

The renderer composes authentic application screenshots and supplied WAV narration into a 1920×1080 H.264/AAC MP4. It never captures a screen, calls a model, accesses keys, creates a fake cursor, or changes the application.

Requires Python, Pillow, and FFmpeg. The `imageio-ffmpeg` package can supply the FFmpeg binary. A system installation or an explicit `--ffmpeg` path is also supported.

```powershell
python scripts/render_video.py --manifest artifacts/video/manifest.json --output artifacts/video/TeamPilot-demo.mp4
python scripts/check_video.py artifacts/video/TeamPilot-demo.mp4 --full
```

Manifest asset paths resolve relative to the manifest's directory. Absolute local paths are also accepted.

```json
{
  "title": "TeamPilot — From group work to teamwork",
  "max_duration": 300,
  "scenes": [
    {
      "id": "intro",
      "title": "A clearer next step",
      "narration": "This is TeamPilot, an AI coordinator for student group projects.",
      "audio": "audio/intro.wav",
      "frames": [{"path": "frames/overview.jpg", "at": 0}],
      "disclosure": true
    },
    {
      "id": "recovery",
      "title": "Recover when availability changes",
      "narration": "The agent checks the impact and stages a recovery plan for review.",
      "audio": "audio/recovery.wav",
      "frames": [
        {"path": "frames/run-start.jpg", "at": 0},
        {"path": "frames/tool-result.jpg", "at": 3.5}
      ],
      "cut_label": "Waiting time shortened"
    }
  ]
}
```

Each scene requires a WAV file and at least one screenshot. The first screenshot begins at `at: 0`; later frame timestamps must increase and stay inside the scene. Screenshots are contained without cropping or distortion in a large inset. Landscape viewport captures around 1440×760 or 1280×720 work well; a tall full-page capture makes interface text too small.

The WAV duration plus 0.35 seconds of leading silence and 0.45 seconds of trailing silence determines the scene duration, rounded to a full frame. An optional scene `duration` may make it longer but never truncates speech. Any additional duration is silent tail time. Total length may not exceed `max_duration` (default 300 seconds).

Phrase captions in the supplied narration language are burned in and also exported to `.srt`. Their timestamps are approximate, distributed across the supplied narration duration; they are not forced-aligned word timestamps. A persistent DEMO label is added. First and last scenes disclose AI-generated narration by default. Set `disclosure: true` on other scenes to show that label as well. A manifest-level `labels` object may localize `disclosure`, `footer`, and `demo_footer`; English is the default. An optional scene `subtitle` displays a compact technology line beneath the chapter heading.

`cut_label` must accurately describe an edited wait or changed playback rate. Do not label a static screenshot sequence as an unedited screen recording. The renderer faithfully uses only supplied frames; it does not fabricate agent activity or UI states.

Outputs are MP4, SRT, `.render.json` and, after validation, `.validation.json`. Full validation decodes the entire file and verifies duration, H.264, AAC, 1080p and yuv420p. Listening to the narration and visually checking the actual finished video remain required human/agent QA steps; successful encoding alone does not prove a good edit.
