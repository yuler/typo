import { AbsoluteFill, interpolate, Sequence, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { clamp, fadeOut, Headline, Keycap, progress } from '../components'
import { Indicator } from '../devices/Indicator'
import { MacWindow } from '../devices/MacWindow'
import { MailPane } from '../devices/MailPane'
import { Sfx, Voice } from '../sound'
import { copy } from '../strings'
import { sec } from '../theme'

// Length of public/voice.wav, printed by `pnpm intro-video:voice`.
export const VOICE_SECONDS = 3.3

const CHARS_PER_FRAME = 0.75
const TYPE_START = sec(0.4)
const TYPE_FRAMES = copy.draft.length / CHARS_PER_FRAME
const SELECT = sec(2.5)
const KEY_AT = (i: number) => sec(3.1) + i * sec(0.2)
const PRESS = sec(3.9)
const SHOW = sec(4.05)
const RESULT = sec(5.9)
const HIDE = sec(7.6)
export const VOICE_AT = sec(2.3)
export const REFINE_FRAMES = sec(9)

const WIN = { left: 360, top: 230, width: 1200, height: 620 }
const DOCK_TOP = 900

export function Refine() {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const winIn = spring({ frame, fps, config: { damping: 18 } })
  const typed = Math.floor(Math.max(0, frame - TYPE_START) * CHARS_PER_FRAME)
  const done = frame >= RESULT
  const text = done ? copy.polished : copy.draft.slice(0, typed)
  const selected = done ? 0 : progress(frame, SELECT, sec(0.5))
  const flash = done ? 1 - progress(frame, RESULT + 30, 50) : 0

  const pressed = interpolate(frame, [PRESS - 4, PRESS, PRESS + 10, PRESS + 18], [0, 1, 1, 0], clamp)
  const keysOut = 1 - progress(frame, SHOW - 6, 12)
  const indicatorIn = spring({ frame: frame - SHOW, fps, config: { damping: 16, stiffness: 160 } })
  const indicatorOut = 1 - progress(frame, HIDE, 14)

  return (
    <AbsoluteFill style={{ opacity: fadeOut(frame, REFINE_FRAMES, 14) }}>
      <Sfx name="whoosh" at={0} />
      <Sfx name="typing" at={TYPE_START} frames={TYPE_FRAMES} />
      <Sfx name="click" at={SELECT} volume={0.5} />
      {copy.keys.map((key, i) => <Sfx key={key} name="click" at={KEY_AT(i)} volume={0.35} />)}
      <Sfx name="click" at={PRESS} />
      <Sfx name="whoosh" at={SHOW - 4} volume={0.6} />
      <Voice at={VOICE_AT} />
      <Sfx name="pop" at={RESULT} />

      <Sequence durationInFrames={RESULT} layout="none">
        <Headline text={copy.select} frames={RESULT} accent={['⌘⇧X']} />
      </Sequence>
      <Sequence from={RESULT} durationInFrames={REFINE_FRAMES - RESULT} layout="none">
        <Headline text={copy.refined} frames={REFINE_FRAMES - RESULT} accent={['Refined']} />
      </Sequence>

      <div
        style={{
          position: 'absolute',
          left: WIN.left,
          top: WIN.top,
          opacity: winIn,
          transform: `perspective(1800px) translateY(${(1 - winIn) * 120}px) rotateX(${(1 - winIn) * 12}deg)`,
        }}
      >
        <MacWindow title={copy.mailTitle} width={WIN.width} height={WIN.height}>
          <MailPane text={text} selected={selected} flash={flash} caret={selected === 0} />
        </MacWindow>
      </div>

      <div style={{ position: 'absolute', left: 0, right: 0, top: DOCK_TOP - 10, display: 'flex', justifyContent: 'center', gap: 22, opacity: keysOut }}>
        {copy.keys.map((key, i) => <Keycap key={key} label={key} at={KEY_AT(i)} pressed={pressed} />)}
      </div>

      {frame >= SHOW && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: DOCK_TOP,
            display: 'flex',
            justifyContent: 'center',
            opacity: Math.min(indicatorIn, indicatorOut),
            transform: `translateY(${(1 - indicatorIn) * 60}px) scale(${0.9 + 0.1 * indicatorIn})`,
          }}
        >
          <Indicator state={done ? 'result' : 'processing'} input={copy.draft} result={copy.polished} />
        </div>
      )}
    </AbsoluteFill>
  )
}
