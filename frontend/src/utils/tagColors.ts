type TagColorOwner = {
  id: string;
  color: string;
};

export function normalizeTagColor(color: string): string {
  const trimmed = color.trim().toUpperCase();
  return trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
}

export function getUsedTagColors(
  tags: TagColorOwner[],
  excludingId?: string
): Set<string> {
  return new Set(
    tags
      .filter((tag) => tag.id !== excludingId)
      .map((tag) => normalizeTagColor(tag.color))
  );
}

export function isTagColorAvailable(
  tags: TagColorOwner[],
  color: string,
  excludingId?: string
): boolean {
  return !getUsedTagColors(tags, excludingId).has(normalizeTagColor(color));
}
