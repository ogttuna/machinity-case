// tests/filter.test.ts
import { filterProducts, type FavoriteFilter } from "@/lib/filter";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Product } from "@/lib/schema";

const base = (over: Partial<Product>): Product => ({
    id: "x",
    name: "X",
    category: "laptop",
    brand: "Brand",
    price: 1000,
    ...over,
});

type Opts = Parameters<typeof filterProducts>[1];
const opts = (over: Partial<Opts> = {}): Opts => ({
    categories: [],
    brands: [],
    priceRange: [0, 1_000_000],
    favoriteFilter: "all",
    favorites: [],
    mounted: true,
    ...over,
});

describe("filterProducts", () => {
    it("kategoriye göre süzer", () => {
        const products: Product[] = [
            base({ id: "1", category: "laptop" }),
            base({ id: "2", category: "phone" }),
        ];
        const out = filterProducts(products, opts({ categories: ["laptop"] }));
        expect(out.map(p => p.id)).toEqual(["1"]);
    });

    it("markaya göre süzer", () => {
        const products: Product[] = [
            base({ id: "1", brand: "Apple" }),
            base({ id: "2", brand: "Lenovo" }),
        ];
        const out = filterProducts(products, opts({ brands: ["Lenovo"] }));
        expect(out.map(p => p.id)).toEqual(["2"]);
    });

    it("fiyat aralığı (uçlar dahil) çalışır", () => {
        const products: Product[] = [
            base({ id: "1", price: 500 }),
            base({ id: "2", price: 1000 }),
            base({ id: "3", price: 1500 }),
        ];
        const out = filterProducts(products, opts({ priceRange: [1000, 1500] }));
        expect(out.map(p => p.id)).toEqual(["2", "3"]);
    });

    it("favoriler: only → sadece favorites listesinde olanlar", () => {
        const products: Product[] = [base({ id: "1" }), base({ id: "2" }), base({ id: "3" })];
        const out = filterProducts(
            products,
            opts({ favoriteFilter: "only", favorites: ["2", "3"], mounted: true })
        );
        expect(out.map(p => p.id)).toEqual(["2", "3"]);
    });

    it("favoriler: non → favorites listesinde olmayanlar", () => {
        const products: Product[] = [base({ id: "1" }), base({ id: "2" })];
        const out = filterProducts(
            products,
            opts({ favoriteFilter: "non", favorites: ["2"], mounted: true })
        );
        expect(out.map(p => p.id)).toEqual(["1"]);
    });

    it("mounted=false iken favori filtresi uygulanmaz (hydrate guard)", () => {
        const products: Product[] = [base({ id: "1" }), base({ id: "2" })];
        const out = filterProducts(
            products,
            opts({ favoriteFilter: "only", favorites: ["2"], mounted: false })
        );
        expect(out.map(p => p.id).sort()).toEqual(["1", "2"]);
    });
});
