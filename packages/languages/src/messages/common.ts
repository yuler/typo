import type { Locale } from '../types'
import en from '../locales/common/en.json'
import jp from '../locales/common/jp.json'
import zh from '../locales/common/zh.json'

export const messages: Record<Locale, Record<string, string>> = { en, zh, jp }
