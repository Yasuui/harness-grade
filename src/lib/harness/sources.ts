export const CANONICAL_SOURCES = [
  {
    id: "openai-harness",
    title: "Harness engineering (OpenAI)",
    url: "https://openai.com/index/harness-engineering/",
    note: "AGENTS.md is a table of contents (~100 lines). The repo is the system of record. Progressive disclosure beats a giant instruction file.",
  },
  {
    id: "codex-agents-md",
    title: "Custom instructions with AGENTS.md (Codex)",
    url: "https://developers.openai.com/codex/guides/agents-md",
    note: "Codex layers global, repo, and nested AGENTS.md / AGENTS.override.md. Put invariants and verification commands here; keep nested overrides scoped.",
  },
  {
    id: "cursor-rules",
    title: "Cursor Rules",
    url: "https://cursor.com/docs/rules",
    note: "Project rules live in .cursor/rules as .mdc with description, globs, alwaysApply. Keep rules under 500 lines, scoped, with examples. .cursorrules is legacy.",
  },
  {
    id: "cursor-learn",
    title: "Customizing agents (Cursor)",
    url: "https://cursor.com/learn/customizing-agents",
    note: "Rules should list project commands, conventions, pointers to canonical files, and guardrails — not entire style guides.",
  },
] as const;

export type SourceId = (typeof CANONICAL_SOURCES)[number]["id"];

export function sourceById(id: string) {
  return CANONICAL_SOURCES.find((s) => s.id === id);
}
