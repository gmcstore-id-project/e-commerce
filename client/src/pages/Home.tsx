import { useAuth } from "@/_core/hooks/useAuth";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLocation } from "wouter";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Search, Store, Zap, Shield, Truck, ShoppingCart } from "lucide-react";
import { useState, useCallback } from "react";
import { toast } from "sonner";

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const { data: products } = trpc.products.list.useQuery({ limit: 8 });
  const { data: searchResults } = trpc.products.search.useQuery(
    { query: searchQuery },
    { enabled: searchQuery.length > 0 }
  );
  const { data: categories } = trpc.categories.list.useQuery();
  const { data: categoryProducts } = trpc.products.getByCategory.useQuery(
    { categoryId: selectedCategory! },
    { enabled: selectedCategory !== null }
  );

  const addToCart = trpc.cart.add.useMutation({
    onSuccess: () => toast.success("Produk ditambahkan ke keranjang"),
    onError: (err) => toast.error(err.message),
  });

  const handleSearch = useCallback(() => {
    setSearchQuery(searchInput.trim());
    setSelectedCategory(null);
  }, [searchInput]);

  const displayedProducts = searchQuery
    ? searchResults
    : selectedCategory
    ? categoryProducts
    : products;

  const features = [
    {
      icon: <Store className="w-8 h-8" />,
      title: "Ribuan Produk",
      description: "Pilih dari berbagai kategori produk berkualitas",
    },
    {
      icon: <Truck className="w-8 h-8" />,
      title: "Pengiriman Cepat",
      description: "Gratis ongkir untuk pembelian tertentu",
    },
    {
      icon: <Shield className="w-8 h-8" />,
      title: "Pembayaran Aman",
      description: "Transaksi terenkripsi dan terjamin",
    },
    {
      icon: <Zap className="w-8 h-8" />,
      title: "Promo Menarik",
      description: "Diskon dan penawaran eksklusif setiap hari",
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation Header */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="CWS Mantap" className="w-12 h-12 object-contain" />
            <h1 className="text-2xl font-bold text-slate-900">CWS Mantap</h1>
          </div>

          <div className="flex-1 max-w-md mx-8">
            <div className="relative flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari produk..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <Button
                onClick={handleSearch}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4"
              >
                Cari
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <>
                <Button
                  onClick={() => setLocation("/cart")}
                  variant="ghost"
                  className="text-slate-700 hover:bg-slate-100"
                >
                  <ShoppingCart className="w-5 h-5" />
                </Button>
                <Button
                  onClick={() => setLocation("/account")}
                  variant="outline"
                  className="border-slate-300 text-slate-700 hover:bg-slate-50"
                >
                  {user?.name || "Akun"}
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={() => setLocation("/login")}
                  variant="ghost"
                  className="text-slate-700 hover:bg-slate-100"
                >
                  Masuk
                </Button>
                <Button
                  onClick={() => setLocation("/register")}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Daftar
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative h-96 bg-cover bg-center" style={{
        backgroundImage: 'url(/manus-storage/banner-cibiru_455b7757.webp)',
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}>
        <div className="absolute inset-0 bg-black/30"></div>
        <div className="relative max-w-7xl mx-auto px-4 h-full flex items-center">
          <div className="text-white max-w-2xl">
            <h2 className="text-5xl font-bold mb-4">
              Belanja Produk Favorit Anda
            </h2>
            <p className="text-xl text-white/90 mb-8">
              Temukan ribuan produk berkualitas dari seller terpercaya dengan harga terbaik
            </p>
            <div className="flex gap-4">
              {!isAuthenticated && (
                <>
                  <Button
                    onClick={() => setLocation("/register")}
                    className="bg-white text-orange-600 hover:bg-orange-50 font-semibold px-8 py-3"
                  >
                    Mulai Belanja
                  </Button>
                  <Button
                    onClick={() => setLocation("/login")}
                    variant="outline"
                    className="border-white text-white hover:bg-white/20 font-semibold px-8 py-3"
                  >
                    Masuk
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4">
          <h3 className="text-3xl font-bold text-slate-900 mb-12 text-center">
            Mengapa Pilih CWS Mantap?
          </h3>
          <div className="grid md:grid-cols-4 gap-8">
            {features.map((feature, idx) => (
              <Card key={idx} className="p-6 text-center hover:shadow-lg transition-shadow">
                <div className="flex justify-center mb-4 text-orange-600">
                  {feature.icon}
                </div>
                <h4 className="font-semibold text-slate-900 mb-2">
                  {feature.title}
                </h4>
                <p className="text-slate-600 text-sm">{feature.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Categories Section */}
      {categories && categories.length > 0 && (
        <section className="py-16">
          <div className="max-w-7xl mx-auto px-4">
            <h3 className="text-3xl font-bold text-slate-900 mb-8">
              Jelajahi Kategori
            </h3>
            <div className="grid md:grid-cols-4 gap-4">
              {categories.slice(0, 4).map((category) => (
                <Card
                  key={category.id}
                  className={`p-6 cursor-pointer hover:shadow-lg transition-all ${
                    selectedCategory === category.id
                      ? "border-orange-500 border-2 bg-orange-50"
                      : "hover:border-orange-300"
                  }`}
                  onClick={() => {
                    setSearchQuery("");
                    setSearchInput("");
                    setSelectedCategory(
                      selectedCategory === category.id ? null : category.id
                    );
                  }}
                >
                  <div className="w-full h-32 bg-slate-100 rounded-lg mb-4 flex items-center justify-center">
                    {category.image ? (
                      <img
                        src={category.image}
                        alt={category.name}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      <Store className="w-16 h-16 text-slate-300" />
                    )}
                  </div>
                  <h4 className="font-semibold text-slate-900">{category.name}</h4>
                  <p className="text-sm text-slate-600 mt-1">
                    {category.description}
                  </p>
                </Card>
              ))}
            </div>
            {selectedCategory && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => setSelectedCategory(null)}
              >
                ✕ Lihat semua produk
              </Button>
            )}
          </div>
        </section>
      )}

      {/* Products Section */}
      {displayedProducts && displayedProducts.length > 0 && (
        <section className="py-16 bg-slate-50">
          <div className="max-w-7xl mx-auto px-4">
            <h3 className="text-3xl font-bold text-slate-900 mb-8">
              {searchQuery
                ? `Hasil pencarian "${searchQuery}" (${displayedProducts.length})`
                : selectedCategory
                ? "Produk Kategori"
                : "Produk Terbaru"}
            </h3>
            {searchQuery && (
              <Button
                variant="outline"
                size="sm"
                className="mb-4"
                onClick={() => { setSearchQuery(""); setSearchInput(""); }}
              >
                ✕ Hapus pencarian
              </Button>
            )}
            <div className="grid md:grid-cols-4 gap-6">
              {displayedProducts.map((product) => (
                <Card
                  key={product.id}
                  className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => setLocation(`/product/${product.id}`)}
                >
                  <div className="w-full h-48 bg-slate-200 flex items-center justify-center overflow-hidden">
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ShoppingCart className="w-12 h-12 text-slate-300" />
                    )}
                  </div>
                  <div className="p-4">
                    <h4 className="font-semibold text-slate-900 line-clamp-2 mb-2">
                      {product.name}
                    </h4>
                    <p className="text-sm text-slate-600 line-clamp-2 mb-4">
                      {product.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xl font-bold text-blue-600">
                        Rp {Number(product.price).toLocaleString("id-ID")}
                      </span>
                      <div className="flex items-center gap-1">
                        <span className="text-yellow-400">⭐</span>
                        <span className="text-sm font-medium text-slate-700">
                          {Number(product.rating).toFixed(1)}
                        </span>
                      </div>
                    </div>
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isAuthenticated) {
                          setLocation("/login");
                        } else {
                          addToCart.mutate({ productId: product.id, quantity: 1 });
                        }
                      }}
                      disabled={addToCart.isPending}
                      className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {isAuthenticated ? "Tambah ke Keranjang" : "Masuk untuk Membeli"}
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Empty state for search */}
      {searchQuery && displayedProducts?.length === 0 && (
        <section className="py-16 bg-slate-50">
          <div className="max-w-7xl mx-auto px-4 text-center">
            <p className="text-slate-500 text-lg mb-4">
              Tidak ada produk ditemukan untuk "{searchQuery}"
            </p>
            <Button variant="outline" onClick={() => { setSearchQuery(""); setSearchInput(""); }}>
              Lihat semua produk
            </Button>
          </div>
        </section>
      )}

      {/* CTA Section */}
      {!isAuthenticated && (
        <section className="py-16 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
          <div className="max-w-7xl mx-auto px-4 text-center">
            <h3 className="text-4xl font-bold mb-4">
              Siap Mulai Belanja?
            </h3>
            <p className="text-xl text-blue-100 mb-8">
              Bergabunglah dengan jutaan pembeli yang puas di CWS Mantap
            </p>
            <Button
              onClick={() => setLocation("/register")}
              className="bg-white text-blue-600 hover:bg-blue-50 font-semibold px-8 py-3 text-lg"
            >
              Daftar Sekarang
            </Button>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-300 py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="font-semibold text-white mb-4">Tentang CWS Mantap</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white">Tentang Kami</a></li>
                <li><a href="#" className="hover:text-white">Karir</a></li>
                <li><a href="#" className="hover:text-white">Blog</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Layanan</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white">Jual di CWS Mantap</a></li>
                <li><a href="#" className="hover:text-white">Bantuan</a></li>
                <li><a href="#" className="hover:text-white">Hubungi Kami</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Kebijakan</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white">Syarat & Ketentuan</a></li>
                <li><a href="#" className="hover:text-white">Privasi</a></li>
                <li><a href="#" className="hover:text-white">Keamanan</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Ikuti Kami</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white">Facebook</a></li>
                <li><a href="#" className="hover:text-white">Instagram</a></li>
                <li><a href="#" className="hover:text-white">Twitter</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-700 pt-8 text-center text-sm">
            <p>&copy; 2024 CWS Mantap. Semua hak dilindungi.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
