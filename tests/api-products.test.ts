// tests/api-products.test.ts
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import type { Product } from "@/lib/schema";

// Repo'yu tipli şekilde mocklansın
type GetAll = () => Promise<Product[]>;
type GetById = (id: string) => Promise<Product | null>;

vi.mock("@/lib/server/products-repo", () => ({
    getAllProducts: vi.fn<GetAll>(),
    getProductById: vi.fn<GetById>(),
}));
import { getAllProducts, getProductById } from "@/lib/server/products-repo";

import { GET as listGET } from "@/app/api/products/route";
import { GET as itemGET } from "@/app/api/products/[id]/route";

import {
    makeListRequest,
    makeItemCtx,
    readJson,
    expectOk,
    expectBadRequest,
} from "./test-utils";

const items: Product[] = [
    {
        id: "1",
        name: "Zeta 15",
        category: "laptop",
        brand: "Lenovo",
        price: 18500,
        rating: 4.3,
        weight_kg: 1.6,
        cpu: "Intel i5",
        ram_gb: 16,
        storage_gb: 512,
        screen_inch: 15.6,
        battery_wh: 60,
    },
    {
        id: "2",
        name: "Alpha 14",
        category: "laptop",
        brand: "Acer",
        price: 21500,
        rating: 4.1,
        weight_kg: 1.4,
        cpu: "Intel i5",
        ram_gb: 8,
        storage_gb: 256,
        screen_inch: 14,
        battery_wh: 45,
    },
    {
        id: "3",
        name: "Phone X",
        category: "phone",
        brand: "Apple",
        price: 48000,
        rating: 4.8,
        weight_kg: 0.18,
        cpu: "A16",
        ram_gb: 6,
        storage_gb: 128,
        screen_inch: 6.1,
        battery_wh: 16,
    },
    {
        id: "4",
        name: "HP Omen 16",
        category: "laptop",
        brand: "HP",
        price: 39500,
        rating: 4.6,
        weight_kg: 2.3,
        cpu: "Intel i7",
        ram_gb: 16,
        storage_gb: 1024,
        screen_inch: 16,
        battery_wh: 70,
    },
    {
        id: "5",
        name: "LG Gram 17",
        category: "laptop",
        brand: "LG",
        price: 31000,
        rating: 4.5,
        weight_kg: 1.35,
        cpu: "Intel i7",
        ram_gb: 16,
        storage_gb: 512,
        screen_inch: 17,
        battery_wh: 80,
    },
];

type ApiListResponse = {
    items: Product[];
    total: number;
    page: number;
    pageSize: number;
    hasNextPage: boolean;
};

