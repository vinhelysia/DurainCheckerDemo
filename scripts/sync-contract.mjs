// Run after `cd program && anchor build`. Never edits or deploys a chain program.
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
assert(process.argv.length === 3 && ['--check', '--write'].includes(process.argv[2]),
  'Usage: node scripts/sync-contract.mjs --check|--write (after anchor build)')
const source = readFileSync(path.join(root, 'program/programs/durian_trust/src/lib.rs'), 'utf8')
const generated = JSON.parse(readFileSync(path.join(root, 'program/target/idl/durian_trust.json'), 'utf8'))
const declaredId = source.match(/declare_id!\("([^"]+)"\)/)?.[1]
assert(declaredId && generated.address === declaredId, 'Generated IDL program address differs from source')
const toml = readFileSync(path.join(root, 'program/Anchor.toml'), 'utf8')
for (const cluster of ['localnet', 'devnet']) {
  const id = toml.match(new RegExp(`\\[programs\\.${cluster}\\]\\s+durian_trust\\s*=\\s*"([^"]+)"`))?.[1]
  assert.equal(id, declaredId, `Anchor.toml ${cluster} program address differs`)
}
const sourcePath = path.join(root, 'public/solana/lib.rs')
const idlPath = path.join(root, 'public/solana/idl.json')
const normalize = text => text.replaceAll('\r\n', '\n')
if (process.argv[2] === '--write') {
  writeFileSync(sourcePath, normalize(source))
  writeFileSync(idlPath, JSON.stringify(generated, null, 2) + '\n')
} else {
  assert.equal(normalize(readFileSync(sourcePath, 'utf8')), normalize(source),
    'Public source snapshot drifted; run sync-contract --write after build')
  assert.deepEqual(JSON.parse(readFileSync(idlPath, 'utf8')), generated,
    'Public IDL drifted; run sync-contract --write after build')
}
console.log('Contract source snapshot, generated IDL and program IDs are in sync. Deployment was not checked or changed.')
