import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Header from "@/components/Header";
import { trpc } from "@/lib/trpc";
import {
  ShoppingBag,
  Store,
  TrendingUp,
  Package,
  Clock,
  CheckCircle,
} from "lucide-react";

export default function Dashboard() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  const { data: userOrders } = trpc.orders.list.useQuery();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header />
        <div className="max-w-7xl mx-auto px-4 py-16 text-center">
          <h2 className="text-2xl font-bold mb-4">Silakan login terlebih dahulu</h2>
          <Button
            onClick={() => setLocation("/login")}
            className="bg-orange-600 hover:bg-orange-700"
          >
            Masuk
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Selamat datang, {user?.name}!
          </h1>
          <p className="text-slate-600">
            Kelola akun Anda sebagai pembeli atau penjual
          </p>
        </div>

        {/* Tabs for Buyer and Seller */}
        <Tabs defaultValue="buyer" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="buyer" className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4" />
              Pembeli
            </TabsTrigger>
            <TabsTrigger value="seller" className="flex items-center gap-2">
              <Store className="w-4 h-4" />
              Penjual
            </TabsTrigger>
          </TabsList>

          {/* Buyer Tab */}
          <TabsContent value="buyer" className="space-y-6 mt-6">
            <div className="grid md:grid-cols-3 gap-4">
              {/* Stats Cards */}
              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-600 text-sm">Total Pesanan</p>
                    <p className="text-3xl font-bold text-slate-900">
                      {userOrders?.length || 0}
                    </p>
                  </div>
                  <ShoppingBag className="w-12 h-12 text-orange-600 opacity-20" />
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-600 text-sm">Sedang Diproses</p>
                    <p className="text-3xl font-bold text-slate-900">
                      {userOrders?.filter((o) => o.status === "processing").length || 0}
                    </p>
                  </div>
                  <Clock className="w-12 h-12 text-blue-600 opacity-20" />
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-600 text-sm">Terkirim</p>
                    <p className="text-3xl font-bold text-slate-900">
                      {userOrders?.filter((o) => o.status === "delivered").length || 0}
                    </p>
                  </div>
                  <CheckCircle className="w-12 h-12 text-green-600 opacity-20" />
                </div>
              </Card>
            </div>

            {/* Recent Orders */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                Pesanan Terbaru
              </h3>
              {userOrders && userOrders.length > 0 ? (
                <div className="space-y-3">
                  {userOrders.slice(0, 5).map((order) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 cursor-pointer transition"
                      onClick={() => setLocation(`/order/${order.id}`)}
                    >
                      <div>
                        <p className="font-semibold text-slate-900">
                          Order #{order.id}
                        </p>
                        <p className="text-sm text-slate-600">
                          Rp {Math.round(Number(order.totalAmount)).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${
                            order.status === "delivered"
                              ? "bg-green-100 text-green-800"
                              : order.status === "shipped"
                                ? "bg-blue-100 text-blue-800"
                                : order.status === "processing"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-slate-100 text-slate-800"
                          }`}
                        >
                          {order.status === "delivered"
                            ? "Terkirim"
                            : order.status === "shipped"
                              ? "Dikirim"
                              : order.status === "processing"
                                ? "Diproses"
                                : "Pending"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-slate-600 text-center py-8">
                  <p className="mb-4">Belum ada pesanan.</p>
                  <Button
                    onClick={() => setLocation("/")}
                    variant="link"
                    className="text-orange-600"
                  >
                    Mulai belanja sekarang
                  </Button>
                </div>
              )}
            </Card>

            <Button
              onClick={() => setLocation("/orders")}
              className="w-full bg-orange-600 hover:bg-orange-700"
            >
              Lihat Semua Pesanan
            </Button>
          </TabsContent>

          {/* Seller Tab */}
          <TabsContent value="seller" className="space-y-6 mt-6">
            <div className="grid md:grid-cols-3 gap-4">
              {/* Stats Cards */}
              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-600 text-sm">Produk Aktif</p>
                    <p className="text-3xl font-bold text-slate-900">12</p>
                  </div>
                  <Package className="w-12 h-12 text-orange-600 opacity-20" />
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-600 text-sm">Pesanan Baru</p>
                    <p className="text-3xl font-bold text-slate-900">5</p>
                  </div>
                  <Clock className="w-12 h-12 text-blue-600 opacity-20" />
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-600 text-sm">Total Penjualan</p>
                    <p className="text-3xl font-bold text-slate-900">
                      Rp 2.5M
                    </p>
                  </div>
                  <TrendingUp className="w-12 h-12 text-green-600 opacity-20" />
                </div>
              </Card>
            </div>

            {/* Seller Actions */}
            <div className="grid md:grid-cols-2 gap-4">
              <Button
                onClick={() => setLocation("/seller-dashboard")}
                className="bg-orange-600 hover:bg-orange-700 h-12"
              >
                Kelola Toko
              </Button>
              <Button
                variant="outline"
                className="h-12 border-orange-600 text-orange-600 hover:bg-orange-50"
              >
                Tambah Produk
              </Button>
            </div>

            {/* Recent Orders for Seller */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                Pesanan Terbaru
              </h3>
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-4 bg-slate-50 rounded-lg"
                  >
                    <div>
                      <p className="font-semibold text-slate-900">
                        Order #{1000 + i}
                      </p>
                      <p className="text-sm text-slate-600">
                        Rp {(500000 * i).toLocaleString("id-ID")}
                      </p>
                    </div>
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                      Menunggu Konfirmasi
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
