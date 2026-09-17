import { artifact, listingFromArtifacts } from "./score.ts";
import type { Artifact, Critique, FixtureId, ListedFile, WorkflowId } from "./types.ts";
import { FIXTURE_IDS } from "./types.ts";

export type Fixture = {
  id: FixtureId;
  title: string;
  blurb: string;
  workflow: WorkflowId;
  artifacts: Artifact[];
  listing: ListedFile[];
  critique: Critique;
};


function extraListing(paths: string[]): ListedFile[] {
  return paths.map((path) => ({ path, kind: artifact(path, "").kind }));
}

function pack(files: Artifact[], extra: string[] = []): { artifacts: Artifact[]; listing: ListedFile[] } {
  const listing = [...listingFromArtifacts(files), ...extraListing(extra)];
  const seen = new Set<string>();
  const deduped: ListedFile[] = [];
  for (const f of listing) {
    if (seen.has(f.path)) continue;
    seen.add(f.path);
    deduped.push(f);
  }
  return { artifacts: files, listing: deduped };
}

const CODEX_AGENTS = `# AGENTS.md

## How to use this repo
Treat this file as a map. Read only what the task needs.

- Architecture: \`docs/architecture.md\`
- Active exec plans: \`docs/exec-plans/active/\`
- Product specs: \`docs/product-specs/index.md\`
- Frontend patterns: \`skills/frontend/SKILL.md\` (details in \`skills/frontend/references/\`)
- Quality bar: \`docs/QUALITY.md\`
- Canonical UI: \`src/components/ui/button.tsx\`

## Invariants
- Never commit secrets, \`.env\`, or API keys.
- Do not edit files under \`src/generated/\`.
- New features land in \`src/\` following the layering in \`docs/architecture.md\`.
- Ask for confirmation before adding production dependencies.

## Verification
After a series of edits, always run:

\`\`\`bash
npm run typecheck
npm test
npm run lint
\`\`\`

Before opening a pull request, run the full suite and the CI-equivalent commands above.

## Output contract
Done when:
- Files land in the paths named by the exec plan
- \`npm run typecheck\` and \`npm test\` pass
- The PR description lists touched files

Path conventions:

\`\`\`text
src/lib/     domain logic
src/routes/  pages
src/components/ui/  primitives — see button.tsx
\`\`\`

## ExecPlans
For multi-file features or refactors, follow \`docs/exec-plans/README.md\` and write the plan under \`docs/exec-plans/active/\`. Do not start implementation until the plan names files, verify commands, and a done-when checklist.

## Worktrees
Prefer an isolated worktree per long-horizon task so the default branch stays bootable.
`;

const ARCH = `# Architecture

Layers per domain: Types → Config → Repo → Service → Runtime → UI.

See \`src/lib/db.ts\` for the canonical data access pattern.
See \`src/components/ui/button.tsx\` for component shape.
`;

const PLAN_README = `# Exec plans

Each plan is a self-contained spec for an agent with no memory of prior work.

Required sections: context, files to touch, verify commands, done-when.
`;

const PLAN = `# Plan: add audit export

## Done when
- Markdown report copies from the result view
- \`npm run typecheck\` and \`npm test\` pass
- PR description lists the new files

## Files
- \`src/lib/harness/report.ts\`
- \`src/components/audit-result.tsx\`
`;

const QUALITY = `# Quality

Mechanical checks live in CI (\`.github/workflows/ci.yml\`).
Do not restate the linter in prose.
`;

const SKILL = `---
name: frontend
description: UI patterns, tokens, and component rules for this repo.
---

# Frontend skill

Read \`skills/frontend/references/tokens.md\` before restyling.
Canonical button: \`src/components/ui/button.tsx\`.
`;

const SKILL_REF = `# Tokens

Use \`bg-surface\` and \`text-fg\`. No ad-hoc hex.
`;

const CI = `name: ci
on: [push, pull_request]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm test
      - run: npm run typecheck
`;

