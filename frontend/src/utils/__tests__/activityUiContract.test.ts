import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("activity page UI contract", () => {
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
});
