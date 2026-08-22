import { describe, expect, it } from "vitest";
import { makeRawResource } from "../encodings";
import { decodePath } from "../url";

describe("URL path helpers", () => {
  it("decodes encoded path segments exactly once for resource state", () => {
    expect(decodePath("/volume1/%40appstore/config/blacklist.csv")).toBe(
      "/volume1/@appstore/config/blacklist.csv"
    );
    expect(decodePath("/volume1/100%25-ready.txt")).toBe(
      "/volume1/100%-ready.txt"
    );
  });

  it("uses the canonical path for encoded text resources", async () => {
    const resource = await makeRawResource(
      new Response("a,b\n1,2"),
      "/volume1/%40appstore/config/blacklist.csv"
    );
    expect(resource.path).toBe("/volume1/@appstore/config/blacklist.csv");
    expect(resource.url).toBe(
      "/files/volume1/@appstore/config/blacklist.csv"
    );
    expect(resource.name).toBe("blacklist.csv");
  });
});
