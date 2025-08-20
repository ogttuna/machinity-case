// src/lib/server/products-repo.ts
import { ProductsSchema, type Product } from "@/lib/schema";
import rawProducts from "@/data/products.json";
import { prisma } from "@/lib/server/prisma";
import { useDb } from "@/lib/server/config";
import type { Product as PrismaProduct } from "@prisma/client";

/* ------------------------- JSON MODE ------------------------------- */

function getAllProductsFromJson(): Product[] {
    const parsed = ProductsSchema.safeParse(rawProducts);
    if (!parsed.success) {
        console.error(
            "[products-repo] Zod validation failed:",
            JSON.stringify(parsed.error.flatten(), null, 2)
        );
        throw new Error("Products data is invalid");
    }
    return parsed.data;
}

/* ------------------------------- DB HELPERS -------------------------- */

function mapDbRowToProduct(r: PrismaProduct): Product {
    // Zod şemasıyla birebir uyum (nullable alanlar undefined'a çevriliyor)
    return {
        id: r.id,
        name: r.name,
        category: r.category,
        brand: r.brand,
        price: r.price,

        rating: r.rating ?? undefined,
        weight_kg: r.weight_kg ?? undefined,
        cpu: r.cpu ?? undefined,

        // nullable alanlar null kalabilir
        ram_gb: r.ram_gb,
        storage_gb: r.storage_gb,
        battery_wh: r.battery_wh,

        screen_inch: r.screen_inch ?? undefined,
        image_url: r.image_url ?? undefined,
    };
}

/* ---------------------------- API ---------------------------------- */

export async function getAllProducts(): Promise<Product[]> {
    if (useDb) {
        const rows = await prisma.product.findMany();
        return rows.map(mapDbRowToProduct);
    }
    return getAllProductsFromJson();
}

export async function getProductById(id: string): Promise<Product | null> {
    if (useDb) {
        const row = await prisma.product.findUnique({ where: { id } });
        return row ? mapDbRowToProduct(row) : null;
    }
    const data = getAllProductsFromJson();
    return data.find((p) => p.id === id) ?? null;
}

// Türkçe’ye uygun doğal sıralama
const strCollator = new Intl.Collator("tr", { sensitivity: "base", numeric: true });

// Yardımcı: uniq + sıralı string
function uniqSortedStr(arr: string[]) {
    return Array.from(new Set(arr)).sort((a, b) => strCollator.compare(a, b));
}

export async function getProductStats(): Promise<{
    minPrice: number;
    maxPrice: number;
    categories: string[];
    brands: string[];
    ramValues: number[];
    storageValues: number[];
    screen: { min: number; max: number };
    battery: { min: number; max: number };
    weight: { min: number; max: number };
    cpuValues: string[];
}> {
    const data = await getAllProducts();

    // --- local yardımcılar
    const nums = (arr: Array<number | null | undefined>) =>
        arr.filter((v): v is number => typeof v === "number" && Number.isFinite(v));

    const uniqSortedNum = (arr: number[]) => Array.from(new Set(arr)).sort((a, b) => a - b);

    const range = (arr: number[]) =>
        arr.length ? { min: Math.min(...arr), max: Math.max(...arr) } : { min: 0, max: 0 };

    // fiyat
    const priceList = nums(data.map((p) => p.price));
    const minPrice = priceList.length ? Math.min(...priceList) : 0;
    const maxPrice = priceList.length ? Math.max(...priceList) : 0;

    // kategoriler / markalar
    const categories = Array.from(new Set(data.map((p) => p.category))).sort((a, b) =>
        a.localeCompare(b)
    );
    const brands = Array.from(new Set(data.map((p) => p.brand))).sort((a, b) =>
        a.localeCompare(b)
    );

    // teknik
    const ramValues = uniqSortedNum(nums(data.map((p) => p.ram_gb ?? undefined)));
    const storageValues = uniqSortedNum(nums(data.map((p) => p.storage_gb ?? undefined)));
    const screen = range(nums(data.map((p) => p.screen_inch ?? undefined)));
    const battery = range(nums(data.map((p) => p.battery_wh ?? undefined)));
    const weight = range(nums(data.map((p) => p.weight_kg ?? undefined)));

    const cpuValues = uniqSortedStr(
        data
            .map((p) => (typeof p.cpu === "string" ? p.cpu.trim() : ""))
            .filter((s) => s && s !== "—")
    );

    return {
        minPrice,
        maxPrice,
        categories,
        brands,
        ramValues,
        storageValues,
        screen,
        battery,
        weight,
        cpuValues,
    } as const;
}
