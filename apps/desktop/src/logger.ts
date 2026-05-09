/* eslint-disable no-console */
const isDev = import.meta.env.DEV

export const logger = {
  debug: (module: string, ...args: any[]) => {
    if (isDev) {
      console.debug(`[${module}]`, ...args)
    }
  },
  info: (module: string, ...args: any[]) => {
    if (isDev) {
      console.info(`[${module}]`, ...args)
    }
  },
  warn: (module: string, ...args: any[]) => {
    console.warn(`[${module}]`, ...args)
  },
  error: (module: string, ...args: any[]) => {
    console.error(`[${module}]`, ...args)
  },
}
