/**
 * Decode paths that were persisted by older clients with URI-encoded UTF-8
 * segments. Invalid or non-text encodings are returned unchanged so a literal
 * percent sign in a filename is never treated as a fatal display error.
 */
export function displayPath(value: string): string {
  if (!value.includes("%")) return value;

  try {
    const decoded = value
      .split("/")
      .map((segment) => decodeURIComponent(segment))
      .join("/");

    return decoded !== value && /[^\u0000-\u007f]/u.test(decoded)
      ? decoded
      : value;
  } catch {
    return value;
  }
}
