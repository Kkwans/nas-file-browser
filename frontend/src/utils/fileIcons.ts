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
  mdx: "article",
  rtf: "description",
  odt: "description",
  pages: "description",

  // Spreadsheets
  xls: "table_chart",
  xlsx: "table_chart",
  csv: "table_chart",
  ods: "table_chart",
  numbers: "table_chart",
  tsv: "table_chart",

  // Presentations
  ppt: "slideshow",
  pptx: "slideshow",
  odp: "slideshow",
  keynote: "slideshow",

  // Audio
  mp3: "audiotrack",
  wav: "audiotrack",
  flac: "audiotrack",
  aac: "audiotrack",
  ogg: "audiotrack",
  wma: "audiotrack",
  m4a: "audiotrack",
  opus: "audiotrack",
  amr: "audiotrack",

  // Video
  mp4: "movie",
  avi: "movie",
  mkv: "movie",
  mov: "movie",
  wmv: "movie",
  flv: "movie",
  webm: "movie",
  m4v: "movie",
  mpeg: "movie",
  mpg: "movie",
  "3gp": "movie",

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
  avif: "image",
  heic: "image",
  heif: "image",
  raw: "image",
  cr2: "image",
  nef: "image",
  psd: "image",
  ai: "image",
  eps: "image",

  // Archives
  zip: "folder_zip",
  rar: "folder_zip",
  "7z": "folder_zip",
  tar: "folder_zip",
  gz: "folder_zip",
  bz2: "folder_zip",
  xz: "folder_zip",
  zst: "folder_zip",
  lz4: "folder_zip",
  cab: "folder_zip",

  // Code
  js: "code",
  mjs: "code",
  cjs: "code",
  ts: "code",
  jsx: "code",
  tsx: "code",
  py: "code",
  pyw: "code",
  java: "code",
  go: "code",
  html: "code",
  htm: "code",
  css: "code",
  scss: "code",
  sass: "code",
  less: "code",
  vue: "code",
  svelte: "code",
  astro: "code",
  rs: "code",
  rb: "code",
  php: "code",
  c: "code",
  cpp: "code",
  cc: "code",
  h: "code",
  hpp: "code",
  swift: "code",
  kt: "code",
  kts: "code",
  sql: "code",
  sh: "code",
  bash: "code",
  zsh: "code",
  fish: "code",
  ps1: "code",
  bat: "code",
  cmd: "code",
  lua: "code",
  r: "code",
  scala: "code",
  clj: "code",
  ex: "code",
  exs: "code",
  erl: "code",
  hs: "code",
  dart: "code",
  zig: "code",
  nim: "code",
  v: "code",
  graphql: "code",
  gql: "code",
  proto: "code",
  tf: "code",
  hcl: "code",
  dockerfile: "code",
  makefile: "code",
  cmake: "code",
  gradle: "code",
  groovy: "code",

  // Data / Config
  json: "data_object",
  jsonc: "data_object",
  json5: "data_object",
  xml: "data_object",
  yaml: "data_object",
  yml: "data_object",
  toml: "data_object",
  ini: "data_object",
  cfg: "data_object",
  conf: "data_object",
  env: "data_object",
  properties: "data_object",

  // Fonts
  ttf: "font_download",
  otf: "font_download",
  woff: "font_download",
  woff2: "font_download",
  eot: "font_download",

  // 3D / CAD
  stl: "view_in_ar",
  obj: "view_in_ar",
  fbx: "view_in_ar",
  blend: "view_in_ar",
  dwg: "view_in_ar",

  // Ebooks
  epub: "menu_book",
  mobi: "menu_book",
  azw: "menu_book",
  azw3: "menu_book",

  // Certificates / Keys
  pem: "security",
  crt: "security",
  key: "vpn_key",
  p12: "security",
  pfx: "security",

  // Logs
  log: "receipt_long",

  // Subtitles
  srt: "subtitles",
  vtt: "subtitles",
  ass: "subtitles",
  ssa: "subtitles",

  // Other
  exe: "settings_ethernet",
  msi: "settings_ethernet",
  dmg: "settings_ethernet",
  pkg: "settings_ethernet",
  deb: "settings_ethernet",
  rpm: "settings_ethernet",
  appimage: "settings_ethernet",
  iso: "settings_ethernet",
  img: "settings_ethernet",
  bin: "settings_ethernet",
  torrent: "cloud_download",
  url: "link",
  lnk: "link",
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
