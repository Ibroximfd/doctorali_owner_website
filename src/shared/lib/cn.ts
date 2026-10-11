import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** `cn('p-4', className)` — chaqiruvchi bergan klass ziddiyatda yutadi. */
export const cn = (...inputs: ClassValue[]): string => twMerge(clsx(inputs));
