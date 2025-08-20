Aşağıdaki metin, GitHub’daki README.md dosyana doğrudan yapıştırman için hazırlanmış, ayrıntılı ve işverenlerin “case study” şeklinde okuyabileceği bir dokümantasyondur. Kod bloğu kullanmadım; her şey düz metin ve Markdown başlıklarıyla düzenli.

# Machinity Case — Next.js + TypeScript Ürün Kataloğu (AI Destekli)

Bu proje, App Router kullanan Next.js (TypeScript) üzerinde, Zustand ile durum yönetimi ve Tailwind ile arayüz katmanına sahip bir ürün katalog uygulamasıdır. Uygulama; kategori/marka/fiyat gibi klasik filtrelerin yanında CPU, RAM, Depolama, Ekran, Batarya, Ağırlık gibi teknik filtreleri de destekler. Doğal dil (AI) ile arama yapabilir, tek ürün için yapay zekâ destekli kısa özet üretebilir ve iki ürünü akıllı biçimde karşılaştırabilir.

Uygulama veri katmanını esnek kurgular: varsayılan olarak JSON verisi ile çalışır (data/products.json) ve ileride USE\_DB=true ile Prisma/DB moduna geçirilecek şekilde konumlandırılmıştır.

---

## İçindekiler

1. Öne Çıkanlar
2. Genel Mimarî
3. Dizin Yapısı (Kaynak Dosyalar)
4. Veri Modeli ve Doğrulama
5. API Tasarımı ve Sözleşmeler
6. İstemci (UI) Mimarisi ve Durum Yönetimi
7. AI Entegrasyonu (Doğal Dil Filtreleme, Özet, Karşılaştırma)
8. URL Senkronizasyonu ve Derin Bağlantılar
9. Kullanıcı Akışları (Flow)
10. Performans, Erişilebilirlik ve UX Notları
11. Kurulum, Ortam Değişkenleri ve Çalıştırma
12. Test ve Gözlemlenebilirlik
13. Güvenlik ve Hata Yönetimi
14. Bilinen Sınırlamalar
15. Yol Haritası (Gelecek Geliştirmeler)
16. Neden Bu Tasarım? (Karar Gerekçeleri)

---

## 1) Öne Çıkanlar

• Çoklu filtreleme: kategori, marka, fiyat, RAM, depolama, CPU, ekran (inç), batarya (Wh), ağırlık (kg)
• Favoriler: localStorage ile kalıcı, listede ayrı bir filtre modu ile kullanılabilir
• Sıralama: alfabetik, fiyat (artan/azalan), puan (artan/azalan)
• AI ile doğal dil arama: serbest metni uygulanabilir filtre şemasına çevirir
• AI özet: tek ürün için kısa teknik özet + value for money derecelendirmesi
• AI karşılaştırma: iki ürünü güçlü/zayıf yönleriyle kıyaslar
• URL senkronizasyonu: filtre ve sıralama parametreleri adres çubuğunda izlenebilir
• Veri katmanı esnek: JSON ile başlar, DB moduna evrilebilir

---

## 2) Genel Mimarî

Uygulama üç ana katmandan oluşur:

• Veri Katmanı: data/products.json üzerinden çalışan basit bir depo (repo) yaklaşımı. Geliştirilebilir DB modu için server klasöründe adaptörler hazırlanmıştır.
• API Katmanı: App Router altında app/api dizininde çalışan REST benzeri uçlar; filtreleme, istatistik, tekil ürün, doğal dil filtreleme ve AI fonksiyonlarını sunar.
• İstemci Katmanı: Zustand tabanlı store’lar (filtreler, karşılaştırma sepeti, favoriler) ve bunları tüketen bileşenler (filter-panel, nl-search, product-card, topbar, vb.). UI Tailwind ile hızlı ve tutarlı biçimde stillenir.

---

## 3) Dizin Yapısı (Kaynak Dosyalar)

app/api/ai/compare/route.ts — POST /api/ai/compare (iki ürün karşılaştırma)
app/api/ai/parse-filters/route.ts — POST /api/ai/parse-filters (doğal dil → filtre)
app/api/ai/summarize/route.ts — POST /api/ai/summarize (tek ürün özeti)

app/api/products/route.ts — GET /api/products (listeleme + çoklu filtre + sıralama + sayfalama)
app/api/products/stats/route.ts — GET /api/products/stats (min/max, ayrık kümeler)
app/api/products/\[id]/route.ts — GET /api/products/\:id (tekil ürün)

app/product/\[id]/page.tsx — Ürün detay sayfası (server component)
app/page.tsx — Ürün listesi + filtre paneli + sıralama + NLSearch + karşılaştırma akışı
app/layout.tsx, app/globals.css — Genel iskelet ve stiller

