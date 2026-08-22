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
});
