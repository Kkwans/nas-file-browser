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
const recentScansSource = readFileSync(
  fileURLToPath(
    new URL(
      "../../components/analysis/AnalysisRecentScans.vue",
      import.meta.url
    )
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

  it("报告页把再次扫描收纳为可展开入口", () => {
    expect(analysisSource).toContain('class="analysis-run-toggle"');
    expect(analysisSource).toContain(':aria-expanded="showRunPanel"');
    expect(analysisSource).toContain('v-if="!hasReport || showRunPanel"');
  });

  it("运行面板不复用会触发全局定位规则的 header 元素", () => {
    expect(scopePanelSource).toContain(
      '<div class="analysis-run-panel__header">'
    );
    expect(scopePanelSource).not.toContain(
      '<header class="analysis-run-panel__header">'
    );
  });

  it("最近扫描同时呈现范围、指标、状态、时间和可达结果入口", () => {
    expect(analysisSource).toContain("<AnalysisRecentScans");
    expect(recentScansSource).toContain("item.scopes.join");
    expect(recentScansSource).toContain("metricsLabel(item)");
    expect(recentScansSource).toContain("statusLabel(item)");
    expect(recentScansSource).toContain("formatTime(item.createdAt)");
    expect(recentScansSource).toMatch(
      /\.analysis-recent__action\s*\{[\s\S]*?min-height:\s*44px;/
    );
    expect(recentScansSource).not.toContain(
      '<header class="analysis-recent__header">'
    );
  });
});
