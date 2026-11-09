"""Split a combined narration at reviewed quiet boundaries without dropping samples."""
from __future__ import annotations

import argparse
from array import array
import json
import math
from pathlib import Path
import sys
import wave


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--production-dir", type=Path, required=True)
    parser.add_argument("--boundaries", required=True,
                        help="Comma-separated seconds at quiet chapter boundaries")
    args = parser.parse_args()
    base = args.production_dir.resolve()
    scenes = json.loads((base / "narration.json").read_text(encoding="utf-8"))
    cuts = [float(value) for value in args.boundaries.split(",")]
    source = base / "audio" / "narration-full.wav"
    with wave.open(str(source), "rb") as reader:
        rate = reader.getframerate()
        params = reader.getparams()
        raw = reader.readframes(reader.getnframes())
    if params.nchannels != 1 or params.sampwidth != 2 or params.comptype != "NONE":
        raise ValueError("Expected mono 16-bit PCM narration")
    samples = array("h", raw)
    if sys.byteorder != "little":
        samples.byteswap()
    duration = len(samples) / rate
    if (len(cuts) != len(scenes) - 1 or
            any(not math.isfinite(t) or t <= 0 or t >= duration for t in cuts) or
            any(a >= b for a, b in zip(cuts, cuts[1:]))):
        raise ValueError("Supply one increasing, finite interior boundary per chapter transition")
    positions = [0] + [round(t * rate) for t in cuts] + [len(samples)]
    levels = []
    for second, position in zip(cuts, positions[1:-1]):
        window = samples[max(0, position - round(rate * .01)):position + round(rate * .01)]
        rms = math.sqrt(sum(value * value for value in window) / len(window))
        if rms > 200:
            raise ValueError(f"Boundary {second}s is not quiet (RMS {rms:.1f}); review it")
        levels.append({"second": second, "rms": round(rms, 3)})
    report = {"source": str(source), "source_seconds": duration,
              "quiet_boundaries": levels, "scenes": []}
    for item, start, end in zip(scenes, positions, positions[1:]):
        if end - start < rate:
            raise ValueError("A scene would be shorter than one second")
        target = base / "audio" / (item["id"] + ".wav")
        with wave.open(str(target), "wb") as writer:
            writer.setparams(params)
            writer.writeframes(raw[start * 2:end * 2])
        report["scenes"].append({"id": item["id"], "start": start / rate,
                                  "end": end / rate, "seconds": (end - start) / rate})
    report["preserved_samples"] = sum(b - a for a, b in zip(positions, positions[1:])) == len(samples)
    (base / "audio" / "split-report.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report))


if __name__ == "__main__":
    main()
