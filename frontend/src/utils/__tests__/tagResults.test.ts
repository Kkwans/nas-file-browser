import { describe, expect, it } from "vitest";
import { buildTaggedPathUrl, getTaggedPathName } from "../tagResults";

describe("tag result paths", () => {
  it("builds a routable URL for a tagged Chinese directory", () => {
    expect(buildTaggedPathUrl("/volume2/电影/精选", true)).toBe(
      "/files/volume2/%E7%94%B5%E5%BD%B1/%E7%B2%BE%E9%80%89/"
    );
  });

  it("decodes the final path segment for display", () => {
    expect(getTaggedPathName("/volume2/%E7%94%B5%E5%BD%B1/精选")).toBe("精选");
  });
});
