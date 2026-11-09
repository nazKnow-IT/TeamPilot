"""Render a narrated TeamPilot demo from authentic screenshot frames.

No screenshot, model, key, browser, or cloud access is performed here. The input
manifest points to already captured screenshots and already generated WAV audio.
"""
from __future__ import annotations

import argparse
import json
import math
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile
import wave

from PIL import Image, ImageDraw, ImageFont, ImageOps

WIDTH, HEIGHT = 1920, 1080
BG = "#F5F6F2"
TEAL = "#183630"
LIME = "#D4ED99"
INK = "#183630"
MUTED = "#77877C"
LEAD, TAIL = 0.35, 0.45


class RenderError(RuntimeError):
    pass


def ffmpeg_binary(explicit: str | None = None) -> str:
    if explicit:
        target = Path(explicit).expanduser().resolve()
        if not target.is_file():
            raise RenderError(f"FFmpeg executable was not found: {target}")
        return str(target)
    target = shutil.which("ffmpeg")
    if target:
        return target
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except (ImportError, RuntimeError) as exc:
        raise RenderError("FFmpeg is required. Install imageio-ffmpeg or pass --ffmpeg PATH.") from exc


def font(size: int, bold: bool = False):
    candidates = [
        Path(os.environ.get("WINDIR", "C:/Windows")) / "Fonts" / ("seguisb.ttf" if bold else "segoeui.ttf"),
        Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"),
    ]
    for candidate in candidates:
        if candidate.is_file():
            return ImageFont.truetype(str(candidate), size)
    return ImageFont.load_default(size=size)


FONTS = {"brand": font(35, True), "title": font(26, True), "small": font(20),
         "caption": font(34, True), "eyebrow": font(18, True), "demo": font(20, True)}


def fit_lines(text: str, face, max_width: int, max_lines: int = 2) -> list[str]:
    draw = ImageDraw.Draw(Image.new("RGB", (1, 1)))
    lines, current = [], ""
    for word in str(text).split():
        attempt = (current + " " + word).strip()
        if current and draw.textlength(attempt, font=face) > max_width:
            lines.append(current)
            current = word
        else:
            current = attempt
    if current:
        lines.append(current)
    if len(lines) > max_lines:
        # Titles may be abbreviated visually; the narration/captions are not.
        lines = lines[:max_lines]
        while lines[-1] and draw.textlength(lines[-1] + "…", font=face) > max_width:
            lines[-1] = lines[-1][:-1]
        lines[-1] += "…"
    return lines


def phrases(text: str, limit: int = 13) -> list[str]:
    """Readable phrase captions, approximate timing rather than forced alignment."""
    pieces = re.split(r"(?<=[.!?;])\s+", " ".join(str(text).split()))
    result = []
    for piece in pieces:
        words = piece.split()
        while words:
            # Keep phrases short enough for a two-line 1080p caption.
            take = min(limit, len(words))
            if len(words) > limit and len(words) - take < 4:
                take = max(5, take - (4 - (len(words) - take)))
            result.append(" ".join(words[:take]))
            words = words[take:]
    return result


def caption_spans(text: str, audio_duration: float) -> list[dict]:
    groups = phrases(text)
    total = sum(max(1, len(p.split())) for p in groups)
    position, result = LEAD, []
    for group in groups:
        duration = audio_duration * max(1, len(group.split())) / max(1, total)
        result.append({"start": position, "end": position + duration, "text": group})
        position += duration
    return result


def resolve_asset(base: Path, raw, label: str) -> Path:
    if not isinstance(raw, str) or not raw.strip():
        raise RenderError(f"Missing {label} path.")
    target = Path(raw).expanduser()
    target = (target if target.is_absolute() else base / target).resolve()
    if not target.is_file():
        raise RenderError(f"Missing {label}: {target}")
    return target


