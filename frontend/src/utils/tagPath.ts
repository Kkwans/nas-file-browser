/** 将接口、路由和旧版缓存中的路径统一为可比较的 NAS 绝对路径。 */
export function normalizeTagPath(path: string): string {
  const decoded = path
    .trim()
    .split("/")
    .map((segment) => {
      try {
        return decodeURIComponent(segment);
      } catch {
        return segment;
      }
    })
    .join("/");
  const withoutFilesPrefix =
    decoded === "/files" || decoded.startsWith("/files/")
      ? decoded.slice("/files".length) || "/"
      : decoded;
  const normalized = `/${withoutFilesPrefix.replace(/^\/+/, "")}`;
  return normalized.replace(/\/+$/, "") || "/";
}

export function isDescendantPath(path: string, parent: string): boolean {
  return parent === "/" ? path.startsWith("/") : path.startsWith(`${parent}/`);
}
