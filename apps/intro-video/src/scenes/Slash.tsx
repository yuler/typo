import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { clamp, fadeOut, progress, Words } from '../components'
import { Indicator } from '../devices/Indicator'
import { MacWindow } from '../devices/MacWindow'
import { Selectable } from '../devices/Selectable'
import { Sfx } from '../sound'
import { copy } from '../strings'
import { color, mono, sans, sec } from '../theme'

const START = sec(0.6)
const CASE = sec(3.2)
const TYPE = sec(0.6)
const SELECT = sec(0.75)
const PRESS = sec(1.2)
const RESULT = sec(2.2)
const HIDE = sec(2.85)
export const SLASH_FRAMES = START + CASE * copy.commands.length + sec(0.3)

const WIN = { left: 360, top: 360, width: 1200, height: 300 }
const CASE_AT = (i: number) => START + i * CASE

export function Slash() {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const winIn = spring({ frame: frame - 6, fps, config: { damping: 18 } })

  const index = Math.min(copy.commands.length - 1, Math.max(0, Math.floor((frame - START) / CASE)))
  const command = copy.commands[index]
  const local = frame - CASE_AT(index)
  const input = Array.from(command.input)
  const done = local >= RESULT
  const text = done ? command.output : input.slice(0, Math.floor(progress(local, 0, TYPE) * input.length)).join('')
  const selected = done ? 0 : progress(local, SELECT, sec(0.3))
  const flash = done ? 1 - progress(local, RESULT + 24, 40) : 0
  const textIn = local < 0 ? 0 : Math.min(progress(local, 0, 8), 1 - progress(local, CASE - 10, 10))
  const indicatorIn = spring({ frame: local - PRESS, fps, config: { damping: 16, stiffness: 160 } })
  const indicatorOut = 1 - progress(local, HIDE, 12)

  return (
    <AbsoluteFill style={{ opacity: fadeOut(frame, SLASH_FRAMES, 14) }}>
      <Sfx name="whoosh" at={0} />
      {copy.commands.map((c, i) => (
        <div key={c.name}>
          <Sfx name="typing" at={CASE_AT(i)} frames={TYPE} volume={0.8} />
          <Sfx name="click" at={CASE_AT(i) + PRESS} />
          <Sfx name="pop" at={CASE_AT(i) + RESULT} volume={0.6} />
        </div>
      ))}

      <AbsoluteFill style={{ alignItems: 'center', top: 110 }}>
        <Words text={copy.slash} size={68} delay={4} stagger={3} accent={['斜杠命令']} />
      </AbsoluteFill>

      <div style={{ position: 'absolute', left: 0, right: 0, top: 250, display: 'flex', justifyContent: 'center', gap: 20 }}>
        {copy.commands.map((c, i) => {
          const p = spring({ frame: frame - 10 - i * 4, fps, config: { damping: 16 } })
          const active = i === index && frame >= START
          const past = i < index
          return (
            <div
              key={c.name}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 22px',
                borderRadius: 999,
                fontFamily: sans,
                fontSize: 26,
                background: color.bg,
                border: `2px solid ${active ? color.brand : color.border}`,
                color: active ? color.brand : past ? color.secondary : color.muted,
                boxShadow: active ? '0 10px 30px rgba(255,16,24,0.15)' : '0 6px 18px rgba(15,23,42,0.05)',
                opacity: Math.min(1, p),
                transform: `translateY(${(1 - p) * 20}px) scale(${active ? 1.06 : 1})`,
              }}
            >
              <span style={{ fontFamily: mono, fontWeight: 600 }}>
                /
                {c.name}
              </span>
              <span style={{ fontWeight: 500 }}>{c.label}</span>
            </div>
          )
        })}
      </div>

      <div style={{ position: 'absolute', left: WIN.left, top: WIN.top, opacity: winIn, transform: `translateY(${(1 - winIn) * 80}px)` }}>
        <MacWindow title={copy.noteTitle} width={WIN.width} height={WIN.height}>
          <Selectable
            text={text}
            selected={selected}
            flash={flash}
            style={{ position: 'absolute', inset: 0, padding: '48px 56px', fontFamily: sans, fontSize: 36, lineHeight: 1.6, color: color.text, opacity: textIn }}
          />
        </MacWindow>
      </div>

      {local >= PRESS && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 760,
            display: 'flex',
            justifyContent: 'center',
            opacity: Math.min(indicatorIn, indicatorOut),
            transform: `translateY(${interpolate(indicatorIn, [0, 1], [50, 0], clamp)}px) scale(${0.9 + 0.1 * indicatorIn})`,
          }}
        >
          <Indicator state={done ? 'result' : 'processing'} command={command.name} input={command.input.replace(/^\/\S+\s*/, '')} result={command.output} maxContent={1100} />
        </div>
      )}
    </AbsoluteFill>
  )
}
