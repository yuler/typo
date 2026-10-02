import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const hyperframes = 'hyperframes@0.6.40'
const watch = !process.argv.includes('--once')
const previewArgs = process.argv.slice(2).filter(arg => arg !== '--once' && arg !== '--')

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: packageRoot,
      stdio: 'inherit',
      shell: process.platform === 'win32',
      ...options,
    })
    child.on('error', reject)
    child.on('exit', (code, signal) => {
      if (signal)
        reject(new Error(`${command} exited via ${signal}`))
      else if (code !== 0)
        reject(new Error(`${command} exited with code ${code}`))
      else
        resolve()
    })
  })
}

function runBackground(command, args) {
  const child = spawn(command, args, {
    cwd: packageRoot,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  })
  child.on('error', (error) => {
    console.error(error)
    process.exit(1)
  })
  return child
}

async function main() {
  await run('pnpm', ['build'])

  let watchProcess
  if (watch) {
    watchProcess = runBackground('pnpm', ['exec', 'vite', 'build', '--watch'])
    const stopWatch = () => {
      if (watchProcess && !watchProcess.killed)
        watchProcess.kill('SIGTERM')
    }
    process.on('SIGINT', stopWatch)
    process.on('SIGTERM', stopWatch)
  }

  try {
    await run('pnpm', ['dlx', hyperframes, 'preview', 'dist/capture', ...previewArgs])
  }
  finally {
    if (watchProcess && !watchProcess.killed)
      watchProcess.kill('SIGTERM')
  }
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
