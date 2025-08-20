// app/product/[id]/page.tsx
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { TopBar } from "@/components/topbar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft } from "lucide-react";
import { AiSummaryDialogTrigger } from "@/components/ai-summary-dialog";

type PageParams = { id: string };
type PageProps = { params: Promise<PageParams> };

async function fetchProductViaApi(id: string) {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    const proto = h.get("x-forwarded-proto") ?? "http";
    if (!host) return null;

    const base = `${proto}://${host}`;
    const res = await fetch(`${base}/api/products/${id}`, { cache: "no-store" });
    if (!res.ok) return null;
    return res.json();
}

export default async function ProductDetailPage({ params }: PageProps) {
    const { id } = await params;
    const product = await fetchProductViaApi(id);

    if (!product) notFound();

    // --- normalize helpers
    const cleanText = (v: unknown) =>
        typeof v === "string" ? v.trim() : "";
    const cpuText = cleanText(product.cpu);
    const hasCpu = !!cpuText && cpuText !== "—";

    const hasRam = typeof product.ram_gb === "number";
    const hasStorage = typeof product.storage_gb === "number";
    const hasScreen = typeof product.screen_inch === "number";
    const hasWeight = typeof product.weight_kg === "number";
    const hasBattery = typeof product.battery_wh === "number";
    const hasRating = typeof product.rating === "number";

    return (
        <>
            <TopBar />
            <main className="mx-auto w-full max-w-[1600px] px-2 sm:px-4 py-4 md:py-6">
                {/* Geri */}
                <nav aria-label="breadcrumb" className="mb-3">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Geri dön
                    </Link>
                </nav>

                {/* Başlık */}
                <header className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">
                            {product.brand}
                        </p>
                        <h1 className="text-2xl md:text-3xl font-semibold leading-tight">
                            {product.name}
                        </h1>
                    </div>

                    {/* Server Component olduğu için interactivity siz */}
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" asChild>
                            <Link href="/">Mağazaya Dön</Link>
                        </Button>
                    </div>
                </header>

                {/* Ana grid */}
                <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
                    {/* Görsel */}
                    <Card className="overflow-hidden">
                        <div className="relative w-full bg-muted">
                            <div className="relative aspect-[4/3]">
                                <Image
                                    src={product.image_url || "/placeholder.png"}
                                    alt={product.name}
                                    fill
                                    sizes="(max-width: 1024px) 100vw, 60vw"
                                    priority
                                    className="object-contain transition-transform duration-300 hover:scale-[1.02]"
                                />
                            </div>
                        </div>
                    </Card>

                    {/* Özet (sticky compnet) */}
                    <aside className="lg:sticky lg:top-24 self-start">
                        <Card>
                            <CardContent className="p-5">
                                <div className="flex items-baseline justify-between">
                                    <span className="text-sm text-muted-foreground">Fiyat</span>
                                    <span className="text-2xl font-semibold">
                    {typeof product.price === "number"
                        ? product.price.toLocaleString("tr-TR")
                        : "-"}{" "}
                                        ₺
                  </span>
                                </div>

                                {/*  etiketler */}
                                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full border px-3 py-1 text-xs capitalize">
                    {product.category}
                  </span>
                                    {hasRam && (
                                        <span className="rounded-full border px-3 py-1 text-xs">
                      {product.ram_gb} GB RAM
                    </span>
                                    )}
                                    {hasStorage && (
                                        <span className="rounded-full border px-3 py-1 text-xs">
                      {product.storage_gb} GB Depolama
                    </span>
                                    )}
                                    {hasScreen && (
                                        <span className="rounded-full border px-3 py-1 text-xs">
                      {product.screen_inch}&quot;
                    </span>
                                    )}
                                    {hasCpu && (
                                        <span className="rounded-full border px-3 py-1 text-xs">
                      {cpuText}
                    </span>
                                    )}
                                </div>

                                <div className="mt-5 grid gap-2 sm:grid-cols-2">
                                    <Button size="lg" disabled aria-disabled="true">
                                        Satın Al / Sepete Ekle
                                    </Button>
                                    <Button size="lg" variant="outline" disabled aria-disabled="true">
                                        Karşılaştırmaya Ekle
                                    </Button>

                                    {/* AI Özet tetikleyicisi */}
                                    <AiSummaryDialogTrigger productId={product.id} />
                                </div>

                                <Separator className="my-5" />

                                {/* Özet bilgilerr */}
                                <dl className="grid grid-cols-2 gap-3 text-sm">
                                    <div>
                                        <dt className="text-muted-foreground">Marka</dt>
                                        <dd>{product.brand}</dd>
                                    </div>

                                    {hasCpu && (
                                        <div>
                                            <dt className="text-muted-foreground">İşlemci</dt>
                                            <dd>{cpuText}</dd>
                                        </div>
                                    )}

                                    {hasRam && (
                                        <div>
                                            <dt className="text-muted-foreground">RAM</dt>
                                            <dd>{product.ram_gb} GB</dd>
                                        </div>
                                    )}

                                    {hasStorage && (
                                        <div>
                                            <dt className="text-muted-foreground">Depolama</dt>
                                            <dd>{product.storage_gb} GB</dd>
                                        </div>
                                    )}

                                    {hasScreen && (
                                        <div>
                                            <dt className="text-muted-foreground">Ekran</dt>
                                            <dd>{product.screen_inch}&quot;</dd>
                                        </div>
                                    )}

                                    {hasRating && (
                                        <div>
                                            <dt className="text-muted-foreground">Puan</dt>
                                            <dd>{product.rating}</dd>
                                        </div>
                                    )}

                                    {hasWeight && (
                                        <div>
                                            <dt className="text-muted-foreground">Ağırlık</dt>
                                            <dd>{product.weight_kg} kg</dd>
                                        </div>
                                    )}

                                    {hasBattery && (
                                        <div>
                                            <dt className="text-muted-foreground">Batarya</dt>
                                            <dd>{product.battery_wh} Wh</dd>
                                        </div>
                                    )}

                                    <div>
                                        <dt className="text-muted-foreground">Kategori</dt>
                                        <dd className="capitalize">{product.category}</dd>
                                    </div>
                                </dl>
                            </CardContent>
                        </Card>

                        <div
                            id="ai-summary-panel"
                            role="dialog"
                            aria-labelledby="ai-summary-title"
                            aria-modal="true"
                            hidden
                            className="mt-3"
                        />
                    </aside>
                </div>

                {/*  teknik özelikler */}
                <section className="mt-8">
                    <h2 className="mb-3 text-lg font-semibold">Teknik Özellikler</h2>
                    <Card>
                        <CardContent className="p-4 md:p-6">
                            <dl className="grid grid-cols-1 gap-x-6 gap-y-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
                                <div>
                                    <dt className="text-muted-foreground">Kategori</dt>
                                    <dd className="capitalize">{product.category}</dd>
                                </div>
                                <div>
                                    <dt className="text-muted-foreground">Marka</dt>
                                    <dd>{product.brand}</dd>
                                </div>
                                {hasCpu && (
                                    <div>
                                        <dt className="text-muted-foreground">İşlemci</dt>
                                        <dd>{cpuText}</dd>
                                    </div>
                                )}
                                {hasRam && (
                                    <div>
                                        <dt className="text-muted-foreground">RAM</dt>
                                        <dd>{product.ram_gb} GB</dd>
                                    </div>
                                )}
                                {hasStorage && (
                                    <div>
                                        <dt className="text-muted-foreground">Depolama</dt>
                                        <dd>{product.storage_gb} GB</dd>
                                    </div>
                                )}
                                {hasScreen && (
                                    <div>
                                        <dt className="text-muted-foreground">Ekran</dt>
                                        <dd>{product.screen_inch}&quot;</dd>
                                    </div>
                                )}
                                {hasWeight && (
                                    <div>
                                        <dt className="text-muted-foreground">Ağırlık</dt>
                                        <dd>{product.weight_kg} kg</dd>
                                    </div>
                                )}
                                {hasBattery && (
                                    <div>
                                        <dt className="text-muted-foreground">Batarya</dt>
                                        <dd>{product.battery_wh} Wh</dd>
                                    </div>
                                )}
                                {hasRating && (
                                    <div>
                                        <dt className="text-muted-foreground">Puan</dt>
                                        <dd>{product.rating}</dd>
                                    </div>
                                )}
                            </dl>
                        </CardContent>
                    </Card>
                </section>
            </main>
        </>
    );
}
