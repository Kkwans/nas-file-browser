import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const packageSource = readFileSync(
  new URL("../../../package.json", import.meta.url),
  "utf8"
);
const iconRegistrySource = readFileSync(
  new URL("../../components/ui/iconRegistry.ts", import.meta.url),
  "utf8"
);
const thumbnailSource = readFileSync(
  new URL("../../components/files/FileThumbnail.vue", import.meta.url),
  "utf8"
);
const listingItemSource = readFileSync(
  new URL("../../components/files/ListingItem.vue", import.meta.url),
  "utf8"
);
const detailedRowSource = readFileSync(
  new URL("../../components/files/DetailedTableRow.vue", import.meta.url),
  "utf8"
);
const fileListingSource = readFileSync(
  new URL("../../views/files/FileListing.vue", import.meta.url),
  "utf8"
);
const categoriesStoreSource = readFileSync(
  new URL("../../stores/categories.ts", import.meta.url),
  "utf8"
);
const listingStyles = readFileSync(
  new URL("../../css/listing.css", import.meta.url),
  "utf8"
);
const workspaceStyles = readFileSync(
  new URL("../../css/workspace-ui.css", import.meta.url),
  "utf8"
);

describe("risk presentation contract", () => {
  it("pins Lucide locally and exposes only semantic wrapper icons", () => {
    expect(JSON.parse(packageSource).dependencies["@lucide/vue"]).toBe(
      "1.30.0"
    );
    expect(iconRegistrySource).toContain('from "@lucide/vue"');
    expect(iconRegistrySource).toContain('"folder-maintenance": FolderCog');
    expect(iconRegistrySource).toContain('"folder-protected": FolderLock');
  });

  it("preserves real media thumbnails before rendering native risk icons", () => {
    expect(thumbnailSource.indexOf('v-if="displaySource"')).toBeLessThan(
      thumbnailSource.indexOf('v-else-if="nonLowRiskLevel"')
    );
    expect(thumbnailSource).toContain("<RiskResourceIcon");
    expect(listingItemSource).toContain("<RiskIndicator");
    expect(detailedRowSource).toContain("<RiskIndicator");
    expect(
      fileListingSource.match(/v-bind:risk-level="item\.riskLevel"/g)
    ).toHaveLength(2);
  });

  it("removes frontend classification and every legacy overlay dot", () => {
    expect(categoriesStoreSource).not.toContain("getRiskLevel");
    expect(listingStyles).not.toContain("risk-badge");
    expect(listingStyles).toMatch(
      /#listing \.file-thumbnail > \.risk-resource-icon \{[\s\S]*?display: grid;[\s\S]*?place-items: center;/
    );
    expect(workspaceStyles).not.toContain("risk-badge");
    expect(listingItemSource).not.toContain("risk-badge");
    expect(detailedRowSource).not.toContain("risk-badge");
  });
});
