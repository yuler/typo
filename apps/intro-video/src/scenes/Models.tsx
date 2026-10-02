import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { fadeOut, Words } from '../components'
import { Sfx } from '../sound'
import { copy } from '../strings'
import { color, sans, sec } from '../theme'

export const MODELS_FRAMES = sec(2.8)

const CARD_AT = (i: number) => 12 + i * 8
const TILE = ['#4d6bfe', '#18181b']

export function Models() {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', gap: 80, opacity: fadeOut(frame, MODELS_FRAMES) }}>
      {copy.providers.map((provider, i) => (
        <Sfx key={provider.name} name="click" at={CARD_AT(i)} volume={0.4} />
      ))}
      <Words text={copy.models} size={88} delay={2} accent={['本地']} />
      <div style={{ display: 'flex', gap: 36 }}>
        {copy.providers.map((provider, i) => {
          const p = spring({ frame: frame - CARD_AT(i), fps, config: { damping: 14, stiffness: 150 } })
          return (
            <div
              key={provider.name}
              style={{
                width: 420,
                padding: '36px 40px',
                borderRadius: 24,
                background: color.bg,
                border: `1px solid ${color.border}`,
                boxShadow: '0 20px 50px rgba(15,23,42,0.08)',
                display: 'flex',
                alignItems: 'center',
                gap: 28,
                fontFamily: sans,
                opacity: Math.min(1, p),
                transform: `translateY(${(1 - p) * 40}px) scale(${0.9 + 0.1 * p})`,
              }}
            >
              <div
                style={{
                  width: 88,
                  height: 88,
                  borderRadius: 22,
                  flexShrink: 0,
                  background: TILE[i],
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 44,
                  fontWeight: 800,
                }}
              >
                {provider.name[0]}
              </div>
              <div>
                <div style={{ fontSize: 38, fontWeight: 700, color: color.text, letterSpacing: '-0.02em' }}>{provider.name}</div>
                <div style={{ fontSize: 24, color: color.secondary, marginTop: 6 }}>{provider.note}</div>
              </div>
            </div>
          )
        })}
      </div>
    </AbsoluteFill>
  )
}
