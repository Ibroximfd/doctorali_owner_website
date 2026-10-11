import { parseEnvelope, type Envelope } from "@/shared/lib/envelope";
import { apiGet, type QueryParams } from "@/shared/lib/http";

import {
  doctorsSchema,
  doctorsSummarySchema,
  type Doctor,
  type DoctorsSummary,
} from "../model/doctors.schema";

export const loadDoctorsSummary = async (params: QueryParams): Promise<Envelope<DoctorsSummary>> =>
  parseEnvelope(doctorsSummarySchema, await apiGet("doctors/summary/", params));

export const loadDoctors = async (params: QueryParams): Promise<Envelope<Doctor[]>> =>
  parseEnvelope(doctorsSchema, await apiGet("doctors/", params));
