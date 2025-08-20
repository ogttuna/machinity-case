
---

# Machinity Case — Next.js + TypeScript Ürün Kataloğu (AI Destekli)

Bu proje, **Next.js (App Router + TypeScript)** üzerinde inşa edilmiş bir ürün katalog uygulamasıdır. Uygulama; **Zustand** ile durum yönetimi, **Zod** ile doğrulama, **Tailwind + shadcn/ui** ile arayüz katmanı sunar.

Öne çıkan farkı, klasik filtreleme ve sıralama yeteneklerinin yanında, **AI destekli doğal dil arama, tek ürün için kısa özet ve iki ürün için akıllı karşılaştırma** fonksiyonlarını da entegre etmiş olmasıdır.

Veri katmanı esnektir: varsayılan olarak **JSON dosyası** kullanılır; `USE_DB=true` ile **Prisma + SQLite** tabanlı DB moduna geçilebilir.

---

## Öne Çıkanlar

* Çoklu filtreleme: kategori, marka, fiyat, CPU, RAM, depolama, ekran (inç), batarya (Wh), ağırlık (kg)
* Favoriler: `localStorage`’ta kalıcı, sekmeler arası senkronize
* Karşılaştırma: en fazla iki ürün, AI destekli kıyaslama
* Sıralama: alfabetik, fiyat (artan/azalan), puan (artan/azalan)
* AI ile doğal dil arama: serbest metni normalize edip filtre şemasına çevirir
* AI özet: tek ürün için kısa teknik özet ve value-for-money yorumu
* AI karşılaştırma: iki ürünün güçlü/zayıf yönlerini kıyaslar
* URL senkronizasyonu: filtre ve sıralama parametreleri adres çubuğuna yazılır, paylaşılabilir hale gelir
* Veri katmanı esnek: JSON ile hızlı başlar, DB moduna geçmeye hazır

---

## Genel Mimarî

Uygulama üç ana katman üzerinde kurgulanmıştır:

* **Veri Katmanı**: JSON dosyası veya Prisma aracılığıyla DB. Tek bir “repo” soyutlaması sayesinde JSON ↔ DB arasında şeffaf geçiş yapılabilir.
* **API Katmanı**: App Router altında REST benzeri uçlar. Ürün listeleme, istatistik, tekil ürün, doğal dil filtreleme ve AI özet/karşılaştırma fonksiyonlarını içerir.
* **İstemci Katmanı**: Zustand tabanlı store’lar (filtre, karşılaştırma, favoriler, istatistikler) ile çalışan bileşenler. Arayüz Tailwind + shadcn/ui ile inşa edilmiştir.

---

## Veri Modeli ve Doğrulama

Ürün modeli şu teknik alanları kapsar:

* id, name, category, brand, price
* cpu, ram\_gb, storage\_gb
* screen\_inch, battery\_wh, weight\_kg
* rating (opsiyonel), image (opsiyonel)

Tüm veriler **Zod şemaları** ile doğrulanır. API giriş/çıkışları tip güvenli hale gelir.

İstatistik uçları (`/api/products/stats`), filtre paneli için tek otorite kaynağıdır. Dönen veri, fiyat aralığı + ayrık değer kümeleri (kategori, marka, ram, storage, cpu) + aralıklar (ekran, batarya, ağırlık) içerir.

---

## API Tasarımı

* **GET /api/products**
  Çoklu filtreleme + sıralama + sayfalama. Query parametreleri: kategori, marka, cpu, ram, storage, min/max fiyat, ekran, batarya, ağırlık aralıkları, sort, page, pageSize. Yanıt: ürün listesi + toplam sayfa bilgileri.

* **GET /api/products/stats**
  Filtre paneli için min/max değerler ve ayrık kümeler.

* **GET /api/products/\:id**
  Tekil ürün bilgisi.

* **POST /api/ai/parse-filters**
  Serbest metni normalize edip filtre şemasına çevirir. Örn: “30 bin altı, 16 GB RAM, i5” → { price: { max: 30000 }, ram\_gb: \[16], cpu: \["Intel i5"] }.

* **POST /api/ai/summarize**
  Tek ürün için kısa teknik özet + artı/eksi maddeler + value-for-money derecelendirmesi.

* **POST /api/ai/compare**
  İki ürünü karşılaştırır. Teknik tabloya göre güçlü/zayıf yönler + kısa özet döner.

---

## İstemci Mimarisi ve Durum Yönetimi

* **Filtre Store**: kategori, marka, cpu, ram, storage, fiyat/ekran/batarya/ağırlık aralıkları, sıralama. `applyFromAI` fonksiyonu ile doğal dilden gelen şema tek hamlede store’a uygulanır.
* **Favoriler Store**: localStorage’ta kalıcıdır, sekmeler arası senkronize olur.
* **Karşılaştırma Store**: en fazla iki ürün seçilebilir.
* **İstatistik Store**: `/api/products/stats` çağrısını bir kez yapar, tüm filtre paneli için tek kaynağı sağlar.

UI Bileşenleri:

