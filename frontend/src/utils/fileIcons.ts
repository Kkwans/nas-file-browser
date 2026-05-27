/**
 * Shared file icon utility - maps file extensions to Material Icons.
 * Used by SearchPage, Sidebar, QuickPreview, and other components.
 */

const EXT_ICON_MAP: Record<string, string> = {
  // Documents
  pdf: "picture_as_pdf",
  doc: "description",
  docx: "description",
  txt: "article",
  md: "article",
  rtf: "description",

  // Spreadsheets
  xls: "table_chart",
  xlsx: "table_chart",
  csv: "table_chart",

  // Presentations
  ppt: "slideshow",
  pptx: "slideshow",

  // Audio
  mp3: "audiotrack",
  wav: "audiotrack",
  flac: "audiotrack",
  aac: "audiotrack",
  ogg: "audiotrack",
  wma: "audiotrack",

  // Video
  mp4: "movie",
  avi: "movie",
  mkv: "movie",
  mov: "movie",
  wmv: "movie",
  flv: "movie",
  webm: "movie",

  // Images
  jpg: "image",
  jpeg: "image",
  png: "image",
  gif: "image",
  webp: "image",
  svg: "image",
  bmp: "image",
  ico: "image",
  tiff: "image",
  tif: "image",

  // Archives
  zip: "folder_zip",
  rar: "folder_zip",
  "7z": "folder_zip",
  tar: "folder_zip",
  gz: "folder_zip",
  bz2: "folder_zip",
  xz: "folder_zip",

  // Code
  js: "code",
  ts: "code",
  jsx: "code",
  tsx: "code",
  py: "code",
  java: "code",
  go: "code",
  html: "code",
  css: "code",
  vue: "code",
  rs: "code",
  rb: "code",
  php: "code",
  c: "code",
  cpp: "code",
  h: "code",
  hpp: "code",
  swift: "code",
  kt: "code",
  sql: "code",
  sh: "code",
  bash: "code",

  // Data
  json: "data_object",
  xml: "data_object",
  yaml: "data_object",
  yml: "data_object",
  toml: "data_object",

  // Other
  exe: "settings_ethernet",
  dmg: "settings_ethernet",
  iso: "settings_ethernet",
};

/**
 * Get Material Icon name for a file based on its extension.
 * @param fileName - The file name (e.g. "photo.jpg")
 * @param isDir - Whether the item is a directory
 * @returns Material Icon name (e.g. "image", "folder", "insert_drive_file")
 */
export function getFileIcon(fileName: string, isDir?: boolean): string {
  if (isDir) return "folder";
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  return EXT_ICON_MAP[ext] || "insert_drive_file";
}

/**
 * Get Material Icon name for a file item object.
 * Compatible with search results and listing items.
 */
export function getFileIconFromItem(item: { name?: string; isDir?: boolean; type?: string }): string {
  if (item.isDir) return "folder";
  if (item.name) return getFileIcon(item.name);
  return "insert_drive_file";
}
