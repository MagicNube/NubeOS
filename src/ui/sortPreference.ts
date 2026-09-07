export function readDefaultSort<T extends string>(
  storageKey: string,
  fallback: T,
  allowed: readonly T[],
): T {
  const stored = localStorage.getItem(storageKey);
  return stored && allowed.includes(stored as T) ? stored as T : fallback;
}

export function saveDefaultSort<T extends string>(storageKey: string, value: T): void {
  localStorage.setItem(storageKey, value);
}
