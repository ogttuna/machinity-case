// src/lib/sort.ts
import { Product } from "@/lib/schema";

export type SortOption =
    | "alphabetical"
    | "price-asc"
    | "price-desc"
    | "rating-asc"
    | "rating-desc";

const collator = new Intl.Collator("tr", { sensitivity: "base", numeric: true });

const byName = (a: Product, b: Product) => collator.compare(a.name, b.name);

const getNum = (v: unknown): number | null =>
    typeof v === "number" && Number.isFinite(v) ? v : null;

export function sortProducts(list: Product[], sortBy: SortOption): Product[] {
    const arr = [...list];

    const sortByNum = (getter: (p: Product) => number | null, asc: boolean) => {
        arr.sort((a, b) => {
            const av = getter(a);
            const bv = getter(b);

            if (av === null && bv === null) return byName(a, b);
            if (av === null) return 1;
            if (bv === null) return -1;

            const diff = av - bv;
            if (diff !== 0) return asc ? diff : -diff;

            return byName(a, b);
        });
    };

    switch (sortBy) {
        case "price-asc":
            sortByNum((p) => getNum(p.price), true);
            break;

        case "price-desc":
            sortByNum((p) => getNum(p.price), false);
            break;

        case "rating-asc":
            sortByNum((p) => getNum(p.rating), true);
            break;

        case "rating-desc":
            sortByNum((p) => getNum(p.rating), false);
            break;

        case "alphabetical":
        default:
            arr.sort(byName);
            break;
    }

    return arr;
}
