export const getLocalStorage = (key: string): any | null => {
  if (typeof window === "undefined") return null;
  const item = localStorage.getItem(key);
  try {
    return item ? JSON.parse(item) : null;
  } catch {
    return item;
  }
};

export const LOCAL_STORAGE_WRITE_EVENT = "ls-write";

export const setLocalStorage = (key: string, value: any): void => {
  if (typeof window === "undefined") return;
  const toStore = typeof value === "string" ? value : JSON.stringify(value);
  localStorage.setItem(key, toStore);
  // `storage` only fires in *other* tabs — this notifies same-tab listeners
  // (e.g. LocalStorageProvider) that a write outside their own setters happened.
  window.dispatchEvent(
    new CustomEvent(LOCAL_STORAGE_WRITE_EVENT, { detail: { key } }),
  );
};

export const removeLocalStorage = (key: string): void => {
  if (typeof window === "undefined") return;
  localStorage.removeItem(key);
};

export const clearLocalStorage = (): void => {
  if (typeof window === "undefined") return;
  localStorage.clear();
};