const CODEX_PACK = pack(
  [
    artifact("AGENTS.md", CODEX_AGENTS),
    artifact("docs/architecture.md", ARCH),
    artifact("docs/exec-plans/README.md", PLAN_README),
    artifact("docs/exec-plans/active/audit-export.md", PLAN),
    artifact("docs/QUALITY.md", QUALITY),
    artifact("docs/product-specs/index.md", "# Specs\n\nIndex of product specs. See \`docs/product-specs/\`.\n"),
    artifact("skills/frontend/SKILL.md", SKILL),
    artifact("skills/frontend/references/tokens.md", SKILL_REF),
    artifact(".github/workflows/ci.yml", CI),
    artifact("README.md", "# Sample\n\nAgent-first repo. Start at AGENTS.md.\n"),
  ],
  ["src/generated/.gitkeep"],
);

const ENCYC_BODY = [
  "# AGENTS.md",
  "",
  "## Everything the model must know",
  "",
  "This file is the complete instruction manual. Do not look elsewhere.",
  "",
  ...Array.from({ length: 90 }, (_, i) =>
    [
      `## Style appendix ${i + 1}`,
      "",
      "Always indent with 2 spaces. Never 4. Prefer early returns. Name things clearly.",
      "Components must be functional. CSS must be Tailwind. Comments should explain why.",
      "When in doubt, rewrite the entire module. Do not read other files; this document is sufficient.",
      "",
    ].join("\n"),
  ),
].join("\n");

const ENCYC_PACK = pack([
  artifact("AGENTS.md", ENCYC_BODY),
  artifact("README.md", "# Widget\n\nA product. Clone and go.\n"),
]);

const CURSOR_AGENTS = `# AGENTS.md

Cursor and Codex both load this file. Prefer glob-scoped rules in \`.cursor/rules/\` for file-local conventions.

## Commands
- \`npm run typecheck\`
- \`npm test\`
- \`npm run lint\`

Run typecheck after a series of edits. Run the full suite before opening a pull request.

## Map
- Components: \`src/components/ui/button.tsx\`
- API routes: \`src/routes/\`
- Architecture: \`docs/architecture.md\`
- Tests colocated as \`*.test.ts\`

## Invariants
- Never commit secrets.
- Do not edit \`src/generated/\`.
- Ask before adding dependencies.

## Output contract
Done when the edited files match the globbed rule, \`npm run typecheck\` passes, and the change is described in the PR body.
`;

const RULE_TS = `---
description: TypeScript conventions for src
globs: src/**/*.{ts,tsx}
alwaysApply: false
---

- Use named exports.
- Canonical data access: \`src/lib/db.ts\`
- After edits run \`npm run typecheck\`
`;

const RULE_UI = `---
description: UI component patterns
globs: src/components/**/*.tsx
alwaysApply: false
---

See \`src/components/ui/button.tsx\` for structure.

\`\`\`tsx
export function Button({ children }: { children: React.ReactNode }) {
  return <button className="h-11 px-4">{children}</button>
}
\`\`\`

Do not copy this entire design system into chat.
`;

const RULE_TEST = `---
description: Test files
globs: "**/*.{test,spec}.{ts,tsx}"
alwaysApply: false
---

Colocate tests. Run \`npm test\` on the touched file first.
`;

const RULE_ALWAYS = `---
description: Global working agreements
alwaysApply: true
---

- Never commit secrets.
- Ask before adding dependencies.
- Prefer existing files over new abstractions.
`;

const CURSOR_PACK = pack([
  artifact("AGENTS.md", CURSOR_AGENTS),
  artifact(".cursor/rules/typescript.mdc", RULE_TS),
  artifact(".cursor/rules/ui.mdc", RULE_UI),
  artifact(".cursor/rules/testing.mdc", RULE_TEST),
  artifact(".cursor/rules/global.mdc", RULE_ALWAYS),
  artifact("docs/architecture.md", ARCH),
  artifact(".github/workflows/ci.yml", CI),
  artifact("README.md", "# Cursor sample\n"),
]);

const THIN_PACK = pack([
  artifact("README.md", "# Hello\n\nTODO: add docs.\n"),
]);

