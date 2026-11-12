import { build } from 'esbuild'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const entry = fileURLToPath(new URL('./verify-techniques-entry.ts', import.meta.url))
const outdir = mkdtempSync(join(tmpdir(), 'mt-verify-tech-'))
const outfile = join(outdir, 'verify.mjs')

try {
  await build({
    entryPoints: [entry],
    bundle: true,
    format: 'esm',
    platform: 'node',
    outfile,
    logLevel: 'silent'
  })
  await import(pathToFileURL(outfile).href)
  rmSync(outdir, { recursive: true, force: true })
  console.log('\n技巧 verify 通过。')
} catch (e) {
  rmSync(outdir, { recursive: true, force: true })
  console.error('\n技巧 verify 失败：', e instanceof Error ? e.message : e)
  process.exit(1)
}
