"use client";

import { parseAsStringLiteral, useQueryState } from "nuqs";

import { ALERT_SEVERITIES } from "@/shared/domain/alert";

/**
 * Daraja filtri URL da (`?severity=critical`) — havola ulashiladi, sahifa
 * yangilansa tanlov saqlanadi. `null` — barcha darajalar; noma'lum qiymat ham `null`.
 */
export const useSeverityFilter = () => useQueryState("severity", parseAsStringLiteral(ALERT_SEVERITIES));