export const FIXTURES: Record<FixtureId, Fixture> = {
  "codex-map": {
    id: "codex-map",
    title: "Strong Codex map",
    blurb: "Short AGENTS.md, docs tree, exec plans, skills, CI.",
    workflow: "codex-horizon",
    ...CODEX_PACK,
    critique: {
      available: true,
      verdict:
        "This is what OpenAI’s harness-engineering note is pointing at: a map, not a manual. Codex can start from AGENTS.md and open the right deeper file.",
      strengths: [
        {
          title: "AGENTS.md is a table of contents",
          file: "AGENTS.md",
          evidence:
            "The file stays near 100 lines and points at docs/, skills, and exec plans instead of inlining them.",
          sourceId: "openai-harness",
        },
        {
          title: "Verification is mechanical",
          file: "AGENTS.md",
          evidence: "typecheck, test, and lint are named, plus a CI workflow.",
          sourceId: "codex-agents-md",
        },
        {
          title: "Skills use references/",
          file: "skills/frontend/SKILL.md",
          evidence: "The skill entry is short; tokens live in references/ for on-demand load.",
        },
      ],
      gaps: [
        {
          title: "No Cursor .mdc rules",
          evidence:
            "Codex-first layout. Cursor will still read AGENTS.md, but glob-scoped .mdc files would raise the Cursor grade.",
          tip: "Add .cursor/rules with description + globs; keep alwaysApply to one short file.",
          sourceId: "cursor-rules",
          severity: "info",
        },
      ],
      tips: [
        {
          title: "Keep the map short as docs grow",
          evidence: "New detail should land under docs/ with a one-line pointer here.",
          tip: "If AGENTS.md approaches 150 lines, split — don’t append.",
          sourceId: "openai-harness",
        },
      ],
      codexNotes:
        "Instruction chain is in good shape: root map, exec plans, nested knowledge, verify loop. Nested AGENTS.override.md would only be needed if a subtree had different invariants.",
      cursorNotes:
        "Cursor can work from AGENTS.md today. Adding glob-scoped .mdc rules would stop the pair loop from dragging frontend guidance into API files.",
      workflowNotes:
        "Fit for long-horizon Codex: plans, isolation note, and done-when checklists exist.",
    },
  },
  encyclopedia: {
    id: "encyclopedia",
    title: "Encyclopedia trap",
    blurb: "One giant AGENTS.md. No docs, no verify loop.",
    workflow: "codex-horizon",
    ...ENCYC_PACK,
    critique: {
      available: true,
      verdict:
        "Classic failure mode. The instruction file crowds out the task. OpenAI dropped this pattern on purpose.",
      strengths: [
        {
          title: "There is a root AGENTS.md",
          file: "AGENTS.md",
          evidence: "Codex will find an entry file. That is the only structural win.",
        },
      ],
      gaps: [
        {
          title: "The map is a 500+ line manual",
          file: "AGENTS.md",
          evidence:
            "Repeated style appendices are inlined. Context is spent on taste, not on the task.",
          tip: "Cut AGENTS.md to ~100 lines. Move each appendix into docs/ and link it.",
          sourceId: "openai-harness",
          severity: "fail",
        },
        {
          title: "Nowhere to disclose into",
          evidence: "No docs/, skills, or exec plans. The agent cannot open a deeper source of truth.",
          tip: "Create docs/architecture.md and docs/exec-plans/ even if they start thin.",
          sourceId: "openai-harness",
          severity: "fail",
        },
        {
          title: "No verification commands",
          evidence: "Nothing tells the agent what to run before a PR.",
          tip: "Name the real commands (test, typecheck, lint) and put them in CI.",
          sourceId: "codex-agents-md",
          severity: "warn",
        },
      ],
      tips: [
        {
          title: "Treat AGENTS.md as a table of contents",
          evidence: "OpenAI: a giant instruction file failed in predictable ways.",
          tip: "Invariants + pointers only. Details live in versioned docs.",
          sourceId: "openai-harness",
        },
      ],
      codexNotes:
        "Codex will load this entire file every run. Nested overrides cannot save it until the root map is cut down.",
      cursorNotes:
        "Cursor has the same context problem, and there are no glob-scoped rules to compensate.",
      workflowNotes:
        "A long-horizon workflow has no exec-plan surface and no verify loop. Overnight runs will drift.",
    },
  },
  "cursor-rules": {
    id: "cursor-rules",
    title: "Cursor rules pack",
    blurb: "Split .mdc rules with globs, plus a short AGENTS.md.",
    workflow: "cursor-loop",
    ...CURSOR_PACK,
    critique: {
      available: true,
      verdict:
        "This is a working Cursor pair-loop harness. Rules are scoped, examples point at files, alwaysApply is a single short global.",
      strengths: [
        {
          title: "MDC frontmatter + globs",
          file: ".cursor/rules/typescript.mdc",
          evidence: "Rules attach to the files they govern instead of every chat.",
          sourceId: "cursor-rules",
        },
        {
          title: "Pointers instead of style dumps",
          file: ".cursor/rules/ui.mdc",
          evidence: "The UI rule names the canonical button instead of pasting the design system.",
          sourceId: "cursor-learn",
        },
        {
          title: "AGENTS.md still present",
          file: "AGENTS.md",
          evidence: "Cursor loads both. Codex can use the same map.",
        },
      ],
      gaps: [
        {
          title: "No exec-plan tree",
          evidence: "Fine for a tight pair loop; weak for overnight Codex work.",
          tip: "If you want long-horizon Codex, add docs/exec-plans and keep AGENTS.md as the pointer.",
          sourceId: "openai-harness",
          severity: "info",
        },
        {
          title: "No CI workflow sampled",
          evidence: "Verify commands are named in rules, but nothing mechanical runs them in GitHub Actions.",
          tip: "Add a workflow that runs the same commands the rules already name.",
          severity: "warn",
        },
      ],
      tips: [
        {
          title: "Keep rules under 500 lines",
          evidence: "Cursor’s own guidance: split large rules, add examples, avoid vague essays.",
          tip: "If a rule grows, split by concern rather than raising alwaysApply.",
          sourceId: "cursor-rules",
        },
      ],
      codexNotes:
        "Codex will use AGENTS.md. It will not load .mdc globs. Mirror the important invariants in the map, not the full rule set.",
      cursorNotes:
        "Strong Cursor surface. One always-on file plus glob rules is the intended shape.",
      workflowNotes:
        "Matches a Cursor pair loop: project commands, canonical files, scoped activation.",
    },
  },
  thin: {
    id: "thin",
    title: "README only",
    blurb: "No AGENTS.md, no rules, no docs.",
    workflow: "custom",
    ...THIN_PACK,
    critique: {
      available: true,
      verdict:
        "There is no harness. The model is guessing from a README. Both Codex and Cursor will improvise.",
      strengths: [
        {
          title: "The repo exists",
          file: "README.md",
          evidence: "A README is better than nothing, but it is not an instruction chain.",
        },
      ],
      gaps: [
        {
          title: "No AGENTS.md",
          evidence: "Codex looks for AGENTS.md before it starts work. Cursor also reads it.",
          tip: "Add a ~80 line AGENTS.md that points at setup, verify commands, and where files go.",
          sourceId: "codex-agents-md",
          severity: "fail",
        },
        {
          title: "No Cursor rules",
          evidence: "No .cursor/rules and no .cursorrules.",
          tip: "Start with one alwaysApply working-agreement file and one glob-scoped rule for your main language.",
          sourceId: "cursor-rules",
          severity: "fail",
        },
        {
          title: "No verify loop",
          evidence: "An agent cannot know what “done” means.",
          tip: "Write the real commands you already run locally. That is the cheapest invariant.",
          severity: "warn",
        },
      ],
      tips: [
        {
          title: "Start with a map, not a manifesto",
          evidence: "Give the agent a table of contents and one verify command.",
          tip: "Three headings: setup, invariants, verification. Expand into docs/ later.",
          sourceId: "openai-harness",
        },
      ],
      codexNotes: "Codex has no instruction chain here. It will rely on the model’s prior and the README.",
      cursorNotes: "Cursor User Rules (global) may still apply, but this repo shares nothing with the team.",
      workflowNotes:
        "Whatever output you want, the harness cannot encode it yet. Describe the artifact in AGENTS.md first.",
    },
  },
};

export function fixtureById(id: string | undefined): Fixture | undefined {
  if (!id) return undefined;
  return FIXTURES[id as FixtureId];
}

export const FIXTURE_LIST = FIXTURE_IDS.map((id) => {
  const f = FIXTURES[id];
  return { id: f.id, title: f.title, blurb: f.blurb, workflow: f.workflow };
});
