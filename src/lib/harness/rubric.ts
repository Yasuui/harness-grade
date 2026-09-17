import type { DimensionId, TargetId, WorkflowId } from "./types.ts";

export const APP_NAME = "HarnessGrade";
export const APP_TAGLINE = "Grade the harness, not the model.";

export type DimensionDef = {
  id: DimensionId;
  label: string;
  weight: number;
  question: string;
  checks: string[];
  sources: string[];
};

export const DIMENSIONS: DimensionDef[] = [
  {
    id: "map",
    label: "Map, not manual",
    weight: 14,
    question: "Is the entry file a table of contents, or an encyclopedia?",
    checks: [
      "AGENTS.md (or CLAUDE.md) exists at the repo root",
      "Length lands near 40–140 lines, not a 500-line dump",
      "Pointers to docs/, skills, or canonical files — not inlined style guides",
      "Clear section headings an agent can scan",
    ],
    sources: ["openai-harness", "codex-agents-md"],
  },
  {
    id: "disclosure",
    label: "Progressive disclosure",
    weight: 14,
    question: "Can the agent start small and open the right deeper file?",
    checks: [
      "docs/ (or equivalent) holds the system of record",
      "Skills use SKILL.md plus references/ instead of one huge body",
      "Cursor rules are split by concern, not one always-on blob",
      "Nested AGENTS.override.md where a subtree has different invariants",
    ],
    sources: ["openai-harness", "cursor-rules"],
  },
  {
    id: "verify",
    label: "Invariants & verification",
    weight: 14,
    question: "Are constraints mechanical (commands, CI) rather than vibes?",
    checks: [
      "Named verify commands: test, typecheck, lint, build",
      "CI workflows or equivalent gates",
      "Instructions say when to run them (before PR, after edits)",
      "Invariants are enforceable, not taste essays",
    ],
    sources: ["openai-harness", "codex-agents-md"],
  },
  {
    id: "cursor",
    label: "Cursor surface",
    weight: 12,
    question: "Does the repo speak Cursor’s current rule format?",
    checks: [
      ".cursor/rules/*.mdc with YAML frontmatter",
      "description + globs; alwaysApply used sparingly",
      "Rules stay under 500 lines with concrete examples",
      "AGENTS.md coexists (Cursor reads it); .cursorrules alone is legacy",
    ],
    sources: ["cursor-rules", "cursor-learn"],
  },
  {
    id: "codex",
    label: "Codex surface",
    weight: 12,
    question: "Does the repo speak Codex’s instruction chain?",
    checks: [
      "Root AGENTS.md as the map",
      "Nested AGENTS.override.md where needed",
      "Exec plans / PLANS.md / docs/exec-plans for long-horizon work",
      ".codex or .agents config when the project ships a Codex-specific harness",
    ],
    sources: ["codex-agents-md", "openai-harness"],
  },
  {
    id: "workflow",
    label: "Workflow fit",
    weight: 12,
    question: "Would this harness actually produce the output you want?",
    checks: [
      "Artifacts match the selected workflow (exec plans vs scoped rules vs skills)",
      "Done-when / acceptance language exists",
      "Desired outputs are named in-repo, not only in chat",
    ],
    sources: ["openai-harness", "cursor-learn"],
  },
  {
    id: "contracts",
    label: "Output contracts",
    weight: 8,
    question: "Is “done” specified as files, commands, or schemas?",
    checks: [
      "Path conventions for where work lands",
      "Structured output / schema / checklist language",
      "PR or commit expectations",
    ],
    sources: ["openai-harness"],
  },
  {
    id: "examples",
    label: "Examples over prose",
    weight: 7,
    question: "Does the harness point at canonical files instead of restating them?",
    checks: [
      "Backticked paths and @file references",
      "Code fences that show the pattern",
      "example/ or golden files",
    ],
    sources: ["cursor-learn", "cursor-rules"],
  },
  {
    id: "guardrails",
    label: "Guardrails",
    weight: 7,
    question: "Are secrets, scope, and “never” rules explicit?",
    checks: [
      "Do-not-touch paths or generated files",
      "Secrets / credentials policy",
      "Approval, sandbox, or spend constraints",
    ],
    sources: ["codex-agents-md", "cursor-learn"],
  },
];

