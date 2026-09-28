import { readdir, readFile, writeFile, unlink } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)))
const partsDir = path.join(root, 'payload-parts')
const archive = path.join(root, '.gippi-store.tar.gz')
const parts = (await readdir(partsDir)).filter((name) => /^part-\d+\.txt$/.test(name)).sort()
const encoded = (await Promise.all(parts.map((name) => readFile(path.join(partsDir, name), 'utf8')))).join('')
await writeFile(archive, Buffer.from(encoded.trim(), 'base64'))
execFileSync('tar', ['-xzf', archive, '-C', root], { stdio: 'inherit' })
await unlink(archive)
console.log('Bingo React source and product artwork materialized.')
