export const alertKeys = {
  all: ["alerts"] as const,
  list: () => [...alertKeys.all, "list"] as const,
  rules: () => [...alertKeys.all, "rules"] as const,
};
