import { classifyPath } from "./classify.ts";
import {
  DIMENSIONS,
  dimsForTarget,
  letterGrade,
  weightedAverage,
  workflowById,
} from "./rubric.ts";
import type {
  Artifact,
  ArtifactKind,
  DimensionId,
  DimensionScore,
  Finding,
  ListedFile,
  StructuralScore,
  TargetId,
  WorkflowId,
} from "./types.ts";

const MAX = 100;

function clamp(n: number): number {
  return Math.max(0, Math.min(MAX, Math.round(n)));
}

function countLines(text: string): number {
  if (!text) return 0;
  return text.replace(/\s+$/, "").split(/\r?\n/).length;
}

function hasKind(listing: ListedFile[], kind: ArtifactKind): boolean {
  return listing.some((f) => f.kind === kind);
}

function filesOf(
  listing: ListedFile[],
  kind: ArtifactKind | ArtifactKind[],
): ListedFile[] {
  const set = new Set(Array.isArray(kind) ? kind : [kind]);
  return listing.filter((f) => set.has(f.kind));
}

function contentOf(artifacts: Artifact[], kind: ArtifactKind): string {
  return artifacts
    .filter((a) => a.kind === kind)
    .map((a) => a.content)
    .join("\n\n");
}

function allInstructionText(artifacts: Artifact[]): string {
  return artifacts
    .filter((a) => a.kind !== "other" && a.kind !== "ci")
    .map((a) => a.content)
    .join("\n");
}

export function parseMdcFrontmatter(content: string): {
  description?: string;
  globs?: string;
  alwaysApply?: boolean;
  hasFrontmatter: boolean;
} {
  const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return { hasFrontmatter: false };
  const yaml = m[1] ?? "";
  const description = yaml.match(/^description:\s*(.+)$/m)?.[1]?.trim();
  const globs = yaml.match(/^globs:\s*(.+)$/m)?.[1]?.trim();
  const alwaysRaw = yaml.match(/^alwaysApply:\s*(.+)$/m)?.[1]?.trim();
  const alwaysApply =
    alwaysRaw === "true" ? true : alwaysRaw === "false" ? false : undefined;
  return { description, globs, alwaysApply, hasFrontmatter: true };
}

