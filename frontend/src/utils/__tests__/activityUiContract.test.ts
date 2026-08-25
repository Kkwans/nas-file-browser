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

  it("任务项将时间与操作放进稳定的右侧栏，避免查看结果漂浮在列表边缘", () => {
    expect(tasksSource).toContain('class="task-row__aside"');
    expect(tasksSource).toContain('class="task-row__time"');
    expect(tasksSource).toMatch(
      /<div class="task-row__aside">[\s\S]*?class="task-row__time"[\s\S]*?class="task-card-actions"/m
    );

    const css = readFileSync(
      resolve(process.cwd(), "src/css/activity.css"),
      "utf8"
    );
    expect(css).toMatch(
      /\.task-row\s*\{[\s\S]*?grid-template-columns:\s*44px minmax\(0, 1fr\) minmax\(176px, auto\);/
    );
    expect(css).toContain(".task-row__aside");
    expect(css).toContain(".task-row__time");
  });

  it("任务列表为内容与更新时间/操作建立明确的列标题和分隔", () => {
    expect(tasksSource).toContain('class="task-list__header"');
    expect(tasksSource).toMatch(
      /class="task-list__header"[\s\S]*?任务[\s\S]*?更新时间 \/ 操作/m
    );

    const css = readFileSync(
      resolve(process.cwd(), "src/css/activity.css"),
      "utf8"
    );
    expect(css).toMatch(
      /\.task-list__header\s*\{[\s\S]*?grid-template-columns:\s*44px minmax\(0, 1fr\) minmax\(176px, auto\);/
    );
    expect(css).toMatch(
      /\.task-row__aside\s*\{[\s\S]*?border-left:\s*1px solid color-mix/
    );
    expect(css).toContain(".task-row__aside .task-card-actions button.primary");
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

  it("操作历史为记录与时间建立稳定列标题，避免时间漂浮在边缘", () => {
    const historySource = readFileSync(
      resolve(process.cwd(), "src/views/History.vue"),
      "utf8"
    );
    expect(historySource).toContain('class="history-ledger__header"');
    expect(historySource).toMatch(
      /class="history-ledger__header"[\s\S]*?操作记录[\s\S]*?时间/m
    );

    const css = readFileSync(
      resolve(process.cwd(), "src/css/activity.css"),
      "utf8"
    );
    expect(css).toMatch(
      /\.history-ledger__header\s*\{[\s\S]*?grid-template-columns:\s*14px 40px minmax\(0, 1fr\) 144px;/
    );
    expect(css).toMatch(
      /\.history-entry time\s*\{[\s\S]*?border-left:\s*1px solid color-mix/
    );
  });

  it("活动页使用轻量标签导航和稳定的时间操作列", () => {
    const css = readFileSync(
      resolve(process.cwd(), "src/css/activity.css"),
      "utf8"
    );

    expect(css).toMatch(
      /\.activity-switcher\s*\{[\s\S]*?border-bottom:\s*1px solid var\(--borderPrimary\);[\s\S]*?border-radius:\s*0;/
    );
    expect(css).toMatch(
      /\.activity-switcher a\[aria-current="page"\]\s*\{[\s\S]*?box-shadow:\s*inset 0 -2px var\(--blue\);/
    );
    expect(css).toMatch(/\.task-row\s*\{[\s\S]*?minmax\(176px, auto\);/);
    expect(css).toMatch(
      /\.task-row__time\s*\{[\s\S]*?justify-items:\s*start;[\s\S]*?text-align:\s*left;/
    );
    expect(css).toContain(".task-result-action");
    expect(css).toMatch(/\.history-entry time\s*\{[\s\S]*?text-align:\s*left;/);
  });
});