* **FilterPanel & TopBar**: filtreleri yönetir (desktop & mobil).
* **NLSearch**: doğal dil arama girişi.
* **ProductCard**: ürün kartı, favori/karşılaştırma aksiyonları.
* **CompareDialog**: iki ürün AI karşılaştırma diyaloğu.
* **AiSummaryDialog**: tek ürün AI özeti diyaloğu.
* **SortDropdown & FavoritesFilter**: sıralama ve favori görünümü.

---

## AI Entegrasyonu

* **Doğal Dil Arama**: Kullanıcının yazdığı metin normalize edilir (ör. “30 bin” → 30000, “15.6” → 15.6). CPU’lar whitelist ile eşleştirilir. Çıktı Zod ile doğrulanır.
* **AI Özet**: Tek ürünün teknik detayları kısa bir “tldr” özetine dönüştürülür.
* **AI Karşılaştırma**: İki ürün artı/eksi listeleri ile kıyaslanır, value-for-money değerlendirmesi yapılır.
* Tüm AI çağrıları **OpenRouter** üzerinden yapılır. İstek/yanıtlar günlük bazlı JSONL dosyalara loglanır.

---

## URL Senkronizasyonu

Filtre ve sıralama durumu URL parametrelerine yazılır. İlk yüklemede URL → Store aktarımı yapılır; store değiştikçe Store → URL güncellemesi yapılır.

Bu sayede:

* geri/ileri navigasyon bozulmaz,
* filtrelenmiş sayfalar paylaşılabilir veya yer imlerine eklenebilir.

---

## Kullanıcı Akışları

**Listeleme ve Filtreleme**

1. Uygulama açıldığında `/api/products/stats` çağrılır.
2. URL parametreleri varsa store’a işlenir.
3. Kullanıcı filtre seçtiğinde store güncellenir, URL yazılır, `/api/products` yeniden çağrılır.

**Doğal Dil Arama**

1. Kullanıcı NLSearch’e metin yazar.
2. `/api/ai/parse-filters` çağrılır.
3. Dönen şema store’a uygulanır, ürün listesi güncellenir.

**AI Özet**

1. Kullanıcı ürün detayında özet ister.
2. `/api/ai/summarize` çağrılır.
3. Gelen JSON, kısa özet ve artı/eksi maddeler olarak gösterilir.

**AI Karşılaştırma**

1. Kullanıcı iki ürünü karşılaştırma sepetine ekler.
2. `/api/ai/compare` çağrılır.
3. Diyalogda güçlü/zayıf yönler ve kısa özet gösterilir.

---

## Kurulum ve Çalıştırma

Önkoşul: Node.js 20+

1. Bağımlılıkları yükle: `pnpm install`
2. `.env.local` dosyası oluştur:

   * `OPENROUTER_API_KEY` (zorunlu)
   * `USE_DB=false` (varsayılan)
   * `USE_DB=true` + `DATABASE_URL=file:./dev.db` (DB modu için)
   * `OPENROUTER_MODEL` (opsiyonel)
3. JSON Modu: `pnpm dev` ile çalıştır.
4. DB Modu:

   * `npx prisma generate`
   * `npx prisma db push`
   * `node prisma/seed.js`
   * `pnpm dev`

---

## Test, Güvenlik ve Hata Yönetimi

* **Doğrulama**: Zod şemaları her uçta giriş/çıkışı doğrular.
* **AI hataları**: Geçersiz JSON dönerse 502 hata verilir, anlamlı mesaj ile.
* **Aralık hataları**: min > max durumunda 400 döner.
* **Gözlemlenebilirlik**: AI çağrıları günlük JSONL dosyalarına loglanır.
* **Güvenlik**: API anahtarları .env.local’de tutulur, repoya girmez.

---

## Bilinen Sınırlamalar

* JSON veri kaynağı gerçek dünyada yetersiz olabilir; DB modunda indeksleme ve cursor pagination önerilir.
* Yetkilendirme henüz eklenmemiştir.
* Görseller için placeholder stratejisi eklenmesi önerilir.
* İ18 dil desteği eklenmesi.

---

## Yol Haritası

* GPU gibi yeni filtre alanlarının eklenmesi (CPU entegrasyonu ile aynı şablon).
* Test altyapısının genişletilmesi (E2E testlerin eklenmesi)
* Auth eklenmesi.


---

## Neden Bu Tasarım?

* **App Router + Server/Client ayrımı** SEO uyumlu, hızlı ve erişilebilir sayfalar sağlar.
* **Zod** sayesinde uçtan uca tip güvenliği ve API sözleşmesi garanti altına alınır.
* **Zustand** ile sade ama güçlü durum yönetimi, bağımsız state alanlarını kolay yönetmeyi sağlar.
* **Tek istatistik ucu** ile filtre seçeneklerinin tek kaynaktan gelmesi, UI’da tutarlılık ve performans sağlar.
* **AI fonksiyonlarının ayrı uçlarda sunulması**, kolay test edilebilirlik ve esneklik kazandırır.
* **URL senkronu** kullanıcı deneyimini modern web uygulamalarına uygun hale getirir.

---

