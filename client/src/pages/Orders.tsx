import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { ShoppingBag, ArrowLeft } from "lucide-react";

export default function Orders() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  const { data: orders } = trpc.orders.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <ShoppingBag className="w-16 h-16 text-slate-300 mb-4" />
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Silakan Masuk Terlebih Dahulu</h2>
        <Button
          onClick={() => setLocation("/login")}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          Masuk
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button
            onClick={() => setLocation("/")}
            variant="ghost"
            className="text-slate-700 hover:bg-slate-100"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold text-slate-900">Pesanan Saya</h1>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {orders && orders.length > 0 ? (
          <div className="space-y-4">
            {orders.map((order) => (
              <Card key={order.id} className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="font-semibold text-slate-900">Pesanan #{order.id}</p>
                    <p className="text-sm text-slate-600">
                      {new Date(order.createdAt).toLocaleDateString("id-ID", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                  <span className={`px-4 py-2 rounded-full text-sm font-semibold ${
                    order.status === "delivered"
                      ? "bg-green-100 text-green-700"
                      : order.status === "shipped"
                      ? "bg-blue-100 text-blue-700"
                      : order.status === "processing"
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-slate-100 text-slate-700"
                  }`}>
                    {order.status === "delivered"
                      ? "Terkirim"
                      : order.status === "shipped"
                      ? "Sedang Dikirim"
                      : order.status === "processing"
                      ? "Diproses"
                      : "Pending"}
                  </span>
                </div>

                <div className="border-t border-slate-200 pt-4">
                  <div className="grid md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <p className="text-slate-600 text-sm mb-1">Alamat Pengiriman</p>
                      <p className="text-slate-900 font-medium">{order.shippingAddress}</p>
                    </div>
                    <div>
                      <p className="text-slate-600 text-sm mb-1">Metode Pembayaran</p>
                      <p className="text-slate-900 font-medium capitalize">{order.paymentMethod}</p>
                    </div>
                    <div>
                      <p className="text-slate-600 text-sm mb-1">Total</p>
                      <p className="text-2xl font-bold text-blue-600">
                        Rp {Number(order.totalAmount).toLocaleString("id-ID")}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => setLocation(`/order/${order.id}`)}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      Lihat Detail
                    </Button>
                    {order.status === "delivered" && (
                      <Button
                        onClick={() => setLocation(`/review/${order.id}`)}
                        variant="outline"
                        className="border-blue-300 text-blue-600 hover:bg-blue-50"
                      >
                        Beri Review
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-12 text-center">
            <ShoppingBag className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Belum Ada Pesanan</h2>
            <p className="text-slate-600 mb-6">Anda belum melakukan pembelian</p>
            <Button
              onClick={() => setLocation("/")}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Mulai Belanja
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}