components/ai-summary-dialog.tsx — Tek ürün AI özeti için dialog
components/compare-dialog.tsx — İki ürün AI karşılaştırma dialogu
components/favorites-filter.tsx — Favori mod seçici (Hepsi / Sadece Favoriler / Favori Olmayanlar)
components/filter-panel.tsx — Sol filtre paneli (desktop)
components/nl-search.tsx — Doğal dil arama giriş bileşeni
components/product-card.tsx — Ürün kartı
components/sort-dropdown.tsx — Sıralama seçici
components/topbar.tsx — Mobilde filtre çekmecesi ve temel aksiyonlar
components/ui/\* — Basit ve yeniden kullanılabilir UI yardımcıları (button, dialog, checkbox, slider, vb.)

data/products.json — Demo veri seti (ürünlerin teknik alanları burada)

lib/ai/openrouter.ts — OpenRouter istemcisi ve istek/yanıt loglama (gün bazlı JSONL)
lib/hooks/use-sync-filters-with-url.ts — Store ↔ URL arama parametreleri senkronizasyonu
lib/schema.ts — Ortak Zod şemaları ve tipler
lib/sort.ts — Sıralama yardımcıları
lib/server/config.ts, prisma.ts, products-repo.ts — Konfigürasyon ve veri erişim katmanı (JSON/DB)
lib/store/favorites.ts, product-stats.ts — Favoriler ve istatistikler için client-side store’lar
lib/utils.ts — Yardımcı fonksiyonlar (ör. cn)

state/useFilters.ts — Tüm filtre/sıralama/sayfalama state’i ve aksiyonları
state/useCompare.ts — Karşılaştırma sepeti (maksimum iki ürün)

---

## 4) Veri Modeli ve Doğrulama

Ürün modeli temel alanlar: id, name, category, brand, price, rating, cpu, ram\_gb, storage\_gb, screen\_inch, battery\_wh, weight\_kg, image (opsiyonel).
Doğrulama ve tip güvenliği Zod ile sağlanır (lib/schema.ts). API çıkışları ve iç akışlar, mümkün olduğunca Zod şemalarından türetilen tiplerle çalışır; bu sayede hem API sözleşmesi hem de istemci tarafı kullanan bileşenler tip güvenli kalır.

İstatistikler (app/api/products/stats): minPrice, maxPrice, ayrık kümeler (categories, brands, ramValues, storageValues, cpuValues) ve aralıklar (screen, battery, weight). Filtre paneli bu uçtan dönen tek otorite kaynağı ile doldurulur.

---

## 5) API Tasarımı ve Sözleşmeler

GET /api/products
Amaç: Ürün listesini filtreler ve sıralama ile döndürmek.
Desteklenen query parametreleri:
• category (birden çok olabilir)
• brand (birden çok olabilir)
• ram (örnek: 8, 16, 32; birden çok olabilir)
• storage (örnek: 256, 512, 1024; birden çok olabilir)
• cpu (örnek: Intel i5, AMD Ryzen 5; birden çok olabilir)
• minPrice, maxPrice
• screenMin, screenMax (inç)
• batteryMin, batteryMax (Wh)
• weightMin, weightMax (kg)
• sort (alphabetical | price-asc | price-desc | rating-asc | rating-desc)
• page, pageSize

Yanıt: items (Product\[]), total, page, pageSize, hasNextPage.

GET /api/products/\:id
Amaç: Tekil ürün bilgisini döndürmek.

GET /api/products/stats
Amaç: Filtre paneli için min/max ve ayrık değer kümelerini döndürmek (tek otorite kaynak).

POST /api/ai/parse-filters
Amaç: Kullanıcının doğal dilde yazdığı metni uygulanabilir filtre şemasına çevirmek.
Girdi: text alanı (ör. “15-20 bin, 16GB RAM, 512 depolama, i5 ya da Ryzen 5, puanı yükseğe göre sırala”).
Çıktı: kategoriler, markalar, price aralığı, ram\_gb, storage\_gb, screen\_inch, battery\_wh, weight\_kg, cpus\[], sort gibi normalize edilmiş bir filtre objesi. Zod ile doğrulanır.

POST /api/ai/summarize
Amaç: Tek ürün için kısa teknik özet ve value\_for\_money yorumu üretmek.
Girdi: productIds alanında tek ID.
Çıktı: item (ürün teknik bilgileri ve artı/eksi maddeleri) + summary (tldr ve value\_for\_money gibi alanlar).

POST /api/ai/compare
Amaç: İki ürünü teknik alanlara göre kıyaslamak, artı/eksi listeleri ve kısa özet üretmek.
Girdi: productIds alanında iki ID.
Çıktı: comparison (iki ürünle ilgili özet blokları) + summary (tldr ve value\_for\_money).

---

## 6) İstemci (UI) Mimarisi ve Durum Yönetimi

