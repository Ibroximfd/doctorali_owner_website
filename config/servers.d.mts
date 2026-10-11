export type ServerName = "prod" | "test";

export type Server = {
  /** Backend hosti (sxemasiz). */
  host: string;
  label: string;
  /** Panelning loopback porti. */
  port: number;
};

export type ResolvedServer = Server & { name: ServerName; origin: string };

export const SERVERS: Record<ServerName, Server>;
export const DEFAULT_SERVER: ServerName;

/** Noma'lum nom berilsa xato tashlaydi. */
export function resolveServer(name?: string): ResolvedServer;
