// src/app/api/products/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAllProducts } from "@/lib/server/products-repo";
import { sortProducts, type SortOption } from "@/lib/sort";

export const dynamic = "force-dynamic";

/**
 * URL query doğrulama + normalize
 * - Sayfalama: page/pageSize
 * - Filtre: category, brand, price, ram, storage, cpu (discrete), screen/battery/weight aralıkları
 * - Sıralama: alphabetical | price-asc | price-desc | rating-asc | rating-desc
 */
const ListQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(12),

    category: z.union([z.array(z.string()), z.string()]).optional(),
    brand: z.union([z.array(z.string()), z.string()]).optional(),

    minPrice: z.coerce.number().nonnegative().optional(),
    maxPrice: z.coerce.number().nonnegative().optional(),

    // discrete çoklu değerler
    ram: z.union([z.array(z.coerce.number().int()), z.coerce.number().int()]).optional(),
    storage: z.union([z.array(z.coerce.number().int()), z.coerce.number().int()]).optional(),
    cpu: z.union([z.array(z.string()), z.string()]).optional(),

    // aralık bazlı
    screenMin: z.coerce.number().nonnegative().optional(),
    screenMax: z.coerce.number().nonnegative().optional(),
    batteryMin: z.coerce.number().nonnegative().optional(),
    batteryMax: z.coerce.number().nonnegative().optional(),
    weightMin: z.coerce.number().nonnegative().optional(),
    weightMax: z.coerce.number().nonnegative().optional(),

    sort: z
        .enum(["alphabetical", "price-asc", "price-desc", "rating-asc", "rating-desc"])
        .default("alphabetical"),
});

//  yardımcilar
function asArray<T>(v: T | T[] | undefined): T[] {
    if (v === undefined) return [];
    return Array.isArray(v) ? v : [v];
}
const inRange = (val: number | null | undefined, min?: number, max?: number) => {
    if (typeof val !== "number" || Number.isNaN(val)) return false;
    if (min !== undefined && val < min) return false;
    if (max !== undefined && val > max) return false;
    return true;
};
const invalidRange = (min?: number, max?: number) =>
    min !== undefined && max !== undefined && min > max;

export async function GET(req: NextRequest) {
    try {
        // Query’yi topla (tekil & çoğul param desteği)
        const sp = req.nextUrl.searchParams;
        const qObj = Object.fromEntries(sp);

        const categoriesQ = sp.getAll("category");
        const brandsQ = sp.getAll("brand");
        const ramsQ = sp.getAll("ram");
        const storagesQ = sp.getAll("storage");
        const cpusQ = sp.getAll("cpu"); // ✅

        const parsed = ListQuerySchema.safeParse({
            ...qObj,
            category: categoriesQ.length ? categoriesQ : qObj["category"],
            brand: brandsQ.length ? brandsQ : qObj["brand"],
            ram: ramsQ.length ? ramsQ : qObj["ram"],
            storage: storagesQ.length ? storagesQ : qObj["storage"],
            cpu: cpusQ.length ? cpusQ : qObj["cpu"], // ✅
        });

        if (!parsed.success) {
            const err = parsed.error.flatten();
            return NextResponse.json(
                { error: "Invalid query parameters", details: err.fieldErrors },
                { status: 400 }
            );
        }

        const {
            page,
            pageSize,
            category,
            brand,
            minPrice,
            maxPrice,
            sort,
            ram,
            storage,
            cpu, // ✅
            screenMin,
            screenMax,
            batteryMin,
            batteryMax,
            weightMin,
            weightMax,
        } = parsed.data;

        // Tutarsız aralıklar için erken dönüş
        if (
            invalidRange(minPrice, maxPrice) ||
            invalidRange(screenMin, screenMax) ||
            invalidRange(batteryMin, batteryMax) ||
            invalidRange(weightMin, weightMax)
        ) {
            return NextResponse.json(
                { error: "Invalid range: min value cannot be greater than max value." },
                { status: 400 }
            );
        }

        let items = await getAllProducts();

        // Filtreler
        const categories = asArray(category);
        const brands = asArray(brand);

        if (categories.length > 0) {
            const set = new Set(categories);
            items = items.filter((p) => set.has(p.category));
        }
        if (brands.length > 0) {
            const set = new Set(brands);
            items = items.filter((p) => set.has(p.brand));
        }
        if (minPrice !== undefined || maxPrice !== undefined) {
            items = items.filter((p) => {
                if (typeof p.price !== "number" || Number.isNaN(p.price)) return false;
                if (minPrice !== undefined && p.price < minPrice) return false;
                if (maxPrice !== undefined && p.price > maxPrice) return false;
                return true;
            });
        }

        // RAM / Storage (discrete)
        const rams = asArray(ram);
        if (rams.length > 0) {
            const set = new Set(rams);
            items = items.filter((p) => typeof p.ram_gb === "number" && set.has(p.ram_gb));
        }
        const storages = asArray(storage);
        if (storages.length > 0) {
            const set = new Set(storages);
            items = items.filter((p) => typeof p.storage_gb === "number" && set.has(p.storage_gb));
        }

        // CPU discrete, case-insensitive eşleşme
        const cpus = asArray(cpu);
        if (cpus.length > 0) {
            const set = new Set(cpus.map((c) => c.toLowerCase()));
            items = items.filter(
                (p) => typeof p.cpu === "string" && set.has(p.cpu.trim().toLowerCase())
            );
        }

        // Screen / Battery / Weight (aralık)
        if (screenMin !== undefined || screenMax !== undefined) {
            items = items.filter((p) => inRange(p.screen_inch, screenMin, screenMax));
        }
        if (batteryMin !== undefined || batteryMax !== undefined) {
            items = items.filter((p) => inRange(p.battery_wh ?? undefined, batteryMin, batteryMax));
        }
        if (weightMin !== undefined || weightMax !== undefined) {
            items = items.filter((p) => inRange(p.weight_kg, weightMin, weightMax));
        }

        // Sıralama
        items = sortProducts(items, sort as SortOption);

        // Sayfalama
        const total = items.length;
        const start = (page - 1) * pageSize;
        const end = start + pageSize;
        const paged = items.slice(start, end);

        return NextResponse.json(
            {
                items: paged,
                total,
                page,
                pageSize,
                hasNextPage: end < total,
            },
            { status: 200 }
        );
    } catch (err) {
        console.error("[GET /api/products] error:", err);
        return NextResponse.json({ error: "Products could not be loaded" }, { status: 500 });
    }
}
