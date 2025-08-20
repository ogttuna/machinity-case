// src/app/api/products/stats/route.ts
import { NextResponse } from "next/server";
import { getProductStats } from "@/lib/server/products-repo";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const stats = await getProductStats();
        return NextResponse.json(stats, { status: 200 });
    } catch (err) {
        console.error("[GET /api/products/stats] error:", err);
        return NextResponse.json(
            { error: "Stats could not be computed" },
            { status: 500 }
        );
    }
}
