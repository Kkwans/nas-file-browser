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

  it("工具切换器占满工作区，两个工具共享同一条对齐基线", () => {
    const switcherSource = readFileSync(
      resolve(
        process.cwd(),
        "src/components/analysis/AnalysisToolSwitcher.vue"
      ),
      "utf8"
    );

    expect(switcherSource).toMatch(
      /\.analysis-tool-switcher\s*\{[\s\S]*?width:\s*100%;[\s\S]*?max-width:\s*100%;/
    );
    expect(switcherSource).toMatch(
      /grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/
    );
  });
});
