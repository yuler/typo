import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, cpSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

const SCRIPT = join(__dirname, '..', 'scripts', 'generate-types.ts')

describe('generate-types --verify', () => {
  let dir: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'i18n-test-'))
    mkdirSync(join(dir, 'src', 'locales', 'fixture'), { recursive: true })
    mkdirSync(join(dir, 'src', 'generated'), { recursive: true })
    mkdirSync(join(dir, 'scripts'), { recursive: true })
    cpSync(SCRIPT, join(dir, 'scripts', 'generate-types.ts'))
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  function writeFixture(locale: string, content: object): void {
    writeFileSync(
      join(dir, 'src', 'locales', 'fixture', `${locale}.json`),
      JSON.stringify(content),
    )
  }

  function run(args: string[] = []): { code: number, stderr: string, stdout: string } {
    try {
      const stdout = execFileSync('node', [
        '--experimental-strip-types',
        join(dir, 'scripts', 'generate-types.ts'),
        ...args,
      ], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
      return { code: 0, stderr: '', stdout }
    }
    catch (e) {
      const err = e as { status: number, stderr: Buffer | string, stdout: Buffer | string }
      return {
        code: err.status,
        stderr: err.stderr?.toString() ?? '',
        stdout: err.stdout?.toString() ?? '',
      }
    }
  }

  it('passes when all locales are complete', () => {
    writeFixture('en', { greeting: 'Hello' })
    writeFixture('zh', { greeting: '你好' })
    const r = run(['--verify'])
    expect(r.code).toBe(0)
    expect(r.stdout).toContain('All locales complete')
  })

  it('fails on missing key', () => {
    writeFixture('en', { greeting: 'Hello', other: 'X' })
    writeFixture('zh', { greeting: '你好' })
    const r = run(['--verify'])
    expect(r.code).toBe(1)
    expect(r.stderr).toContain('Missing key "other"')
  })

  it('fails on empty value', () => {
    writeFixture('en', { greeting: 'Hello' })
    writeFixture('zh', { greeting: '' })
    const r = run(['--verify'])
    expect(r.code).toBe(1)
    expect(r.stderr).toContain('Empty value')
  })

  it('fails on missing placeholder', () => {
    writeFixture('en', { greeting: 'Hello, {name}' })
    writeFixture('zh', { greeting: '你好' })
    const r = run(['--verify'])
    expect(r.code).toBe(1)
    expect(r.stderr).toContain('missing placeholder {name}')
  })

  it('writes keys.d.ts in non-verify mode', () => {
    writeFixture('en', { 'a.b': 'A', 'c.d': 'B' })
    writeFixture('zh', { 'a.b': 'A', 'c.d': 'B' })
    const r = run([])
    expect(r.code).toBe(0)
    const out = readFileSync(join(dir, 'src', 'generated', 'keys.d.ts'), 'utf8')
    expect(out).toContain('fixture: \'a.b\' | \'c.d\'')
  })
})
