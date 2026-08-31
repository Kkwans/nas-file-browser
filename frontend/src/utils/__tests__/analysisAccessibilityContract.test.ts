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

  it("路径选择器作为主入口，粘贴路径保留在高级区域", () => {
    expect(analysisSource).toContain("<AnalysisToolSwitcher");
    expect(analysisSource).toContain("<AnalysisScopePanel");
    expect(analysisSource).toContain('mode="both"');
    expect(analysisSource).toContain("multiple");
    expect(scopePanelSource).toContain("analysis-run-panel__advanced");
    expect(scopePanelSource).toContain("高级：粘贴路径");
    expect(scopePanelSource).not.toContain("步骤 1");
    expect(scopePanelSource).not.toContain("步骤 2");
    expect(analysisSource).toContain('class="analysis-results-heading__icon"');
    expect(analysisSource).toContain('name="analysis-duplicates"');
    expect(analysisSource).not.toContain('class="analysis-hero"');
  });

  it("报告页把再次扫描收纳为可展开入口", () => {
    expect(analysisSource).toContain('class="analysis-run-toggle"');
    expect(analysisSource).toContain(':aria-expanded="showRunPanel"');
    expect(analysisSource).toContain('v-if="!hasReport || showRunPanel"');
  });

  it("分析报告卡片不复用会继承全局定位规则的原生 header", () => {
    expect(analysisSource).toContain('class="storage-ranking-header"');
    expect(analysisSource).toContain('class="duplicate-group__header"');
    expect(analysisSource).not.toMatch(/<header(?:\s|>)/);
  });

  it("扫描面板使用单个表单，不嵌套表单或借用全局 header", () => {
    expect(scopePanelSource.match(/<form(?:\s|>)/g)).toHaveLength(1);
    expect(scopePanelSource).not.toMatch(/<header(?:\s|>)/);
    expect(scopePanelSource).toContain(`@submit.prevent="$emit('start')"`);
  });

  it("扫描动作紧随范围，不保留右侧启动栏与重复准备提示", () => {
    expect(scopePanelSource).toContain('class="analysis-run-panel__footer"');
    expect(scopePanelSource).not.toContain("border-left:");
    expect(scopePanelSource).not.toContain("准备就绪后开始一次扫描。");
    expect(scopePanelSource).toContain("扫描只读，不会删除文件。");
  });

  it("最近扫描同时呈现范围、指标、状态、时间和可达结果入口", () => {
    expect(analysisSource).toContain("<AnalysisRecentScans");
    expect(recentScansSource).toContain("item.scopes.join");
    expect(recentScansSource).toContain("metricsLabel(item)");
    expect(recentScansSource).toContain("statusLabel(item)");
    expect(recentScansSource).toContain("formatTime(recordTime(item))");
    expect(recentScansSource).toContain("item.finishedAt || item.createdAt");
    expect(recentScansSource).toContain('aria-label="完整扫描范围"');
    expect(recentScansSource).toMatch(
      /\.analysis-recent__action\s*\{[\s\S]*?min-height:\s*44px;/
    );
    expect(recentScansSource).not.toContain(
      '<header class="analysis-recent__header">'
    );
  });
});
