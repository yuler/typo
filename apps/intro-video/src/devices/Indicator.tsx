import type React from 'react'
import logoDark from '@typo/logo/logo-dark.svg'
import { Img, useCurrentFrame } from 'remotion'
import { color, mono, sans } from '../theme'

export type IndicatorState = 'idle' | 'processing' | 'result'

interface IndicatorProps {
  state: IndicatorState
  input?: string
  command?: string
  result?: string
  shortcut?: string
  maxContent?: number
  style?: React.CSSProperties
}

const S = 2

const Spinner: React.FC = () => {
  const frame = useCurrentFrame()
  return (
    <svg width={14 * S} height={14 * S} viewBox="0 0 24 24" fill="none" stroke={color.capsuleBlue} strokeWidth={2.4} strokeLinecap="round" style={{ flexShrink: 0, transform: `rotate(${frame * 9}deg)` }}>
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  )
}

const TerminalIcon: React.FC = () => (
  <svg width={12 * S} height={12 * S} viewBox="0 0 24 24" fill="none" stroke={color.capsuleBlue} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="4 17 10 11 4 5" />
    <line x1="12" x2="20" y1="19" y2="19" />
  </svg>
)

const truncate: React.CSSProperties = { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }

export const Indicator: React.FC<IndicatorProps> = ({ state, input = '', command, result = '', shortcut = '⌘⇧X', maxContent = 780, style }) => {
  const frame = useCurrentFrame()
  const runner = state === 'processing'
    ? `conic-gradient(from ${frame * 1.7}deg, rgba(229,229,229,0) 0deg, rgba(229,229,229,0) 310deg, rgba(229,229,229,0.95) 318deg, rgba(229,229,229,0.95) 336deg, rgba(229,229,229,0) 344deg), ${color.capsuleRing}`
    : 'transparent'

  return (
    <div style={{ display: 'inline-flex', padding: 2 * S, borderRadius: 10 * S, background: runner, ...style }}>
      <div
        style={{
          height: 56 * S,
          display: 'flex',
          alignItems: 'center',
          gap: 12 * S,
          padding: `0 ${16 * S}px`,
          background: color.capsule,
          borderRadius: 8 * S,
          border: `1px solid ${color.capsuleBorder}`,
          boxShadow: '0 16px 48px rgba(0,0,0,0.28)',
          fontFamily: sans,
        }}
      >
        <Img src={logoDark} style={{ width: 28 * S, height: 28 * S, objectFit: 'contain', flexShrink: 0 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 * S, maxWidth: maxContent, padding: `0 ${8 * S}px`, overflow: 'hidden' }}>
          {state === 'processing' && (
            <>
              {command && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4 * S,
                    flexShrink: 0,
                    padding: `${2 * S}px ${6 * S}px ${2 * S}px ${4 * S}px`,
                    borderRadius: 4 * S,
                    background: 'rgba(59,130,246,0.1)',
                    border: '1px solid rgba(59,130,246,0.2)',
                  }}
                >
                  <TerminalIcon />
                  <span style={{ fontSize: 10 * S, fontWeight: 700, color: color.capsuleBlue, textTransform: 'uppercase', letterSpacing: '-0.01em' }}>{command}</span>
                </div>
              )}
              <Spinner />
              <span style={{ ...truncate, fontSize: 14 * S, fontWeight: 500, color: color.capsuleBlueText }}>{input}</span>
              <span style={{ fontFamily: mono, fontSize: 10 * S, color: 'rgba(96,165,250,0.4)', flexShrink: 0 }}>{input.length}</span>
            </>
          )}
          {state === 'result' && <span style={{ ...truncate, fontSize: 14 * S, fontWeight: 500, color: color.capsuleGreen }}>{result}</span>}
          {state === 'idle' && (
            <span
              style={{
                fontFamily: mono,
                fontSize: 10 * S,
                color: 'rgba(255,255,255,0.4)',
                padding: `${2 * S}px ${6 * S}px`,
                borderRadius: 4 * S,
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.05)',
              }}
            >
              {shortcut}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
