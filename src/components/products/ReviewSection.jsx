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
    queryFn: () => base44.entities.Review.filter({ product_id: product.id, approved: true }),
    enabled: !!product.id,
  });

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
        approved: false,
      });
    },
    onSuccess: () => {
      toast.success('Review submitted! It will appear after admin approval.');
      setComment('');
      setRating(5);
      setShowForm(false);
      queryClient.invalidateQueries({ queryKey: ['reviews', product.id] });
    }
  });

  if (!product.review_enabled) return null;

  const avgRating = reviews.length > 0
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  return (
    <div className="mt-8 border-t pt-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-800">Customer Reviews</h3>
          {avgRating && (
            <div className="flex items-center gap-1 mt-1">
              {[1,2,3,4,5].map(i => (
                <Star key={i} className={`h-4 w-4 ${i <= Math.round(avgRating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`} />
              ))}
              <span className="text-sm text-gray-500 ml-1">{avgRating} ({reviews.length} reviews)</span>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          {reviews.length > 0 && (
            <Button size="sm" variant="outline" onClick={() => setShowReviews(s => !s)}>
              {showReviews ? 'Hide Reviews' : 'Show Reviews'}
              {showReviews ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />}
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => setShowForm(s => !s)}>
            {showForm ? 'Cancel' : 'Write a Review'}
          </Button>
        </div>
      </div>

      {showForm && (
        <div className="bg-gray-50 rounded-xl p-4 mb-4 space-y-3">
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-1">Your Rating</p>
            <div className="flex gap-1">
              {[1,2,3,4,5].map(i => (
                <button key={i} onClick={() => setRating(i)}
                  onMouseEnter={() => setHoverRating(i)}
                  onMouseLeave={() => setHoverRating(0)}>
                  <Star className={`h-7 w-7 transition-colors ${i <= (hoverRating || rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                </button>
              ))}
            </div>
          </div>
          <Textarea
            placeholder="Share your experience with this product..."
            value={comment}
            onChange={e => setComment(e.target.value)}
            rows={3}
          />
          <Button
            className="w-full bg-[#2E86C1] hover:bg-[#2578ae] text-white"
            disabled={!comment.trim() || submitMutation.isPending}
            onClick={() => submitMutation.mutate()}
          >
            {submitMutation.isPending ? 'Submitting...' : 'Submit Review'}
          </Button>
          <p className="text-xs text-gray-400 text-center">Reviews are approved by admin before going live.</p>
        </div>
      )}

      {reviews.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-6">No reviews yet. Be the first!</p>
      ) : showReviews ? (
        <div className="space-y-4">
          {reviews.map(review => (
            <div key={review.id} className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-800 text-sm">{review.user_name}</span>
                  {review.verified_purchase && (
                    <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">✓ Verified</span>
                  )}
                </div>
                <div className="flex">
                  {[1,2,3,4,5].map(i => (
                    <Star key={i} className={`h-3.5 w-3.5 ${i <= review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`} />
                  ))}
                </div>
              </div>
              <p className="text-sm text-gray-600">{review.comment}</p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}