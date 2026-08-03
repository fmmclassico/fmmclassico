import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Star, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { appClient } from '@/api/appClient.js';
import { calculateReviewStats, getApprovedReviews, hasExistingReview, hasVerifiedDeliveredOrder, syncProductReviewStats } from '@/lib/reviews';

const MODERATION_KEYWORDS = [
  'awful',
  'terrible',
  'worst',
  'useless',
  'scam',
  'fraud',
  'fake',
  'hate',
  'nonsense',
  'garbage',
  'stupid',
  'idiot',
  'damn',
  'bad service',
  'very bad',
];

const INELIGIBLE_REVIEW_MESSAGE = 'Only customers with a delivered order for this product can leave a review.';
const DUPLICATE_REVIEW_MESSAGE = 'You have already submitted a review for this product.';

function requiresManualApproval(comment = '', rating = 0) {
  const normalizedComment = String(comment || '').trim().toLowerCase();
  return Number(rating) <= 2 || MODERATION_KEYWORDS.some((keyword) => normalizedComment.includes(keyword));
}

function getReviewErrorMessage(error) {
  const message = String(error?.message || '').trim();
  if (!message) return 'Failed to submit review. Please try again.';
  if (/already submitted a review/i.test(message)) return DUPLICATE_REVIEW_MESSAGE;
  if (/delivered order|verified purchase|purchase this product/i.test(message)) return INELIGIBLE_REVIEW_MESSAGE;
  return message;
}

export default function ReviewSection({ product, user }) {
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showReviews, setShowReviews] = useState(false);
  const queryClient = useQueryClient();

  const { data: reviews = [] } = useQuery({
    queryKey: ['reviews', product.id],
    queryFn: () => getApprovedReviews(product.id),
    enabled: !!product.id,
    staleTime: 60 * 1000,
  });

  const { data: settings = [] } = useQuery({
    queryKey: ['appSettings'],
    queryFn: async () => {
      const result = await appClient.entities.AppSetting.list();
      return Array.isArray(result) ? result : result?.data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { average, count } = useMemo(() => calculateReviewStats(reviews), [reviews]);
  const autoApprove = settings.find((setting) => setting.key === 'auto_approve_reviews')?.value === 'true';

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!user) {
        appClient.auth.redirectToLogin(window.location.href);
        return { redirected: true };
      }

      const [eligible, duplicate] = await Promise.all([
        hasVerifiedDeliveredOrder(user.email, product.id),
        hasExistingReview(user.email, product.id),
      ]);

      if (!eligible) {
        throw new Error(INELIGIBLE_REVIEW_MESSAGE);
      }

      if (duplicate) {
        throw new Error(DUPLICATE_REVIEW_MESSAGE);
      }

      const needsApproval = requiresManualApproval(comment, rating);
      const approved = autoApprove && !needsApproval;

      await appClient.entities.Review.create({
        product_id: product.id,
        user_name: user.full_name || user.email.split('@')[0],
        user_email: user.email,
        rating,
        comment: comment.trim(),
        verified_purchase: true,
        approved,
      });

      if (approved) {
        await syncProductReviewStats(product.id);
      }

      return { redirected: false, needsApproval, approved };
    },
    onSuccess: async (result) => {
      if (result?.redirected) return;

      if (result?.needsApproval) {
        toast.success('Review submitted for admin approval before it goes live.');
      } else {
        toast.success('Review submitted successfully!');
      }

      setComment('');
      setRating(5);
      setShowForm(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['reviews', product.id] }),
        queryClient.invalidateQueries({ queryKey: ['adminReviews'] }),
        queryClient.invalidateQueries({ queryKey: ['products'] }),
        queryClient.invalidateQueries({ queryKey: ['product', product.id] }),
        queryClient.invalidateQueries({ queryKey: ['product-review-summary', product.id] }),
      ]);
    },
    onError: (error) => {
      console.error('Review submit error:', error);
      toast.error(getReviewErrorMessage(error));
    },
  });

  if (!product.review_enabled) return null;

  const handleReviewToggle = async () => {
    if (!user) {
      appClient.auth.redirectToLogin(window.location.href);
      return;
    }

    if (!showForm) {
      const eligible = await hasVerifiedDeliveredOrder(user.email, product.id);
      if (!eligible) {
        toast.error(INELIGIBLE_REVIEW_MESSAGE);
        return;
      }
    }

    setShowForm((current) => !current);
  };

  return (
    <div className="mt-8 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Customer Reviews</h3>
          {count > 0 ? (
            <div className="mt-1 flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((index) => (
                <Star key={index} className={`h-4 w-4 ${index <= Math.round(Number(average)) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`} />
              ))}
              <span className="ml-1 text-sm text-gray-600">{average.toFixed(1)} ({count} review{count === 1 ? '' : 's'})</span>
            </div>
          ) : (
            <p className="mt-1 text-sm text-gray-500">No approved reviews yet.</p>
          )}
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          {count > 0 && (
            <Button variant="ghost" size="sm" className="w-full sm:w-auto" onClick={() => setShowReviews((current) => !current)}>
              {showReviews ? 'Hide Reviews' : 'Show Reviews'}
              {showReviews ? <ChevronUp className="ml-1 h-3 w-3" /> : <ChevronDown className="ml-1 h-3 w-3" />}
            </Button>
          )}
          <Button variant="outline" size="sm" className="w-full sm:w-auto" onClick={handleReviewToggle}>
            {showForm ? 'Cancel' : 'Write a Review'}
          </Button>
        </div>
      </div>

      {showForm && user && (
        <div className="mb-4 space-y-3 rounded-xl bg-gray-50 p-4">
          <div>
            <p className="mb-1 text-sm font-medium">Your Rating</p>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setRating(index)}
                  onMouseEnter={() => setHoverRating(index)}
                  onMouseLeave={() => setHoverRating(0)}
                >
                  <Star className={`h-6 w-6 transition-colors ${index <= (hoverRating || rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                </button>
              ))}
            </div>
          </div>
          <Textarea
            placeholder="Write your review here..."
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            rows={3}
          />
          <p className="text-xs text-gray-500">Reviews are limited to verified customers with a delivered order for this product.</p>
          <Button
            type="button"
            onClick={() => submitMutation.mutate()}
            disabled={submitMutation.isPending || !comment.trim()}
            className="bg-[#2E86C1] text-white hover:bg-[#2578ae]"
          >
            {submitMutation.isPending ? 'Submitting...' : 'Submit Review'}
          </Button>
        </div>
      )}

      {showReviews && count > 0 && (
        <div className="space-y-3">
          {reviews.map((review) => (
            <div key={review.id} className="border-b border-gray-100 pb-3 last:border-b-0 last:pb-0">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{review.user_name}</span>
                  {review.verified_purchase ? (
                    <span className="rounded bg-green-100 px-1.5 py-0.5 text-[10px] text-green-700">Verified</span>
                  ) : null}
                </div>
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((index) => (
                    <Star key={index} className={`h-3 w-3 ${index <= Number(review.rating || 0) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`} />
                  ))}
                </div>
              </div>
              <p className="mt-1 text-sm text-gray-600">{review.comment}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
