import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLocation } from "wouter";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Search, Store, Zap, Shield, Truck, ShoppingCart } from "lucide-react";
import { useState } from "react";
import Header from "@/components/Header";

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);

  const { data: products } = trpc.products.list.useQuery({ limit: 8 });
  const { data: categories } = trpc.categories.list.useQuery();

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
    <div className="min-h-screen flex flex-col bg-white">
      <Header />

      {/* Hero Section with Banner Image */}
      <section className="relative w-full h-64 sm:h-80 md:h-96 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              'url("/manus-storage/processed-a7c95d7c-3032-468e-8741-d8c105a57bf2_ZSOIBKwa_1e2e3f4g5h6i.webp")',
          }}
        >
          <div className="absolute inset-0 bg-black/40"></div>
        </div>

        <div className="relative h-full flex flex-col items-start justify-center px-6 md:px-16 max-w-4xl">
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold text-white mb-3">
            Belanja Produk Favorit Anda
          </h1>
          <p className="text-sm sm:text-lg text-white/90 mb-6 max-w-2xl">
            Temukan ribuan produk berkualitas dari seller terpercaya dengan harga
            terbaik
          </p>

          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => setLocation("/products")}
              className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 py-2"
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              Mulai Belanja
            </Button>
            <Button
              onClick={() => setLocation("/seller-registration")}
              variant="outline"
              className="border-white text-white hover:bg-white/10 font-semibold px-6 py-2"
            >
              Daftar Sebagai Seller
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 md:px-8 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-slate-900 mb-12">
            Mengapa Pilih CWS Mantap?
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, idx) => (
              <Card
                key={idx}
                className="p-6 text-center hover:shadow-lg transition-shadow"
              >
                <div className="flex justify-center mb-4 text-orange-500">
                  {feature.icon}
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-slate-600">{feature.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Categories Section */}
      {categories && categories.length > 0 && (
        <section className="py-16 px-4 md:px-8">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-slate-900 mb-8">
              Jelajahi Kategori
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`p-4 rounded-lg border-2 transition-all text-center ${
                    selectedCategory === category.id
                      ? "border-orange-500 bg-orange-50"
                      : "border-slate-200 hover:border-orange-300"
                  }`}
                >
                  <p className="font-semibold text-sm text-slate-900">
                    {category.name}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Products Section */}
      {products && products.length > 0 && (
        <section className="py-16 px-4 md:px-8 bg-slate-50">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-slate-900 mb-8">
              Produk Terbaru
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {products.map((product) => (
                <Card
                  key={product.id}
                  className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => setLocation(`/products/${product.id}`)}
                >
                  <div className="bg-slate-200 h-48 flex items-center justify-center">
                    <p className="text-slate-500">Foto Produk</p>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-slate-900 line-clamp-2 mb-2">
                      {product.name}
                    </h3>
                    <p className="text-sm text-slate-600 line-clamp-2 mb-4">
                      {product.description}
                    </p>
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-orange-600">
                        Rp {Number(product.price).toLocaleString()}
                      </span>
                      <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">
                        {product.stock} stok
                      </span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            <div className="text-center mt-12">
              <Button
                onClick={() => setLocation("/products")}
                className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-8 py-3"
              >
                Lihat Semua Produk
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-orange-500 to-orange-600 py-16 px-4 md:px-8 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">
            Siap Menjadi Seller di CWS Mantap?
          </h2>
          <p className="text-lg mb-8 opacity-90">
            Bergabunglah dengan ribuan seller sukses dan mulai berjualan hari ini
          </p>
          <Button
            onClick={() => setLocation("/seller-registration")}
            className="bg-white text-orange-600 hover:bg-slate-100 font-semibold px-8 py-3"
          >
            Daftar Sekarang
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-12 px-4 md:px-8">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <h3 className="font-bold mb-4">Tentang CWS Mantap</h3>
            <p className="text-sm text-slate-400">
              Platform marketplace terpercaya untuk UMKM dan konsumen Indonesia
            </p>
          </div>
          <div>
            <h3 className="font-bold mb-4">Kategori</h3>
            <ul className="text-sm text-slate-400 space-y-2">
              <li>Elektronik</li>
              <li>Fashion</li>
              <li>Makanan</li>
              <li>Lainnya</li>
            </ul>
          </div>
          <div>
            <h3 className="font-bold mb-4">Bantuan</h3>
            <ul className="text-sm text-slate-400 space-y-2">
              <li>Hubungi Kami</li>
              <li>FAQ</li>
              <li>Kebijakan Privasi</li>
              <li>Syarat & Ketentuan</li>
            </ul>
          </div>
          <div>
            <h3 className="font-bold mb-4">Kontak</h3>
            <p className="text-sm text-slate-400">
              Email: support@cwsmantap.com
              <br />
              Phone: +62 812 3456 7890
            </p>
          </div>
        </div>

        <div className="border-t border-slate-700 pt-8 text-center text-sm text-slate-400">
          <p>&copy; 2026 CWS Mantap. Semua hak dilindungi.</p>
        </div>
      </footer>
    </div>
  );
}
