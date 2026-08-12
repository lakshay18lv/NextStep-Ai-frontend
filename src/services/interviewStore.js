const STORAGE_KEY = "nextstep_interviews";
const UPDATE_EVENT = "nextstep:interviews-updated";

const safeParse = (value) => {
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    return [];
  }
};

export const readInterviewCache = () => {
  if (typeof window === "undefined") return [];
  return safeParse(window.localStorage.getItem(STORAGE_KEY));
};

export const writeInterviewCache = (items) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT, { detail: items }));
};

export const mergeInterviewCache = (serverItems = []) => {
  const cachedItems = readInterviewCache();
  const merged = [...serverItems];

  cachedItems.forEach((cached) => {
    const exists = merged.some((item) => (item._id || item.localId) === (cached._id || cached.localId));
    if (!exists) {
      merged.push(cached);
    }
  });

  merged.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  writeInterviewCache(merged);
  return merged;
};

export const prependInterviewCache = (item) => {
  if (!item) return;
  const current = readInterviewCache();
  const filtered = current.filter(
    (entry) => (entry._id || entry.localId) !== (item._id || item.localId),
  );
  writeInterviewCache([item, ...filtered]);
};

export const clearInterviewCache = () => {
  writeInterviewCache([]);
};

export const subscribeInterviewCache = (callback) => {
  if (typeof window === "undefined") return () => {};
  const handler = () => callback(readInterviewCache());
  window.addEventListener(UPDATE_EVENT, handler);
  return () => window.removeEventListener(UPDATE_EVENT, handler);
};
