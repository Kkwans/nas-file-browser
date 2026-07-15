import { describe, expect, it } from "vitest";
import type { Tag } from "@/stores/tags";
import {
  getUsedTagColors,
  isTagColorAvailable,
  normalizeTagColor,
} from "../tagColors";

const tags: Tag[] = [
  {
    id: "tag-red",
    name: "红色标签",
    color: "#F04438",
    paths: [],
    createdAt: 1,
  },
  {
    id: "tag-blue",
    name: "蓝色标签",
    color: "#2E90FA",
    paths: [],
    createdAt: 2,
  },
];

describe("tag color uniqueness", () => {
  it("normalizes equivalent hexadecimal colors before comparison", () => {
    expect(normalizeTagColor("#f04438")).toBe("#F04438");
    expect(normalizeTagColor(" f04438 ")).toBe("#F04438");
  });

  it("marks colors used by another tag as unavailable", () => {
    expect(getUsedTagColors(tags)).toEqual(new Set(["#F04438", "#2E90FA"]));
    expect(isTagColorAvailable(tags, "#f04438")).toBe(false);
    expect(isTagColorAvailable(tags, "#7F56D9")).toBe(true);
  });

  it("allows an edited tag to keep its current color", () => {
    expect(isTagColorAvailable(tags, "#f04438", "tag-red")).toBe(true);
    expect(isTagColorAvailable(tags, "#2E90FA", "tag-red")).toBe(false);
  });
});
