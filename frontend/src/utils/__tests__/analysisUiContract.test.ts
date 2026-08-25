import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("analysis page UI contract", () => {
  it("uses local semantic icons throughout reports and task states", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/views/Analysis.vue"),
      "utf8"
    );

    expect(source).not.toContain("material-icons");
    expect(source).toContain(
      'import AppIcon from "@/components/ui/AppIcon.vue"'
    );
    expect(source).toContain("getResourceIconName");
  });

  it("首屏只保留面向用户的分析入口标题，不重复堆叠工作区文案", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/views/Analysis.vue"),
      "utf8"
    );

    expect(source).toContain("开始一次分析");
    expect(source).not.toMatch(/<span>分析工作区<\/span>/);
  });

  it("工具切换器在桌面保持紧凑，在移动端占满工作区", () => {
    const switcherSource = readFileSync(
      resolve(
        process.cwd(),
        "src/components/analysis/AnalysisToolSwitcher.vue"
      ),
      "utf8"
    );

    expect(switcherSource).toMatch(
      /\.analysis-tool-switcher\s*\{[\s\S]*?display:\s*inline-flex;[\s\S]*?max-width:\s*100%;/
    );
    expect(switcherSource).toMatch(
      /@media\s*\(max-width:\s*520px\)[\s\S]*?\.analysis-tool-switcher\s*\{[\s\S]*?width:\s*100%;/
    );
    expect(switcherSource).toMatch(
      /grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/
    );
  });

  it("分析工作区把扫描动作和最近记录保持在清晰的对齐列中", () => {
    const scopeSource = readFileSync(
      resolve(process.cwd(), "src/components/analysis/AnalysisScopePanel.vue"),
      "utf8"
    );
    const recentSource = readFileSync(
      resolve(process.cwd(), "src/components/analysis/AnalysisRecentScans.vue"),
      "utf8"
    );

    expect(scopeSource).toContain('class="analysis-run-panel__intro"');
    expect(scopeSource).toContain('class="analysis-run-panel__section"');
    expect(recentSource).toContain('class="analysis-recent__side"');
    expect(recentSource).toContain('class="analysis-recent__time"');
    expect(recentSource).toContain('class="analysis-recent__time-label"');
    expect(recentSource).toMatch(
      /grid-template-columns:\s*34px\s+minmax\(0, 1fr\)\s+174px\s+110px/
    );
    expect(recentSource).toContain("display: contents;");
  });

  it("最近扫描使用紧凑的表格节奏，动作入口不抢夺报告内容", () => {
    const recentSource = readFileSync(
      resolve(process.cwd(), "src/components/analysis/AnalysisRecentScans.vue"),
      "utf8"
    );

    expect(recentSource).toMatch(
      /\.analysis-recent__list li\s*\{[\s\S]*?min-height:\s*82px;/
    );
    expect(recentSource).toMatch(
      /\.analysis-recent__action\s*\{[\s\S]*?min-height:\s*38px;/
    );
    expect(recentSource).toMatch(
      /\.analysis-recent\s*\{[\s\S]*?border-radius:\s*10px;/
    );
  });
});
