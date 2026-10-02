#!/usr/bin/env bash
# Clone the spoken line from src/strings.ts into public/voice.wav (needs a local explore-tts checkout).
set -euo pipefail

cd "$(dirname "$0")/.."
TTS_DIR="${TTS_DIR:-$HOME/Explore/explore-tts}"
TEXT="$(sed -n "s/^ *spoken: '\(.*\)',$/\1/p" src/strings.ts)"
[ -n "$TEXT" ] || { echo "spoken line not found in src/strings.ts" >&2; exit 1; }

raw="$(mktemp -d)/voice.wav"
(cd "$TTS_DIR" && ./omni-voice-cli.sh --text "$TEXT" --output "$raw" --ref-audio ./yuler.sample.wav)

trim="silenceremove=start_periods=1:start_threshold=-45dB"
ffmpeg -y -loglevel error -i "$raw" -af "$trim,areverse,$trim,areverse,loudnorm=I=-16:TP=-1.5:LRA=11" -ar 44100 public/voice.wav
printf 'public/voice.wav: %ss\n' "$(ffprobe -v error -show_entries format=duration -of csv=p=0 public/voice.wav)"
