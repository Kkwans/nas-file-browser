import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const sourceRoot = resolve(process.cwd(), "src");

describe("上传 UI 图标契约", () => {
  it("上传方式和上传队列使用本地 AppIcon", () => {
    const uploadPrompt = readFileSync(
      resolve(sourceRoot, "components/prompts/Upload.vue"),
      "utf8"
    );
    const uploadList = readFileSync(
      resolve(sourceRoot, "components/prompts/UploadFiles.vue"),
      "utf8"
    );

    expect(uploadPrompt).not.toContain("material-icons");
    expect(uploadList).not.toContain("material-icons");
    expect(uploadPrompt).toContain(
      'import AppIcon from "@/components/ui/AppIcon.vue"'
    );
    expect(uploadList).toContain(
      'import AppIcon from "@/components/ui/AppIcon.vue"'
    );
    expect(uploadList).toContain("getResourceIconName");
    expect(uploadList).toContain('name="x"');
    expect(uploadList).toContain("chevron-down");
    expect(uploadList).toContain("chevron-up");
  });
});
