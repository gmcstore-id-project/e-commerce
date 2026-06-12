import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Star, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function Review() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [hoveredRating, setHoveredRating] = useState(0);

  const orderId = parseInt(id || "0");
  const { data: order, isLoading } = trpc.orders.getById.useQuery(
    { id: orderId },
    { enabled: !!orderId }
  );

  const submitReviewMutation = trpc.reviews.create.useMutation({
    onSuccess: () => {
      toast.success("Review berhasil dikirim!");
      setLocation("/orders");
    },
    onError: (error) => {
      toast.error(error.message || "Gagal mengirim review");
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Memuat pesanan...</p>
        </div>
      </div>
    );
  }

  if (!order || order.status !== "delivered") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">
          Pesanan belum terkirim
        </h2>
        <p className="text-slate-600 mb-8">
          Anda hanya bisa memberikan review setelah pesanan terkirim
        </p>
        <Button onClick={() => setLocation("/orders")} className="bg-blue-600 hover:bg-blue-700">
          Kembali ke Pesanan
        </Button>
      </div>
    );
  }

  const handleSubmit = () => {
    if (!comment.trim()) {
      toast.error("Silakan tulis komentar");
      return;
    }

    submitReviewMutation.mutate({
      productId: 1,
      orderId,
      rating,
      comment,
    });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button
            onClick={() => setLocation("/orders")}
            variant="ghost"
            className="text-slate-700 hover:bg-slate-100"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold text-slate-900">Beri Review</h1>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <Card className="p-8">
          {/* Order Info */}
          <div className="mb-8 pb-8 border-b border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Pesanan #{order.id}</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-slate-600 text-sm mb-1">Tanggal Pesanan</p>
                <p className="text-slate-900 font-medium">
                  {new Date(order.createdAt).toLocaleDateString("id-ID", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
              <div>
                <p className="text-slate-600 text-sm mb-1">Total</p>
                <p className="text-slate-900 font-medium">
                  Rp {Number(order.totalAmount).toLocaleString("id-ID")}
                </p>
              </div>
            </div>
          </div>

          {/* Rating */}
          <div className="mb-8">
            <label className="block text-lg font-bold text-slate-900 mb-4">
              Berapa rating untuk pesanan ini?
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-12 h-12 ${
                      star <= (hoveredRating || rating)
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-slate-300"
                    }`}
                  />
                </button>
              ))}
            </div>
            <p className="text-sm text-slate-600 mt-2">
              {rating === 1 && "Sangat Buruk"}
              {rating === 2 && "Buruk"}
              {rating === 3 && "Cukup"}
              {rating === 4 && "Baik"}
              {rating === 5 && "Sangat Baik"}
            </p>
          </div>

          {/* Comment */}
          <div className="mb-8">
            <label className="block text-lg font-bold text-slate-900 mb-4">
              Tulis komentar Anda
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Bagikan pengalaman Anda dengan produk ini..."
              className="w-full h-32 p-4 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            <p className="text-sm text-slate-600 mt-2">
              {comment.length}/500 karakter
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              onClick={handleSubmit}
              disabled={submitReviewMutation.isPending}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold"
            >
              {submitReviewMutation.isPending ? "Mengirim..." : "Kirim Review"}
            </Button>
            <Button
              onClick={() => setLocation("/orders")}
              variant="outline"
              className="flex-1 border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              Batal
            </Button>
          </div>

          {/* Info */}
          <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-900">
              <strong>Tips:</strong> Berikan review yang jujur dan detail untuk membantu pembeli lain membuat keputusan yang tepat.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
