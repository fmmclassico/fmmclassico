import React, { useMemo, useState } from 'react';
import { appClient } from '@/api/appClient.js';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';

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

function hasDeliveredPurchase(orders = [], productId = '') {
  return (Array.isArray(orders) ? orders : []).some((order) => {
    const status = String(order?.status || '').toLowerCase();
    if (status !== 'delivered') return false;

    const items = Array.isArray(order?.items) ? order.items : [];
    return items.some((item) => String(item?.product_id || '') === String(productId));
  });
}

function requiresManualApproval(comment = '', rating = 0) {
  const normalizedComment = String(comment || '').trim().toLowerCase();
  return Number(rating) <= 2 || MODERATION_KEYWORDS.some((keyword) => normalizedComment.includes(keyword));
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
    queryFn: async () => {
      const result = await appClient.entities.Review.filter({ product_id: product.id, approved: true }, '-created_date', 100);
      return Array.isArray(result) ? result : result?.data || [];
    },
    enabled: !!product.id,
  });

  const { data: settings = [] } = useQuery({
    queryKey: ['appSettings'],
    queryFn: async () => {
      const result = await appClient.entities.AppSetting.list();
      return Array.isArray(result) ? result : result?.data || [];
    },
  });

  const { data: customerOrders = [] } = useQuery({
    queryKey: ['reviewEligibleOrders', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const result = await appClient.entities.Order.filter({ customer_email: user.email }, '-created_date', 200);
      return Array.isArray(result) ? result : result?.data || [];
    },
    enabled: !!user?.email,
  });

  const autoApprove = settings.find((setting) => setting.key === 'auto_approve_reviews')?.value === 'true';

  const verifiedPurchase = useMemo(() => {
    if (!user?.email || !product?.id) return false;
    return hasDeliveredPurchase(customerOrders, product.id);
  }, [customerOrders, product?.id, user?.email]);

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!user) {
        appClient.auth.redirectToLogin(window.location.href);
        return { redirected: true };
      }

      if (!verifiedPurchase) {
        throw new Error('Only customers who have bought and received this product can post a review.');
      }

      const needsApproval = requiresManualApproval(comment, rating);

      await appClient.entities.Review.create({
        product_id: product.id,
        user_name: user.full_name || user.email.split('@')[0],
        user_email: user.email,
        rating,
        comment: comment.trim(),
        verified_purchase: true,
        approved: autoApprove && !needsApproval,
      });

      return { redirected: false, needsApproval };
    },
    onSuccess: (result) => {
      if (result?.redirected) return;

      if (result?.needsApproval) {
        toast.success('Review submitted for admin approval before it goes live.');
      } else if (autoApprove) {
        toast.success('Verified review posted successfully!');
      } else {
        toast.success('Review submitted! It will appear after admin approval.');
      }

      setComment('');
      setRating(5);
      setShowForm(false);
      queryClient.invalidateQueries({ queryKey: ['reviews', product.id] });
      queryClient.invalidateQueries({ queryKey: ['adminReviews'] });
    },
    onError: (error) => {
      console.error('Review submit error:', error);
      toast.error(error?.message || 'Failed to submit review. Please try again.');
    }
  });

  if (!product.review_enabled) return null;

  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / reviews.length).toFixed(1)
    : null;

  const handleReviewToggle = () => {
    if (!user) {
      appClient.auth.redirectToLogin(window.location.href);
      return;
    }

    if (!verifiedPurchase) {
      toast.error('Only customers with a delivered order for this product can post a review.');
      return;
    }

    setShowForm((current) => !current);
  };

  return (
    <div className="mt-8 bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Customer Reviews</h3>
          {avgRating && (
            <div className="flex items-center gap-1 mt-1">
              {[1, 2, 3, 4, 5].map((index) => (
                <Star key={index} className={`h-4 w-4 ${index <= Math.round(Number(avgRating)) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}`} />
              ))}
              <span className="text-sm text-gray-600 ml-1">{avgRating} ({reviews.length} reviews)</span>
            </div>
          )}
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          {reviews.length > 0 && (
            <Button variant="ghost" size="sm" className="w-full sm:w-auto" onClick={() => setShowReviews((current) => !current)}>
              {showReviews ? 'Hide Reviews' : 'Show Reviews'}
              {showReviews ? <ChevronUp className="ml-1 h-3 w-3" /> : <ChevronDown className="ml-1 h-3 w-3" />}
            </Button>
          )}
          <Button variant="outline" size="sm" className="w-full sm:w-auto" onClick={handleReviewToggle}>
            {!user ? 'Sign in to Review' : verifiedPurchase ? (showForm ? 'Cancel' : 'Write a Review') : 'Verified Buyers Only'}
          </Button>
        </div>
      </div>

      {user && !verifiedPurchase && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Only customers with a delivered order for this product can post a review. Reviews from verified buyers show a <span className="font-semibold">Verified</span> badge.
        </div>
      )}

      {showForm && user && verifiedPurchase && (
        <div className="bg-gray-50 rounded-xl p-4 mb-4 space-y-3">
          <div>
            <p className="text-sm font-medium mb-1">Your Rating</p>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setRating(index)}
                  onMouseEnter={() => setHoverRating(index)}
                  onMouseLeave={() => setHoverRating(0)}
                >
                  <Star
                    className={`h-6 w-6 transition-colors ${
                      index <= (hoverRating || rating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
                    }`}
                  />
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
          <p className="text-xs text-gray-500">
            Verified reviews can go live automatically when auto-approve is on. Low-rated or strongly negative reviews will stay pending for admin approval first.
          </p>
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
          {reviews.map((review) => (
            <div key={review.id} className="border-b border-gray-100 pb-3 last:border-b-0 last:pb-0">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{review.user_name}</span>
                  {review.verified_purchase && (
                    <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded">Verified</span>
                  )}
                </div>
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((index) => (
                    <Star key={index} className={`h-3 w-3 ${index <= Number(review.rating || 0) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}`} />
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
