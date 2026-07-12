import { describe, expect, it } from "vitest";
import { normalizeSearchBase } from "../searchPath";

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
