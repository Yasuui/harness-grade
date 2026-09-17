# HarnessGrade rubric

Layer 1 is a deterministic 0–100 score. Layer 2 is a written critique that must cite files or the canonical docs below. The model cannot change the number.

## Canonical sources

- [Harness engineering (OpenAI)](https://openai.com/index/harness-engineering/) — `AGENTS.md` is a ~100-line table of contents; the repo is the system of record; progressive disclosure.
- [Custom instructions with AGENTS.md (Codex)](https://developers.openai.com/codex/guides/agents-md) — global / repo / nested `AGENTS.md` and `AGENTS.override.md`.
- [Cursor Rules](https://cursor.com/docs/rules) — `.cursor/rules/*.mdc` with `description`, `globs`, `alwaysApply`. Keep rules under 500 lines. `.cursorrules` is legacy.
- [Customizing agents (Cursor)](https://cursor.com/learn/customizing-agents) — commands, conventions, pointers to canonical files, guardrails. Not style-guide dumps.

## Dimensions

| Id | Label | Weight | Fail if |
|---|---|---|---|
| map | Map, not manual | 14 | No root AGENTS.md, or a 400+ line encyclopedia with no pointers |
| disclosure | Progressive disclosure | 14 | Nowhere to put depth (`docs/`, skills/references, split rules) |
| verify | Invariants & verification | 14 | No test/lint/typecheck command and no CI |
| cursor | Cursor surface | 12 | No `.mdc` rules and no AGENTS.md either |
| codex | Codex surface | 12 | No AGENTS.md |
| workflow | Workflow fit | 12 | Selected workflow’s artifacts are missing |
| contracts | Output contracts | 8 | No done-when, paths, or schemas |
| examples | Examples over prose | 7 | No fences, paths, or canonical files |
| guardrails | Guardrails | 7 | No secrets / scope / approval language |

Codex index drops `cursor`. Cursor index drops `codex`. Overall uses all nine.

## Bands

| Score | Letter | Band |
|---|---|---|
| 85–100 | A / A- | Exemplary |
| 70–84 | B+ / B / B- | Production-ready |
| 55–69 | C+ / C / C- | Uneven |
| 40–54 | D+ / D | Fragile |
| 0–39 | F | Unharnessed |
