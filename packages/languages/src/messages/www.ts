import type { Locale } from '../types'
import en from '../locales/www/en.json'
import ja from '../locales/www/ja.json'
import zh from '../locales/www/zh.json'

export const messages: Record<Locale, Record<string, string>> = { en, zh, ja }
