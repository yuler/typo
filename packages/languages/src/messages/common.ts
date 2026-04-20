import type { Locale } from '../types'
import en from '../locales/en.json'
import jp from '../locales/jp.json'
import zh from '../locales/zh.json'

export const messages: Record<Locale, Record<string, string>> = { en, zh, jp }
