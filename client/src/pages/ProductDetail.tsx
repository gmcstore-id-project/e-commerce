import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useState } from "react";
import { ShoppingCart, Star, Truck, Shield, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const [quantity, setQuantity] = useState(1);

  const productId = parseInt(id || "0");
  const { data: product, isLoading } = trpc.products.getById.useQuery(
    { id: productId },
    { enabled: !!productId }
  );
  const { data: reviews } = trpc.reviews.getByProduct.useQuery(
    { productId },
    { enabled: !!productId }
  );

  const addToCartMutation = trpc.cart.add.useMutation({
    onSuccess: () => {
      toast.success("Produk ditambahkan ke keranjang!");
      setQuantity(1);
    },
    onError: (error) => {
      toast.error(error.message || "Gagal menambahkan ke keranjang");
    },
  });

  const handleAddToCart = () => {
    if (!isAuthenticated) {
      setLocation("/login");
      return;
    }

    addToCartMutation.mutate({
      productId,
      quantity,
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Memuat produk...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Produk tidak ditemukan</h2>
        <Button onClick={() => setLocation("/")} className="bg-blue-600 hover:bg-blue-700">
          Kembali ke Beranda
        </Button>
      </div>
    );
  }

  const averageRating = reviews && reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : 0;

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button
            onClick={() => setLocation("/")}
            variant="ghost"
            className="text-slate-700 hover:bg-slate-100"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold text-slate-900">Detail Produk</h1>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 gap-12">
          {/* Product Image */}
          <div>
            <div className="w-full aspect-square bg-slate-100 rounded-lg flex items-center justify-center overflow-hidden mb-4">
              {product.image ? (
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <ShoppingCart className="w-32 h-32 text-slate-300" />
              )}
            </div>

            {/* Thumbnail Images */}
            {product.images && JSON.parse(product.images as any).length > 0 && (
              <div className="flex gap-2">
                {JSON.parse(product.images as any).slice(0, 4).map((img: string, idx: number) => (
                  <div
                    key={idx}
                    className="w-20 h-20 bg-slate-100 rounded-lg flex items-center justify-center cursor-pointer hover:border-2 hover:border-blue-500"
                  >
                    <img
                      src={img}
                      alt={`Thumbnail ${idx}`}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div>
            <h1 className="text-4xl font-bold text-slate-900 mb-4">{product.name}</h1>

            {/* Rating */}
            <div className="flex items-center gap-2 mb-6">
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-5 h-5 ${
                      i < Math.round(Number(averageRating))
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-slate-300"
                    }`}
                  />
                ))}
              </div>
              <span className="text-lg font-semibold text-slate-900">
                {averageRating}
              </span>
              <span className="text-slate-600">({reviews?.length || 0} ulasan)</span>
            </div>

            {/* Price */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
              <p className="text-slate-600 text-sm mb-2">Harga</p>
              <p className="text-4xl font-bold text-blue-600">
                Rp {Number(product.price).toLocaleString("id-ID")}
              </p>
            </div>

            {/* Stock Info */}
            <div className="mb-6">
              <p className="text-slate-700 mb-2">
                <span className="font-semibold">Stok Tersedia:</span>{" "}
                <span className={product.stock > 0 ? "text-green-600" : "text-red-600"}>
                  {product.stock > 0 ? `${product.stock} unit` : "Habis"}
                </span>
              </p>
            </div>

            {/* Quantity Selector */}
            {product.stock > 0 && (
              <div className="mb-6">
                <p className="text-slate-700 font-semibold mb-3">Jumlah</p>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-10 h-10 border border-slate-300 rounded-lg flex items-center justify-center hover:bg-slate-100"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-16 h-10 border border-slate-300 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                    className="w-10 h-10 border border-slate-300 rounded-lg flex items-center justify-center hover:bg-slate-100"
                  >
                    +
                  </button>
                </div>
              </div>
            )}

            {/* Add to Cart Button */}
            <Button
              onClick={handleAddToCart}
              disabled={product.stock === 0 || addToCartMutation.isPending}
              className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg mb-4 flex items-center justify-center gap-2"
            >
              <ShoppingCart className="w-5 h-5" />
              {product.stock === 0 ? "Produk Habis" : "Tambah ke Keranjang"}
            </Button>

            {/* Features */}
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <Truck className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="font-semibold text-slate-900">Pengiriman Cepat</p>
                  <p className="text-sm text-slate-600">Gratis ongkir untuk pembelian tertentu</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <Shield className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-semibold text-slate-900">Pembayaran Aman</p>
                  <p className="text-sm text-slate-600">Transaksi terenkripsi dan terjamin</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Description Section */}
        <div className="mt-16 border-t border-slate-200 pt-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Deskripsi Produk</h2>
          <Card className="p-6 bg-slate-50">
            <p className="text-slate-700 whitespace-pre-wrap">{product.description}</p>
          </Card>
        </div>

        {/* Reviews Section */}
        <div className="mt-16 border-t border-slate-200 pt-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Ulasan Pembeli</h2>

          {reviews && reviews.length > 0 ? (
            <div className="space-y-4">
              {reviews.map((review) => (
                <Card key={review.id} className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold text-slate-900">Pembeli</p>
                      <p className="text-sm text-slate-600">
                        {new Date(review.createdAt).toLocaleDateString("id-ID")}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${
                            i < review.rating
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-slate-300"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  {review.comment && (
                    <p className="text-slate-700">{review.comment}</p>
                  )}
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-6 text-center bg-slate-50">
              <p className="text-slate-600">Belum ada ulasan untuk produk ini</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
