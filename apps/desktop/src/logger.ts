/* eslint-disable no-console */
import { debug, error, info, LogLevel, warn } from '@tauri-apps/plugin-log'

const isDev = import.meta.env.DEV

/**
 * Current log level strategy:
 * - Development: Debug (shows all logs)
 * - Production: Warn (shows only warnings and errors)
 */
const MIN_LEVEL = isDev ? LogLevel.Debug : LogLevel.Warn

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

function canLog(level: LogLevel): boolean {
  return level >= MIN_LEVEL
}

export const logger = {
  debug: (module: string, ...args: any[]) => {
    if (canLog(LogLevel.Debug)) {
      console.debug(`[${module}]`, ...args)
      void debug(`[${module}] ${formatArgs(args)}`)
    }
  },
  info: (module: string, ...args: any[]) => {
    if (canLog(LogLevel.Info)) {
      console.info(`[${module}]`, ...args)
      void info(`[${module}] ${formatArgs(args)}`)
    }
  },
  warn: (module: string, ...args: any[]) => {
    if (canLog(LogLevel.Warn)) {
      console.warn(`[${module}]`, ...args)
      void warn(`[${module}] ${formatArgs(args)}`)
    }
  },
  error: (module: string, ...args: any[]) => {
    if (canLog(LogLevel.Error)) {
      console.error(`[${module}]`, ...args)
      void error(`[${module}] ${formatArgs(args)}`)
    }
  },
}
