import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const settingsViews = [
  "Global.vue",
  "Profile.vue",
  "Shares.vue",
  "Users.vue",
  "User.vue",
];

describe("settings UI contract", () => {
  it("uses the shared local icon component across settings views", () => {
    for (const view of settingsViews) {
      const source = readFileSync(
        resolve(process.cwd(), `src/views/settings/${view}`),
        "utf8"
      );

      expect(source, view).not.toContain("material-icons");
    }

    const profile = readFileSync(
      resolve(process.cwd(), "src/views/settings/Profile.vue"),
      "utf8"
    );
    const registry = readFileSync(
      resolve(process.cwd(), "src/components/ui/iconRegistry.ts"),
      "utf8"
    );

    expect(profile).toContain(
      'import AppIcon from "@/components/ui/AppIcon.vue"'
    );
    expect(profile).toContain(":name=\"rule.visible ? 'eye' : 'eye-off'\"");
    expect(registry).toContain('"eye-off"');
  });

  it("账户设置两列按内容高度对齐，密码卡片不被左侧长表单撑满", () => {
    const profile = readFileSync(
      resolve(process.cwd(), "src/views/settings/Profile.vue"),
      "utf8"
    );

    expect(profile).toContain('class="row profile-settings-grid"');
    expect(profile).toMatch(
      /\.profile-settings-grid\s*\{[\s\S]*?align-items:\s*flex-start;/
    );
    expect(profile).toMatch(
      /\.profile-settings-grid\s*>\s*\.column\s*>\s*\.card\s*\{[\s\S]*?height:\s*auto;/
    );
    expect(profile).toMatch(
      /@media\s*\(max-width:\s*1200px\)[\s\S]*?\.profile-settings-grid\s*>\s*\.column\s*\{[\s\S]*?flex:\s*0\s+0\s+auto;/
    );
  });
});
