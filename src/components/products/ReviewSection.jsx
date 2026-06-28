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

  const autoApprove = settings.find(s => s.key === 'auto_approve_reviews')?.value === 'true';

  const submitMutation = useMutation({
  mutationFn: async () => {
    if (!user) { base44.auth.redirectToLogin(window.location.href); return; }
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
  }
});

  if (!product.review_enabled) return null;

  const avgRating = reviews.length > 0
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  return (
    <div className="mt-8 bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Customer Reviews</h3>
          {avgRating && (
            <div className="flex items-center gap-1 mt-1">
              {[1,2,3,4,5].map(i => (
                <Star key={i} className={`h-4 w-4 ${i <= Math.round(avgRating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}`} />
              ))}
              <span className="text-sm text-gray-600 ml-1">{avgRating} ({reviews.length} reviews)</span>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          {reviews.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setShowReviews(s => !s)}>
              {showReviews ? 'Hide Reviews' : 'Show Reviews'}
              {showReviews ? <ChevronUp className="ml-1 h-3 w-3" /> : <ChevronDown className="ml-1 h-3 w-3" />}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => setShowForm(s => !s)}>
            {showForm ? 'Cancel' : 'Write a Review'}
          </Button>
        </div>
      </div>

      {showForm && (
        <div className="bg-gray-50 rounded-xl p-4 mb-4 space-y-3">
          <div>
            <p className="text-sm font-medium mb-1">Your Rating</p>
            <div className="flex gap-1">
              {[1,2,3,4,5].map(i => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setRating(i)}
                  onMouseEnter={() => setHoverRating(i)}
                  onMouseLeave={() => setHoverRating(0)}
                >
                  <Star className={`h-6 w-6 transition-colors ${
                    i <= (hoverRating || rating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
                  }`} />
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
            className="bg-[#2E86C1] hover:bg-[#2578ae] text-white"
          >
            {submitMutation.isPending ? 'Submitting...' : 'Submit Review'}
          </Button>
        </div>
      )}

      {showReviews && reviews.length > 0 && (
        <div className="space-y-3">
          {reviews.map(review => (
            <div key={review.id} className="border-b border-gray-100 pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{review.user_name}</span>
                  {review.verified_purchase && (
                    <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded">✓ Verified</span>
                  )}
                </div>
                <div className="flex">
                  {[1,2,3,4,5].map(i => (
                    <Star key={i} className={`h-3 w-3 ${i <= review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}`} />
                  ))}
                </div>
              </div>
              <p className="text-sm text-gray-600 mt-1">{review.comment}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
