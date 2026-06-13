import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

const API_URL =
  import.meta.env.VITE_API_URL || "https://cws-ecommerce-api.nadiracemilan25.workers.dev";

export type SellerProductFull = {
  id: number;
  name: string;
  description?: string | null;
  price: number | string;
  categoryId?: number | null;
  stock: number | string;
  image?: string | null;
  images?: string | null;
  isActive?: number | boolean;
};

type Category = {
  id: number;
  name: string;
};

type ProductFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: SellerProductFull | null;
  onSaved: () => void;
};

async function callTrpc(procedure: string, input: unknown) {
  const res = await fetch(`${API_URL}/api/trpc/${procedure}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  const raw = await res.json();
  const entry = Array.isArray(raw) ? raw[0] : raw;

  if (entry?.error) {
    throw new Error(entry.error.message || "Terjadi kesalahan");
  }

  return entry?.result?.data?.json;
}

export default function ProductFormDialog({
  open,
  onOpenChange,
  product,
  onSaved,
}: ProductFormDialogProps) {
  const isEdit = Boolean(product?.id);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [image, setImage] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [isActive, setIsActive] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load categories when dialog opens
  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    fetch(`${API_URL}/api/categories`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (!cancelled) setCategories(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setCategories([]);
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  // Reset / fill form when dialog opens or target product changes
  useEffect(() => {
    if (!open) return;

    if (product) {
      setName(product.name ?? "");
      setDescription(product.description ?? "");
      setPrice(String(product.price ?? ""));
      setStock(String(product.stock ?? ""));
      setImage(product.image ?? "");
      setCategoryId(product.categoryId != null ? String(product.categoryId) : "");
      setIsActive(
        product.isActive === undefined || product.isActive === null
          ? true
          : Boolean(product.isActive)
      );
    } else {
      setName("");
      setDescription("");
      setPrice("");
      setStock("");
      setImage("");
      setCategoryId("");
      setIsActive(true);
    }
    setError(null);
  }, [open, product]);

  const handleSubmit = async () => {
    setError(null);

    if (!name.trim()) {
      setError("Nama produk wajib diisi");
      return;
    }
    if (!price || Number(price) <= 0) {
      setError("Harga harus lebih dari 0");
      return;
    }
    if (stock === "" || Number(stock) < 0) {
      setError("Stok wajib diisi");
      return;
    }
    if (!isEdit && !categoryId) {
      setError("Kategori wajib dipilih");
      return;
    }

    setSaving(true);
    try {
      if (isEdit && product) {
        await callTrpc("products.update", {
          id: product.id,
          name,
          description,
          price: Number(price),
          stock: Number(stock),
          image,
          isActive,
        });
      } else {
        await callTrpc("products.create", {
          name,
          description,
          price: Number(price),
          categoryId: Number(categoryId),
          stock: Number(stock),
          image,
          images: [],
        });
      }

      onSaved();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan produk");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Produk" : "Tambah Produk"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Perbarui informasi produk Anda."
              : "Isi detail produk baru untuk toko Anda."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="product-name">Nama Produk</Label>
            <Input
              id="product-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Kaos Polos Premium"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="product-description">Deskripsi</Label>
            <Textarea
              id="product-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Deskripsikan produk Anda"
              rows={4}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="product-price">Harga (Rp)</Label>
              <Input
                id="product-price"
                type="number"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="product-stock">Stok</Label>
              <Input
                id="product-stock"
                type="number"
                min="0"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>

          {!isEdit && (
            <div className="space-y-2">
              <Label htmlFor="product-category">Kategori</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger id="product-category">
                  <SelectValue placeholder="Pilih kategori" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={String(cat.id)}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="product-image">URL Gambar</Label>
            <Input
              id="product-image"
              value={image}
              onChange={(e) => setImage(e.target.value)}
              placeholder="https://..."
            />
          </div>

          {isEdit && (
            <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
              <div>
                <Label htmlFor="product-active">Produk Aktif</Label>
                <p className="text-sm text-slate-500">
                  Produk nonaktif tidak akan tampil di marketplace
                </p>
              </div>
              <Switch
                id="product-active"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Batal
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={saving}
            className="bg-orange-600 hover:bg-orange-700 text-white"
          >
            {saving ? "Menyimpan..." : isEdit ? "Simpan Perubahan" : "Tambah Produk"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
