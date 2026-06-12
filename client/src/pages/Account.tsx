import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { User, LogOut, ShoppingBag, Store, Settings, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function Account() {
  const { user, logout, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<"profile" | "orders">("profile");

  const { data: orders } = trpc.orders.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      logout();
      toast.success("Berhasil logout");
      setLocation("/");
    },
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <User className="w-16 h-16 text-slate-300 mb-4" />
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
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => setLocation("/")}
              variant="ghost"
              className="text-slate-700 hover:bg-slate-100"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-2xl font-bold text-slate-900">Akun Saya</h1>
          </div>
          <Button
            onClick={() => logoutMutation.mutate()}
            variant="outline"
            className="border-red-300 text-red-600 hover:bg-red-50 flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid md:grid-cols-4 gap-6">
          <div className="md:col-span-1">
            <Card className="p-4 space-y-2">
              <button
                onClick={() => setActiveTab("profile")}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                  activeTab === "profile"
                    ? "bg-blue-100 text-blue-700 font-semibold"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                <User className="w-5 h-5" />
                Profil
              </button>
              <button
                onClick={() => setActiveTab("orders")}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                  activeTab === "orders"
                    ? "bg-blue-100 text-blue-700 font-semibold"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                <ShoppingBag className="w-5 h-5" />
                Pesanan
              </button>
              {user?.role === "seller" && (
                <button
                  onClick={() => setLocation("/seller-dashboard")}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-700 hover:bg-slate-100 transition"
                >
                  <Store className="w-5 h-5" />
                  Toko Saya
                </button>
              )}
              {user?.role === "admin" && (
                <button
                  onClick={() => setLocation("/admin")}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-700 hover:bg-slate-100 transition"
                >
                  <Settings className="w-5 h-5" />
                  Admin Panel
                </button>
              )}
            </Card>
          </div>

          <div className="md:col-span-3">
            {activeTab === "profile" && (
              <Card className="p-8">
                <h2 className="text-2xl font-bold text-slate-900 mb-6">Informasi Profil</h2>
                <div className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Nama
                      </label>
                      <input
                        type="text"
                        value={user?.name || ""}
                        disabled
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-700"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        value={user?.email || ""}
                        disabled
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-700"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Role
                    </label>
                    <div className="px-4 py-2 border border-slate-300 rounded-lg bg-slate-50">
                      <span className="text-slate-700 capitalize font-medium">
                        {user?.role === "user" ? "Pembeli" : user?.role === "seller" ? "Penjual" : "Admin"}
                      </span>
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Tanggal Bergabung
                      </label>
                      <input
                        type="text"
                        value={user?.createdAt ? new Date(user.createdAt).toLocaleDateString("id-ID") : ""}
                        disabled
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-700"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Terakhir Login
                      </label>
                      <input
                        type="text"
                        value={user?.lastSignedIn ? new Date(user.lastSignedIn).toLocaleDateString("id-ID") : ""}
                        disabled
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-700"
                      />
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {activeTab === "orders" && (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-slate-900 mb-6">Pesanan Saya</h2>
                {orders && orders.length > 0 ? (
                  orders.map((order) => (
                    <Card key={order.id} className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <p className="font-semibold text-slate-900">Pesanan #{order.id}</p>
                          <p className="text-sm text-slate-600">
                            {new Date(order.createdAt).toLocaleDateString("id-ID")}
                          </p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
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
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-slate-600 text-sm">Total</p>
                            <p className="text-2xl font-bold text-slate-900">
                              Rp {Number(order.totalAmount).toLocaleString("id-ID")}
                            </p>
                          </div>
                          <Button
                            onClick={() => setLocation(`/order/${order.id}`)}
                            variant="outline"
                            className="border-blue-300 text-blue-600 hover:bg-blue-50"
                          >
                            Lihat Detail
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))
                ) : (
                  <Card className="p-12 text-center">
                    <ShoppingBag className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-slate-900 mb-2">Belum Ada Pesanan</h3>
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
