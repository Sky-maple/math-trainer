// 用 esbuild 打包 verify-entry.ts 后在 Node 中执行，交叉验证出题引擎。
import { build } from 'esbuild'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const entry = fileURLToPath(new URL('./verify-entry.ts', import.meta.url))
const outdir = mkdtempSync(join(tmpdir(), 'mt-verify-'))
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
  console.log('\nverify 通过。')
} catch (e) {
  rmSync(outdir, { recursive: true, force: true })
  console.error('\nverify 失败：', e instanceof Error ? e.message : e)
  process.exit(1)
}
