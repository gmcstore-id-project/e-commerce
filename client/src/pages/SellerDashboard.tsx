import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import Header from "@/components/Header";
import { Store, ArrowLeft, Plus, Package } from "lucide-react";

export default function SellerDashboard() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  const { data: sellerProfile } = trpc.sellers.getProfile.useQuery();
  const { data: sellerOrders } = trpc.orders.getSellerOrders.useQuery();
  const { data: sellerProducts } = trpc.sellers.getProducts.useQuery();

  if (!isAuthenticated || user?.role !== "seller") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <Store className="w-16 h-16 text-slate-300 mb-4" />
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Akses Ditolak</h2>
        <p className="text-slate-600 mb-8">Hanya seller yang dapat mengakses halaman ini</p>
        <Button
          onClick={() => setLocation("/")}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          Kembali ke Beranda
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
        <Button
          onClick={() => setLocation("/dashboard")}
          variant="ghost"
          className="text-slate-700 hover:bg-slate-100"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
            <h1 className="text-2xl font-bold text-slate-900">Dashboard Toko</h1>
          </div>
          <Button
            onClick={() => {}}
            className="bg-orange-600 hover:bg-orange-700 text-white flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Tambah Produk
          </Button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Store Info */}
        <Card className="p-6 mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Informasi Toko</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <p className="text-slate-600 text-sm mb-1">Nama Toko</p>
              <p className="text-xl font-bold text-slate-900">
                {sellerProfile?.shopName || "Toko Anda"}
              </p>
            </div>
            <div>
              <p className="text-slate-600 text-sm mb-1">Rating</p>
              <p className="text-xl font-bold text-yellow-500">
                {sellerProfile?.rating || "0"} ⭐
              </p>
            </div>
            <div>
              <p className="text-slate-600 text-sm mb-1">Total Penjualan</p>
              <p className="text-xl font-bold text-slate-900">
                Rp {Number(sellerProfile?.totalRevenue || 0).toLocaleString("id-ID")}
              </p>
            </div>
          </div>
        </Card>

        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6">
            <p className="text-slate-600 text-sm mb-2">Produk Aktif</p>
            <p className="text-4xl font-bold text-blue-600">{sellerProducts?.length || 0}</p>
          </Card>
          <Card className="p-6">
            <p className="text-slate-600 text-sm mb-2">Pesanan Pending</p>
            <p className="text-4xl font-bold text-yellow-600">
              {sellerOrders?.filter((o) => o.status === "pending").length || 0}
            </p>
          </Card>
          <Card className="p-6">
            <p className="text-slate-600 text-sm mb-2">Pesanan Terkirim</p>
            <p className="text-4xl font-bold text-green-600">
              {sellerOrders?.filter((o) => o.status === "delivered").length || 0}
            </p>
          </Card>
        </div>

        {/* Recent Orders */}
        <Card className="p-6">
          <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Package className="w-5 h-5" />
            Pesanan Terbaru
          </h3>
          {sellerOrders && sellerOrders.length > 0 ? (
            <div className="space-y-3">
              {sellerOrders.slice(0, 5).map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  <div>
                    <p className="font-semibold text-slate-900">Pesanan #{order.id}</p>
                    <p className="text-sm text-slate-600">
                      {new Date(order.createdAt).toLocaleDateString("id-ID")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-900">
                      Rp {Number(order.totalAmount).toLocaleString("id-ID")}
                    </p>
                    <span className={`text-xs font-semibold px-2 py-1 rounded ${
                      order.status === "delivered"
                        ? "bg-green-100 text-green-700"
                        : order.status === "shipped"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}>
                      {order.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-600 text-center py-8">Belum ada pesanan</p>
          )}
        </Card>
      </div>
    </div>
  );
}
