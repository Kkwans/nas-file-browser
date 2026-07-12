/**
 * 将搜索页路由中的路径转换成后端搜索接口使用的绝对目录。
 *
 * `Resource.path` 已经是 NAS 绝对路径，而 `/files/...` 只属于前端路由。
 * 不能对两者都使用旧的 removePrefix，否则真实路径会被误删前两级目录。
 */
export function normalizeSearchBase(rawBase: string): string {
  let base = rawBase.trim();
  if (!base || base === "/files") return "/";

  if (base === "/files" || base.startsWith("/files/")) {
    base = base.slice("/files".length) || "/";
  }

  // 路由查询参数可能已经被编码，先逐段解码再由 API 层统一编码。
  base = base
    .split("/")
    .map((segment) => {
      try {
        return decodeURIComponent(segment);
      } catch {
        return segment;
      }
    })
    .join("/");

  if (!base.startsWith("/")) base = `/${base}`;
  base = base.replace(/\/+/g, "/");
  if (base.length > 1) base = base.replace(/\/+$/, "");
  return `${base}/`;
}
