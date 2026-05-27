import { copyFile, mkdir, readdir } from 'node:fs/promises'
import { dirname, extname, resolve } from 'node:path'
import sharp from 'sharp'

const root = resolve(import.meta.dirname, '..')
const assets = resolve(root, 'assets')
const dist = resolve(root, 'dist')

type Mode = 'light' | 'dark'

interface RasterSource {
  mode: Mode
  path: string
  background: string
  trayColor: string
}

interface RasterOutput {
  name: string
  size: number
  padding: number
  aliases?: string[]
}

const rasterSources: RasterSource[] = [
  {
    mode: 'light',
    path: resolve(assets, 'logo-light.png'),
    background: '#ffffff',
    trayColor: '#000000',
  },
  {
    mode: 'dark',
    path: resolve(assets, 'logo-dark.png'),
    background: '#18181b',
    trayColor: '#ffffff',
  },
]

const rasterOutputs: RasterOutput[] = [
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

function rasterOutputPath(name: string, mode: Mode) {
  return resolve(dist, `${name}-${mode}.png`)
}

async function writeLightAliases(
  from: string,
  aliases: string[],
  extension: string,
) {
  await Promise.all(aliases.map(async (alias) => {
    const target = resolve(dist, `${alias}${extension}`)
    await ensureParent(target)
    await copyFile(from, target)
  }))
}

async function rasterSourceBuffer(source: RasterSource) {
  return sharp(source.path).png().toBuffer()
}

async function writeRasterOutputs(source: RasterSource) {
  const logo = await rasterSourceBuffer(source)

  await Promise.all(rasterOutputs.map(async (output) => {
    const target = rasterOutputPath(output.name, source.mode)
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

    if (source.mode === 'light')
      await writeLightAliases(target, output.aliases ?? [], '.png')
  }))
}

async function trayTemplateBuffer(source: RasterSource) {
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

async function writeTrayOutput(source: RasterSource) {
  const tray = await trayTemplateBuffer(source)
  const target = rasterOutputPath('desktop/tray', source.mode)

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

  if (source.mode === 'light')
    await writeLightAliases(target, ['desktop/tray'], '.png')
}

async function copySvgAssets() {
  const files = await readdir(assets)

  await Promise.all(files
    .filter(file => extname(file) === '.svg')
    .map(async (file) => {
      const from = resolve(assets, file)
      const target = resolve(dist, file)

      await ensureParent(target)
      await copyFile(from, target)

      const light = file.match(/^(.+)-light\.svg$/)
      if (light)
        await writeLightAliases(target, [light[1]], '.svg')
    }))
}

await Promise.all([
  ...rasterSources.map(async (source) => {
    await writeRasterOutputs(source)
    await writeTrayOutput(source)
  }),
  copySvgAssets(),
])
