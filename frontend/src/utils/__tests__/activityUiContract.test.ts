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

  it("搜索输入本身继承表单命中高度并固定文字行高", () => {
    const css = readFileSync(
      resolve(process.cwd(), "src/css/activity.css"),
      "utf8"
    );

    expect(css).toMatch(
      /\.task-filter-bar__search input,\s*\.history-filter-bar__search input\s*\{[^}]*box-sizing:\s*border-box;[^}]*min-height:\s*40px;[^}]*line-height:\s*1\.4;/s
    );
    expect(css).toMatch(
      /@media \(max-width: 520px\)[\s\S]*?\.task-filter-bar__search input,\s*\.history-filter-bar__search input\s*\{[^}]*min-height:\s*44px;/s
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

  it("手机任务操作使用独立对齐行，单个动作不留下半列空洞", () => {
    const css = readFileSync(
      resolve(process.cwd(), "src/css/activity.css"),
      "utf8"
    );

    expect(css).toContain("border-top: 1px solid var(--borderPrimary);");
    expect(css).toMatch(
      /@media \(max-width: 520px\)[\s\S]*?\.task-row \.task-card-actions\s*\{[\s\S]*?display:\s*flex;[\s\S]*?justify-content:\s*flex-end;/
    );
    expect(css).toContain(".task-row .task-card-actions > :only-child");
  });

  it("操作历史时间线的轨道与时间点使用同一光学中心", () => {
    const css = readFileSync(
      resolve(process.cwd(), "src/css/activity.css"),
      "utf8"
    );

    expect(css).toMatch(
      /\.history-ledger__entries::before\s*\{[\s\S]*?left:\s*18px;[\s\S]*?width:\s*1px;/
    );
    expect(css).toMatch(
      /\.history-entry-line span\s*\{[\s\S]*?left:\s*1px;[\s\S]*?width:\s*11px;[\s\S]*?height:\s*11px;/
    );
  });
});
