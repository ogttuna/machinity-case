// lib/filter.ts BU ARTIK KULLANILMIYOR BACKENDE ALDIM
import { Product } from "@/lib/schema";

export type FavoriteFilter = "all" | "only" | "non";

export type FilterOptions = {
    categories: string[];
    brands: string[];
    priceRange: [number, number];
    favoriteFilter: FavoriteFilter;
    favorites: string[]; // id listesi
    mounted: boolean;    // hydration guard
};

export function filterProducts(products: Product[], opts: FilterOptions): Product[] {
    let result = products;

    // kategori
    if (opts.categories.length > 0) {
        result = result.filter((p) => opts.categories.includes(p.category));
    }

    // marka
    if (opts.brands.length > 0) {
        result = result.filter((p) => opts.brands.includes(p.brand));
    }

    // fiyat
    result = result.filter(
        (p) =>
            typeof p.price === "number" &&
            p.price >= opts.priceRange[0] &&
            p.price <= opts.priceRange[1]
    );

    // favori (hydrate sonrası)
    if (opts.mounted) {
        if (opts.favoriteFilter === "only") {
            result = result.filter((p) => opts.favorites.includes(String(p.id)));
        } else if (opts.favoriteFilter === "non") {
            result = result.filter((p) => !opts.favorites.includes(String(p.id)));
        }
    }

    return result;
}
