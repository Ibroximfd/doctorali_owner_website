import type { Doctor } from "./doctors.schema";

export type RankedDoctor = Doctor & {
  rank: number;
  /** Yetakchining sotuviga nisbatan foiz (0–100) — mini ustun uzunligi. */
  salesShare: number;
};

/** Shifokorlarni sotuv bo'yicha tartiblaydi (manba massiv o'zgarmaydi). */
export const rankDoctors = (doctors: readonly Doctor[]): RankedDoctor[] => {
  const sorted = [...doctors].sort((first, second) => second.salesAmount - first.salesAmount);
  const top = sorted[0]?.salesAmount ?? 0;

  return sorted.map((doctor, index) => ({
    ...doctor,
    rank: index + 1,
    salesShare: top > 0 ? (doctor.salesAmount / top) * 100 : 0,
  }));
};

/** Ism ostidagi qator: "Terapevt · Toshkent"; filial bo'lmasa — faqat mutaxassislik. */
export const doctorSubtitle = (doctor: Pick<Doctor, "specialty" | "filial">): string =>
  doctor.filial ? `${doctor.specialty} · ${doctor.filial}` : doctor.specialty;