beforeEach(() => {
    vi.mocked(getAllProducts).mockResolvedValue(items);
    vi.mocked(getProductById).mockImplementation(async (id: string) => items.find((p) => p.id === id) ?? null);
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe("[GET] /api/products", () => {
    it("geçersiz fiyat aralığında 400 döner", async () => {
        const req = makeListRequest("http://t/api/products?minPrice=5000&maxPrice=3000");
        const res = await listGET(req);
        expectBadRequest(res);
        const json = await readJson<{ error: string }>(res);
        expect(json.error).toMatch(/Invalid range/i);
    });

    it("kategori + marka filtresi ve sayfalama çalışır", async () => {
        const req = makeListRequest(
            "http://t/api/products?category=laptop&brand=Lenovo&page=1&pageSize=12"
        );
        const res = await listGET(req);
        expectOk(res);

        const json = await readJson<ApiListResponse>(res);
        expect(json.items.map((p) => p.id)).toEqual(["1"]);
        expect(json.total).toBe(1);
        expect(json.page).toBe(1);
        expect(json.pageSize).toBe(12);
        expect(json.hasNextPage).toBe(false);
    });

    it("ram=16 ve storage=512 birlikte uygulandığında kesişimi döner", async () => {
        const req = makeListRequest("http://t/api/products?ram=16&storage=512&category=laptop");
        const res = await listGET(req);
        expectOk(res);

        const json = await readJson<ApiListResponse>(res);
        // id=1 (Lenovo 16/512) ve id=5 (LG 16/512) kalır; telefonlar zaten kategoriyle elendi
        expect(json.items.map((p) => p.id).sort()).toEqual(["1", "5"]);
        expect(json.total).toBe(2);
    });

    it("screenMin/screenMax aralığına uyanları döner (inclusive)", async () => {
        const req = makeListRequest("http://t/api/products?category=laptop&screenMin=15&screenMax=16");
        const res = await listGET(req);
        expectOk(res);

        const json = await readJson<ApiListResponse>(res);
        // 15.6 ve 16 dahil → id=1 (15.6), id=4 (16). 14 ve 17 dışarıda
        expect(json.items.map((p) => p.id).sort()).toEqual(["1", "4"]);
        expect(json.total).toBe(2);
    });

    it("rating-desc sıralar; sayfalama hasNextPage doğru döner", async () => {
        // rating-desc: 4.8 (3) > 4.6 (4) > 4.5 (5) > 4.3 (1) > 4.1 (2)
        const req = makeListRequest("http://t/api/products?sort=rating-desc&page=1&pageSize=2");
        const res = await listGET(req);
        expectOk(res);

        const json = await readJson<ApiListResponse>(res);
        expect(json.items.map((p) => p.id)).toEqual(["3", "4"]); // ilk 2
        expect(json.total).toBe(5);
        expect(json.page).toBe(1);
        expect(json.pageSize).toBe(2);
        expect(json.hasNextPage).toBe(true);
    });
});

describe("[GET] /api/products/:id", () => {
    it("ürün bulunduğunda 200 döner", async () => {
        const res = await itemGET(makeListRequest("http://t/api/products/2"), makeItemCtx("2"));
        expectOk(res);
        const json = await readJson<Product>(res);
        expect(json.id).toBe("2");
        expect(json.name).toBe("Alpha 14");
    });

    it("ürün yoksa 404 döner", async () => {
        const res = await itemGET(makeListRequest("http://t/api/products/999"), makeItemCtx("999"));
        expect(res.status).toBe(404);
        const json = await readJson<{ error: string }>(res);
        expect(json.error.toLowerCase()).toContain("not found");
    });
});


describe("[GET] /api/products (error paths)", () => {
    it("repo throw ederse 500 döner", async () => {
        const errSpy = vi.spyOn(console, "error").mockImplementation(() => {}); // logları kapat
        try {
            vi.mocked(getAllProducts).mockRejectedValueOnce(new Error("DB down"));
            const req = makeListRequest("http://t/api/products");
            const res = await listGET(req);
            expect(res.status).toBe(500);
            const json = await readJson<{ error: string }>(res);
            expect(json.error).toMatch(/could not be loaded/i);
        } finally {
            errSpy.mockRestore(); // test bitince geri aç
        }
    });
});


describe("[GET] /api/products (invalid range)", () => {
    it("screenMin > screenMax → 400", async () => {
        const req = makeListRequest("http://t/api/products?screenMin=17&screenMax=14");
        const res = await listGET(req);
        expectBadRequest(res);
        const json = await readJson<{ error: string }>(res);
        expect(json.error).toMatch(/Invalid range/i);
    });
});

describe("[GET] /api/products (discrete multi)", () => {
    it("ram=8&ram=16 → iki değerden biri eşleşmeli", async () => {
        const req = makeListRequest("http://t/api/products?ram=8&ram=16&category=laptop");
        const res = await listGET(req);
        expectOk(res);
        const json = await readJson<{ items: Product[] }>(res);
        const rams = new Set(json.items.map(p => p.ram_gb));
        expect(rams.has(8) || rams.has(16)).toBe(true);
    });
});

describe("[GET] /api/products (paging)", () => {
    it("toplamı aşan sayfa → boş sonuç", async () => {
        const req = makeListRequest("http://t/api/products?page=99&pageSize=50");
        const res = await listGET(req);
        expectOk(res);
        const json = await readJson<{ items: Product[]; hasNextPage: boolean }>(res);
        expect(json.items).toEqual([]);
        expect(json.hasNextPage).toBe(false);
    });
});

