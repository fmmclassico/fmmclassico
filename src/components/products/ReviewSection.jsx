import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';

export default function ReviewSection({ product, user }) {
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showReviews, setShowReviews] = useState(false);
  const queryClient = useQueryClient();

  const { data: reviews = [] } = useQuery({
    queryKey: ['reviews', product.id],
    queryFn: async () => {
      const result = await base44.entities.Review.filter({ product_id: product.id, approved: true });
      return Array.isArray(result) ? result : result?.data || [];
    },
    enabled: !!product.id,
  });

  const { data: settings = [] } = useQuery({
    queryKey: ['appSettings'],
    queryFn: async () => {
      const result = await base44.entities.AppSetting.list();
      return Array.isArray(result) ? result : result?.data || [];
    },
  });

  const autoApprove = settings.find((setting) => setting.key === 'auto_approve_reviews')?.value === 'true';

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!user) {
        base44.auth.redirectToLogin(window.location.href);
        return;
      }

      await base44.entities.Review.create({
        product_id: product.id,
        user_name: user.full_name || user.email.split('@')[0],
        user_email: user.email,
        rating,
        comment,
        verified_purchase: true,
        approved: autoApprove,
      });
    },
    onSuccess: () => {
      toast.success(autoApprove ? 'Review posted!' : 'Review submitted! It will appear after admin approval.');
      setComment('');
      setRating(5);
      setShowForm(false);
      queryClient.invalidateQueries({ queryKey: ['reviews', product.id] });
    },
    onError: (error) => {
      console.error('Review submit error:', error);
      toast.error('Failed to submit review. Please try again.');
    },
  });

  if (!product.review_enabled) return null;

  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1)
    : null;

  return (
    <div className="mt-10 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm md:p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Customer Reviews</h3>
          {avgRating ? (
            <div className="mt-1 flex flex-wrap items-center gap-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} className={`h-4 w-4 ${i <= Math.round(avgRating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`} />
              ))}
              <span className="ml-1 text-sm text-gray-600">{avgRating} ({reviews.length} review{reviews.length === 1 ? '' : 's'})</span>
            </div>
          ) : (
            <p className="mt-1 text-sm text-gray-500">No reviews yet. Be the first to share your experience.</p>
          )}
        </div>

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          {reviews.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowReviews((value) => !value)}
              className="w-full justify-center sm:w-auto"
            >
              {showReviews ? 'Hide Reviews' : 'Show Reviews'}
              {showReviews ? <ChevronUp className="ml-1 h-3 w-3" /> : <ChevronDown className="ml-1 h-3 w-3" />}
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowForm((value) => !value)}
            className="w-full justify-center sm:w-auto"
          >
            {showForm ? 'Cancel' : 'Write a Review'}
          </Button>
        </div>
      </div>

      {showForm && (
        <div className="mb-4 space-y-3 rounded-xl bg-gray-50 p-4">
          <div>
            <p className="mb-1 text-sm font-medium">Your Rating</p>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setRating(i)}
                  onMouseEnter={() => setHoverRating(i)}
                  onMouseLeave={() => setHoverRating(0)}
                >
                  <Star
                    className={`h-6 w-6 transition-colors ${
                      i <= (hoverRating || rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          <Textarea
            placeholder="Write your review here..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
          />

          <Button
            type="button"
            onClick={() => submitMutation.mutate()}
            disabled={submitMutation.isPending || !comment.trim()}
            className="w-full bg-[#2E86C1] text-white hover:bg-[#2578ae] sm:w-auto"
          >
            {submitMutation.isPending ? 'Submitting...' : 'Submit Review'}
          </Button>
        </div>
      )}

      {showReviews && reviews.length > 0 && (
        <div className="space-y-3">
          {reviews.map((review) => (
            <div key={review.id} className="border-b border-gray-100 pb-3 last:border-b-0 last:pb-0">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">{review.user_name}</span>
                  {review.verified_purchase && (
                    <span className="rounded bg-green-100 px-1.5 py-0.5 text-[10px] text-green-700">✓ Verified</span>
                  )}
                </div>
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className={`h-3 w-3 ${i <= review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`} />
                  ))}
                </div>
              </div>
              <p className="mt-1 text-sm leading-6 text-gray-600">{review.comment}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
