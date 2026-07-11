export interface PersistedFavorite {
  id: string;
  path: string;
  name: string;
  groupId?: string;
  addedAt: number;
  order: number;
}

export function replaceFavoriteByPath<T extends PersistedFavorite>(
  favorites: T[],
  created: T
): T[] {
  return favorites.map((favorite) =>
    favorite.path === created.path ? created : favorite
  );
}
