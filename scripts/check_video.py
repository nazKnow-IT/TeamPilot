"""Validate encoded demo metadata and decode the video with FFmpeg."""
from __future__ import annotations
import argparse
import json
from pathlib import Path
import re
import subprocess
import sys

sys.dont_write_bytecode = True
from render_video import ffmpeg_binary, RenderError


def check(path: Path, ffmpeg: str, full: bool = False):
    if not path.is_file() or path.stat().st_size < 1000:
        raise RenderError(f"Video is missing or empty: {path}")
    probe = subprocess.run([ffmpeg, "-hide_banner", "-i", str(path)], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    details = probe.stderr.decode("utf-8", "replace")
    duration_match = re.search(r"Duration:\s+(\d+):(\d+):(\d+(?:\.\d+)?)", details)
    if not duration_match:
        raise RenderError("FFmpeg could not read the video duration.\n" + details[-2000:])
    h, m, s = duration_match.groups()
    duration = int(h) * 3600 + int(m) * 60 + float(s)
    if duration <= 0 or duration > 300:
        raise RenderError(f"Duration is outside the competition limit: {duration}s")
    for pattern, label in [(r"Video:\s+h264", "H.264 video"), (r"1920x1080", "1920×1080 resolution"), (r"Audio:\s+aac", "AAC audio"), (r"yuv420p", "compatible pixel format")]:
        if not re.search(pattern, details):
            raise RenderError(f"Expected {label} was not detected.\n" + details[-2000:])
    command = [ffmpeg, "-hide_banner", "-v", "error", "-i", str(path)]
    if not full:
        command += ["-t", "2"]
    command += ["-f", "null", "-"]
    decoded = subprocess.run(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if decoded.returncode or decoded.stderr.strip():
        raise RenderError("Decode errors:\n" + decoded.stderr.decode("utf-8", "replace")[-4000:])
    report = {"file": str(path), "duration_seconds": round(duration, 3), "bytes": path.stat().st_size,
              "video_codec": "h264", "resolution": "1920x1080", "pixel_format": "yuv420p", "audio_codec": "aac",
              "decode_verified": "entire file" if full else "first 2 seconds", "passed": True}
    path.with_suffix(".validation.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("video", type=Path)
    parser.add_argument("--ffmpeg")
    parser.add_argument("--full", action="store_true", help="Decode the entire video, not only the first two seconds")
    args = parser.parse_args()
    try:
        check(args.video.expanduser().resolve(), ffmpeg_binary(args.ffmpeg), args.full)
    except (RenderError, OSError) as exc:
        print(f"Validation error: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
