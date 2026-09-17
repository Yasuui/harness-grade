import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { FIXTURES } from "./fixtures.ts";
import { lettersOf, parseMdcFrontmatter, scoreHarness } from "./score.ts";
import { classifyPath } from "./classify.ts";
import { parseSource } from "./parse-url.ts";

describe("classifyPath", () => {
  it("recognizes instruction surfaces", () => {
    assert.equal(classifyPath("AGENTS.md"), "agents_md");
    assert.equal(classifyPath("apps/web/AGENTS.md"), "agents_nested");
    assert.equal(classifyPath("AGENTS.override.md"), "agents_override");
    assert.equal(classifyPath(".cursor/rules/ui.mdc"), "cursor_rule");
    assert.equal(classifyPath(".cursorrules"), "cursorrules_legacy");
    assert.equal(classifyPath("skills/foo/SKILL.md"), "skill_md");
    assert.equal(classifyPath("docs/exec-plans/active/x.md"), "exec_plan");
    assert.equal(classifyPath(".github/workflows/ci.yml"), "ci");
  });
});

describe("parseSource", () => {
  it("parses github urls and shorthand", () => {
    const a = parseSource("https://github.com/acme/widgets");
    assert.equal(a.type, "github");
    if (a.type === "github") {
      assert.equal(a.owner, "acme");
      assert.equal(a.repo, "widgets");
    }
    const b = parseSource("acme/widgets");
    assert.equal(b.type, "github");
    const c = parseSource(
      "https://github.com/acme/widgets/blob/main/AGENTS.md",
    );
    assert.equal(c.type, "github");
    if (c.type === "github") assert.equal(c.file, "AGENTS.md");
  });
});

describe("parseMdcFrontmatter", () => {
  it("reads description and globs", () => {
    const meta = parseMdcFrontmatter(
      "---\ndescription: UI\nglobs: src/**/*.tsx\nalwaysApply: false\n---\nbody\n",
    );
    assert.equal(meta.hasFrontmatter, true);
    assert.equal(meta.description, "UI");
    assert.equal(meta.globs, "src/**/*.tsx");
    assert.equal(meta.alwaysApply, false);
  });
});

describe("fixture scores", () => {
  it("rates a strong Codex map highly", () => {
    const f = FIXTURES["codex-map"];
    const s = scoreHarness({
      listing: f.listing,
      artifacts: f.artifacts,
      workflow: f.workflow,
    });
    assert.ok(s.overall >= 72, `overall ${s.overall}`);
    assert.ok(s.codex >= 75, `codex ${s.codex}`);
    assert.ok(s.dimensions.map.score >= 70, `map ${s.dimensions.map.score}`);
    assert.ok(s.dimensions.verify.score >= 60);
    assert.notEqual(lettersOf(s).overall, "F");
  });

  it("penalizes encyclopedia AGENTS.md", () => {
    const f = FIXTURES.encyclopedia;
    const s = scoreHarness({
      listing: f.listing,
      artifacts: f.artifacts,
      workflow: f.workflow,
    });
    assert.ok(s.dimensions.map.score < 55, `map ${s.dimensions.map.score}`);
    const strong = scoreHarness({
      listing: FIXTURES["codex-map"].listing,
      artifacts: FIXTURES["codex-map"].artifacts,
      workflow: "codex-horizon",
    });
    assert.ok(s.overall < strong.overall - 15, `${s.overall} vs ${strong.overall}`);
  });

  it("rates Cursor rules highly on the Cursor index", () => {
    const f = FIXTURES["cursor-rules"];
    const s = scoreHarness({
      listing: f.listing,
      artifacts: f.artifacts,
      workflow: f.workflow,
      target: "cursor",
    });
    assert.ok(s.cursor >= 65, `cursor ${s.cursor}`);
    assert.ok(s.dimensions.cursor.score >= 80, `dim ${s.dimensions.cursor.score}`);
    assert.ok(s.cursor >= s.codex);
  });

  it("gives a thin README a failing band", () => {
    const f = FIXTURES.thin;
    const s = scoreHarness({
      listing: f.listing,
      artifacts: f.artifacts,
      workflow: "custom",
      desiredOutputs: "",
    });
    assert.ok(s.overall < 45, `overall ${s.overall}`);
    assert.equal(lettersOf(s).overall, "F");
  });
});
