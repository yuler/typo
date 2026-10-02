# /// script
# dependencies = ["numpy", "scipy"]
# ///
"""Synthesize the intro soundtrack and UI sound effects into apps/intro-video/public/audio/."""

from pathlib import Path

import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt

SR = 44100
BPM = 104
BEAT = 60 / BPM
BAR = 4 * BEAT
LENGTH = 23.0
OUT = Path(__file__).resolve().parent.parent / "public" / "audio"
rng = np.random.default_rng(7)


def t_axis(seconds):
    return np.arange(int(seconds * SR)) / SR


def hz(midi):
    return 440.0 * 2 ** ((midi - 69) / 12)


def filt(x, kind, cutoff, order=2):
    return sosfilt(butter(order, cutoff, btype=kind, fs=SR, output="sos"), x)


def place(track, sound, at, gain=1.0):
    tail = min(len(sound), int(0.01 * SR))
    sound = sound.copy()
    sound[-tail:] *= np.linspace(1, 0, tail)
    start = int(at * SR)
    end = min(len(track), start + len(sound))
    if start < len(track):
        track[start:end] += sound[: end - start] * gain


def keys(midi, seconds=1.6):
    t = t_axis(seconds)
    f = hz(midi)
    tone = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(4 * np.pi * f * t) * np.exp(-t * 6) + 0.08 * np.sin(6 * np.pi * f * t)
    env = np.minimum(1, t / 0.006) * np.exp(-t * 2.6)
    return tone * env


def pad(midi, seconds):
    t = t_axis(seconds)
    f = hz(midi)
    tone = sum(np.sin(2 * np.pi * f * (1 + d) * t) for d in (-0.003, 0, 0.003)) / 3
    env = np.minimum(1, t / 0.6) * np.minimum(1, (seconds - t) / 0.6)
    return filt(tone, "lowpass", 1800) * env


def bass(midi, seconds=0.5):
    t = t_axis(seconds)
    f = hz(midi)
    tone = np.sin(2 * np.pi * f * t) + 0.25 * np.sin(4 * np.pi * f * t)
    return tone * np.minimum(1, t / 0.004) * np.exp(-t * 5)


def pluck(midi, seconds=0.45):
    t = t_axis(seconds)
    f = hz(midi)
    tri = 2 / np.pi * np.arcsin(np.sin(2 * np.pi * f * t))
    return tri * np.minimum(1, t / 0.003) * np.exp(-t * 9)


def kick():
    t = t_axis(0.3)
    freq = 45 + 85 * np.exp(-t * 28)
    return np.sin(2 * np.pi * np.cumsum(freq) / SR) * np.exp(-t * 11)


def snap():
    t = t_axis(0.18)
    return filt(rng.standard_normal(len(t)), "bandpass", [1200, 5000]) * np.exp(-t * 30)


def shaker():
    t = t_axis(0.05)
    return filt(rng.standard_normal(len(t)), "highpass", 7000) * np.minimum(1, t / 0.002) * np.exp(-t * 90)


CHORDS = [  # C, G, Am, F voicings (root for bass, notes for keys)
    (36, [60, 64, 67, 71]),
    (43, [59, 62, 67, 69]),
    (45, [60, 64, 69, 71]),
    (41, [60, 65, 69, 72]),
]


def music():
    n = int(LENGTH * SR)
    mix = {name: np.zeros(n) for name in ("keys", "pad", "bass", "drums", "pluck")}
    bars = int(np.ceil(LENGTH / BAR))
    for b in range(bars):
        root, notes = CHORDS[b % 4]
        start = b * BAR
        outro = start >= LENGTH - BAR
        for note in notes:
            place(mix["pad"], pad(note - 12, BAR + 0.3), start, 0.12)
        for beat in (0, 1.5, 3):
            for note in notes:
                place(mix["keys"], keys(note), start + beat * BEAT, 0.09)
        if b >= 1 and not outro:
            place(mix["bass"], bass(root), start, 0.55)
            place(mix["bass"], bass(root), start + 2.5 * BEAT, 0.4)
        if b >= 2 and not outro:
            for beat in (0, 2):
                place(mix["drums"], kick(), start + beat * BEAT, 0.6)
            for beat in (1, 3):
                place(mix["drums"], snap(), start + beat * BEAT, 0.12)
            for step in range(8):
                place(mix["drums"], shaker(), start + step * BEAT / 2, 0.05 if step % 2 else 0.08)
        if b >= 3 and not outro:
            arp = [notes[0] + 12, notes[2] + 12, notes[1] + 12, notes[3] + 12]
            for step in range(8):
                place(mix["pluck"], pluck(arp[step % 4]), start + step * BEAT / 2, 0.07)

    out = sum(mix.values())
    t = np.arange(n) / SR
    out *= np.minimum(1, t / 1.2) * np.minimum(1, (LENGTH - t) / 2.5)
    return out / np.max(np.abs(out)) * 0.89


def click():
    t = t_axis(0.05)
    body = np.sin(2 * np.pi * 1900 * t) * np.exp(-t * 160)
    tap = filt(rng.standard_normal(len(t)), "highpass", 3000) * np.exp(-t * 400) * 0.4
    return (body + tap) * 0.8


def whoosh(seconds=0.7):
    t = t_axis(seconds)
    noise = rng.standard_normal(len(t))
    chunks = np.array_split(noise, 40)
    out = np.concatenate([
        filt(c, "bandpass", [300 + 2500 * np.sin(np.pi * i / 40), 900 + 5000 * np.sin(np.pi * i / 40)])
        for i, c in enumerate(chunks)
    ])
    env = np.sin(np.pi * t / seconds) ** 2
    return out * env * 0.5


def pop():
    t = t_axis(0.25)
    freq = 520 + 500 * (1 - np.exp(-t * 30))
    return np.sin(2 * np.pi * np.cumsum(freq) / SR) * np.minimum(1, t / 0.003) * np.exp(-t * 18) * 0.7


def typing(seconds=4.0):
    track = np.zeros(int(seconds * SR))
    at = 0.0
    while at < seconds:
        t = t_axis(0.02)
        tick = filt(rng.standard_normal(len(t)), "bandpass", [2500, 7000]) * np.exp(-t * 350)
        place(track, tick, at, rng.uniform(0.25, 0.45))
        at += rng.uniform(0.045, 0.085)
    return track


def write(name, x):
    OUT.mkdir(parents=True, exist_ok=True)
    wavfile.write(OUT / f"{name}.wav", SR, (np.clip(x, -1, 1) * 32767).astype(np.int16))


if __name__ == "__main__":
    write("music", music())
    write("click", click())
    write("whoosh", whoosh())
    write("pop", pop())
    write("typing", typing())
    print(f"wrote {sorted(p.name for p in OUT.glob('*.wav'))}")
