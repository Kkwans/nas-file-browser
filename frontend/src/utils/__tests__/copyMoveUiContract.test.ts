import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function readSource(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("copy and move dialog contract", () => {
  it("uses PathPicker as the sole destination browser", () => {
    for (const view of ["Copy.vue", "Move.vue"]) {
      const source = readSource(`src/components/prompts/${view}`);
      expect(source, view).toContain("PathPicker");
      expect(source, view).not.toContain("FileList");
      expect(source, view).not.toContain('class="card floating"');
    }
  });

  it("renders picker prompts outside the legacy BaseModal wrapper", () => {
    const prompts = readSource("src/components/prompts/Prompts.vue");
    const picker = readSource("src/components/prompts/PathPicker.vue");

    expect(prompts).toContain("const directModal = computed");
    expect(prompts).toContain('currentPromptName.value === "copy"');
    expect(prompts).toContain('currentPromptName.value === "move"');
    expect(picker).toContain("exclude?: string[]");
    expect(picker).toContain("props.exclude.some");
  });
});
