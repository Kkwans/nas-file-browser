import { fetchURL } from "./utils";

export interface CategoryRule {
  id: string;
  name: string;
  icon: string;
  color: string;
  patterns: string[];
}

export interface CategoryInfo {
  categories: CategoryRule[];
}

export interface ClassifyResult {
  path: string;
  category: {
    id: string;
    name: string;
    icon: string;
    color: string;
  };
  risk: "high" | "medium" | "low";
}

export async function getCategories(): Promise<CategoryInfo> {
  const res = await fetchURL("/api/categories", {});
  return (await res.json()) as CategoryInfo;
}

export async function classifyPath(path: string): Promise<ClassifyResult> {
  const res = await fetchURL(`/api/classify?path=${encodeURIComponent(path)}`, {});
  return (await res.json()) as ClassifyResult;
}
