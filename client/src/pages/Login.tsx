import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useLocation } from "wouter";
import { getLoginUrl } from "@/const";
import { LogIn, ArrowRight } from "lucide-react";

export default function Login() {
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);

  const handleMausOAuthLogin = () => {
    setIsLoading(true);
    window.location.href = getLoginUrl();
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
          <div className="space-y-6">
            {/* OAuth Button */}
            <div>
              <Button
                onClick={handleMausOAuthLogin}
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
            </div>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-slate-500">atau</span>
              </div>
            </div>

            {/* Info Text */}
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <p className="text-sm text-slate-700">
                <span className="font-semibold text-orange-900">Belum punya akun?</span>
                {" "}Anda dapat mendaftar saat pertama kali masuk.
              </p>
            </div>

            {/* Back Button */}
            <Button
              onClick={() => setLocation("/")}
              variant="outline"
              className="w-full h-11 border-slate-300 text-slate-700 hover:bg-slate-50 font-medium rounded-lg transition-colors"
            >
              Kembali ke Beranda
            </Button>
          </div>
        </Card>

        {/* Footer Info */}
        <div className="mt-8 text-center text-sm text-slate-600">
          <p>
            Dengan masuk, Anda menyetujui{" "}
            <a href="#" className="text-blue-600 hover:underline">
              Syarat Layanan
            </a>
            {" "}dan{" "}
            <a href="#" className="text-blue-600 hover:underline">
              Kebijakan Privasi
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
