export const getLocalStorage = (key: string): any | null => {
  if (typeof window === "undefined") return null;
  const item = localStorage.getItem(key);
  try {
    return item ? JSON.parse(item) : null;
  } catch {
    return item;
  }
};

export const setLocalStorage = (key: string, value: any): void => {
  if (typeof window === "undefined") return;
  const toStore = typeof value === "string" ? value : JSON.stringify(value);
  localStorage.setItem(key, toStore);
};

export const removeLocalStorage = (key: string): void => {
  if (typeof window === "undefined") return;
  localStorage.removeItem(key);
};

export const clearLocalStorage = (): void => {
  if (typeof window === "undefined") return;
  localStorage.clear();
};
