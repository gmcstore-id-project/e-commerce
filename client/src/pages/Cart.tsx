import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Trash2, ArrowLeft, ShoppingCart as CartIcon } from "lucide-react";
import { toast } from "sonner";

export default function Cart() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [shippingAddress, setShippingAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("credit_card");
  const [showCheckout, setShowCheckout] = useState(false);

  const { data: cartItems, refetch: refetchCart } = trpc.cart.list.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const removeFromCartMutation = trpc.cart.remove.useMutation({
    onSuccess: () => {
      refetchCart();
      toast.success("Produk dihapus dari keranjang");
    },
  });

  const updateQuantityMutation = trpc.cart.update.useMutation({
    onSuccess: () => {
      refetchCart();
    },
  });

  const createOrderMutation = trpc.orders.create.useMutation({
    onSuccess: (data) => {
      toast.success("Pesanan berhasil dibuat!");
      setLocation("/orders");
    },
    onError: (error) => {
      toast.error(error.message || "Gagal membuat pesanan");
    },
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <CartIcon className="w-16 h-16 text-slate-300 mb-4" />
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Silakan Masuk Terlebih Dahulu</h2>
        <p className="text-slate-600 mb-8">Anda perlu masuk untuk melihat keranjang belanja</p>
                    <Button
                      onClick={() => setLocation("/login")}
                      className="bg-orange-600 hover:bg-orange-700 text-white"
                    >
                      Masuk
                    </Button>
      </div>
    );
  }

  const productAmount = cartItems
    ? cartItems.reduce((sum, item) => {
        return sum + (item.quantity * 50000);
      }, 0)
    : 0;
  
  const adminFeePercentage = 1;
  const adminFee = Math.round(productAmount * (adminFeePercentage / 100));
  const shippingCost = productAmount > 0 ? 25000 : 0;
  const totalPrice = productAmount + adminFee + shippingCost;

  return (
    <div className="min-h-screen bg-slate-50">
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
          <h1 className="text-2xl font-bold text-slate-900">Keranjang Belanja</h1>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {!cartItems || cartItems.length === 0 ? (
          <Card className="p-12 text-center">
            <CartIcon className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Keranjang Kosong</h2>
            <p className="text-slate-600 mb-6">Belum ada produk di keranjang Anda</p>
            <Button
              onClick={() => setLocation("/")}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              Lanjut Belanja
            </Button>
          </Card>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2">
              <Card className="p-6">
                <h2 className="text-xl font-bold text-slate-900 mb-6">Produk dalam Keranjang</h2>
                <div className="space-y-4">
                  {cartItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex gap-4 p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition"
                    >
                      <div className="w-20 h-20 bg-slate-100 rounded-lg flex-shrink-0 flex items-center justify-center">
                        <CartIcon className="w-8 h-8 text-slate-300" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-slate-900">Produk #{item.productId}</p>
                        <p className="text-sm text-slate-600">Jumlah: {item.quantity}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              updateQuantityMutation.mutate({
                                cartId: item.id,
                                quantity: Math.max(1, item.quantity - 1),
                              })
                            }
                            className="w-8 h-8 border border-slate-300 rounded flex items-center justify-center hover:bg-slate-100"
                          >
                            −
                          </button>
                          <span className="w-8 text-center">{item.quantity}</span>
                          <button
                            onClick={() =>
                              updateQuantityMutation.mutate({
                                cartId: item.id,
                                quantity: item.quantity + 1,
                              })
                            }
                            className="w-8 h-8 border border-slate-300 rounded flex items-center justify-center hover:bg-slate-100"
                          >
                            +
                          </button>
                        </div>
                        <button
                          onClick={() => removeFromCartMutation.mutate({ cartId: item.id })}
                          className="text-red-600 hover:text-red-700 flex items-center gap-1"
                        >
                          <Trash2 className="w-4 h-4" />
                          Hapus
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* Checkout Summary */}
            <div>
              <Card className="p-6 sticky top-24">
                <h2 className="text-xl font-bold text-slate-900 mb-6">Ringkasan Pesanan</h2>

                {!showCheckout ? (
                  <>
                    <div className="space-y-3 mb-6 pb-6 border-b border-slate-200">
                      <div className="flex justify-between">
                        <span className="text-slate-600">Subtotal Produk</span>
                        <span className="font-semibold text-slate-900">Rp {productAmount.toLocaleString('id-ID')}</span>
                      </div>
                      <div className="flex justify-between text-orange-600">
                        <span className="text-slate-600">Biaya Admin (1%)</span>
                        <span className="font-semibold">Rp {adminFee.toLocaleString('id-ID')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Pengiriman</span>
                        <span className="font-semibold text-slate-900">Rp {shippingCost.toLocaleString('id-ID')}</span>
                      </div>
                      <div className="flex justify-between text-lg pt-3">
                        <span className="font-bold text-slate-900">Total Pembayaran</span>
                        <span className="font-bold text-orange-600">Rp {totalPrice.toLocaleString('id-ID')}</span>
                      </div>
                    </div>
                    <Button
                      onClick={() => setShowCheckout(true)}
                      disabled={!cartItems || cartItems.length === 0}
                      className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold disabled:bg-slate-300"
                    >
                      Lanjut ke Checkout
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="space-y-4 mb-6">
                      <div>
                        <label className="block text-sm font-semibold text-slate-900 mb-2">
                          Alamat Pengiriman
                        </label>
                        <textarea
                          value={shippingAddress}
                          onChange={(e) => setShippingAddress(e.target.value)}
                          placeholder="Masukkan alamat lengkap Anda"
                          className="w-full h-24 p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-900 mb-2">
                          Metode Pembayaran
                        </label>
                        <select
                          value={paymentMethod}
                          onChange={(e) => setPaymentMethod(e.target.value)}
                          className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="credit_card">Kartu Kredit</option>
                          <option value="debit_card">Kartu Debit</option>
                          <option value="bank_transfer">Transfer Bank</option>
                          <option value="e_wallet">E-Wallet</option>
                        </select>
                      </div>
                    </div>
                    <Button
                      onClick={() =>
                        createOrderMutation.mutate({
                          shippingAddress,
                          paymentMethod,
                        })
                      }
                      disabled={!shippingAddress || createOrderMutation.isPending}
                      className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold mb-2 disabled:bg-slate-300"
                    >
                      {createOrderMutation.isPending ? "Memproses..." : "Buat Pesanan"}
                    </Button>
                    <Button
                      onClick={() => setShowCheckout(false)}
                      variant="outline"
                      className="w-full border-slate-300 text-slate-700 hover:bg-slate-50"
                    >
                      Kembali
                    </Button>
                  </>
                )}
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
