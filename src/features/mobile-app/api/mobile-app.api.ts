import { parseEnvelope, timeseriesSchema, type Envelope, type Timeseries } from "@/shared/lib/envelope";
import { apiGet, type QueryParams } from "@/shared/lib/http";

import {
  appConsultationsSchema,
  appDevicesSchema,
  appEngagementSchema,
  appFunnelsSchema,
  appLoyaltySchema,
  appSummarySchema,
  doctorAppSchema,
  type AppConsultations,
  type AppDevices,
  type AppEngagement,
  type AppFunnels,
  type AppLoyalty,
  type AppSummary,
  type AppTimeseriesMetric,
  type DoctorApp,
} from "../model/mobile-app.schema";

export const loadAppSummary = async (params: QueryParams): Promise<Envelope<AppSummary>> =>
  parseEnvelope(appSummarySchema, await apiGet("app/summary/", params));

/** Bitta o'lchovning vaqt qatori (`active_users` yoki `new_users`). */
export const loadAppTimeseries = async (
  metric: AppTimeseriesMetric,
  params: QueryParams,
): Promise<Envelope<Timeseries>> =>
  parseEnvelope(timeseriesSchema, await apiGet("app/timeseries/", { ...params, metric }));

export const loadAppDevices = async (params: QueryParams): Promise<Envelope<AppDevices>> =>
  parseEnvelope(appDevicesSchema, await apiGet("app/devices/", params));

export const loadAppConsultations = async (params: QueryParams): Promise<Envelope<AppConsultations>> =>
  parseEnvelope(appConsultationsSchema, await apiGet("app/consultations/", params));

export const loadAppEngagement = async (params: QueryParams): Promise<Envelope<AppEngagement>> =>
  parseEnvelope(appEngagementSchema, await apiGet("app/engagement/", params));

export const loadAppLoyalty = async (params: QueryParams): Promise<Envelope<AppLoyalty>> =>
  parseEnvelope(appLoyaltySchema, await apiGet("app/loyalty/", params));

export const loadDoctorApp = async (params: QueryParams): Promise<Envelope<DoctorApp>> =>
  parseEnvelope(doctorAppSchema, await apiGet("app/doctor-app/", params));

export const loadAppFunnels = async (params: QueryParams): Promise<Envelope<AppFunnels>> =>
  parseEnvelope(appFunnelsSchema, await apiGet("orders/app-funnels/", params));
