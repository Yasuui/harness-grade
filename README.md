# HarnessGrade

**Grade the harness, not the model.**

HarnessGrade audits the instruction files around a coding agent — `AGENTS.md`, Cursor `.mdc` rules, skills, exec plans, CI — and returns:

1. **A structural score** (0–100, plus Codex and Cursor indexes, plus a letter grade). The number is deterministic. The model cannot inflate it.
2. **A written critique** that cites files and a small set of published docs ([OpenAI harness engineering](https://openai.com/index/harness-engineering/), [Codex AGENTS.md](https://developers.openai.com/codex/guides/agents-md), [Cursor Rules](https://cursor.com/docs/rules)).

Tell it the workflow you actually want (long-horizon Codex, Cursor pair loop, docs-first, skill packs, verify-and-PR). The **workflow-fit** dimension grades whether the repo would produce that output.

Grok bot agents are a later target. Same rubric, once instruction files live in-repo.

## Why this exists

OpenAI’s [harness-engineering](https://openai.com/index/harness-engineering/) note is blunt: a giant `AGENTS.md` failed. Context is scarce. The repo is the system of record. `AGENTS.md` should be a **table of contents** (~100 lines), not an encyclopedia.

Cursor’s docs say the same thing in a different dialect: split `.cursor/rules/*.mdc`, keep rules under 500 lines, glob-scope them, point at canonical files, don’t paste the style guide.

Teams still ship the encyclopedia. HarnessGrade is an objective check.

## Scoring (layer 1)

Nine weighted dimensions. Details in [`docs/RUBRIC.md`](docs/RUBRIC.md).

| Dimension | What we look for |
|---|---|
| Map, not manual | Root `AGENTS.md` ~40–140 lines, with pointers |
| Progressive disclosure | `docs/`, skills + `references/`, split rules |
| Invariants & verification | Named test/lint/typecheck, CI, when to run them |
| Cursor surface | `.cursor/rules/*.mdc` + frontmatter + globs |
| Codex surface | Instruction chain, exec plans, nested overrides |
| Workflow fit | Artifacts match the job you selected |
| Output contracts | Done-when, paths, schemas |
| Examples over prose | Canonical files, fences, `@file` |
| Guardrails | Secrets, do-not-touch, approval |

Codex and Cursor indexes drop the other product’s surface and re-weight.

## Critique (layer 2)

Live GitHub / paste audits ask Grok to write strengths, gaps, and tips **against the sampled files**. Sample reports in the app use a fixed critique so you can see the format without spending quota.

## Engine

The scorer is isomorphic TypeScript with no network:

```ts
import { scoreHarness } from "./src/lib/harness/score.ts";
import { artifact } from "./src/lib/harness/score.ts";

const agents = artifact("AGENTS.md", fs.readFileSync("AGENTS.md", "utf8"));
const score = scoreHarness({
  listing: [{ path: agents.path, kind: agents.kind }],
  artifacts: [agents],
  workflow: "codex-horizon",
  target: "codex",
});
console.log(score.overall, score.dimensions.map.score);
```

Run the fixture tests:

```bash
node --experimental-strip-types --test src/lib/harness/score.test.ts
```

## Live auditor

Paste a `github.com/owner/repo` URL (or `owner/repo`), pick a workflow, optionally describe the output you want. Public GitHub trees are fetched; private IPs are blocked.

History is `localStorage` only. No accounts.

## License

MIT
