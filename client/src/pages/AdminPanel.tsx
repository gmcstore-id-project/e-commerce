import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Header from "@/components/Header";
import { trpc } from "@/lib/trpc";
import {
  Users,
  Package,
  ShoppingBag,
  BarChart3,
  MessageSquare,
  AlertCircle,
} from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export default function AdminPanel() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [chatMessages, setChatMessages] = useState<
    Array<{ id: number; sender: string; message: string; timestamp: string }>
  >([]);
  const [newMessage, setNewMessage] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");

  const { data: allOrders } = trpc.admin.getAllOrders.useQuery();
  const { data: allProducts } = trpc.admin.getAllProducts.useQuery();
  const { data: allUsers, refetch: refetchUsers } = trpc.admin.getAllUsers.useQuery();
  const { data: stats } = trpc.admin.getStats.useQuery();
  const updateRole = trpc.admin.updateUserRole.useMutation({
    onSuccess: () => {
      toast.success("Role berhasil diperbarui");
      refetchUsers();
    },
    onError: (err) => toast.error(err.message),
  });

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

  if (!isAuthenticated || user?.role !== "admin") {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header />
        <div className="max-w-7xl mx-auto px-4 py-16">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              Akses Ditolak
            </h2>
            <p className="text-slate-600 mb-6">
              Anda tidak memiliki akses ke admin panel. Hanya admin yang dapat
              mengakses halaman ini.
            </p>
            <Button
              onClick={() => setLocation("/")}
              className="bg-orange-600 hover:bg-orange-700"
            >
              Kembali ke Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    const message = {
      id: chatMessages.length + 1,
      sender: "admin",
      message: newMessage,
      timestamp: new Date().toLocaleTimeString("id-ID"),
    };
    setChatMessages([...chatMessages, message]);
    setNewMessage("");
  };

  const filteredUsers = allUsers?.filter(
    (u) =>
      u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email?.toLowerCase().includes(userSearch.toLowerCase())
  );

  const filteredProducts = allProducts?.filter((p) =>
    p.name.toLowerCase().includes(productSearch.toLowerCase())
  );

  const roleBadge = (role: string) => {
    const map: Record<string, string> = {
      admin: "bg-red-100 text-red-800",
      seller: "bg-orange-100 text-orange-800",
      user: "bg-blue-100 text-blue-800",
    };
    return map[role] ?? "bg-slate-100 text-slate-800";
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      delivered: "bg-green-100 text-green-800",
      shipped: "bg-blue-100 text-blue-800",
      processing: "bg-yellow-100 text-yellow-800",
      pending: "bg-slate-100 text-slate-800",
      cancelled: "bg-red-100 text-red-800",
    };
    return map[status] ?? "bg-slate-100 text-slate-800";
  };

  const statusLabel = (status: string) => {
    const map: Record<string, string> = {
      delivered: "Terkirim",
      shipped: "Dikirim",
      processing: "Diproses",
      pending: "Pending",
      cancelled: "Dibatalkan",
    };
    return map[status] ?? status;
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Admin Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Admin Panel
          </h1>
          <p className="text-slate-600">
            Kelola platform CWS Mantap dan berikan dukungan pelanggan
          </p>
        </div>

        {/* Stats Cards — real data */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm">Total Users</p>
                <p className="text-3xl font-bold text-slate-900">
                  {stats?.totalUsers ?? allUsers?.length ?? "—"}
                </p>
              </div>
              <Users className="w-12 h-12 text-blue-600 opacity-20" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm">Total Produk</p>
                <p className="text-3xl font-bold text-slate-900">
                  {stats?.totalProducts ?? allProducts?.length ?? 0}
                </p>
              </div>
              <Package className="w-12 h-12 text-orange-600 opacity-20" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm">Total Order</p>
                <p className="text-3xl font-bold text-slate-900">
                  {stats?.totalOrders ?? allOrders?.length ?? 0}
                </p>
              </div>
              <ShoppingBag className="w-12 h-12 text-green-600 opacity-20" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm">Revenue (Terkirim)</p>
                <p className="text-2xl font-bold text-slate-900">
                  Rp {Math.round(stats?.totalRevenue ?? 0).toLocaleString("id-ID")}
                </p>
              </div>
              <BarChart3 className="w-12 h-12 text-purple-600 opacity-20" />
            </div>
          </Card>
        </div>

        {/* Admin Tabs */}
        <Tabs defaultValue="users" className="w-full">
          <TabsList className="grid w-full max-w-2xl grid-cols-4">
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="products" className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              Produk
            </TabsTrigger>
            <TabsTrigger value="orders" className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4" />
              Order
            </TabsTrigger>
            <TabsTrigger value="support" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Support
            </TabsTrigger>
          </TabsList>

          {/* Users Tab — real data */}
          <TabsContent value="users" className="space-y-6 mt-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                Manajemen User ({filteredUsers?.length ?? 0})
              </h3>
              <div className="space-y-4">
                <Input
                  placeholder="Cari user berdasarkan nama atau email..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                />

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-100">
                      <tr>
                        <th className="px-4 py-2 text-left">ID</th>
                        <th className="px-4 py-2 text-left">Nama</th>
                        <th className="px-4 py-2 text-left">Email</th>
                        <th className="px-4 py-2 text-left">Role</th>
                        <th className="px-4 py-2 text-left">Ubah Role</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers && filteredUsers.length > 0 ? (
                        filteredUsers.map((u) => (
                          <tr key={u.id} className="border-b border-slate-200">
                            <td className="px-4 py-3">{u.id}</td>
                            <td className="px-4 py-3">{u.name || "—"}</td>
                            <td className="px-4 py-3">{u.email}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${roleBadge(u.role)}`}>
                                {u.role}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <Select
                                defaultValue={u.role}
                                onValueChange={(val) =>
                                  updateRole.mutate({ userId: u.id, role: val as any })
                                }
                              >
                                <SelectTrigger className="w-28 h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="user">User</SelectItem>
                                  <SelectItem value="seller">Seller</SelectItem>
                                  <SelectItem value="admin">Admin</SelectItem>
                                </SelectContent>
                              </Select>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                            {userSearch ? "Tidak ada user ditemukan" : "Belum ada user"}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Products Tab — real data */}
          <TabsContent value="products" className="space-y-6 mt-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                Manajemen Produk ({filteredProducts?.length ?? 0})
              </h3>
              <div className="space-y-4">
                <Input
                  placeholder="Cari produk..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                />

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-100">
                      <tr>
                        <th className="px-4 py-2 text-left">ID</th>
                        <th className="px-4 py-2 text-left">Nama</th>
                        <th className="px-4 py-2 text-left">Harga</th>
                        <th className="px-4 py-2 text-left">Stok</th>
                        <th className="px-4 py-2 text-left">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProducts && filteredProducts.length > 0 ? (
                        filteredProducts.map((p) => (
                          <tr key={p.id} className="border-b border-slate-200">
                            <td className="px-4 py-3">{p.id}</td>
                            <td className="px-4 py-3 max-w-xs truncate">{p.name}</td>
                            <td className="px-4 py-3">
                              Rp {Number(p.price).toLocaleString("id-ID")}
                            </td>
                            <td className="px-4 py-3">{p.stock}</td>
                            <td className="px-4 py-3">
                              <span
                                className={`px-2 py-1 rounded text-xs font-medium ${
                                  p.isActive
                                    ? "bg-green-100 text-green-800"
                                    : "bg-red-100 text-red-800"
                                }`}
                              >
                                {p.isActive ? "Aktif" : "Nonaktif"}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                            {productSearch ? "Produk tidak ditemukan" : "Belum ada produk"}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders" className="space-y-6 mt-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                Manajemen Order ({allOrders?.length ?? 0})
              </h3>
              <div className="space-y-3">
                {allOrders && allOrders.length > 0 ? (
                  allOrders.slice(0, 20).map((order) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between p-4 bg-slate-50 rounded-lg"
                    >
                      <div>
                        <p className="font-semibold text-slate-900">
                          Order #{order.id}
                        </p>
                        <p className="text-sm text-slate-600">
                          Rp {Math.round(Number(order.totalAmount)).toLocaleString("id-ID")}
                        </p>
                        <p className="text-xs text-slate-500">{order.paymentMethod} · {order.shippingAddress?.slice(0, 30)}...</p>
                      </div>
                      <div className="flex gap-2 items-center">
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${statusBadge(order.status)}`}
                        >
                          {statusLabel(order.status)}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-orange-600 border-orange-600 hover:bg-orange-50"
                          onClick={() => setLocation(`/order/${order.id}`)}
                        >
                          Detail
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-slate-600 py-8">
                    Belum ada pesanan
                  </p>
                )}
              </div>
            </Card>
          </TabsContent>

          {/* Support Tab */}
          <TabsContent value="support" className="space-y-6 mt-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                Customer Service Chat
              </h3>

              <div className="border border-slate-200 rounded-lg p-4 mb-4 h-96 overflow-y-auto bg-slate-50">
                {chatMessages.length === 0 ? (
                  <div className="text-center text-slate-500 py-8">
                    <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Belum ada pesan. Mulai percakapan dengan customer.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {chatMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.sender === "admin" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-xs px-4 py-2 rounded-lg ${
                            msg.sender === "admin"
                              ? "bg-orange-600 text-white"
                              : "bg-white text-slate-900 border border-slate-200"
                          }`}
                        >
                          <p className="text-sm">{msg.message}</p>
                          <p
                            className={`text-xs mt-1 ${
                              msg.sender === "admin" ? "text-orange-100" : "text-slate-500"
                            }`}
                          >
                            {msg.timestamp}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Textarea
                  placeholder="Tulis pesan dukungan pelanggan..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="flex-1 min-h-12"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && e.ctrlKey) {
                      handleSendMessage();
                    }
                  }}
                />
                <Button
                  onClick={handleSendMessage}
                  className="bg-orange-600 hover:bg-orange-700 h-12"
                >
                  Kirim
                </Button>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Tekan Ctrl+Enter untuk mengirim
              </p>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
