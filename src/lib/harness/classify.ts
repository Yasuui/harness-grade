import type { ArtifactKind } from "./types.ts";

export function normalizePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\.\//, "");
}

export function classifyPath(path: string): ArtifactKind {
  const p = normalizePath(path);
  const base = p.split("/").pop() ?? p;
  const lower = p.toLowerCase();

  if (/^agents\.override\.md$/i.test(base)) return "agents_override";
  if (/^agents\.md$/i.test(base)) {
    return p.includes("/") ? "agents_nested" : "agents_md";
  }
  if (/^claude\.md$/i.test(base)) return "claude_md";
  if (base === ".cursorrules" || lower.endsWith("/.cursorrules")) {
    return "cursorrules_legacy";
  }
  if (lower.includes(".cursor/rules/") && /\.(mdc|md)$/.test(lower)) {
    return "cursor_rule";
  }
  if (lower.includes(".cursor/skills/")) return "cursor_skill";
  if (/\/skill\.md$/i.test(p)) return "skill_md";
  if (
    /^plans\.md$/i.test(base) ||
    /exec-?plans?\//i.test(p) ||
    /\/plans\.md$/i.test(p)
  ) {
    return "exec_plan";
  }
  if (/^architecture\.md$/i.test(base) || /architecture\.md$/i.test(p)) {
    return "architecture";
  }
  if (/^readme\.md$/i.test(base) && !p.includes("/")) return "readme";
  if (/(^|\/)mcp\.json$/i.test(p) || lower.includes(".cursor/mcp")) return "mcp";
  if (p.startsWith(".github/workflows/")) return "ci";
  if (p.startsWith(".codex/") || p.startsWith(".agents/")) return "codex_config";
  if (/(^|\/)(evals?|eval-harness)\//i.test(p)) return "eval";
  if (p.startsWith("docs/") || p.includes("/docs/")) return "docs";
  return "other";
}

export function isInstructionPath(path: string): boolean {
  const kind = classifyPath(path);
  return kind !== "other";
}

export function priorityFor(kind: ArtifactKind): number {
  switch (kind) {
    case "agents_md":
      return 100;
    case "agents_override":
    case "agents_nested":
      return 90;
    case "claude_md":
      return 85;
    case "cursor_rule":
      return 88;
    case "skill_md":
      return 80;
    case "exec_plan":
      return 78;
    case "architecture":
      return 74;
    case "cursorrules_legacy":
      return 70;
    case "cursor_skill":
      return 68;
    case "codex_config":
      return 64;
    case "mcp":
      return 60;
    case "ci":
      return 55;
    case "eval":
      return 52;
    case "docs":
      return 50;
    case "readme":
      return 40;
    default:
      return 10;
  }
}

export function shouldSkipPath(path: string): boolean {
  const p = normalizePath(path).toLowerCase();
  return (
    p.startsWith("node_modules/") ||
    p.startsWith("dist/") ||
    p.startsWith("build/") ||
    p.startsWith(".git/") ||
    p.startsWith("vendor/") ||
    p.includes("/node_modules/") ||
    /\.(png|jpe?g|gif|webp|ico|pdf|zip|wasm|mp4|lock)$/.test(p)
  );
}
