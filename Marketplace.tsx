import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Search, Filter } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

export default function Marketplace() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | undefined>();

  const { data: allProducts = [], isLoading: isLoadingAll } = trpc.products.list.useQuery({
    limit: 20,
    offset: 0,
  });

  const { data: searchResults = [], isLoading: isLoadingSearch } = trpc.products.search.useQuery(
    { query: search },
    { enabled: search.trim().length > 0 }
  );

  const { data: categoryResults = [], isLoading: isLoadingCategory } = trpc.products.getByCategory.useQuery(
    { categoryId: selectedCategory! },
    { enabled: selectedCategory !== undefined }
  );

  const { data: categories = [] } = trpc.categories.list.useQuery();

  const isLoading = isLoadingAll || isLoadingSearch || isLoadingCategory;

  const displayProducts = search.trim()
    ? searchResults
    : selectedCategory !== undefined
    ? categoryResults
    : allProducts;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-slate-900 mb-6">Marketplace</h1>

          {/* Search Bar */}
          <div className="flex gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
              <Input
                placeholder="Cari produk..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline">
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </Button>
          </div>

          {/* Categories */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            <Button
              variant={selectedCategory === undefined ? "default" : "outline"}
              onClick={() => setSelectedCategory(undefined)}
              size="sm"
            >
              Semua
            </Button>
            {categories.map((cat) => (
              <Button
                key={cat.id}
                variant={selectedCategory === cat.id ? "default" : "outline"}
                onClick={() => setSelectedCategory(cat.id)}
                size="sm"
              >
                {cat.name}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <Card key={i} className="h-64 bg-slate-200 animate-pulse" />
            ))}
          </div>
        ) : displayProducts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-600 mb-4">Tidak ada produk ditemukan</p>
            {!isAuthenticated && (
              <Button asChild>
                <a href={getLoginUrl()}>Masuk untuk melihat produk</a>
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {displayProducts.map((product: any) => (
              <Card
                key={product.id}
                className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => navigate(`/product/${product.id}`)}
              >
                <div className="aspect-square bg-slate-200 overflow-hidden">
                  {product.image && (
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover hover:scale-105 transition-transform"
                    />
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-slate-900 line-clamp-2 mb-2">
                    {product.name}
                  </h3>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-lg font-bold text-blue-600">
                      Rp {parseFloat(product.price.toString()).toLocaleString("id-ID")}
                    </span>
                    {product.rating > 0 && (
                      <span className="text-sm text-yellow-500">
                        ★ {parseFloat(product.rating.toString()).toFixed(1)}
                      </span>
                    )}
                  </div>
                  <Button className="w-full" size="sm">
                    Lihat Detail
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
