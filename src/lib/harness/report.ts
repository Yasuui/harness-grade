import { APP_NAME, DIMENSIONS } from "./rubric.ts";
import { sourceById } from "./sources.ts";
import type { AuditReport } from "./types.ts";

export function reportToMarkdown(report: AuditReport): string {
  const { structural, critique, letter, source, request } = report;
  const lines: string[] = [];
  lines.push(`# ${APP_NAME} report`);
  lines.push("");
  lines.push(`- Source: ${source.label}`);
  if (source.url) lines.push(`- URL: ${source.url}`);
  lines.push(`- Workflow: ${request.workflow}`);
  lines.push(`- Target: ${request.target}`);
  lines.push(`- Date: ${report.createdAt}`);
  lines.push("");
  lines.push(`## Grades`);
  lines.push("");
  lines.push(`| Surface | Score | Letter |`);
  lines.push(`|---|---:|---|`);
  lines.push(`| Overall | ${structural.overall} | ${letter.overall} |`);
  lines.push(`| Codex | ${structural.codex} | ${letter.codex} |`);
  lines.push(`| Cursor | ${structural.cursor} | ${letter.cursor} |`);
  lines.push("");
  lines.push(`## Dimensions`);
  lines.push("");
  for (const dim of DIMENSIONS) {
    const d = structural.dimensions[dim.id];
    lines.push(`### ${dim.label} — ${d.score}/100`);
    for (const f of d.findings) {
      const sign = f.delta > 0 ? `+${f.delta}` : `${f.delta}`;
      lines.push(`- (${sign}) ${f.reason}`);
    }
    lines.push("");
  }
  if (critique.verdict) {
    lines.push(`## Critique`);
    lines.push("");
    lines.push(critique.verdict);
    lines.push("");
    if (critique.strengths.length) {
      lines.push(`### What is working`);
      for (const s of critique.strengths) {
        lines.push(`- **${s.title}**${s.file ? ` (\`${s.file}\`)` : ""}: ${s.evidence}`);
      }
      lines.push("");
    }
    if (critique.gaps.length) {
      lines.push(`### Gaps`);
      for (const g of critique.gaps) {
        lines.push(`- **${g.title}**${g.file ? ` (\`${g.file}\`)` : ""}: ${g.evidence}`);
        if (g.tip) lines.push(`  - Tip: ${g.tip}`);
        const src = g.sourceId ? sourceById(g.sourceId) : undefined;
        if (src) lines.push(`  - Source: [${src.title}](${src.url})`);
      }
      lines.push("");
    }
    if (critique.tips.length) {
      lines.push(`### Tips`);
      for (const t of critique.tips) {
        lines.push(`- **${t.title}**: ${t.tip ?? t.evidence}`);
        const src = t.sourceId ? sourceById(t.sourceId) : undefined;
        if (src) lines.push(`  - ${src.title}: ${src.url}`);
      }
      lines.push("");
    }
    if (critique.codexNotes) {
      lines.push(`### Codex`);
      lines.push(critique.codexNotes);
      lines.push("");
    }
    if (critique.cursorNotes) {
      lines.push(`### Cursor`);
      lines.push(critique.cursorNotes);
      lines.push("");
    }
  }
  lines.push(`## Files inventoried`);
  lines.push("");
  for (const f of report.listing.slice(0, 80)) {
    lines.push(`- \`${f.path}\` (${f.kind})`);
  }
  if (report.listing.length > 80) {
    lines.push(`- … ${report.listing.length - 80} more`);
  }
  lines.push("");
  lines.push(
    `_Structural scores are heuristic. Written critiques cite files plus published Codex/Cursor docs. The model does not set the numbers._`,
  );
  return lines.join("\n");
}
