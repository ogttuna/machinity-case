// prisma/seed.js
/* eslint-disable no-console, @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires */

const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();

function loadProducts() {
    // Proje kökünden güvenli path
    const dataPath = path.resolve(process.cwd(), "src/data/products.json");
    const raw = fs.readFileSync(dataPath, "utf-8");
    const items = JSON.parse(raw);

    if (!Array.isArray(items)) {
        throw new Error("products.json array bekleniyor");
    }

    // JSON'da id string ise Prisma'ya direkt string olarak bırak zaten stirn olcak gibi şimdiilk
    return items.map((p) => ({
        ...p,
        id: String(p.id),
    }));
}

async function main() {
    const items = loadProducts();
    console.log(`Seeding ${items.length} products...`);

    for (const p of items) {
        await prisma.product.upsert({
            where: { id: p.id },
            update: {
                name: p.name,
                category: p.category,
                brand: p.brand,
                price: p.price,
                rating: p.rating ?? null,
                weight_kg: p.weight_kg ?? null,
                cpu: p.cpu === "—" ? null : p.cpu ?? null,
                ram_gb: p.ram_gb ?? null,
                storage_gb: p.storage_gb ?? null,
                screen_inch: p.screen_inch ?? null,
                battery_wh: p.battery_wh ?? null,
                image_url: p.image_url ?? null,
            },
            create: {
                id: String(p.id),
                name: p.name,
                category: p.category,
                brand: p.brand,
                price: p.price,
                rating: p.rating ?? null,
                weight_kg: p.weight_kg ?? null,
                cpu: p.cpu === "—" ? null : p.cpu ?? null,
                ram_gb: p.ram_gb ?? null,
                storage_gb: p.storage_gb ?? null,
                screen_inch: p.screen_inch ?? null,
                battery_wh: p.battery_wh ?? null,
                image_url: p.image_url ?? null,
            },
        });
    }

    console.log(" Seeding complete!");
}

main()
    .catch((e) => {
        console.error("Seed failed:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
