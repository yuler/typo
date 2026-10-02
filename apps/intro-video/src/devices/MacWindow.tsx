import type * as React from 'react'
import { color, sans } from '../theme'

interface MacWindowProps {
  title: string
  width: number
  height: number
  style?: React.CSSProperties
  children: React.ReactNode
}

export const MacWindow: React.FC<MacWindowProps> = ({ title, width, height, style, children }) => (
  <div
    style={{
      width,
      height,
      borderRadius: 18,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      background: color.bg,
      border: `1px solid ${color.border}`,
      boxShadow: '0 40px 120px rgba(15,23,42,0.18), 0 8px 24px rgba(15,23,42,0.08)',
      ...style,
    }}
  >
    <div
      style={{
        height: 52,
        flexShrink: 0,
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        background: color.bg2,
        borderBottom: `1px solid ${color.border}`,
      }}
    >
      <div style={{ display: 'flex', gap: 9 }}>
        {['#ff5f57', '#febc2e', '#28c840'].map(c => (
          <div key={c} style={{ width: 13, height: 13, borderRadius: 7, background: c }} />
        ))}
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, textAlign: 'center', fontFamily: sans, fontSize: 18, fontWeight: 500, color: color.secondary }}>
        {title}
      </div>
    </div>
    <div style={{ flex: 1, position: 'relative' }}>{children}</div>
  </div>
)
