import { parseEnvelope, timeseriesSchema, type Envelope, type Timeseries } from "@/shared/lib/envelope";
import { apiGet, type QueryParams } from "@/shared/lib/http";

import {
  clinicBranchesSchema,
  clinicDoctorsSchema,
  clinicSummarySchema,
  clinicWarehouseSchema,
  type ClinicBranch,
  type ClinicDoctor,
  type ClinicSummary,
  type ClinicWarehouse,
} from "../model/clinic.schema";

export const loadClinicSummary = async (params: QueryParams): Promise<Envelope<ClinicSummary>> =>
  parseEnvelope(clinicSummarySchema, await apiGet("clinic/summary/", params));

/** Klinika tushumi tarkibi bo'yicha: mahsulot, muolaja, konsultatsiya. */
export const loadClinicRevenueMix = async (params: QueryParams): Promise<Envelope<Timeseries>> =>
  parseEnvelope(timeseriesSchema, await apiGet("clinic/timeseries/", { ...params, metric: "revenue" }));

export const loadClinicBranches = async (params: QueryParams): Promise<Envelope<ClinicBranch[]>> =>
  parseEnvelope(clinicBranchesSchema, await apiGet("clinic/branches/", params));

export const loadClinicDoctors = async (params: QueryParams): Promise<Envelope<ClinicDoctor[]>> =>
  parseEnvelope(clinicDoctorsSchema, await apiGet("clinic/doctors/", params));

export const loadClinicWarehouse = async (params: QueryParams): Promise<Envelope<ClinicWarehouse>> =>
  parseEnvelope(clinicWarehouseSchema, await apiGet("clinic/warehouse/", params));
