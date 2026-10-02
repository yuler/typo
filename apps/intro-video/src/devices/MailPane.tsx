import type React from 'react'
import { copy } from '../strings'
import { color, sans } from '../theme'
import { Selectable } from './Selectable'

const Field: React.FC<{ label: string, value: string }> = ({ label, value }) => (
  <div style={{ display: 'flex', gap: 14, padding: '16px 0', borderBottom: `1px solid ${color.border}`, fontSize: 24 }}>
    <span style={{ color: color.muted }}>{label}</span>
    <span style={{ color: color.text }}>{value}</span>
  </div>
)

export const MailPane: React.FC<{ text: string, selected: number, flash: number }> = ({ text, selected, flash }) => (
  <div style={{ position: 'absolute', inset: 0, padding: '12px 56px', fontFamily: sans, color: color.text }}>
    <Field label={copy.mailToLabel} value={copy.mailTo} />
    <Field label={copy.mailSubjectLabel} value={copy.mailSubject} />
    <div style={{ fontSize: 32, lineHeight: 1.6, marginTop: 32, color: color.secondary }}>{copy.greeting}</div>
    <Selectable text={text} selected={selected} flash={flash} style={{ fontSize: 32, lineHeight: 1.6, marginTop: 12, minHeight: '3.2em' }} />
    <div style={{ fontSize: 32, lineHeight: 1.6, marginTop: 24, color: color.secondary }}>{copy.signature}</div>
  </div>
)
