/* eslint-disable no-console */
import { debug, error, info, warn } from '@tauri-apps/plugin-log'

const isDev = import.meta.env.DEV

function formatArgs(args: any[]): string {
  return args.map((arg) => {
    if (typeof arg === 'object') {
      try {
        return JSON.stringify(arg)
      }
      catch {
        return String(arg)
      }
    }
    return String(arg)
  }).join(' ')
}

export const logger = {
  debug: (module: string, ...args: any[]) => {
    if (isDev) {
      console.debug(`[${module}]`, ...args)
      void debug(`[${module}] ${formatArgs(args)}`)
    }
  },
  info: (module: string, ...args: any[]) => {
    if (isDev) {
      console.info(`[${module}]`, ...args)
      void info(`[${module}] ${formatArgs(args)}`)
    }
  },
  warn: (module: string, ...args: any[]) => {
    console.warn(`[${module}]`, ...args)
    void warn(`[${module}] ${formatArgs(args)}`)
  },
  error: (module: string, ...args: any[]) => {
    console.error(`[${module}]`, ...args)
    void error(`[${module}] ${formatArgs(args)}`)
  },
}
