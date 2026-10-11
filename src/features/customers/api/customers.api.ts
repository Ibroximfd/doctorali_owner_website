import { parseEnvelope, timeseriesSchema, type Envelope, type Timeseries } from "@/shared/lib/envelope";
import { apiGet, type QueryParams } from "@/shared/lib/http";

import {
  cohortsSchema,
  customerRegionsSchema,
  customersSummarySchema,
  topCustomersSchema,
  type Cohort,
  type CustomerRegion,
  type CustomersSummary,
  type TopCustomer,
} from "../model/customers.schema";

export const loadCustomersSummary = async (params: QueryParams): Promise<Envelope<CustomersSummary>> =>
  parseEnvelope(customersSummarySchema, await apiGet("customers/summary/", params));

export const loadCohorts = async (params: QueryParams): Promise<Envelope<Cohort[]>> =>
  parseEnvelope(cohortsSchema, await apiGet("customers/cohorts/", params));

/** Davrda xarid qilganlar: `new` va `returning` seriyalari. */
export const loadCustomersMix = async (params: QueryParams): Promise<Envelope<Timeseries>> =>
  parseEnvelope(timeseriesSchema, await apiGet("customers/timeseries/", params));

export const loadTopCustomers = async (params: QueryParams): Promise<Envelope<TopCustomer[]>> =>
  parseEnvelope(topCustomersSchema, await apiGet("customers/top/", params));

export const loadCustomerRegions = async (params: QueryParams): Promise<Envelope<CustomerRegion[]>> =>
  parseEnvelope(customerRegionsSchema, await apiGet("customers/regions/", params));