def run_checked(command: list[str], label: str):
    result = subprocess.run(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if result.returncode:
        detail = result.stderr.decode("utf-8", "replace")[-5000:]
        raise RenderError(f"{label} failed:\n{detail}")
    return result


def load_manifest(path: Path, work: Path, ffmpeg: str, fps: int) -> tuple[dict, list[dict], Path, float]:
    try:
        manifest = json.loads(path.read_text(encoding="utf-8-sig"))
    except (OSError, ValueError) as exc:
        raise RenderError(f"Cannot read manifest: {exc}") from exc
    if not isinstance(manifest, dict) or not isinstance(manifest.get("scenes"), list) or not manifest["scenes"]:
        raise RenderError("Manifest must contain a non-empty scenes array.")
    scenes, absolute_start, ids = [], 0.0, set()
    for index, raw in enumerate(manifest["scenes"]):
        if not isinstance(raw, dict):
            raise RenderError("Each scene must be an object.")
        sid = str(raw.get("id", f"scene-{index+1}"))
        if sid in ids:
            raise RenderError(f"Duplicate scene id: {sid}")
        ids.add(sid)
        narration = str(raw.get("narration", "")).strip()
        audio_path = resolve_asset(path.parent, raw.get("audio"), f"audio for {sid}")
        normalized = work / f"audio-{index:02d}.wav"
        run_checked([ffmpeg, "-hide_banner", "-loglevel", "error", "-y", "-i", str(audio_path),
                     "-ar", "48000", "-ac", "1", "-c:a", "pcm_s16le", str(normalized)], f"Audio normalization ({sid})")
        with wave.open(str(normalized), "rb") as reader:
            audio_duration = reader.getnframes() / reader.getframerate()
        if audio_duration < 0.1:
            raise RenderError(f"Narration is empty or too short in {sid}.")
        requested = float(raw.get("duration", 0) or 0)
        if not math.isfinite(requested) or requested < 0:
            raise RenderError(f"Invalid scene duration for {sid}.")
        duration = math.ceil(max(audio_duration + LEAD + TAIL, requested) * fps) / fps
        frames = raw.get("frames")
        if not isinstance(frames, list) or not frames:
            raise RenderError(f"At least one authentic screenshot is required for {sid}.")
        parsed_frames = []
        previous_at = -1.0
        for frame in frames:
            if not isinstance(frame, dict):
                raise RenderError(f"Invalid screenshot frame in {sid}.")
            at = float(frame.get("at", 0))
            if not math.isfinite(at) or at < 0 or at >= duration or at <= previous_at:
                raise RenderError(f"Frame timestamps in {sid} must increase and lie within 0–{duration:.2f}s.")
            screenshot = resolve_asset(path.parent, frame.get("path"), f"screenshot for {sid}")
            try:
                with Image.open(screenshot) as image:
                    image.verify()
            except Exception as exc:
                raise RenderError(f"Screenshot could not be decoded: {screenshot}") from exc
            parsed_frames.append({"path": screenshot, "at": at})
            previous_at = at
        if parsed_frames[0]["at"] != 0:
            raise RenderError(f"The first screenshot in {sid} must start at 0 seconds.")
        scenes.append({**raw, "id": sid, "title": str(raw.get("title", sid)), "narration": narration,
                       "normalized_audio": normalized, "audio_duration": audio_duration, "duration": duration,
                       "start": absolute_start, "frames": parsed_frames, "captions": caption_spans(narration, audio_duration),
                       "disclosure": bool(raw.get("disclosure", index in (0, len(manifest["scenes"]) - 1)))})
        absolute_start += duration
    if absolute_start > float(manifest.get("max_duration", 300)):
        raise RenderError(f"Video would be {absolute_start:.1f}s; the permitted maximum is {manifest.get('max_duration', 300)}s.")
    combined = work / "narration.wav"
    with wave.open(str(combined), "wb") as writer:
        writer.setnchannels(1)
        writer.setsampwidth(2)
        writer.setframerate(48000)
        for scene in scenes:
            writer.writeframes(b"\0\0" * round(LEAD * 48000))
            with wave.open(str(scene["normalized_audio"]), "rb") as reader:
                writer.writeframes(reader.readframes(reader.getnframes()))
            remaining = round(scene["duration"] * 48000) - round(LEAD * 48000) - round(scene["audio_duration"] * 48000)
            writer.writeframes(b"\0\0" * max(0, remaining))
    return manifest, scenes, combined, absolute_start


def base_frame(scene: dict, screenshot_path: Path, number: int, count: int) -> Image.Image:
    canvas = Image.new("RGB", (WIDTH, HEIGHT), BG)
    draw = ImageDraw.Draw(canvas)
    draw.rectangle((0, 0, WIDTH, 119), fill=TEAL)
    draw.rounded_rectangle((51, 30, 104, 84), radius=15, fill=LIME)
    draw.text((64, 32), "T", font=FONTS["brand"], fill=TEAL)
    draw.text((123, 35), "TeamPilot", font=FONTS["brand"], fill="white")
    draw.text((365, 35), f"{number:02d} / {count:02d}", font=FONTS["small"], fill="#AFC2B3")
    title_lines = fit_lines(scene["title"], FONTS["title"], 1020, 1)
    draw.text((488, 38), title_lines[0] if title_lines else "", font=FONTS["title"], fill="white")
    draw.rounded_rectangle((1743, 35, 1864, 79), radius=10, fill=LIME)
    draw.text((1769, 42), "DEMO", font=FONTS["demo"], fill=TEAL)

    # Large, faithful screenshot inset: no crop, stretching, fake controls or cursor.
    area = (56, 143, 1864, 902)
    draw.rounded_rectangle((area[0] - 2, area[1] - 2, area[2] + 2, area[3] + 2), radius=15, fill="#D9E1D5")
    draw.rounded_rectangle(area, radius=13, fill="#E8EDE4")
    with Image.open(screenshot_path) as raw:
        screen = ImageOps.exif_transpose(raw).convert("RGB")
        screen = ImageOps.contain(screen, (area[2] - area[0] - 6, area[3] - area[1] - 6), Image.Resampling.LANCZOS)
    x = area[0] + (area[2] - area[0] - screen.width) // 2
    y = area[1] + (area[3] - area[1] - screen.height) // 2
    canvas.paste(screen, (x, y))
    cut_label = str(scene.get("cut_label", "")).strip()
    if cut_label:
        label = fit_lines(cut_label, FONTS["small"], 1150, 1)[0]
        w = draw.textlength(label, font=FONTS["small"]) + 34
        draw.rounded_rectangle((77, 159, 77 + w, 202), radius=7, fill=TEAL)
        draw.text((94, 167), label, font=FONTS["small"], fill=LIME)
    if scene["disclosure"]:
        draw.text((58, 1038), "AI-generated narration · Authentic application captures", font=FONTS["eyebrow"], fill=MUTED)
    else:
        draw.text((58, 1038), "Student team coordination · Human review before changes", font=FONTS["eyebrow"], fill=MUTED)
    draw.text((1620, 1038), "AGENTIC AI DEMO", font=FONTS["eyebrow"], fill=MUTED)
    return canvas


def add_caption(base: Image.Image, caption: str, progress: float) -> bytes:
    canvas = base.copy()
    draw = ImageDraw.Draw(canvas)
    if caption:
        draw.rounded_rectangle((56, 921, 1864, 1023), radius=13, fill=TEAL)
        lines = fit_lines(caption, FONTS["caption"], 1690, 2)
        total_h = len(lines) * 42
        y = 971 - total_h // 2
        for line in lines:
            w = draw.textlength(line, font=FONTS["caption"])
            draw.text(((WIDTH - w) / 2, y), line, font=FONTS["caption"], fill="white")
            y += 42
    draw.rectangle((0, 1074, WIDTH, 1080), fill="#E1E8D8")
    draw.rectangle((0, 1074, round(WIDTH * min(1, max(0, progress))), 1080), fill="#83A85C")
    return canvas.tobytes()


def srt_time(seconds: float) -> str:
    ms = round(seconds * 1000)
    h, ms = divmod(ms, 3600000)
    m, ms = divmod(ms, 60000)
    s, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def render(manifest_path: Path, output: Path, fps: int, ffmpeg: str):
    if not 1 <= fps <= 60:
        raise RenderError("FPS must be between 1 and 60.")
    if not manifest_path.is_file():
        raise RenderError(f"Manifest does not exist: {manifest_path}")
    if output.suffix.lower() != ".mp4":
        raise RenderError("The output must have an .mp4 extension.")
    output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="teampilot-render-", dir=str(output.parent)) as raw_work:
        work = Path(raw_work).resolve()
        if not work.is_relative_to(output.parent.resolve()):
            raise RenderError("Render workspace escaped the output directory.")
        manifest, scenes, combined_audio, total = load_manifest(manifest_path, work, ffmpeg, fps)
        command = [ffmpeg, "-hide_banner", "-loglevel", "error", "-y", "-f", "rawvideo", "-vcodec", "rawvideo",
                   "-pix_fmt", "rgb24", "-s", f"{WIDTH}x{HEIGHT}", "-r", str(fps), "-i", "pipe:0", "-i", str(combined_audio),
                   "-c:v", "libx264", "-preset", "veryfast", "-tune", "stillimage", "-crf", "19", "-pix_fmt", "yuv420p",
                   "-c:a", "aac", "-b:a", "160k", "-ar", "48000", "-movflags", "+faststart", "-shortest",
                   "-metadata", "title=" + str(manifest.get("title", "TeamPilot demo")), str(output)]
        error_path = work / "ffmpeg.log"
        srt, caption_index = [], 1
        with error_path.open("wb") as error_stream:
            process = subprocess.Popen(command, stdin=subprocess.PIPE, stdout=subprocess.DEVNULL, stderr=error_stream)
            try:
                global_frames = 0
                for number, scene in enumerate(scenes, 1):
                    print(json.dumps({"rendering": scene["id"], "duration": round(scene["duration"], 2)}, ensure_ascii=False), flush=True)
                    for cap in scene["captions"]:
                        srt.extend([str(caption_index), f"{srt_time(scene['start'] + cap['start'])} --> {srt_time(scene['start'] + cap['end'])}", cap["text"], ""])
                        caption_index += 1
                    screenshot_index, cap_index, previous_key, cached_bytes = 0, 0, None, None
                    screenshot_key, base = None, None
                    for local_frame in range(round(scene["duration"] * fps)):
                        seconds = local_frame / fps
                        while screenshot_index + 1 < len(scene["frames"]) and seconds >= scene["frames"][screenshot_index + 1]["at"]:
                            screenshot_index += 1
                        while cap_index + 1 < len(scene["captions"]) and seconds >= scene["captions"][cap_index]["end"]:
                            cap_index += 1
                        cap = scene["captions"][cap_index] if scene["captions"] else None
                        caption = cap["text"] if cap and cap["start"] <= seconds < cap["end"] else ""
                        screenshot = scene["frames"][screenshot_index]["path"]
                        if screenshot != screenshot_key:
                            base = base_frame(scene, screenshot, number, len(scenes))
                            screenshot_key = screenshot
                        # Quantized progress avoids re-rasterizing a static frame 24 times a second.
                        tick = int((scene["start"] + seconds) * 2)
                        cache_key = (screenshot, caption, tick)
                        if cache_key != previous_key:
                            cached_bytes = add_caption(base, caption, tick / 2 / total)
                            previous_key = cache_key
                        process.stdin.write(cached_bytes)
                        global_frames += 1
                process.stdin.close()
                code = process.wait()
            except (BrokenPipeError, OSError):
                process.kill()
                process.wait()
                raise RenderError("Video encoding failed:\n" + error_path.read_text(encoding="utf-8", errors="replace")[-5000:])
            finally:
                if process.poll() is None:
                    process.kill()
                    process.wait()
            if code:
                raise RenderError("Video encoding failed:\n" + error_path.read_text(encoding="utf-8", errors="replace")[-5000:])
        output.with_suffix(".srt").write_text("\n".join(srt), encoding="utf-8")
        report = {"output": str(output), "width": WIDTH, "height": HEIGHT, "fps": fps,
                  "duration_seconds": round(total, 3), "scene_count": len(scenes), "caption_count": caption_index - 1,
                  "video_codec": "h264", "audio_codec": "aac", "narration": "AI generated", "caption_timing": "approximate phrase timing",
                  "screenshots": "Authentic captures supplied in manifest; aspect ratio preserved", "frame_count": global_frames}
        output.with_suffix(".render.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
        print(json.dumps(report), flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--fps", type=int, default=24)
    parser.add_argument("--ffmpeg")
    args = parser.parse_args()
    try:
        render(args.manifest.expanduser().resolve(), args.output.expanduser().resolve(), args.fps, ffmpeg_binary(args.ffmpeg))
    except (RenderError, ValueError, OSError, wave.Error) as exc:
        print(f"Render error: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
