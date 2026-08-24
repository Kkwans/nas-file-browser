import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("activity page UI contract", () => {
  const tasksSource = readFileSync(
    resolve(process.cwd(), "src/views/Tasks.vue"),
    "utf8"
  );

  it("uses the shared SVG icon class instead of the retired font icon selectors", () => {
    const css = readFileSync(
      resolve(process.cwd(), "src/css/activity.css"),
      "utf8"
    );

    expect(css).not.toContain(".material-icons");
    expect(css).toContain(".task-icon .app-icon");
    expect(css).toContain(".history-entry-icon .app-icon");
  });

  it("在手机端将任务状态筛选平铺成两行，避免露出横向滚动条", () => {
    const css = readFileSync(
      resolve(process.cwd(), "src/css/activity.css"),
      "utf8"
    );

    expect(css).toContain(".activity-toolbar.task-status-tabs {");
    expect(css).toContain("grid-template-columns: repeat(3, minmax(0, 1fr));");
    expect(css).toContain("overflow-x: visible;");
  });

  it("刷新动作使用紧凑的次级按钮，不占满 Header 操作槽", () => {
    const css = readFileSync(
      resolve(process.cwd(), "src/css/activity.css"),
      "utf8"
    );

    expect(css).toMatch(
      /\.activity-header-action\s*\{[\s\S]*?width:\s*auto;[\s\S]*?border:\s*1px solid var\(--borderPrimary\);/
    );
    expect(css).toContain(".activity-header-action:disabled");
  });

  it("手机端任务与历史切换保持 44px 触控高度", () => {
    const css = readFileSync(
      resolve(process.cwd(), "src/css/activity.css"),
      "utf8"
    );

    expect(css).toMatch(
      /@media \(max-width: 520px\)[\s\S]*?\.activity-switcher a\s*\{[^}]*min-height:\s*44px;/
    );
  });

  it("用告警和停止语义区分失败与取消，避免状态列表堆叠巨大的叉号", () => {
    expect(tasksSource).toContain('failed: "circle-alert"');
    expect(tasksSource).toContain('canceled: "circle-stop"');
    expect(tasksSource).toContain('app-icon name="circle-alert"');

    const historySource = readFileSync(
      resolve(process.cwd(), "src/views/History.vue"),
      "utf8"
    );
    const mediaIconSource = readFileSync(
      resolve(process.cwd(), "src/utils/mediaIconSemantics.ts"),
      "utf8"
    );
    expect(historySource).toContain('icon: "circle-stop"');
    expect(mediaIconSource).toContain('cancel: "circle-stop"');
    expect(mediaIconSource).toContain('sentiment_dissatisfied: "frown"');
  });
});
