import type React from 'react'
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { color, mono, sans } from './theme'

export const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const

export const progress = (frame: number, start: number, length: number) => interpolate(frame, [start, start + length], [0, 1], clamp)

export const fadeOut = (frame: number, duration: number, length = 12) => interpolate(frame, [duration - length, duration], [1, 0], clamp)

export const Background: React.FC = () => {
  const frame = useCurrentFrame()
  const drift = Math.sin(frame / 240) * 80
  return (
    <AbsoluteFill style={{ background: color.bg2, overflow: 'hidden' }}>
      <div
        style={{
          position: 'absolute',
          width: 1700,
          height: 1700,
          left: 120 + drift,
          top: -1050,
          background: 'radial-gradient(closest-side, rgba(255,16,24,0.09), rgba(255,16,24,0) 70%)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: 1400,
          height: 1400,
          right: -500 - drift,
          bottom: -950,
          background: 'radial-gradient(closest-side, rgba(59,130,246,0.07), rgba(59,130,246,0) 70%)',
        }}
      />
      <AbsoluteFill
        style={{
          backgroundImage:
            'linear-gradient(rgba(0,0,0,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.035) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
          maskImage: 'radial-gradient(ellipse at 50% 30%, black 20%, transparent 75%)',
        }}
      />
    </AbsoluteFill>
  )
}

interface WordsProps {
  text: string
  delay?: number
  stagger?: number
  size?: number
  weight?: number
  accent?: string[]
  style?: React.CSSProperties
}

export const Words: React.FC<WordsProps> = ({ text, delay = 0, stagger = 4, size = 72, weight = 700, accent = [], style }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const words = text.split(' ')
  return (
    <div style={{ fontFamily: sans, fontSize: size, fontWeight: weight, letterSpacing: '-0.035em', color: color.text, lineHeight: 1.1, ...style }}>
      {words.map((word, i) => {
        const p = spring({ frame: frame - delay - i * stagger, fps, config: { damping: 18, stiffness: 140 } })
        const highlighted = accent.includes(word.replace(/[.,]/g, ''))
        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              marginRight: i < words.length - 1 ? '0.24em' : 0,
              opacity: p,
              transform: `translateY(${(1 - p) * 0.5}em)`,
              filter: `blur(${(1 - p) * 10}px)`,
              color: highlighted ? color.brand : undefined,
            }}
          >
            {word}
          </span>
        )
      })}
    </div>
  )
}

export const Headline: React.FC<{ text: string, frames: number, accent: string[] }> = ({ text, frames, accent }) => {
  const frame = useCurrentFrame()
  return (
    <AbsoluteFill style={{ alignItems: 'center', top: 110, opacity: fadeOut(frame, frames) }}>
      <Words text={text} size={68} delay={4} stagger={3} accent={accent} />
    </AbsoluteFill>
  )
}

export const Keycap: React.FC<{ label: string, at: number, pressed: number }> = ({ label, at, pressed }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const p = spring({ frame: frame - at, fps, config: { damping: 12, stiffness: 180 } })
  return (
    <div
      style={{
        width: 108,
        height: 108,
        borderRadius: 22,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: mono,
        fontSize: 52,
        fontWeight: 600,
        color: color.text,
        background: color.bg,
        border: `1px solid ${color.border}`,
        boxShadow: `0 ${10 - 7 * pressed}px 0 ${color.border}, 0 ${24 - 12 * pressed}px 40px rgba(15,23,42,0.12)`,
        opacity: Math.min(1, p),
        transform: `translateY(${(1 - p) * 40 + pressed * 7}px) scale(${0.8 + 0.2 * p})`,
      }}
    >
      {label}
    </div>
  )
}
