import type { Locale } from '../types'
import en from '../locales/desktop/en.json'
import ja from '../locales/desktop/ja.json'
import zh from '../locales/desktop/zh.json'

export const messages: Record<Locale, Record<string, string>> = { en, zh, ja }
