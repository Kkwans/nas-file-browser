import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const analysisSource = readFileSync(
  fileURLToPath(new URL("../../views/Analysis.vue", import.meta.url)),
  "utf8"
);
const scopePanelSource = readFileSync(
  fileURLToPath(
    new URL("../../components/analysis/AnalysisScopePanel.vue", import.meta.url)
  ),
  "utf8"
);

describe("存储工具无障碍契约", () => {
  it("扫描范围移除按钮保留 44px 触摸目标", () => {
    expect(scopePanelSource).toMatch(
      /\.analysis-run-panel__scopes button\s*\{[\s\S]*?width:\s*44px;[\s\S]*?height:\s*44px;/
    );
  });

  it("工具、范围和结果形成连续的三步工作流", () => {
    expect(analysisSource).toContain("<AnalysisToolSwitcher");
    expect(analysisSource).toContain("<AnalysisScopePanel");
    expect(scopePanelSource).toContain("步骤 1");
    expect(scopePanelSource).toContain("步骤 2");
    expect(analysisSource).toContain("<span>03</span>");
    expect(analysisSource).not.toContain('class="analysis-hero"');
  });
});
