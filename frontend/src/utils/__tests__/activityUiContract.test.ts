import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(
  resolve(process.cwd(), "src/views/TaskCenter.vue"),
  "utf8"
);
const taskCenterCss = readFileSync(
  resolve(process.cwd(), "src/css/task-center.css"),
  "utf8"
);
const activityCss = readFileSync(
  resolve(process.cwd(), "src/css/activity.css"),
  "utf8"
);

describe("activity page UI contract", () => {
  it("uses the shared SVG icon class instead of retired font selectors", () => {
    expect(source).not.toContain("material-icons");
    expect(taskCenterCss).not.toContain("material-icons");
    expect(activityCss).not.toContain("material-icons");
  });

  it("keeps the five task categories in the product order", () => {
    const order = ["download", "upload", "file", "background", "history"];
    let previous = -1;
    for (const id of order) {
      const index = source.indexOf(`id: "${id}"`);
      expect(index, id).toBeGreaterThan(previous);
      previous = index;
    }
    expect(source).toContain(
      'type TaskCenterTab = "download" | "upload" | "file" | "background" | "history"'
    );
  });

  it("renders byte, item and indeterminate progress states", () => {
    expect(source).toContain("taskProgress(task).mode === 'bytes'");
    expect(source).toContain("taskProgress(task).mode === 'items'");
    expect(source).toContain("task-center-progress--indeterminate");
    expect(source).toContain("item.bytesTransferred");
  });

  it("keeps task tabs and mobile task actions at accessible hit sizes", () => {
    expect(taskCenterCss).toMatch(
      /\.task-center-tabs button\s*\{[\s\S]*?min-height:\s*44px;/
    );
    expect(taskCenterCss).toMatch(
      /@media \(max-width: 640px\)[\s\S]*?\.task-center-item-actions button\s*\{[\s\S]*?min-height:\s*44px;/
    );
  });

  it("does not retain the removed TaskCenter hero or summary panel", () => {
    expect(taskCenterCss).not.toContain(".task-center-intro");
    expect(taskCenterCss).not.toContain(".task-center-summary");
    expect(source).not.toContain("task-center-intro");
    expect(source).not.toContain("task-center-summary");
  });

  it("does not issue a second all-transfer snapshot on TaskCenter mount", () => {
    expect(source).not.toMatch(
      /onMounted\(async \(\) => \{[\s\S]*?await transfersStore\.load\(\);/
    );
  });

  it("keeps recent page shared layout styles without legacy task selectors", () => {
    expect(activityCss).toContain(".activity-page {");
    expect(activityCss).toContain(".recent-entry {");
    expect(activityCss).toContain(".activity-state,");
    expect(activityCss).not.toContain(".task-row {");
    expect(activityCss).not.toContain(".history-entry {");
  });
});
