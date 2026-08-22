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
});