function pointerDensity(text: string): number {
  if (!text) return 0;
  const links = text.match(/\[[^\]]+\]\([^)]+\)/g)?.length ?? 0;
  const ticks = text.match(/`[^`\n]+\/[^`\n]+`/g)?.length ?? 0;
  const docsWord = (text.match(/\bdocs\//gi) ?? []).length;
  return links + ticks + docsWord;
}

function agentsLengthScore(lines: number): number {
  if (lines <= 0) return 0;
  if (lines < 16) return 35;
  if (lines < 40) return 68;
  if (lines <= 140) return 100;
  if (lines <= 200) return 78;
  if (lines <= 320) return 48;
  if (lines <= 500) return 28;
  return 12;
}

function add(
  findings: Finding[],
  dimension: DimensionId,
  delta: number,
  reason: string,
) {
  findings.push({ dimension, delta, reason });
}

function sumFindings(base: number, findings: Finding[]): number {
  return clamp(base + findings.reduce((s, f) => s + f.delta, 0));
}

function scoreMap(
  listing: ListedFile[],
  artifacts: Artifact[],
): DimensionScore {
  const findings: Finding[] = [];
  const agents =
    artifacts.find((a) => a.kind === "agents_md") ??
    artifacts.find((a) => a.kind === "claude_md");
  const hasRoot = hasKind(listing, "agents_md") || hasKind(listing, "claude_md");

  if (!hasRoot) {
    add(findings, "map", 0, "No root AGENTS.md or CLAUDE.md");
    const nested = filesOf(listing, "agents_nested").length;
    if (nested)
      add(findings, "map", 12, `${nested} nested AGENTS.md but no root map`);
    return { id: "map", score: sumFindings(8, findings), findings };
  }

  add(findings, "map", 0, "Root instruction file present");
  const text = agents?.content ?? "";
  const lines = countLines(text);
  const lengthPts = Math.round(agentsLengthScore(lines) * 0.45);
  add(
    findings,
    "map",
    lengthPts,
    `Entry file is ${lines} lines (OpenAI: treat AGENTS.md as a ~100-line table of contents)`,
  );

  const pointers = pointerDensity(text);
  if (pointers >= 6) add(findings, "map", 22, "Dense pointers to other files");
  else if (pointers >= 2) add(findings, "map", 12, "Some path/link pointers");
  else add(findings, "map", -8, "Few or no pointers — reads like an encyclopedia");

  const headings = text.match(/^#{1,3} /gm)?.length ?? 0;
  if (headings >= 4) add(findings, "map", 10, "Scannable section headings");
  else if (headings >= 2) add(findings, "map", 5, "Some section structure");

  if (hasKind(listing, "docs") || hasKind(listing, "architecture")) {
    add(findings, "map", 8, "docs/ or architecture file backs the map");
  }

  return { id: "map", score: sumFindings(18, findings), findings };
}

function scoreDisclosure(
  listing: ListedFile[],
  artifacts: Artifact[],
): DimensionScore {
  const findings: Finding[] = [];
  const docs = filesOf(listing, ["docs", "architecture", "exec_plan"]);
  if (docs.length >= 6)
    add(findings, "disclosure", 28, `${docs.length} docs/architecture files`);
  else if (docs.length >= 3)
    add(findings, "disclosure", 22, `${docs.length} docs/plan files`);
  else if (docs.length >= 1)
    add(findings, "disclosure", 16, `${docs.length} docs file(s)`);
  else add(findings, "disclosure", -6, "No docs/ tree — nowhere to disclose into");

  const skills = filesOf(listing, ["skill_md", "cursor_skill"]);
  const skillPaths = skills.map((s) => s.path);
  const withRefs = skillPaths.filter((p) => {
    const dir = p.replace(/\/[^/]+$/i, "");
    return listing.some((f) => f.path.startsWith(`${dir}/references/`));
  }).length;
  if (skills.length) {
    add(findings, "disclosure", 14, `${skills.length} SKILL.md entrypoint(s)`);
    if (withRefs)
      add(findings, "disclosure", 12, `${withRefs} skill(s) use references/`);
    else add(findings, "disclosure", -4, "Skills lack references/ for on-demand depth");
  }

  const cursorRules = filesOf(listing, "cursor_rule");
  if (cursorRules.length >= 3)
    add(findings, "disclosure", 12, `${cursorRules.length} split Cursor rules`);
  else if (cursorRules.length === 1)
    add(findings, "disclosure", 4, "Single Cursor rule file — consider splitting");

  const overrides = filesOf(listing, ["agents_override", "agents_nested"]);
  if (overrides.length)
    add(findings, "disclosure", 10, "Nested AGENTS / override files");

  const giant = artifacts.find((a) => {
    if (a.kind !== "agents_md" && a.kind !== "cursor_rule") return false;
    return countLines(a.content) > 400;
  });
  if (giant)
    add(
      findings,
      "disclosure",
      -12,
      `${giant.path} is ${countLines(giant.content)} lines — split it`,
    );

  return { id: "disclosure", score: sumFindings(16, findings), findings };
}

const VERIFY_CMDS =
  /\b(npm (run )?(test|lint|typecheck|build)|pnpm (test|lint|typecheck)|yarn (test|lint)|pytest|cargo test|go test|make test|bun test|vitest|tsc --noEmit)\b/i;

function scoreVerify(
  listing: ListedFile[],
  artifacts: Artifact[],
): DimensionScore {
  const findings: Finding[] = [];
  const text = allInstructionText(artifacts);
  const cmds = text.match(
    /\b(npm (?:run )?(?:test|lint|typecheck|build)|pnpm (?:test|lint|typecheck)|pytest|cargo test|go test|make test|bun test|vitest|tsc --noEmit)\b/gi,
  );
  const unique = new Set((cmds ?? []).map((c) => c.toLowerCase()));
  if (unique.size >= 3)
    add(findings, "verify", 28, `Named verify commands: ${[...unique].slice(0, 4).join(", ")}`);
  else if (unique.size >= 1)
    add(findings, "verify", 16, `Verify command present (${[...unique][0]})`);
  else add(findings, "verify", -8, "No explicit test/lint/typecheck command");

  if (hasKind(listing, "ci"))
    add(findings, "verify", 18, "CI workflow in .github/workflows");
  else add(findings, "verify", 0, "No CI workflow detected");

  if (/before (opening a )?(pr|pull request)|after (each )?(edit|change)|always run/i.test(text))
    add(findings, "verify", 12, "Says when to run verification");

  if (hasKind(listing, "eval"))
    add(findings, "verify", 10, "Eval / harness tests present");

  if (!VERIFY_CMDS.test(text) && !hasKind(listing, "ci"))
    add(findings, "verify", -6, "Nothing mechanical for an agent to run");

  return { id: "verify", score: sumFindings(18, findings), findings };
}

function scoreCursor(
  listing: ListedFile[],
  artifacts: Artifact[],
): DimensionScore {
  const findings: Finding[] = [];
  const rules = artifacts.filter((a) => a.kind === "cursor_rule");
  const listed = filesOf(listing, "cursor_rule");

  if (listed.length === 0) {
    if (hasKind(listing, "cursorrules_legacy")) {
      add(
        findings,
        "cursor",
        18,
        "Legacy .cursorrules only — migrate to .cursor/rules/*.mdc",
      );
    } else if (hasKind(listing, "agents_md")) {
      add(findings, "cursor", 22, "AGENTS.md only — Cursor reads it, but .mdc rules add globs");
    } else {
      add(findings, "cursor", 0, "No Cursor rules surface");
      return { id: "cursor", score: 10, findings };
    }
    return { id: "cursor", score: sumFindings(12, findings), findings };
  }

  add(findings, "cursor", 28, `${listed.length} .cursor/rules file(s)`);

  let withMeta = 0;
  let withGlobs = 0;
  let alwaysOn = 0;
  let overlong = 0;
  for (const rule of rules) {
    const meta = parseMdcFrontmatter(rule.content);
    if (meta.hasFrontmatter) withMeta += 1;
    if (meta.description) withMeta += 0;
    if (meta.globs) withGlobs += 1;
    if (meta.alwaysApply) alwaysOn += 1;
    if (countLines(rule.content) > 500) overlong += 1;
  }
  if (rules.length === 0) {
    add(findings, "cursor", 8, "Rule files listed but contents not sampled");
  } else {
    if (withMeta)
      add(findings, "cursor", 16, "MDC frontmatter present");
    else add(findings, "cursor", -8, "Rules missing YAML frontmatter (plain .md is ignored)");
    if (withGlobs)
      add(findings, "cursor", 12, "Glob-scoped rules");
    if (alwaysOn === rules.length && rules.length > 1)
      add(findings, "cursor", -8, "Every rule is alwaysApply — burns context");
    else if (alwaysOn <= 1)
      add(findings, "cursor", 6, "alwaysApply used sparingly");
    if (overlong)
      add(findings, "cursor", -10, `${overlong} rule(s) over 500 lines`);
  }

  if (hasKind(listing, "agents_md"))
    add(findings, "cursor", 8, "AGENTS.md coexists with project rules");
  if (hasKind(listing, "cursor_skill"))
    add(findings, "cursor", 6, ".cursor/skills present");

  return { id: "cursor", score: sumFindings(14, findings), findings };
}

function scoreCodex(
  listing: ListedFile[],
  artifacts: Artifact[],
): DimensionScore {
  const findings: Finding[] = [];
  if (hasKind(listing, "agents_md"))
    add(findings, "codex", 30, "Root AGENTS.md (Codex instruction chain)");
  else add(findings, "codex", -10, "No root AGENTS.md");

  if (filesOf(listing, ["agents_override", "agents_nested"]).length)
    add(findings, "codex", 14, "Nested AGENTS / override files");

  const plans = filesOf(listing, "exec_plan");
  if (plans.length)
    add(findings, "codex", 18, `Exec plan surface (${plans.length} file(s))`);

  if (hasKind(listing, "codex_config"))
    add(findings, "codex", 8, ".codex / .agents config present");

  const text = contentOf(artifacts, "agents_md");
  if (/worktree/i.test(text))
    add(findings, "codex", 6, "Mentions worktrees / isolation");
  if (VERIFY_CMDS.test(text))
    add(findings, "codex", 8, "Verification commands in AGENTS.md");

  const lines = countLines(text);
  if (lines > 0 && lines <= 140)
    add(findings, "codex", 10, "AGENTS.md stays map-sized");
  else if (lines > 300)
    add(findings, "codex", -10, "AGENTS.md is too large for Codex context");

  return { id: "codex", score: sumFindings(12, findings), findings };
}

function scoreWorkflow(
  listing: ListedFile[],
  artifacts: Artifact[],
  workflow: WorkflowId,
  desiredOutputs?: string,
): DimensionScore {
  const findings: Finding[] = [];
  const wants = workflowById(workflow).wants;
  add(findings, "workflow", 0, `Target workflow: ${workflowById(workflow).label}`);

  const hasAgents = hasKind(listing, "agents_md");
  const hasDocs = hasKind(listing, "docs") || hasKind(listing, "architecture");
  const hasRules = filesOf(listing, "cursor_rule").length > 0;
  const hasSkills = filesOf(listing, ["skill_md", "cursor_skill"]).length > 0;
  const hasPlans = hasKind(listing, "exec_plan");
  const hasCi = hasKind(listing, "ci");
  const text = allInstructionText(artifacts) + " " + (desiredOutputs ?? "");
  const doneWhen = /done when|acceptance|definition of done|must (pass|open|produce)/i.test(
    text,
  );

  switch (workflow) {
    case "codex-horizon":
      if (hasAgents) add(findings, "workflow", 18, "Has the Codex map");
      if (hasPlans) add(findings, "workflow", 22, "Exec plans exist");
      else add(findings, "workflow", -12, "No exec-plan / PLANS.md surface");
      if (hasDocs) add(findings, "workflow", 12, "Docs tree for long-horizon context");
      if (VERIFY_CMDS.test(text)) add(findings, "workflow", 10, "Verify loop for overnight runs");
      break;
    case "cursor-loop":
      if (hasRules) add(findings, "workflow", 24, "Project rules for the pair loop");
      else add(findings, "workflow", -10, "No .cursor/rules — Cursor will only see AGENTS.md");
      if (hasAgents) add(findings, "workflow", 10, "AGENTS.md also loaded by Cursor");
      if (pointerDensity(text) >= 3)
        add(findings, "workflow", 10, "Canonical file pointers");
      break;
    case "docs-first":
      if (hasDocs) add(findings, "workflow", 26, "docs/ is present");
      else add(findings, "workflow", -14, "No docs tree to navigate");
      if (hasAgents && countLines(contentOf(artifacts, "agents_md")) <= 160)
        add(findings, "workflow", 14, "Short map into the docs");
      break;
    case "skills":
      if (hasSkills) add(findings, "workflow", 26, "Skill entrypoints found");
      else add(findings, "workflow", -12, "No SKILL.md files");
      break;
    case "pr-factory":
      if (hasCi) add(findings, "workflow", 18, "CI present");
      if (VERIFY_CMDS.test(text)) add(findings, "workflow", 16, "Local verify commands");
      if (/pull request|\bPR\b|conventional commit/i.test(text))
        add(findings, "workflow", 12, "PR / commit conventions");
      if (!hasCi && !VERIFY_CMDS.test(text))
        add(findings, "workflow", -14, "Nothing to verify before a PR");
      break;
    case "custom":
      if ((desiredOutputs ?? "").trim().length > 12)
        add(findings, "workflow", 16, "Desired output stated for this audit");
      else add(findings, "workflow", -6, "Custom workflow with no desired output described");
      if (doneWhen) add(findings, "workflow", 12, "Done-when language in-repo or prompt");
      if (hasAgents || hasRules) add(findings, "workflow", 10, "Some instruction surface exists");
      break;
  }

  if (doneWhen) add(findings, "workflow", 8, "Acceptance / done-when language");
  wants.slice(0, 0);

  return { id: "workflow", score: sumFindings(20, findings), findings };
}

function scoreContracts(
  listing: ListedFile[],
  artifacts: Artifact[],
): DimensionScore {
  const findings: Finding[] = [];
  const text = allInstructionText(artifacts);
  if (/json schema|zod|response_format|structured output/i.test(text))
    add(findings, "contracts", 18, "Structured output / schema language");
  if (/done when|definition of done|acceptance criter/i.test(text))
    add(findings, "contracts", 16, "Done-when / acceptance criteria");
  if (/must (write|land|live) in|files? (go|belong) in|path convention/i.test(text))
    add(findings, "contracts", 14, "Path conventions for outputs");
  if (/pull request|\.github\/PULL_REQUEST|commit message/i.test(text) || hasKind(listing, "ci"))
    add(findings, "contracts", 10, "PR or commit contract");
  if (findings.length === 0)
    add(findings, "contracts", -8, "No explicit output contract");
  return { id: "contracts", score: sumFindings(22, findings), findings };
}

function scoreExamples(artifacts: Artifact[]): DimensionScore {
  const findings: Finding[] = [];
  const text = allInstructionText(artifacts);
  const fences = text.match(/```/g)?.length ?? 0;
  const paths = text.match(/`[^`\n]+\/[^`\n]+`/g)?.length ?? 0;
  const atFiles = text.match(/@[A-Za-z0-9_./-]+/g)?.length ?? 0;
  if (fences >= 4) add(findings, "examples", 22, "Code fences showing the pattern");
  else if (fences >= 2) add(findings, "examples", 12, "Some code examples");
  if (paths >= 5) add(findings, "examples", 18, "Canonical path references");
  else if (paths >= 2) add(findings, "examples", 8, "A few path references");
  if (atFiles >= 2) add(findings, "examples", 10, "@file references");
  if (artifacts.some((a) => /example/i.test(a.path)))
    add(findings, "examples", 12, "example/ files in the tree");
  if (findings.length === 0)
    add(findings, "examples", -6, "Mostly prose, few examples");
  return { id: "examples", score: sumFindings(20, findings), findings };
}

function scoreGuardrails(artifacts: Artifact[]): DimensionScore {
  const findings: Finding[] = [];
  const text = allInstructionText(artifacts);
  if (/never (commit )?(secrets?|api keys?|credentials)/i.test(text) || /do not commit secrets/i.test(text))
    add(findings, "guardrails", 18, "Secrets policy");
  if (/do not (modify|edit|touch)|never (edit|change)|don't (touch|modify)/i.test(text))
    add(findings, "guardrails", 16, "Do-not-touch scope");
  if (/sandbox|ask for (approval|confirmation)|never run (rm|destructive)/i.test(text))
    add(findings, "guardrails", 12, "Approval / sandbox language");
  if (/safety|security guidelines|precedence:/i.test(text))
    add(findings, "guardrails", 10, "Safety / precedence section");
  if (findings.length === 0)
    add(findings, "guardrails", -8, "No explicit guardrails");
  return { id: "guardrails", score: sumFindings(24, findings), findings };
}

export function scoreHarness(input: {
  listing: ListedFile[];
  artifacts: Artifact[];
  workflow: WorkflowId;
  target?: TargetId;
  desiredOutputs?: string;
}): StructuralScore {
  const { listing, artifacts, workflow, desiredOutputs } = input;
  const map = scoreMap(listing, artifacts);
  const disclosure = scoreDisclosure(listing, artifacts);
  const verify = scoreVerify(listing, artifacts);
  const cursor = scoreCursor(listing, artifacts);
  const codex = scoreCodex(listing, artifacts);
  const workflowScore = scoreWorkflow(
    listing,
    artifacts,
    workflow,
    desiredOutputs,
  );
  const contracts = scoreContracts(listing, artifacts);
  const examples = scoreExamples(artifacts);
  const guardrails = scoreGuardrails(artifacts);

  const dimensions = {
    map,
    disclosure,
    verify,
    cursor,
    codex,
    workflow: workflowScore,
    contracts,
    examples,
    guardrails,
  } satisfies Record<DimensionId, DimensionScore>;

  const values = Object.fromEntries(
    DIMENSIONS.map((d) => [d.id, dimensions[d.id].score]),
  ) as Record<DimensionId, number>;

  return {
    overall: weightedAverage(values, dimsForTarget(input.target ?? "both")),
    codex: weightedAverage(values, dimsForTarget("codex")),
    cursor: weightedAverage(values, dimsForTarget("cursor")),
    dimensions,
  };
}

export function lettersOf(score: StructuralScore) {
  return {
    overall: letterGrade(score.overall),
    codex: letterGrade(score.codex),
    cursor: letterGrade(score.cursor),
  };
}

export function listingFromArtifacts(artifacts: Artifact[]): ListedFile[] {
  return artifacts.map((a) => ({ path: a.path, kind: a.kind }));
}

export function artifact(
  path: string,
  content: string,
): Artifact {
  return { path, kind: classifyPath(path), content };
}
