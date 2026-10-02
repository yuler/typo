import type React from 'react'
import { useCurrentFrame } from 'remotion'
import { copy } from '../strings'
import { color, sans } from '../theme'

interface MailPaneProps {
  text: string
  selected: number
  flash: number
  caret: boolean
}

const Field: React.FC<{ label: string, value: string }> = ({ label, value }) => (
  <div style={{ display: 'flex', gap: 14, padding: '16px 0', borderBottom: `1px solid ${color.border}`, fontSize: 24 }}>
    <span style={{ color: color.muted }}>{label}</span>
    <span style={{ color: color.text }}>{value}</span>
  </div>
)

export const MailPane: React.FC<MailPaneProps> = ({ text, selected, flash, caret }) => {
  const frame = useCurrentFrame()
  const caretOn = caret && Math.floor(frame / 30) % 2 === 0
  const cut = Math.round(text.length * selected)
  return (
    <div style={{ position: 'absolute', inset: 0, padding: '12px 56px', fontFamily: sans, color: color.text }}>
      <Field label="To:" value={copy.mailTo} />
      <Field label="Subject:" value={copy.mailSubject} />
      <div style={{ fontSize: 32, lineHeight: 1.6, marginTop: 32, color: color.secondary }}>{copy.greeting}</div>
      <div style={{ fontSize: 32, lineHeight: 1.6, marginTop: 12, minHeight: '3.2em' }}>
        <span style={{ background: color.selection, borderRadius: 4 }}>{text.slice(0, cut)}</span>
        <span style={{ background: `rgba(34,197,94,${0.2 * flash})`, borderRadius: 6 }}>{text.slice(cut)}</span>
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
      <div style={{ fontSize: 32, lineHeight: 1.6, marginTop: 24, color: color.secondary }}>{copy.signature}</div>
    </div>
  )
}
