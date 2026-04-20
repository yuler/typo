function nodeDevFlag(): boolean {
  const p = Reflect.get(globalThis, 'process') as { env?: Record<string, string | undefined> } | undefined
  return p?.env?.DEV === 'true'
}

export function isDev(): boolean {
  if (typeof import.meta !== 'undefined' && (import.meta as { env?: { DEV?: boolean } }).env?.DEV) {
    return true
  }
  return nodeDevFlag()
}
