import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useLocation } from "wouter";
import { LogIn } from "lucide-react";

const API_URL =
  import.meta.env.VITE_API_URL || "https://cws-ecommerce-api.nadiracemilan25.workers.dev";

export default function Login() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError("Email dan password wajib diisi");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setError(data.error || "Email atau password salah");
        setIsLoading(false);
        return;
      }

      window.location.href = "/";
    } catch (err) {
      setError("Gagal terhubung ke server. Coba lagi.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <img src="/manus-storage/icon_cws_mantap.png" alt="CWS Mantap" className="w-10 h-10" />
            <h1 className="text-2xl font-bold text-slate-900">CWS Mantap</h1>
          </div>
          <p className="text-slate-600">Masuk ke akun Anda untuk melanjutkan</p>
        </div>

        {/* Login Card */}
        <Card className="p-8 shadow-lg border-0">
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@email.com"
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                {error}
              </p>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Sedang masuk...
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  Masuk
                </>
              )}
            </Button>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-slate-500">atau</span>
              </div>
            </div>

            {/* Register Link */}
            <div className="text-center">
              <p className="text-slate-600 text-sm">
                Belum punya akun?{" "}
                <button
                  type="button"
                  onClick={() => setLocation("/register")}
                  className="text-blue-600 hover:underline font-semibold"
                >
                  Daftar di sini
                </button>
              </p>
            </div>

            {/* Back Button */}
            <Button
              type="button"
              onClick={() => setLocation("/")}
              variant="outline"
              className="w-full h-11 border-slate-300 text-slate-700 hover:bg-slate-50 font-medium rounded-lg transition-colors"
            >
              Kembali ke Beranda
            </Button>
          </form>
        </Card>

        {/* Footer Info */}
        <div className="mt-8 text-center text-sm text-slate-600">
          <p>
            Dengan masuk, Anda menyetujui{" "}
            <a href="#" className="text-blue-600 hover:underline">
              Syarat Layanan
            </a>{" "}
            dan{" "}
            <a href="#" className="text-blue-600 hover:underline">
              Kebijakan Privasi
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
