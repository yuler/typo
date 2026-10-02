import { AbsoluteFill, useCurrentFrame } from 'remotion'
import { fadeOut, Words } from '../components'
import { Sfx } from '../sound'
import { copy } from '../strings'
import { color, sec } from '../theme'

export const HOOK_FRAMES = sec(3)

export function Hook() {
  const frame = useCurrentFrame()
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', opacity: fadeOut(frame, HOOK_FRAMES) }}>
      <Sfx name="whoosh" at={0} />
      <Sfx name="pop" at={sec(1.05)} />
      <div style={{ textAlign: 'center' }}>
        <Words text={copy.hook[0]} size={120} delay={6} style={{ color: color.muted }} />
        <Words text={copy.hook[1]} size={120} weight={800} delay={sec(1)} accent={['Polishing']} />
      </div>
    </AbsoluteFill>
  )
}
