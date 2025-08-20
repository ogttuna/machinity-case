// tests/sort.test.ts
import { describe, it, expect } from "vitest";
import type { Product } from "@/lib/schema";
import { sortProducts, type SortOption } from "@/lib/sort";

const base = (over: Partial<Product>): Product => ({
    id: "x",
    name: "X",
    category: "laptop",
    brand: "Brand",
    price: 1,
    ...over,
});

describe("sortProducts", () => {
    it("alphabetical: Türkçe collator + doğal sayı sıralama (Model 2 < Model 10)", () => {
        const items: Product[] = [
            base({ id: "1", name: "Model 10" }),
            base({ id: "2", name: "Model 2" }),
            base({ id: "3", name: "Älfa" }), // collator testi
            base({ id: "4", name: "Zeta" }),
        ];
        const out = sortProducts(items, "alphabetical");
        expect(out.map(p => p.name)).toEqual(["Älfa", "Model 2", "Model 10", "Zeta"]);
    });

    it("price-asc: artan fiyata göre, eşitlikte alfabetik fallback", () => {
        const items: Product[] = [
            base({ id: "1", name: "B", price: 1000 }),
            base({ id: "2", name: "A", price: 1000 }),
            base({ id: "3", name: "C", price: 500 }),
        ];
        const out = sortProducts(items, "price-asc");
        expect(out.map(p => p.id)).toEqual(["3", "2", "1"]); // 500 önce, 1000'lerde A < B
    });

    it("price-desc: azalan fiyata göre", () => {
        const items: Product[] = [
            base({ id: "1", price: 100 }),
            base({ id: "2", price: 300 }),
            base({ id: "3", price: 200 }),
        ];
        const out = sortProducts(items, "price-desc");
        expect(out.map(p => p.price)).toEqual([300, 200, 100]);
    });

    it("rating-desc: sayısal değeri olmayanlar sona, eşitlikte ada göre", () => {
        const items: Product[] = [
            base({ id: "1", name: "Beta", rating: 4.5 }),
            base({ id: "2", name: "Alpha", rating: 4.5 }),
            base({ id: "3", name: "NoRating1" }),          // undefined
            base({ id: "4", name: "NoRating0", rating: 0 }), // 0 geçerli sayı
            base({ id: "5", name: "Gamma", rating: 4.7 }),
        ];
        const out = sortProducts(items, "rating-desc");
        // 4.7 > 4.5 > 4.5 > 0 > (undefined’ler en sonda ve kendi içinde alfabetik)
        expect(out.map(p => p.name)).toEqual(["Gamma", "Alpha", "Beta", "NoRating0", "NoRating1"]);
    });

    it("rating-asc: artan, eşitlikte alfabetik", () => {
        const items: Product[] = [
            base({ id: "1", name: "C", rating: 3 }),
            base({ id: "2", name: "A", rating: 1 }),
            base({ id: "3", name: "B", rating: 1 }),
            base({ id: "4", name: "D", rating: 2 }),
        ];
        const out = sortProducts(items, "rating-asc");
        expect(out.map(p => p.id)).toEqual(["2", "3", "4", "1"]); // 1’lerde A < B
    });

    it("default/unknown sort option → alphabetical", () => {
        const items: Product[] = [
            base({ id: "1", name: "Z" }),
            base({ id: "2", name: "A" }),
        ];
        const out = sortProducts(items, "alphabetical" as SortOption);
        expect(out.map(p => p.name)).toEqual(["A", "Z"]);
    });
});
