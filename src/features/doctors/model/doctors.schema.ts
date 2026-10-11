import { z } from "zod";

import type { Camelized } from "@/shared/lib/camelize";
import { metricSchema } from "@/shared/lib/envelope";

/** `GET /doctors/summary/` — sahifa tepasidagi 4 ko'rsatkich. To'lanmagan komissiya — hozirgi holat. */
export const doctorsSummarySchema = z.object({
  active_doctors: metricSchema,
  online_consultations: metricSchema,
  sales_amount: metricSchema,
  payout_outstanding: z.number(),
  /** To'lov kutayotgan shifokorlar soni. */
  doctors_waiting: z.number(),
  /** KPI kataklaridagi mini trendlar (kalit — ko'rsatkich nomi). */
  sparklines: z.record(z.array(z.number())).default({}),
});
export type DoctorsSummary = Camelized<z.infer<typeof doctorsSummarySchema>>;

/** `GET /doctors/` (`02_BACKEND_TZ` §4.9). `filial` — onlayn ishlaydigan shifokorda bo'lmasligi mumkin. */
export const doctorsSchema = z.array(
  z.object({
    id: z.number(),
    full_name: z.string(),
    specialty: z.string(),
    filial: z.string().nullable(),
    online_consultations: z.number(),
    clinic_visits: z.number(),
    orders_created: z.number(),
    sales_amount: z.number(),
    commission_earned: z.number(),
    payout_outstanding: z.number(),
    /** Baho hali yo'q bo'lsa `null`. */
    rating_avg: z.number().nullable(),
    rating_count: z.number(),
  }),
);
export type Doctor = Camelized<z.infer<typeof doctorsSchema>>[number];
