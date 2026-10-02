import type React from 'react'
import { useCurrentFrame } from 'remotion'
import { color } from '../theme'

interface SelectableProps {
  text: string
  selected: number
  flash: number
  style?: React.CSSProperties
}

export const Selectable: React.FC<SelectableProps> = ({ text, selected, flash, style }) => {
  const frame = useCurrentFrame()
  const chars = Array.from(text)
  const cut = Math.round(chars.length * selected)
  const caretOn = selected === 0 && Math.floor(frame / 30) % 2 === 0
  return (
    <div style={style}>
      <span style={{ background: color.selection, borderRadius: 4 }}>{chars.slice(0, cut).join('')}</span>
      <span style={{ background: `rgba(34,197,94,${0.2 * flash})`, borderRadius: 6 }}>{chars.slice(cut).join('')}</span>
      <span
        style={{
          display: 'inline-block',
          width: 3,
          height: '1.15em',
          verticalAlign: '-0.22em',
          marginLeft: 2,
          background: color.accent,
          opacity: caretOn ? 1 : 0,
        }}
      />
    </div>
  )
}
