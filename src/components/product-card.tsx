// src/components/product-card.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Product } from "@/lib/schema";
import { toast } from "sonner";
import { useFavoriteStore } from "@/lib/store/favorites";

/*  Compare store */
import { useCompare } from "@/state/useCompare";

export function ProductCard({ product }: { product: Product }) {
    const id = product.id;

    //  Mount sonrası localStorage’dan gerçek değer
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    const isFav = useFavoriteStore((s) => s.isFavorite(id));
    const toggleFavorite = useFavoriteStore((s) => s.toggleFavorite);
    const effectiveFav = mounted ? isFav : false;

    /*Compare store verilri  */
    const compareEnabled = useCompare((s) => s.enabled);
    const isSelected = useCompare((s) => s.isSelected(id));
    //const canSelectMore = useCompare((s) => s.canSelectMore());// Gerk yok sanki commentli kalsın şimdilö
    const toggleSelect = useCompare((s) => s.toggleSelect);

    const handleToggleFav = () => {
        const wasFav = isFav;
        toggleFavorite(id);

        if (wasFav) {
            toast.custom(
                (t) => (
                    <div className="flex items-center justify-between gap-4 rounded-md border bg-background px-4 py-2 shadow-md">
                        <span>“{product.name}” favorilerden çıkarıldı</span>
                        <button
                            className="text-primary underline text-sm"
                            onClick={() => {
                                toggleFavorite(id);
                                toast.dismiss(t);
                            }}
                        >
                            Geri Al
                        </button>
                    </div>
                ),
                { duration: 3000 }
            );
        } else {
            toast.success(`“${product.name}” favorilere eklendi`, { duration: 1500 });
        }
    };

    /*Compare seçimi */
    const handleToggleCompare = () => {
        // Seçiliyse her zaman çıkarsın; değilse limit baksn
        const ok = toggleSelect(id);
        if (!ok) {
            toast.info("En fazla 2 ürün seçebilirsiniz.", { duration: 1800 });
        }
    };

    return (
        <div className="relative">
            <Link
                href={`/product/${product.id}`}
                aria-label={`${product.name} detayına git`}
                className="group block focus:outline-none"
            >
                <Card
                    className={cn(
                        "relative overflow-hidden border transition-all group-hover:shadow-lg group-hover:-translate-y-0.5 group-hover:border-primary/40 focus-within:shadow-lg focus-within:-translate-y-0.5 focus-within:border-primary/50",
                        compareEnabled && isSelected && "border-green-500"
                    )}
                >
                    <div className="pointer-events-none absolute inset-0 bg-primary/5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100" />

                    <CardHeader className="p-0">
                        <div className="relative h-40 w-full bg-muted">
                            <Image
                                src={product.image_url || "/placeholder.png"}
                                alt={product.name}
                                fill
                                sizes="(max-width: 768px) 100vw, 33vw"
                                className="object-contain transition-transform duration-200 group-hover:scale-[1.02] group-focus-within:scale-[1.02]"
                            />
                        </div>
                    </CardHeader>

                    <CardContent className="relative p-4">
                        <CardTitle className="text-base line-clamp-1">{product.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">{product.brand}</p>
                        <p className="mt-2 font-semibold">
                            {product.price.toLocaleString("tr-TR")} ₺
                        </p>
                    </CardContent>
                </Card>
            </Link>

            {/* Favori kalp butonu  */}
            <button
                type="button"
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleToggleFav();
                }}
                aria-label={
                    effectiveFav
                        ? `${product.name} favorilerden çıkar`
                        : `${product.name} favorilere ekle`
                }
                aria-pressed={effectiveFav}
                title={effectiveFav ? "Favorilerden çıkar" : "Favorilere ekle"}
                className="
          absolute top-2 right-2 z-10
          rounded-full bg-background/80 p-1.5
          shadow-md backdrop-blur-sm
          hover:scale-110 transition
          border
        "
            >
                <Heart
                    className={cn(
                        "h-5 w-5 transition-colors",
                        effectiveFav ? "fill-red-500 text-red-500" : "text-muted-foreground"
                    )}
                />
            </button>

            {/* Karşılaştırma seçimi Komaper açıkksan görünüyor sadece iyi */}
            {compareEnabled && (
                <button
                    type="button"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleToggleCompare();
                    }}
                    aria-label={
                        isSelected
                            ? `${product.name} karşılaştırmadan çıkar`
                            : `${product.name} karşılaştırmaya ekle`
                    }
                    aria-pressed={isSelected}
                    title={isSelected ? "Karşılaştırmadan çıkar" : "Karşılaştırmaya ekle"}
                    className={cn(
                        "absolute top-2 left-2 z-10 rounded-full border bg-background/85 p-1.5 shadow-md backdrop-blur-sm transition",
                        isSelected ? "border-green-500" : "border-muted-foreground/50"
                    )}
                >
          <span
              className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-[4px] border",
                  isSelected
                      ? "border-green-500 bg-green-500 text-white"
                      : "border-muted-foreground/50 bg-background text-muted-foreground"
              )}
          >
            {isSelected && <Check className="h-3.5 w-3.5" aria-hidden />}
          </span>
                </button>
            )}
        </div>
    );
}
