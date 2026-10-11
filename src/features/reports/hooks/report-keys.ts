export const reportKeys = {
  all: ["reports"] as const,
  exports: () => [...reportKeys.all, "exports"] as const,
  // Ro'yxat kaliti ostida emas — ro'yxat invalidatsiyasi holat so'rovlarini qayta ishga tushirmasin.
  exportStatus: (jobId: string) => [...reportKeys.all, "export-status", jobId] as const,
  digest: () => [...reportKeys.all, "digest"] as const,
};
