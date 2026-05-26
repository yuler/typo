import { copyFile, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..', '..', '..')
const logo = resolve(root, 'packages/logo/dist')

const copies = [
  ['www/favicon.png', 'apps/www/public/favicon.png'],
  ['www/favicon-light.png', 'apps/www/public/favicon-light.png'],
  ['www/favicon-dark.png', 'apps/www/public/favicon-dark.png'],
  ['www/favicon.png', 'core/public/icon.png'],
  ['desktop/icon.png', 'apps/desktop/resources/logo.png'],
  ['desktop/icon.png', 'apps/desktop/src/assets/logo.png'],
  ['desktop/icon.png', 'core/app/assets/images/logo.png'],
  ['desktop/trayTemplate.png', 'apps/desktop/src-tauri/icons/trayTemplate.png'],
] as const

await Promise.all(copies.map(async ([from, to]) => {
  const target = resolve(root, to)
  await mkdir(dirname(target), { recursive: true })
  await copyFile(resolve(logo, from), target)
}))
