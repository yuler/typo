import type * as React from 'react'
import { Audio, interpolate, Sequence, staticFile } from 'remotion'
import { clamp } from './components'

export type SfxName = 'click' | 'whoosh' | 'pop' | 'typing'

const LEVEL: Record<SfxName, number> = { click: 0.75, whoosh: 0.35, pop: 0.6, typing: 0.45 }

export const Sfx: React.FC<{ name: SfxName, at: number, frames?: number, volume?: number }> = ({ name, at, frames, volume = 1 }) => (
  <Sequence from={Math.round(at)} durationInFrames={frames ? Math.max(1, Math.round(frames)) : undefined} layout="none">
    <Audio src={staticFile(`audio/${name}.wav`)} volume={LEVEL[name] * volume} />
  </Sequence>
)

export const Music: React.FC<{ frames: number, duck: [number, number] }> = ({ frames, duck: [from, to] }) => (
  <Audio
    src={staticFile('audio/music.wav')}
    volume={f =>
      interpolate(f, [0, 30, frames - 90, frames], [0, 1, 1, 0], clamp)
      * interpolate(f, [from - 15, from, to, to + 20], [1, 0.3, 0.3, 1], clamp)}
  />
)

export const Voice: React.FC<{ at: number }> = ({ at }) => (
  <Sequence from={Math.round(at)} layout="none">
    <Audio src={staticFile('voice.wav')} />
  </Sequence>
)
