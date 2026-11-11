/**
 * Генерация и проверка фикстур по эталонной реализации (PWA).
 *
 *   GENERATE=1 — вычислить expected и перезаписать fixtures/*.json;
 *   без него   — сверить PWA с уже записанными фикстурами (тест падает при расхождении).
 *
 * Запуск — из корня репозитория PWA (там установлен vitest), см. tools/README.md.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { CASES } from './cases'

import * as finance from '@pwa/domain/finance'
import * as dates from '@pwa/domain/dates'
import * as period from '@pwa/domain/period'
import * as rates from '@pwa/domain/rates'
import * as budget from '@pwa/domain/budget'
import * as planning from '@pwa/domain/planning'
import * as analytics from '@pwa/domain/analytics'
import * as history from '@pwa/domain/history'
import * as categories from '@pwa/domain/categories'
import * as accounts from '@pwa/domain/accounts'
import * as numpad from '@pwa/domain/numpad'
import * as onboarding from '@pwa/domain/onboarding'
import * as dangerConfirm from '@pwa/domain/dangerConfirm'
import * as backupValidation from '@pwa/domain/backupValidation'
import * as format from '@pwa/lib/format'
import * as savedMessage from '@pwa/lib/savedMessage'

const MODULES: Record<string, Record<string, unknown>> = {
  finance, dates, period, rates, budget, planning, analytics, history, categories,
  accounts, numpad, onboarding, dangerConfirm, backupValidation, format, savedMessage,
}

const FIXTURES_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'fixtures')
const GENERATE = process.env.GENERATE === '1'

/** JSON → значения JS: { $set } → Set, { $undefined } → undefined, { $number: 'Infinity' } → Infinity. */
function decode(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(decode)
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>
    if ('$set' in o) return new Set(o.$set as unknown[])
    if ('$undefined' in o) return undefined
    if ('$number' in o) return Number(o.$number)
    return Object.fromEntries(Object.entries(o).map(([k, x]) => [k, decode(x)]))
  }
  return v
}

/** Значения JS → JSON: Set → { $set } (отсортирован), undefined → { $undefined }, ключи с undefined опускаются. */
function encode(v: unknown): unknown {
  if (v === undefined) return { $undefined: true }
  if (v instanceof Set) return { $set: [...v].sort() }
  if (Array.isArray(v)) return v.map(encode)
  if (v && typeof v === 'object') {
    return Object.fromEntries(Object.entries(v).filter(([, x]) => x !== undefined).map(([k, x]) => [k, encode(x)]))
  }
  if (typeof v === 'number' && !Number.isFinite(v)) throw new Error(`Нечисловой результат: ${v}`)
  return v
}

function run(module: string, fn: string, rawArgs: unknown[]): unknown {
  const f = MODULES[module][fn]
  if (typeof f !== 'function') throw new Error(`${module}.${fn} не найдена`)
  // Аргументы проходят через JSON — ровно то, что получит другая платформа
  const args = decode(JSON.parse(JSON.stringify(rawArgs))) as unknown[]
  try {
    return encode(f(...args))
  } catch (e) {
    if (e instanceof Error && !(e instanceof TypeError) && !(e instanceof ReferenceError)) return { $error: e.message }
    throw e
  }
}

interface FixtureFile {
  module: string
  generatedFrom: string
  cases: { fn: string; name: string; args: unknown; expected: unknown }[]
}

for (const [module, cases] of Object.entries(CASES)) {
  const path = join(FIXTURES_DIR, `${module}.json`)

  if (GENERATE) {
    it(`generate ${module}`, () => {
      const file: FixtureFile = {
        module,
        generatedFrom: process.env.PWA_REF ?? 'PWA-Budget',
        cases: cases.map((c) => ({
          fn: c.fn,
          name: c.name,
          args: JSON.parse(JSON.stringify(c.args)),
          expected: run(module, c.fn, c.args),
        })),
      }
      writeFileSync(path, JSON.stringify(file, null, 2) + '\n')
    })
    continue
  }

  describe(module, () => {
    const file = JSON.parse(readFileSync(path, 'utf8')) as FixtureFile
    for (const c of file.cases) {
      it(`${c.fn}: ${c.name}`, () => {
        expect(run(module, c.fn, c.args as unknown[])).toEqual(c.expected)
      })
    }
  })
}