Durum Yönetimi (Zustand):
• useFilters.ts: Seçili kategoriler/markalar/ram/storage/cpu, aralık filtreleri (fiyat, ekran, batarya, ağırlık), sıralama ve sayfalama; ayrıca applyFromAI aksiyonu ile doğal dilden gelen şema store’a uygulanır.
• useCompare.ts: Karşılaştırma sepeti (maksimum iki ürün).
• favorites.ts: Favoriler (localStorage’ta kalıcı), hydrate ve cross-tab uyumu.
• product-stats.ts: /api/products/stats sonucunu bir kez getirip tüm filtre bileşenlerine tek kaynaktan seçenek sağlar.

Bileşenler:
• FilterPanel (desktop sol panel) ve TopBar (mobil çekmece) filtreleri yönetir.
• NLSearch doğal dil metnini parse-filters API’sine gönderir; gelen şemayı applyFromAI ile store’a uygular.
• ProductCard ürün gösterimi ve favori/karşılaştırma aksiyonlarını içerir.
• CompareDialog iki ürün seçildiğinde AI karşılaştırma çıktısını sunar.
• AiSummaryDialog tek ürün için AI özetini gösterir.
• SortDropdown ve FavoritesFilter, sırasıyla sıralama ve favori modlarını düzenler.

---

## 7) AI Entegrasyonu (Doğal Dil, Özet, Karşılaştırma)

openrouter.ts dosyası, OpenRouter API anahtarı ile model çağrılarını yapar. Tüm istek/yanıtlar günlük bazında JSONL dosyalara loglanır (ai-logs klasörü). Doğal dil filtrelemede, giriş metni normalize edilir (ör. “30 bin” → 30000, “15.6 inç” → 15.6). CPU, veri setindeki whitelist’e göre kanonik eşleşir ve cpus dizisi olarak döner. Tüm AI dönüşleri Zod ile doğrulandığından hatalı/bozuk JSON çıktıları erken aşamada yakalanır ve istemciye anlamlı bir hata iletilir.

Özet ve karşılaştırma uçlarında model; yalnızca teknik alanları referans alır (name sadece gösterim amaçlıdır). Çıktı, artı/eksi maddeleri ile kullanıcıya anlaşılır bir özet sunar.

---

## 8) URL Senkronizasyonu ve Derin Bağlantılar

use-sync-filters-with-url.ts ilk aşamada URL’yi okuyup store’u başlatır (URL → Store). Ardından store değiştikçe URL güncellenir (Store → URL). Birden çok parametre değeri desteklenir (category=X\&category=Y gibi). Aralıklar, istatistikteki varsayılan min/max’tan sapınca URL’ye yazılır. Böylece;
• geri/ileri butonlarıyla gezinti bozulmaz,
• filtreli sayfalar paylaşılabilir/yer imlerine eklenebilir.

---

## 9) Kullanıcı Akışları (Flow)

Listeleme ve Filtreleme Akışı

1. Uygulama açılırken /api/products/stats çağrılır; filtre seçenekleri yüklenir.
2. URL parametreleri varsa store’a işlenir; yoksa varsayılan durum kullanılır.
3. Kullanıcı filtre seçer; store güncellenir; URL parametreleri eş zamanlı güncellenir.
4. /api/products filtre parametreleriyle çağrılır ve liste güncellenir.
5. Sıralama ve favori modları aynı akışa dâhil olarak listeyi yeniden üretir.

Doğal Dil Araması

1. NLSearch’e metin girilir.
2. /api/ai/parse-filters çağrısı yapılır; dönen şema applyFromAI ile store’a uygulanır.
3. Store güncellenince /api/products yeniden tetiklenir ve liste yeni kriterlerle render edilir.

AI Özet (tek ürün)

1. Kullanıcı ürün kartından “özet” aksiyonu ile dialogu açar.
2. /api/ai/summarize, ürün ID’si ile çağrılır.
3. dönen kısa özet ve artı/eksi maddeleri dialogda gösterilir.

AI Karşılaştırma (iki ürün)

1. Kullanıcı iki ürünü karşılaştırma sepetine ekler.
2. CompareDialog açılır; /api/ai/compare çağrılır.
3. Teknik tabloya dayalı artı/eksi ve kısa özet kullanıcıya sunulur.

---

## 10) Performans, Erişilebilirlik ve UX Notları

• App Router ile sayfalar server component yaklaşımıyla derli toplu yapılandırılmıştır; istemciye sadece gerekli interaktif kısımlar gönderilir.
• Filtre değerleri tek bir istatistik kaynağından (stats) beslendiği için gereksiz tekrar isteklerden kaçınılır.
• Favoriler localStorage ile kalıcıdır; rehidratasyon ve sekmeler arası senkron düşünülmüştür.
• Bileşenler sade, anlaşılır; ikonlar (lucide-react) ve iletişimler (sonner) ile temel UX geri bildirimleri sunulur.
• Erişilebilirlikte temel başlık/rol/label düzenleri gözetilmiştir; daha ileri ARIA iyileştirmeleri yol haritasındadır.

