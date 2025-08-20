// src/app/api/products/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getProductById } from "@/lib/server/products-repo";

export const dynamic = "force-dynamic";

const ParamsSchema = z.object({
    id: z.string().min(1),
});

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
    try {
        const params = await ctx.params;
        const parsed = ParamsSchema.safeParse(params);
        if (!parsed.success) {
            return NextResponse.json({ error: "Invalid product ID" }, { status: 400 });
        }
        const { id } = parsed.data;
        const product = await getProductById(id);
        if (!product) {
            return NextResponse.json({ error: `Product with id=${id} not found` }, { status: 404 });
        }
        return NextResponse.json(product, { status: 200 });
    } catch (err) {
        console.error("[GET /api/products/:id] error:", err);
        return NextResponse.json({ error: "Product could not be loaded" }, { status: 500 });
    }
}
