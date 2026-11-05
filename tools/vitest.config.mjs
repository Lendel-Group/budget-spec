// Без импорта из 'vitest/config': vitest берётся из node_modules репозитория PWA, а не этого репозитория.
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const pwa = process.env.PWA_DIR
if (!pwa) throw new Error('Укажите PWA_DIR — путь к репозиторию PWA-Budget')

export default {
  root: here,
  resolve: { alias: { '@pwa': resolve(pwa, 'src') } },
  test: { environment: 'node', include: ['fixtures.test.ts'] },
}
