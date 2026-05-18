import { fetchURL } from "./utils";

export interface Volume {
  path: string;
  name: string;
  type: "system" | "usb" | "network" | "docker";
  totalSpace: number;
  usedSpace: number;
}

export async function getVolumes(): Promise<Volume[]> {
  const res = await fetchURL("/api/volumes", {});
  return (await res.json()) as Volume[];
}
