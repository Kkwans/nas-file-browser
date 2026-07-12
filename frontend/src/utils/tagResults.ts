import { normalizeTagPath } from "./tagPath";
import { encodePath } from "./url";

/** 将标签中保存的 NAS 路径转换成可直接跳转的文件路由。 */
export function buildTaggedPathUrl(path: string, isDir: boolean): string {
  const normalized = normalizeTagPath(path);
  const suffix = isDir ? "/" : "";
  return `/files${encodePath(normalized)}${suffix}`;
}

/** 取标签路径最后一段作为结果标题，同时兼容历史编码路径。 */
export function getTaggedPathName(path: string): string {
  const normalized = normalizeTagPath(path);
  const segment = normalized.split("/").filter(Boolean).pop() || "/";
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}