export const WORKFLOWS: {
  id: WorkflowId;
  label: string;
  summary: string;
  wants: string[];
}[] = [
  {
    id: "codex-horizon",
    label: "Long-horizon Codex",
    summary: "Multi-hour exec plans, PRs, overnight loops.",
    wants: ["AGENTS.md map", "exec plans", "verification commands", "docs as system of record"],
  },
  {
    id: "cursor-loop",
    label: "Cursor pair loop",
    summary: "Tight inline edits with scoped project rules.",
    wants: [".cursor/rules/*.mdc", "globs", "canonical file pointers", "project commands"],
  },
  {
    id: "docs-first",
    label: "Docs-first knowledge",
    summary: "Agent navigates a structured docs tree.",
    wants: ["short AGENTS.md", "docs/ index", "architecture map", "progressive links"],
  },
  {
    id: "skills",
    label: "Skill packs",
    summary: "On-demand playbooks instead of always-on rules.",
    wants: ["SKILL.md entrypoints", "references/", "trigger descriptions", "size caps"],
  },
  {
    id: "pr-factory",
    label: "Verify-and-PR",
    summary: "Autonomous change → test → pull request.",
    wants: ["CI", "lint/test/typecheck", "PR conventions", "guardrails"],
  },
  {
    id: "custom",
    label: "Custom output",
    summary: "You describe the artifact the agent should produce.",
    wants: ["stated done-when", "matching docs or rules", "examples of the output"],
  },
];

export function workflowById(id: WorkflowId) {
  return WORKFLOWS.find((w) => w.id === id) ?? WORKFLOWS[0];
}

export function dimensionById(id: DimensionId) {
  return DIMENSIONS.find((d) => d.id === id)!;
}

export function letterGrade(score: number): string {
  if (score >= 90) return "A";
  if (score >= 85) return "A-";
  if (score >= 80) return "B+";
  if (score >= 75) return "B";
  if (score >= 70) return "B-";
  if (score >= 65) return "C+";
  if (score >= 60) return "C";
  if (score >= 55) return "C-";
  if (score >= 50) return "D+";
  if (score >= 40) return "D";
  return "F";
}

export function bandLabel(score: number): string {
  if (score >= 85) return "Exemplary";
  if (score >= 70) return "Production-ready";
  if (score >= 55) return "Uneven";
  if (score >= 40) return "Fragile";
  return "Unharnessed";
}

export function scoreTone(score: number): "sage" | "steel" | "amber" | "rust" {
  if (score >= 80) return "sage";
  if (score >= 65) return "steel";
  if (score >= 45) return "amber";
  return "rust";
}

const CODEX_DIMS: DimensionId[] = [
  "map",
  "disclosure",
  "verify",
  "codex",
  "workflow",
  "contracts",
  "examples",
  "guardrails",
];
const CURSOR_DIMS: DimensionId[] = [
  "map",
  "disclosure",
  "verify",
  "cursor",
  "workflow",
  "contracts",
  "examples",
  "guardrails",
];

export function dimsForTarget(target: TargetId): DimensionId[] {
  if (target === "codex") return CODEX_DIMS;
  if (target === "cursor") return CURSOR_DIMS;
  return DIMENSIONS.map((d) => d.id);
}

export function weightedAverage(
  scores: Record<DimensionId, number>,
  ids: DimensionId[],
): number {
  let num = 0;
  let den = 0;
  for (const id of ids) {
    const w = dimensionById(id).weight;
    num += scores[id] * w;
    den += w;
  }
  return den === 0 ? 0 : Math.round(num / den);
}