---

## 11) Kurulum, Ortam Değişkenleri ve Çalıştırma

Önkoşul: Node.js 20 ve üzeri önerilir.

Kurulum adımları:

1. Bağımlılıkları yükleyin: pnpm install (ya da npm/yarn)
2. Ortam değişkenleri dosyası oluşturun: .env.local

Örnek .env.local içerikleri:
• OPENROUTER\_API\_KEY: OpenRouter API anahtarınız
• OPENROUTER\_MODEL: örnek “deepseek/deepseek-chat-v3-0324\:free”
• REVALIDATE\_SECONDS: ISR/SSG revalidate saniyesi (opsiyonel)
• USE\_DB: false (DB moduna geçmek için true; Prisma şeması eklenmelidir)

Çalıştırma:
• Geliştirme: pnpm dev ([http://localhost:3000](http://localhost:3000))
• Prod’a hazırlık: pnpm build
• Prod çalıştırma: pnpm start

---

## 12) Test ve Gözlemlenebilirlik

• Doğrulama: Zod ile API giriş/çıkışlarının tipleri güvence altına alınır.
• Gözlemlenebilirlik: openrouter.ts, AI çağrılarının istek/yanıtlarını gün bazlı JSONL dosyalarına loglar; sorunların izlenmesi kolaylaşır.
• Birim/E2E testleri için alt yapı kolay eklenebilir (Vitest/Playwright); yol haritasında belirtilmiştir.

---

## 13) Güvenlik ve Hata Yönetimi

• AI uçlarında yalnızca JSON kabul edilir; geçersiz JSON çıktılarında anlamlı hata döner.
• API uçlarında NextResponse ve uygun HTTP durum kodları kullanılır.
• Üretimde rate limit ve yetkilendirme eklenmesi önerilir (yol haritasında).
• Ortam değişkenleri üzerinden hassas bilgiler (.env.local) saklanır; repoya dahil edilmez.

---

## 14) Bilinen Sınırlamalar

• Varsayılan veri kaynağı dosya tabanlıdır (data/products.json); büyük veri setlerinde ya da gerçek zamanlı senaryolarda DB moduna geçmek gerekir.
• Prisma/DB şeması ve migrasyonları bu repo içinde hazır değildir; ileride kolay adaptasyon için kablo çekilmiştir.
• Erişilebilirlik, çok dillilik (i18n) ve test kapsaması temel seviyededir; yol haritasında derinleştirilecektir.

---

## 15) Yol Haritası (Gelecek Geliştirmeler)

• Prisma şeması ve migrasyonların eklenmesi; USE\_DB=true modunun tamamlanması
• Rate limit, auth ve üretim-grade hataya dayanıklılık
• Unit ve E2E testleri; CI/CD entegrasyonu
• i18n (Türkçe/İngilizce)
• Erişilebilirlik ve tema iyileştirmeleri
• Gerçek ürün API’sine geçiş ve veri akışının soyutlanması
• Meta/OG etiketleri ve görsel zenginleştirme (badge, ekran görüntüsü, demo gif)

---

## 16) Neden Bu Tasarım? (Karar Gerekçeleri)

• App Router + Server/Client bileşen ayrımı, boyutu düşük ve hızlı sayfalar sağlar; SEO uyumlu, erişilebilir bir iskelet sunar.
• Zod ile “şema önce” yaklaşımı, API ve istemci arasındaki sözleşmeyi netleştirir; tip güvenliği kaliteyi yükseltir.
• Zustand, React ekosisteminde hafif ve sezgisel bir durum yönetimi sunar; filtre/karşılaştırma/favori gibi bağımsız durumları sade şekilde yönetmeyi kolaylaştırır.
• Tek istatistik ucu (stats) ile filtre seçeneklerinin tek kaynaktan beslenmesi, UI’da tutarlılık ve performans kazandırır.
• AI fonksiyonlarının ayrık uçlarda sunulması (parse-filters, summarize, compare), yeteneklerin net sınırlarla test edilebilir ve geliştirilebilir olmasını sağlar.
• URL senkronizasyonu, paylaşılabilir derin bağlantılar üretir; ürün keşif deneyimini modern web uygulamalarındaki beklenen seviyeye taşır.

---

Bu dokümantasyon, projeyi inceleyenlere hem teknik derinliği hem de ürün akışını net göstermeyi amaçlar. Daha fazla görsel, rozet veya demo gif alanını istersen ekleyebilirim; ancak bu haliyle “case study” olarak mimariyi, akışları, API sözleşmelerini ve tasarım gerekçelerini bütünüyle anlatır.
