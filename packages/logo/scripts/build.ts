import { copyFile, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import sharp from 'sharp'

const root = resolve(import.meta.dirname, '..')
const dist = resolve(root, 'dist')

type Mode = 'light' | 'dark'

interface Source {
  mode: Mode
  path: string
  background: string
  trayColor: string
}

interface Output {
  name: string
  size: number
  padding: number
  aliases?: string[]
}

const sources: Source[] = [
  {
    mode: 'light',
    path: resolve(root, 'assets/logo-light.png'),
    background: '#ffffff',
    trayColor: '#000000',
  },
  {
    mode: 'dark',
    path: resolve(root, 'assets/logo-dark.png'),
    background: '#18181b',
    trayColor: '#ffffff',
  },
]

const outputs: Output[] = [
  { name: 'www/favicon', size: 64, padding: 6, aliases: ['www/favicon'] },
  { name: 'desktop/icon', size: 1024, padding: 96, aliases: ['desktop/icon'] },
  { name: 'desktop/dock', size: 1024, padding: 96, aliases: ['desktop/dock'] },
]

async function ensureParent(path: string) {
  await mkdir(dirname(path), { recursive: true })
}

async function writePng(path: string, image: sharp.Sharp) {
  await ensureParent(path)
  await image.png().toFile(path)
}

function outputPath(name: string, mode: Mode) {
  return resolve(dist, `${name}-${mode}.png`)
}

async function writeAliases(name: string, mode: Mode, aliases: string[] = []) {
  if (mode !== 'light')
    return

  await Promise.all(aliases.map(async (alias) => {
    const target = resolve(dist, `${alias}.png`)
    await ensureParent(target)
    await copyFile(outputPath(name, mode), target)
  }))
}

async function sourceBuffer(source: Source) {
  return sharp(source.path).png().toBuffer()
}

async function writeImageOutputs(source: Source) {
  const logo = await sourceBuffer(source)

  await Promise.all(outputs.map(async (output) => {
    const target = outputPath(output.name, source.mode)
    const contentSize = output.size - output.padding * 2

    await writePng(
      target,
      sharp(logo)
        .resize(contentSize, contentSize, {
          fit: 'contain',
          withoutEnlargement: false,
          background: source.background,
        })
        .extend({
          top: output.padding,
          right: output.padding,
          bottom: output.padding,
          left: output.padding,
          background: source.background,
        }),
    )

    await writeAliases(output.name, source.mode, output.aliases)
  }))
}

async function trayTemplateBuffer(source: Source) {
  const { data, info } = await sharp(source.path)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const background = source.mode === 'light' ? 255 : 24
  const [r, g, b] = source.trayColor === '#ffffff' ? [255, 255, 255] : [0, 0, 0]

  for (let i = 0; i < data.length; i += 4) {
    const originalAlpha = data[i + 3]!
    const distance = Math.max(
      Math.abs(data[i]! - background),
      Math.abs(data[i + 1]! - background),
      Math.abs(data[i + 2]! - background),
    )
    const calculatedAlpha = Math.max(0, Math.min(255, Math.round((distance - 8) * 5)))
    const alpha = Math.min(originalAlpha, calculatedAlpha < 10 ? 0 : calculatedAlpha)

    data[i] = r
    data[i + 1] = g
    data[i + 2] = b
    data[i + 3] = alpha
  }

  return sharp(data, {
    raw: {
      width: info.width,
      height: info.height,
      channels: 4,
    },
  })
    .trim({ background: '#00000000', threshold: 1 })
    .png()
    .toBuffer()
}

async function writeTrayOutput(source: Source) {
  const tray = await trayTemplateBuffer(source)
  const target = outputPath('desktop/tray', source.mode)

  await writePng(
    target,
    sharp(tray)
      .resize(32, 32, {
        fit: 'contain',
        withoutEnlargement: false,
      })
      .extend({
        top: 6,
        right: 6,
        bottom: 6,
        left: 6,
        background: '#00000000',
      }),
  )

  await writeAliases('desktop/tray', source.mode, ['desktop/trayTemplate'])
}

await Promise.all(sources.map(async (source) => {
  await writeImageOutputs(source)
  await writeTrayOutput(source)
}))
