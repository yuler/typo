const TOKEN = /\{(\w+)\}/g

export function interpolate(
  template: string,
  vars: Record<string, string | number | undefined | null>,
): string {
  return template.replace(TOKEN, (_, key: string) => {
    const value = vars[key]
    return value === undefined ? `{${key}}` : String(value)
  })
}
