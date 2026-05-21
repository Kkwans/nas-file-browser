import { fetchURL } from "./utils";

export interface SubDir {
  path: string;
  name: string;
}

export interface Volume {
  path: string;
  name: string;
  type: "system" | "usb" | "network" | "docker";
  totalSpace: number;
  usedSpace: number;
  subDirs?: SubDir[];
}

export async function getVolumes(): Promise<Volume[]> {
  const res = await fetchURL("/api/volumes", {});
  return (await res.json()) as Volume[];
}
