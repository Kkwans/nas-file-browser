export const isExternalFileDrag = (
  types: ArrayLike<string> | null | undefined
): boolean => {
  if (!types) return false;
  return Array.from(types).includes("Files");
};
