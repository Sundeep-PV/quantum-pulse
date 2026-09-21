#!/usr/bin/env python3
"""
Lesson audio synthesis pipeline for Quantum Ready Pulse.

Reads the 21-day curriculum from content/lessons.json, narrates each day's
articleBody with Kokoro-82M (local, offline TTS), and writes a standardized
.m4b per day. Optionally uploads the results to the Cloudflare R2 bucket
that edge/access-worker streams from.

This is a batch job, run by an engineer when content changes -- NOT a
request-time service. See README.md in this directory for rationale.

Usage:
    python synthesize_lessons.py                 # synthesize all 21 days locally
    python synthesize_lessons.py --day 5          # re-synthesize a single day
    python synthesize_lessons.py --upload-r2       # synthesize + upload all to R2
"""

import argparse
import json
import os
import subprocess
import sys

import numpy as np
import soundfile as sf

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # content/
LESSONS_JSON = os.path.join(ROOT, "lessons.json")
AUDIO_DIR = os.path.join(ROOT, "audio")

VOICE_PROFILE = "am_adam"   # entrepreneurial, professional tone -- matches brand voice
PLAYBACK_SPEED = 1.0
SAMPLE_RATE = 24000


def load_lessons():
    with open(LESSONS_JSON, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data["lessons"]


def synthesize_day(pipeline, lesson: dict) -> str:
    """Synthesize one lesson's articleBody to a .wav, then containerize to .m4b via ffmpeg."""
    day = lesson["day"]
    text = lesson["articleBody"]
    audio_filename = lesson["audioFile"]  # e.g. "day-05.m4b"

    if text.strip().startswith("PLACEHOLDER"):
        print(f"[!] Day {day}: articleBody is still a placeholder -- skipping real narration, "
              f"writing a short silent stub so the pipeline is exercisable end-to-end.")
        text = f"Placeholder audio for day {day}. Replace lessons.json articleBody before launch."

    os.makedirs(AUDIO_DIR, exist_ok=True)
    wav_path = os.path.join(AUDIO_DIR, audio_filename.replace(".m4b", ".wav"))
    m4b_path = os.path.join(AUDIO_DIR, audio_filename)

    print(f"[+] Synthesizing day {day}/21: {lesson['title']}")
    audio_chunk_generator = pipeline(
        text,
        voice=VOICE_PROFILE,
        speed=PLAYBACK_SPEED,
        split_pattern=r"\n+",
    )

    collected_audio_segments = []
    for _, _, audio_segment in audio_chunk_generator:
        collected_audio_segments.append(audio_segment)

    if not collected_audio_segments:
        print(f"[-] Warning: no audio synthesized for day {day}")
        return ""

    consolidated_waveform = np.concatenate(collected_audio_segments)
    sf.write(wav_path, consolidated_waveform, SAMPLE_RATE)

    # Containerize to .m4b (AAC, 64k) for small file size + native WhatsApp/iOS/Android playback
    subprocess.run(
        ["ffmpeg", "-y", "-i", wav_path, "-c:a", "aac", "-b:a", "64k", m4b_path],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.STDOUT,
    )
    os.remove(wav_path)
    print(f"[✓] Wrote {m4b_path}")
    return m4b_path


def upload_to_r2(local_path: str, bucket: str):
    """Upload one file to the R2 bucket via the S3-compatible API (boto3)."""
    import boto3

    account_id = os.environ["CF_ACCOUNT_ID"]
    access_key = os.environ["R2_ACCESS_KEY_ID"]
    secret_key = os.environ["R2_SECRET_ACCESS_KEY"]

    client = boto3.client(
        "s3",
        endpoint_url=f"https://{account_id}.r2.cloudflarestorage.com",
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
        region_name="auto",
    )
    key = os.path.basename(local_path)
    print(f"[+] Uploading {key} to R2 bucket '{bucket}'...")
    client.upload_file(local_path, bucket, key)
    print(f"[✓] Uploaded {key}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--day", type=int, default=None, help="Synthesize only this day (1-21)")
    parser.add_argument("--upload-r2", action="store_true", help="Upload results to Cloudflare R2")
    parser.add_argument("--bucket", default="quantum-ready-pulse-audio", help="R2 bucket name")
    args = parser.parse_args()

    try:
        from kokoro import KPipeline
    except ImportError:
        print("Kokoro isn't installed. Run: pip install -r requirements.txt", file=sys.stderr)
        sys.exit(1)

    lessons = load_lessons()
    if args.day:
        lessons = [l for l in lessons if l["day"] == args.day]
        if not lessons:
            print(f"No lesson found for day {args.day}", file=sys.stderr)
            sys.exit(1)

    pipeline = KPipeline(lang_code="a")  # American English

    print("=" * 60)
    print("STARTING LESSON AUDIO SYNTHESIS")
    print("=" * 60)

    written = []
    for lesson in lessons:
        path = synthesize_day(pipeline, lesson)
        if path:
            written.append(path)

    print("=" * 60)
    print(f"SYNTHESIS COMPLETE -- {len(written)}/{len(lessons)} day(s) written")
    print("=" * 60)

    if args.upload_r2:
        for path in written:
            upload_to_r2(path, args.bucket)


if __name__ == "__main__":
    main()
