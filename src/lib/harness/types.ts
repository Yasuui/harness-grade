export const WORKFLOW_IDS = [
  "codex-horizon",
  "cursor-loop",
  "docs-first",
  "skills",
  "pr-factory",
  "custom",
] as const;

export type WorkflowId = (typeof WORKFLOW_IDS)[number];

export const TARGETS = ["both", "codex", "cursor"] as const;
export type TargetId = (typeof TARGETS)[number];

export const DIMENSION_IDS = [
  "map",
  "disclosure",
  "verify",
  "cursor",
  "codex",
  "workflow",
  "contracts",
  "examples",
  "guardrails",
] as const;

export type DimensionId = (typeof DIMENSION_IDS)[number];

export type ArtifactKind =
  | "agents_md"
  | "agents_nested"
  | "agents_override"
  | "claude_md"
  | "cursor_rule"
  | "cursorrules_legacy"
  | "cursor_skill"
  | "skill_md"
  | "exec_plan"
  | "architecture"
  | "readme"
  | "docs"
  | "mcp"
  | "ci"
  | "eval"
  | "codex_config"
  | "other";

export type ListedFile = {
  path: string;
  kind: ArtifactKind;
};

export type Artifact = ListedFile & {
  content: string;
  truncated?: boolean;
};

export type Finding = {
  dimension: DimensionId;
  delta: number;
  reason: string;
};

export type DimensionScore = {
  id: DimensionId;
  score: number;
  findings: Finding[];
};

export type StructuralScore = {
  overall: number;
  codex: number;
  cursor: number;
  dimensions: Record<DimensionId, DimensionScore>;
};

export type CritiqueItem = {
  title: string;
  evidence: string;
  file?: string;
  tip?: string;
  sourceId?: string;
  severity?: "info" | "warn" | "fail";
};

export type Critique = {
  available: boolean;
  model?: string;
  verdict: string;
  strengths: CritiqueItem[];
  gaps: CritiqueItem[];
  tips: CritiqueItem[];
  codexNotes: string;
  cursorNotes: string;
  workflowNotes: string;
};

export type AuditRequest = {
  source: string;
  fixtureId?: string;
  paste?: string;
  workflow: WorkflowId;
  target: TargetId;
  desiredOutputs?: string;
};

export type CollectedSource = {
  kind: "github" | "web" | "paste" | "fixture";
  label: string;
  url?: string;
  owner?: string;
  repo?: string;
  ref?: string;
  warning?: string;
};

export const FIXTURE_IDS = [
  "codex-map",
  "encyclopedia",
  "cursor-rules",
  "thin",
] as const;

export type FixtureId = (typeof FIXTURE_IDS)[number];

export type AuditReport = {
  id: string;
  createdAt: string;
  request: AuditRequest;
  source: CollectedSource;
  listing: ListedFile[];
  sampled: { path: string; bytes: number; kind: ArtifactKind }[];
  structural: StructuralScore;
  critique: Critique;
  letter: {
    overall: string;
    codex: string;
    cursor: string;
  };
};


