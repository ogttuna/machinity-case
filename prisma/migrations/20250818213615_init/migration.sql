-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "rating" REAL,
    "weight_kg" REAL,
    "cpu" TEXT,
    "ram_gb" INTEGER,
    "storage_gb" INTEGER,
    "screen_inch" REAL,
    "battery_wh" INTEGER,
    "image_url" TEXT
);
