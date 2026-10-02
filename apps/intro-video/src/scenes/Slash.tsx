import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { fadeOut, Words } from '../components'
import { Indicator } from '../devices/Indicator'
import { Sfx } from '../sound'
import { copy } from '../strings'
import { sec } from '../theme'

export const SLASH_FRAMES = sec(5)

const ROW_AT = (i: number) => sec(0.6) + i * sec(0.55)
const RESULT_AFTER = sec(1)

export function Slash() {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', gap: 72, opacity: fadeOut(frame, SLASH_FRAMES) }}>
      <Sfx name="whoosh" at={0} />
      {copy.commands.map((command, i) => (
        <Sfx key={command.name} name="pop" at={ROW_AT(i) + RESULT_AFTER} volume={0.5} />
      ))}
      <Words text={copy.slash} size={76} delay={2} stagger={3} accent={['commands']} />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 36 }}>
        {copy.commands.map((command, i) => {
          const p = spring({ frame: frame - ROW_AT(i), fps, config: { damping: 16, stiffness: 160 } })
          const done = frame >= ROW_AT(i) + RESULT_AFTER
          return (
            <div key={command.name} style={{ opacity: Math.min(1, p), transform: `translateY(${(1 - p) * 40}px)` }}>
              <Indicator state={done ? 'result' : 'processing'} command={command.name} input={command.input} result={command.output} maxContent={1100} />
            </div>
          )
        })}
      </div>
    </AbsoluteFill>
  )
}
