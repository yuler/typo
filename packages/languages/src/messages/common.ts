import type { Locale } from '../types'
import en from '../locales/common/en.json'
import ja from '../locales/common/ja.json'
import zh from '../locales/common/zh.json'

export const messages: Record<Locale, Record<string, string>> = { en, zh, ja }
