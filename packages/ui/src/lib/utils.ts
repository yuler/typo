import type { ClassValue } from 'clsx'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatShortcut(shortcut: string, mac: boolean): string {
  return shortcut.replace('CommandOrControl', mac ? 'Command' : 'Ctrl')
}
