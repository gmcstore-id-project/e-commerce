import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { ShoppingCart, Menu, X, Search } from "lucide-react";
import { useState } from "react";

export default function Header() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    setLocation("/");
  };

  return (
    <header className="border-b border-slate-200 bg-white sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
        {/* Logo & Brand */}
        <div
          className="flex items-center gap-2 cursor-pointer flex-shrink-0"
          onClick={() => setLocation("/")}
        >
          <img src="/logo.png" alt="CWS Mantap" className="w-10 h-10 object-contain" />
          <h1 className="text-xl font-bold text-slate-900 hidden sm:block">CWS Mantap</h1>
        </div>

        {/* Search Bar - center, grows */}
        <div className="flex-1 max-w-xl">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari produk..."
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-full text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent"
            />
          </div>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-2 flex-shrink-0">
          {isAuthenticated ? (
            <>
              <Button
                onClick={() => setLocation("/cart")}
                variant="ghost"
                className="text-slate-700 hover:bg-slate-100"
              >
                <ShoppingCart className="w-5 h-5" />
              </Button>
              <Button
                onClick={() => setLocation("/orders")}
                variant="ghost"
                className="text-slate-700 hover:bg-slate-100"
              >
                Pesanan
              </Button>
              <Button
                onClick={() => setLocation("/account")}
                variant="outline"
                className="border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                {user?.name || "Akun"}
              </Button>
              {user?.role === "admin" && (
                <Button
                  onClick={() => setLocation("/admin")}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  Admin
                </Button>
              )}
              <Button
                onClick={handleLogout}
                variant="ghost"
                className="text-slate-700 hover:bg-slate-100"
              >
                Keluar
              </Button>
            </>
          ) : (
            <>
              <Button
                onClick={() => setLocation("/login")}
                variant="ghost"
                className="text-slate-700 hover:bg-slate-100"
              >
                Masuk
              </Button>
              <Button
                onClick={() => setLocation("/register")}
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                Daftar
              </Button>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden flex-shrink-0"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? (
            <X className="w-6 h-6" />
          ) : (
            <Menu className="w-6 h-6" />
          )}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 p-4 space-y-2">
          {isAuthenticated ? (
            <>
              <Button
                onClick={() => {
                  setLocation("/cart");
                  setMobileMenuOpen(false);
                }}
                variant="ghost"
                className="w-full justify-start text-slate-700"
              >
                <ShoppingCart className="w-5 h-5 mr-2" />
                Keranjang
              </Button>
              <Button
                onClick={() => {
                  setLocation("/orders");
                  setMobileMenuOpen(false);
                }}
                variant="ghost"
                className="w-full justify-start text-slate-700"
              >
                Pesanan
              </Button>
              <Button
                onClick={() => {
                  setLocation("/account");
                  setMobileMenuOpen(false);
                }}
                variant="ghost"
                className="w-full justify-start text-slate-700"
              >
                Akun ({user?.name})
              </Button>
              {user?.role === "admin" && (
                <Button
                  onClick={() => {
                    setLocation("/admin");
                    setMobileMenuOpen(false);
                  }}
                  className="w-full justify-start bg-red-600 hover:bg-red-700 text-white"
                >
                  Admin Panel
                </Button>
              )}
              <Button
                onClick={() => {
                  handleLogout();
                  setMobileMenuOpen(false);
                }}
                variant="ghost"
                className="w-full justify-start text-slate-700"
              >
                Keluar
              </Button>
            </>
          ) : (
            <>
              <Button
                onClick={() => {
                  setLocation("/login");
                  setMobileMenuOpen(false);
                }}
                variant="ghost"
                className="w-full justify-start text-slate-700"
              >
                Masuk
              </Button>
              <Button
                onClick={() => {
                  setLocation("/register");
                  setMobileMenuOpen(false);
                }}
                className="w-full justify-start bg-orange-600 hover:bg-orange-700 text-white"
              >
                Daftar
              </Button>
            </>
          )}
        </div>
      )}
    </header>
  );
}
