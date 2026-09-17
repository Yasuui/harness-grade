# Contributing to HarnessGrade

## What to change

- **Rubric / weights** — `src/lib/harness/rubric.ts` and `docs/RUBRIC.md`. Keep them in sync. Cite a published source (OpenAI harness engineering, Codex AGENTS.md, Cursor Rules) when you add a check.
- **Heuristics** — `src/lib/harness/score.ts`. Every new rule should show up as a finding string the UI can list. Add or extend a fixture in `src/lib/harness/fixtures.ts` so the test suite pins the behavior.
- **Tests** — `src/lib/harness/score.test.ts`. Strong Codex maps must outscore encyclopedia dumps. Thin READMEs must fail.

## How to test

```bash
node --experimental-strip-types --test src/lib/harness/score.test.ts
```

Do not let the critique model set numeric scores. Layer 1 is deterministic.

## Grok bot agents

Not in scope yet. When they ship as in-repo instruction files, extend `ArtifactKind` and a dimension — do not special-case a hosted bot that has no files.
