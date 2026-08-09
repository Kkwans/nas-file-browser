import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const listingSource = readFileSync(
  new URL("../../views/files/FileListing.vue", import.meta.url),
  "utf8"
);
const profileSource = readFileSync(
  new URL("../../views/settings/Profile.vue", import.meta.url),
  "utf8"
);
const listingStyles = readFileSync(
  new URL("../../css/listing.css", import.meta.url),
  "utf8"
);

describe("listing preference integration contract", () => {
  it("uses one shared grouped view model in every listing layout", () => {
    expect(listingSource).toContain("buildListingSections(");
    expect(listingSource).toContain("paginateListingSections(");
    expect(listingSource.match(/data-prefix-group/g)).toHaveLength(3);
    expect(listingSource).not.toContain("nas-file-browser-show-system-dirs");
    expect(listingSource).not.toContain("system-dirs-toggle");
  });

  it("keeps listing visibility in the versioned preference editor", () => {
    expect(profileSource).toContain("特殊前缀");
    expect(profileSource).toContain("直接路径、搜索、收藏和最近访问不受影响");
    expect(profileSource).not.toContain('name="hideDotfiles"');
    expect(profileSource).not.toContain('"hideDotfiles",');
  });

  it("renders clear full-width group controls instead of overlay dots", () => {
    expect(listingStyles).toMatch(
      /#listing \.listing-prefix-header \{[\s\S]*?grid-template-columns:[\s\S]*?min-height: 42px;/
    );
    expect(listingStyles).not.toContain("system-dirs-toggle");
  });
});
