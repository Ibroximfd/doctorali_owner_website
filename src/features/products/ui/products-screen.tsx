import { Grid, span } from "@/shared/ui/grid";

import { CategoriesCard } from "./categories-card";
import { ProductsKpis } from "./products-kpis";
import { TopProductsTable } from "./top-products-table";

/** "Mahsulotlar": nima sotilyapti — yetkazib berish va klinika do'koni birga. */
export const ProductsScreen = () => (
  <>
    <ProductsKpis />
    <Grid>
      <TopProductsTable className={span.c8} />
      <CategoriesCard className={span.c4} />
    </Grid>
  </>
);
