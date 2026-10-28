import { RegionExplorer } from "@/features/regions/ui/region-explorer";
import { WarehouseScreen } from "@/features/warehouse/ui/warehouse-screen";

/** Sarlavha (`h1`) bo'lim boshida — `WarehouseHero` ichida. Xarita viloyatlar qoldig'ini ko'rsatadi. */
export default function WarehousePage() {
  return <WarehouseScreen regionSlot={<RegionExplorer initialMetric="stock" />} />;
}
