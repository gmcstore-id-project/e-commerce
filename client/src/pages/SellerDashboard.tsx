import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
<<<<<<< HEAD
import { useEffect, useState } from "react";
import { Store, ArrowLeft, Plus, Package } from "lucide-react";
=======
import { useCallback, useEffect, useState } from "react";
import { Store, ArrowLeft, Plus, Package, Pencil, Boxes } from "lucide-react";
import ProductFormDialog, { type SellerProductFull } from "@/components/ProductFormDialog";

const API_URL =
  import.meta.env.VITE_API_URL || "https://cws-ecommerce-api.nadiracemilan25.workers.dev";

type SellerProfile = {
  shopName?: string;
  rating?: number | string;
  totalRevenue?: number | string;
} | null;

type SellerOrder = {
  id: number;
  status: string;
  totalAmount: number | string;
  createdAt: string;
};

async function fetchSellerProducts(): Promise<SellerProductFull[]> {
  const res = await fetch(`${API_URL}/api/trpc/sellers.getProducts`, {
    credentials: "include",
  });
  if (!res.ok) return [];
  const raw = await res.json();
  const data = raw?.[0]?.result?.data?.json ?? raw ?? [];
  return Array.isArray(data) ? data : [];
}
>>>>>>> 03a0463 (update auth pages and source files)

const API_URL =
  import.meta.env.VITE_API_URL || "https://cws-ecommerce-api.nadiracemilan25.workers.dev";

type SellerProfile = {
  shopName?: string;
  rating?: number | string;
  totalRevenue?: number | string;
} | null;

type SellerOrder = {
  id: number;
  status: string;
  totalAmount: number | string;
  createdAt: string;
};

type SellerProduct = {
  id: number;
  name: string;
};

export default function SellerDashboard() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();

  const [sellerProfile, setSellerProfile] = useState<SellerProfile>(null);
  const [sellerOrders, setSellerOrders] = useState<SellerOrder[]>([]);
<<<<<<< HEAD
  const [sellerProducts, setSellerProducts] = useState<SellerProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || user?.role !== "seller") {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadData() {
      setLoading(true);
      try {
        const [profileRes, ordersRes, productsRes] = await Promise.all([
          fetch(`${API_URL}/api/seller/profile`, { credentials: "include" }),
          fetch(`${API_URL}/api/seller/orders`, { credentials: "include" }),
          fetch(`${API_URL}/api/trpc/sellers.getProducts`, { credentials: "include" }),
        ]);

        const profileData = profileRes.ok ? await profileRes.json() : null;
        const ordersData = ordersRes.ok ? await ordersRes.json() : [];

        let productsData: SellerProduct[] = [];
        if (productsRes.ok) {
          const raw = await productsRes.json();
          // tRPC-style response: [{ result: { data: { json: [...] } } }]
          productsData = raw?.[0]?.result?.data?.json ?? raw ?? [];
        }

        if (!cancelled) {
          setSellerProfile(profileData);
          setSellerOrders(Array.isArray(ordersData) ? ordersData : []);
          setSellerProducts(Array.isArray(productsData) ? productsData : []);
        }
      } catch (err) {
        console.error("[SellerDashboard] Failed to load data", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, [authLoading, isAuthenticated, user]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-600">Memuat...</p>
      </div>
    );
  }
=======
  const [sellerProducts, setSellerProducts] = useState<SellerProductFull[]>([]);
  const [loading, setLoading] = useState(true);
>>>>>>> 03a0463 (update auth pages and source files)

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<SellerProductFull | null>(null);

  const canAccess = isAuthenticated && user?.role === "seller";

  const loadProducts = useCallback(async () => {
    const products = await fetchSellerProducts();
    setSellerProducts(products);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!canAccess) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadData() {
      setLoading(true);
      try {
        const [profileRes, ordersRes, products] = await Promise.all([
          fetch(`${API_URL}/api/seller/profile`, { credentials: "include" }),
          fetch(`${API_URL}/api/seller/orders`, { credentials: "include" }),
          fetchSellerProducts(),
        ]);

        const profileData = profileRes.ok ? await profileRes.json() : null;
        const ordersData = ordersRes.ok ? await ordersRes.json() : [];

        if (!cancelled) {
          setSellerProfile(profileData);
          setSellerOrders(Array.isArray(ordersData) ? ordersData : []);
          setSellerProducts(products);
        }
      } catch (err) {
        console.error("[SellerDashboard] Failed to load data", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, [authLoading, canAccess]);

  const openAddDialog = () => {
    setEditingProduct(null);
    setDialogOpen(true);
  };

  const openEditDialog = (product: SellerProductFull) => {
    setEditingProduct(product);
    setDialogOpen(true);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-600">Memuat...</p>
      </div>
    );
  }

  if (!canAccess) {
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
            onClick={openAddDialog}
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

        {/* Products */}
        <Card className="p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Boxes className="w-5 h-5" />
              Produk Saya
            </h3>
            <Button
              onClick={openAddDialog}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Tambah
            </Button>
          </div>

          {sellerProducts && sellerProducts.length > 0 ? (
            <div className="space-y-3">
              {sellerProducts.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-4 p-4 border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <img
                      src={p.image || "https://placehold.co/64x64?text=No+Image"}
                      alt={p.name}
                      className="w-14 h-14 rounded-md object-cover bg-slate-100 flex-shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 truncate">{p.name}</p>
                      <p className="text-sm text-slate-600">
                        Rp {Number(p.price).toLocaleString("id-ID")} · Stok {p.stock}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span
                      className={`text-xs font-semibold px-2 py-1 rounded ${
                        Number(p.isActive) === 0
                          ? "bg-slate-100 text-slate-500"
                          : "bg-green-100 text-green-700"
                      }`}
                    >
                      {Number(p.isActive) === 0 ? "Nonaktif" : "Aktif"}
                    </span>
                    <Button
                      onClick={() => openEditDialog(p)}
                      variant="ghost"
                      size="sm"
                      className="flex items-center gap-1"
                    >
                      <Pencil className="w-4 h-4" />
                      Edit
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-600 text-center py-8">Belum ada produk</p>
          )}
        </Card>

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
                    <span
                      className={`text-xs font-semibold px-2 py-1 rounded ${
                        order.status === "delivered"
                          ? "bg-green-100 text-green-700"
                          : order.status === "shipped"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
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

      <ProductFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        product={editingProduct}
        onSaved={loadProducts}
      />
    </div>
  );
}
