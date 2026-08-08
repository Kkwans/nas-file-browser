import { describe, expect, it, vi } from "vitest";

import {
  isMarkdownImageFile,
  markdownImageCandidateName,
  markdownImageLink,
  markdownImageTargetPath,
  normalizeMarkdownImageName,
  storeMarkdownImage,
} from "../markdownImages";

describe("Markdown 图片拖入", () => {
  it("保存到文档同级 assets 并保留原扩展名", async () => {
    const upload = vi.fn().mockResolvedValue(undefined);
    const file = new File(["image"], "家庭照片.JPEG", {
      type: "image/jpeg",
    });

    const stored = await storeMarkdownImage("/文档/记录.md", file, upload);

    expect(stored).toEqual({
      name: "家庭照片.JPEG",
      path: "/文档/assets/家庭照片.JPEG",
      markdown: "![家庭照片.JPEG](./assets/家庭照片.JPEG)",
    });
    expect(upload).toHaveBeenCalledWith("/文档/assets/家庭照片.JPEG", file);
  });

  it("冲突时按 -2、-3 递增且从不请求覆盖", async () => {
    const conflict = { status: 409 };
    const upload = vi
      .fn()
      .mockRejectedValueOnce(conflict)
      .mockRejectedValueOnce(conflict)
      .mockResolvedValueOnce(undefined);
    const file = new File(["image"], "photo.png", { type: "image/png" });

    const stored = await storeMarkdownImage("/note.md", file, upload);

    expect(upload.mock.calls.map(([path]) => path)).toEqual([
      "/assets/photo.png",
      "/assets/photo-2.png",
      "/assets/photo-3.png",
    ]);
    expect(stored.name).toBe("photo-3.png");
  });

  it("生成可读且安全的相对 Markdown 链接", () => {
    expect(markdownImageLink("图 片(终稿)#1.png")).toBe(
      "![图 片(终稿)#1.png](./assets/图%20片%28终稿%29%231.png)"
    );
    expect(markdownImageLink("a[b].png")).toContain("![a\\[b\\].png]");
  });

  it("清理路径片段、处理隐藏名并识别无 MIME 图片", () => {
    expect(
      normalizeMarkdownImageName({ name: "folder\\.photo.png", type: "" })
    ).toBe("image.photo.png");
    expect(normalizeMarkdownImageName({ name: "", type: "image/webp" })).toBe(
      "image.webp"
    );
    expect(isMarkdownImageFile({ name: "scan.HEIC", type: "" })).toBe(true);
    expect(isMarkdownImageFile({ name: "notes.txt", type: "text/plain" })).toBe(
      false
    );
  });

  it("保留复杂扩展名之前的基础名称", () => {
    expect(markdownImageCandidateName("archive.photo.png", 1)).toBe(
      "archive.photo-2.png"
    );
    expect(markdownImageTargetPath("/docs/note.md", "photo.png")).toBe(
      "/docs/assets/photo.png"
    );
  });

  it("非冲突失败立即返回且不尝试其他名称", async () => {
    const failure = Object.assign(new Error("forbidden"), { status: 403 });
    const upload = vi.fn().mockRejectedValue(failure);

    await expect(
      storeMarkdownImage(
        "/note.md",
        new File(["image"], "photo.png", { type: "image/png" }),
        upload
      )
    ).rejects.toBe(failure);
    expect(upload).toHaveBeenCalledTimes(1);
  });
});
