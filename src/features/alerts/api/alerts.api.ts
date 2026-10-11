import { alertSchema, type Alert } from "@/shared/domain/alert";
import { parseJson } from "@/shared/lib/envelope";
import { apiGet, apiSend } from "@/shared/lib/http";

import {
  alertRuleSchema,
  alertRulesResponseSchema,
  alertsResponseSchema,
  type AlertRule,
  type AlertRulePatch,
  type AlertsResponse,
} from "../model/alerts.schema";

export const loadAlerts = async (): Promise<AlertsResponse> =>
  parseJson(alertsResponseSchema, await apiGet("alerts/"));

export const acknowledgeAlert = async (id: number): Promise<Alert> =>
  parseJson(alertSchema, await apiSend("post", `alerts/${id}/ack/`));

export const loadAlertRules = async (): Promise<AlertRule[]> =>
  parseJson(alertRulesResponseSchema, await apiGet("alerts/rules/")).results;

export const updateAlertRule = async (code: string, patch: AlertRulePatch): Promise<AlertRule> =>
  parseJson(
    alertRuleSchema,
    await apiSend("patch", `alerts/rules/${encodeURIComponent(code)}/`, {
      enabled: patch.enabled,
      params: patch.threshold === undefined ? undefined : { threshold: patch.threshold },
    }),
  );
