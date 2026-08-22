import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const source = readFileSync(
  new URL("../../views/Archive.vue", import.meta.url),
  "utf8"
);

describe("archive browser UI contract", () => {
  it("uses local semantic icons for archive states and entries", () => {
    expect(source).not.toContain("material-icons");
    expect(source).toContain(
      'import AppIcon from "@/components/ui/AppIcon.vue"'
    );
    expect(source).toContain("getResourceIconName");
    expect(source).toContain('"circle-alert"');
    expect(source).toContain('"archive-restore"');
  });
});
