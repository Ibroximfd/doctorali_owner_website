import type { Product, ProductCategory } from "./products.schema";

export type StockLevel = "out" | "low" | "ok" | "untracked";

/** Ombor holati: tugagan (0) kam qolgandan ustun; qoldig'i yuritilmaydigan mahsulot — belgisiz. */
export const stockLevel = (product: Pick<Product, "stockQuantity" | "isLow">): StockLevel => {
  if (product.stockQuantity === null) return "untracked";
  if (product.stockQuantity === 0) return "out";
  return product.isLow ? "low" : "ok";
};

/** Top ro'yxat — tushum bo'yicha, kattadan kichikka. */
export const rankProducts = (products: readonly Product[]): Product[] =>
  [...products].sort((a, b) => b.revenue - a.revenue);

export const sortCategories = (categories: readonly ProductCategory[]): ProductCategory[] =>
  [...categories].sort((a, b) => b.revenue - a.revenue);

/** Qiymatning eng kattasiga nisbati, foizda (mini ustun kengligi). */
export const shareOfMax = (value: number, max: number): number => (max > 0 ? (value / max) * 100 : 0);
