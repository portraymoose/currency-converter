export const requestCache = new Map<string, { data: any; timestamp: number }>();

setInterval(() => {
  const now = Date.now();
  for (const [key, { timestamp }] of requestCache.entries()) {
    if (now - timestamp > 5 * 60 * 1000) {
      requestCache.delete(key);
    }
  }
}, 60 * 1000);
