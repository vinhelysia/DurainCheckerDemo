/**
 * Convert public/images/*.jpg → WebP (max width 1600, quality 78).
 * Keeps originals as fallback; components prefer .webp.
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dir = path.join(__dirname, '../public/images')

const files = fs.readdirSync(dir).filter((f) => /\.jpe?g$/i.test(f))

for (const file of files) {
  const input = path.join(dir, file)
  const outName = file.replace(/\.jpe?g$/i, '.webp')
  const output = path.join(dir, outName)
  const maxW = file.startsWith('hero') ? 1600 : 1200
  const quality = file.includes('market') ? 72 : 78

  await sharp(input)
    .rotate()
    .resize({ width: maxW, withoutEnlargement: true })
    .webp({ quality, effort: 5 })
    .toFile(output)

  const inKb = (fs.statSync(input).size / 1024).toFixed(1)
  const outKb = (fs.statSync(output).size / 1024).toFixed(1)
  console.log(`${file} ${inKb}KB → ${outName} ${outKb}KB`)
}
