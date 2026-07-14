import { describe, expect, it } from "vitest";
import {
  buildFilesRouteFromSearchBase,
  buildTagSearchQuery,
  normalizeSearchBase,
} from "../searchPath";

describe("normalizeSearchBase", () => {
  it("keeps an absolute NAS path when it is already a resource path", () => {
    expect(normalizeSearchBase("/home/Kkwans/电影")).toBe("/home/Kkwans/电影/");
  });

  it("removes only the UI files prefix", () => {
    expect(normalizeSearchBase("/files/home/Kkwans/电影")).toBe(
      "/home/Kkwans/电影/"
    );
  });

  it("uses the root path for empty or invalid input", () => {
    expect(normalizeSearchBase("")).toBe("/");
    expect(normalizeSearchBase("/files")).toBe("/");
  });
});

describe("search route helpers", () => {
  it("returns to the exact file directory represented by the search base", () => {
    expect(buildFilesRouteFromSearchBase("/")).toBe("/files/");
    expect(buildFilesRouteFromSearchBase("/files/home/Kkwans/电影")).toBe(
      "/files/home/Kkwans/电影/"
    );
  });

  it("keeps the return directory when switching tag search scope", () => {
    expect(buildTagSearchQuery("/home/Kkwans/电影", "global")).toEqual({
      base: "/home/Kkwans/电影/",
      scope: "global",
    });
  });
});
