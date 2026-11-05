# Инструменты: генерация и проверка фикстур

- `cases.ts` — **входы** тестовых случаев по модулям. Ожидаемые значения здесь не пишутся.
- `fixtures.test.ts` — запускает функции PWA на этих входах:
  с `GENERATE=1` записывает `fixtures/*.json`, без него — сверяет PWA с записанными фикстурами.
- `vitest.config.mjs` — конфиг для запуска vitest из репозитория PWA.

Нужен клон PWA рядом с установленными зависимостями (`npm ci`). Команды — из корня PWA:

```bash
SPEC=../budget-spec   # путь к этому репозиторию

# Проверить, что PWA соответствует фикстурам
PWA_DIR=$PWD npx vitest run --config $SPEC/tools/vitest.config.mjs

# Перегенерировать фикстуры (после изменения cases.ts или намеренного изменения поведения PWA)
PWA_REF="PWA-Budget@$(git rev-parse --short HEAD) (v$(node -p "require('./package.json').version"))" \
GENERATE=1 PWA_DIR=$PWD npx vitest run --config $SPEC/tools/vitest.config.mjs
```

## Порядок изменения поведения
1. Обновить документ в `spec/` и при необходимости `cases.ts` (новые случаи).
2. Изменить PWA, перегенерировать фикстуры, просмотреть diff `fixtures/` — меняться должно только ожидаемое.
3. Закоммитить spec + fixtures, указать в `CHANGELOG.md`.
4. Обновить Android, чтобы его тесты на фикстурах снова прошли.
