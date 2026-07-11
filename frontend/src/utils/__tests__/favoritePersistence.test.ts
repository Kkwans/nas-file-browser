import { describe, expect, it } from "vitest";
import { replaceFavoriteByPath } from "../favoritePersistence";

describe("收藏持久化", () => {
  it("使用服务端创建记录的真实 ID 替换本地临时收藏", () => {
    const result = replaceFavoriteByPath(
      [
        {
          id: "local-id",
          path: "/资料",
          name: "资料",
          addedAt: 1,
          order: 0,
        },
      ],
      {
        id: "server-id",
        path: "/资料",
        name: "资料",
        addedAt: 2,
        order: 0,
      }
    );

    expect(result).toEqual([
      {
        id: "server-id",
        path: "/资料",
        name: "资料",
        addedAt: 2,
        order: 0,
      },
    ]);
  });
});
