import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import Header from "@/components/Header";
import { useAuth } from "@/_core/hooks/useAuth";
import { ArrowLeft, Package, Truck, MapPin, CreditCard } from "lucide-react";

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();

  const orderId = parseInt(id || "0");
  const { data: order, isLoading } = trpc.orders.getById.useQuery(
    { id: orderId },
    { enabled: !!orderId }
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Memuat detail pesanan...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Pesanan tidak ditemukan</h2>
        <Button onClick={() => setLocation("/orders")} className="bg-orange-600 hover:bg-orange-700">
          Kembali ke Pesanan
        </Button>
      </div>
    );
  }

  const statusTimeline = [
    { status: "pending", label: "Pesanan Dibuat", icon: Package },
    { status: "processing", label: "Diproses", icon: Package },
    { status: "shipped", label: "Dikirim", icon: Truck },
    { status: "delivered", label: "Terkirim", icon: Package },
  ];

  const currentStatusIndex = statusTimeline.findIndex((s) => s.status === order.status);

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <header className="border-b border-slate-200 bg-white sticky top-0 z-50" style={{ display: "none" }}>
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button
            onClick={() => setLocation("/orders")}
            variant="ghost"
            className="text-slate-700 hover:bg-slate-100"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold text-slate-900">Detail Pesanan #{order.id}</h1>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Status Timeline */}
            <Card className="p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-6">Status Pesanan</h2>
              <div className="space-y-4">
                {statusTimeline.map((item, idx) => {
                  const Icon = item.icon;
                  const isCompleted = idx <= currentStatusIndex;
                  const isCurrent = idx === currentStatusIndex;

                  return (
                    <div key={item.status} className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        isCompleted
                          ? "bg-green-100 text-green-600"
                          : "bg-slate-100 text-slate-400"
                      }`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <p className={`font-semibold ${
                          isCompleted ? "text-slate-900" : "text-slate-500"
                        }`}>
                          {item.label}
                        </p>
                        {isCurrent && (
                          <p className="text-sm text-blue-600">Sedang berlangsung</p>
                        )}
                      </div>
                      {isCompleted && (
                        <span className="text-green-600 font-semibold">✓</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Order Items */}
            <Card className="p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-4">Item Pesanan</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                  <div>
                    <p className="font-semibold text-slate-900">Produk</p>
                    <p className="text-sm text-slate-600">Jumlah: 1</p>
                  </div>
                  <p className="font-bold text-slate-900">
                    Rp {Number(order.totalAmount).toLocaleString("id-ID")}
                  </p>
                </div>
              </div>
            </Card>

            {/* Shipping Address */}
            <Card className="p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Alamat Pengiriman
              </h2>
              <p className="text-slate-700 whitespace-pre-wrap">{order.shippingAddress}</p>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Order Summary */}
            <Card className="p-6 sticky top-24">
              <h2 className="text-xl font-bold text-slate-900 mb-4">Ringkasan Pesanan</h2>
              <div className="space-y-3 pb-4 border-b border-slate-200">
                <div className="flex justify-between">
                  <span className="text-slate-600">Harga Produk</span>
                  <span className="font-semibold text-slate-900">
                    Rp {(Number(order.totalAmount) * 0.99).toLocaleString("id-ID", {maximumFractionDigits: 0})}
                  </span>
                </div>
                <div className="flex justify-between text-orange-600">
                  <span className="text-slate-600">Biaya Admin (1%)</span>
                  <span className="font-semibold">
                    Rp {(Number(order.totalAmount) * 0.01).toLocaleString("id-ID", {maximumFractionDigits: 0})}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Pengiriman</span>
                  <span className="font-semibold text-slate-900">Rp 25.000</span>
                </div>
              </div>
              <div className="flex justify-between text-lg mt-4">
                <span className="font-bold text-slate-900">Total Pembayaran</span>
                <span className="font-bold text-orange-600">
                  Rp {Number(order.totalAmount).toLocaleString("id-ID")}
                </span>
              </div>
            </Card>

            {/* Payment Info */}
            <Card className="p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Pembayaran
              </h2>
              <div className="space-y-2">
                <div>
                  <p className="text-slate-600 text-sm mb-1">Metode</p>
                  <p className="font-semibold text-slate-900 capitalize">
                    {order.paymentMethod.replace("_", " ")}
                  </p>
                </div>
                <div>
                  <p className="text-slate-600 text-sm mb-1">Status</p>
                  <p className="font-semibold text-green-600">Dibayar</p>
                </div>
              </div>
            </Card>

            {/* Actions */}
            <div className="space-y-2">
              <Button
                onClick={() => setLocation("/orders")}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white"
              >
                Kembali ke Pesanan
              </Button>
              {order.status === "delivered" && (
                <Button
                  onClick={() => setLocation(`/review/${order.id}`)}
                  variant="outline"
                  className="w-full border-orange-300 text-orange-600 hover:bg-orange-50"
                >
                  Beri Review
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
