"""Build the six-scene video/narration inputs from the reviewed Markdown script.

Run from any working directory. Only generated JSON under artifacts/video is
written; audio and captured frames are produced by the other video steps.
"""

from __future__ import annotations

import argparse
import json
import re
import wave
from pathlib import Path


SCENE_HEADING = re.compile(r"^### Scene (\d+)\s+—\s+([^—]+)—\s+(.+)$", re.MULTILINE)
TECHNOLOGY_SUBTITLE = (
    "Google Gemini 3.1 Flash-Lite · OpenAI Agents SDK · Zod · "
    "custom JavaScript scheduler · Node.js"
)
CAPTURE_SEQUENCE = {
    1: [("scene-1.jpg", 0)],
    2: [("scene-2.jpg", 0), ("team-capacity.jpg", 10), ("scene-3.jpg", 19)],
    3: [("scene-3.jpg", 0), ("goal-entered.jpg", 12)],
    4: [("scene-4.jpg", 0), ("tool-evidence.jpg", 5),
        ("agent-completed.jpg", 13), ("scene-5.jpg", 21),
        ("proposal-allocations.jpg", 28)],
    5: [("scene-5.jpg", 0), ("proposal-allocations.jpg", 7),
        ("applied-board.jpg", 13), ("updated-schedule.jpg", 18),
        ("export-options.jpg", 23)],
    6: [("scene-6.jpg", 0)],
}
REFERENCE_AUDIO_SECONDS = {1: 22.92, 2: 24.04, 3: 21.96, 4: 35.56, 5: 27.28, 6: 28.68}


def extract_scenes(markdown: str) -> list[dict[str, str]]:
    headings = list(SCENE_HEADING.finditer(markdown))
    if [int(match.group(1)) for match in headings] != list(range(1, 7)):
        raise ValueError("Expected exactly six ordered Scene 1–6 headings.")

    scenes: list[dict[str, str]] = []
    for index, heading in enumerate(headings):
        end = headings[index + 1].start() if index + 1 < len(headings) else len(markdown)
        block = markdown[heading.end():end]
        paragraphs = re.findall(r"^> (.+)$", block, re.MULTILINE)
        if len(paragraphs) != 1:
            raise ValueError(f"Scene {index + 1} must contain one quoted narration paragraph.")
        text = re.sub(r"\bTeamPilot\b", "Team Pilot", paragraphs[0].strip())
        title = heading.group(3).strip()
        title = title[:1].upper() + title[1:]
        scenes.append({"id": f"scene-{index + 1}", "title": title, "text": text})
    return scenes


def build_manifest(narration: list[dict[str, str]], language: str = "en-US",
                   frames_dir: str = "frames", output: Path | None = None) -> dict:
    scenes = []
    for number, item in enumerate(narration, start=1):
        scale = 1.0
        audio = output / "audio" / f"{item['id']}.wav" if output else None
        if language != "en-US" and audio and audio.is_file():
            with wave.open(str(audio), "rb") as reader:
                scale = reader.getnframes() / reader.getframerate() / REFERENCE_AUDIO_SECONDS[number]
        scene = {
            "id": item["id"],
            "title": item["title"],
            "narration": item["text"],
            "audio": f"audio/{item['id']}.wav",
            "frames": [{"path": f"{frames_dir.rstrip('/')}/{name}", "at": round(at * scale, 3)}
                       for name, at in CAPTURE_SEQUENCE[number]],
            "disclosure": number in (1, 6),
        }
        if number == 4:
            scene["cut_label"] = ("Demo sebenar dirakam · masa menunggu dipendekkan"
                                  if language == "ms-MY" else "Recorded live run · waiting time shortened")
        if number == 6:
            scene["subtitle"] = TECHNOLOGY_SUBTITLE
        scenes.append(scene)
    # No fixed durations: the renderer must use the actual WAV lengths.
    manifest = {"title": "TeamPilot — Group Project Coordination Agent", "scenes": scenes,
                "language": language}
    if language == "ms-MY":
        manifest["title"] = "TeamPilot — Ejen AI Penyelarasan Projek Berkumpulan"
        manifest["labels"] = {
            "disclosure": "Narasi dijana AI · Paparan aplikasi sebenar",
            "footer": "Projek berkumpulan · Semakan manusia sebelum perubahan",
            "demo_footer": "DEMO EJEN AI",
        }
    return manifest


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    default_root = Path(__file__).resolve().parents[1]
    parser.add_argument("--project-root", type=Path, default=default_root)
    parser.add_argument("--output-dir", type=Path)
    parser.add_argument("--source", type=Path, help="Narration Markdown; defaults to the English final script")
    parser.add_argument("--language", default="en-US", choices=("en-US", "ms-MY", "en-MY"))
    parser.add_argument("--frames-dir", default="frames", help="Frame path relative to the generated manifest")
    args = parser.parse_args()
    root = args.project_root.resolve()
    output = args.output_dir.resolve() if args.output_dir else root / "artifacts" / "video"
    source = args.source.resolve() if args.source else root / "docs" / "VIDEO_SCRIPT_FINAL.md"
    narration = extract_scenes(source.read_text(encoding="utf-8-sig"))
    manifest = build_manifest(narration, args.language, args.frames_dir, output)
    output.mkdir(parents=True, exist_ok=True)
    for filename, payload in (("narration.json", narration), ("manifest.json", manifest)):
        (output / filename).write_text(
            json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )
    word_counts = {
        scene["id"]: len(re.findall(r"\S+", scene["text"])) for scene in narration
    }
    print(json.dumps({"output": str(output), "scene_words": word_counts,
                      "total_words": sum(word_counts.values())}, ensure_ascii=False))


if __name__ == "__main__":
    main()
