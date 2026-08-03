import { appClient } from '@/api/appClient.js';

function normalizeListResult(result) {
  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.data)) return result.data;
  return [];
}

export function calculateReviewStats(reviews = []) {
  const approvedReviews = (Array.isArray(reviews) ? reviews : []).filter((review) => review?.approved !== false);
  const count = approvedReviews.length;
  const average = count > 0
    ? Number((approvedReviews.reduce((sum, review) => sum + Number(review?.rating || 0), 0) / count).toFixed(1))
    : 0;

  return { count, average };
}

export async function getApprovedReviews(productId) {
  const result = await appClient.entities.Review.filter({ product_id: productId, approved: true }, '-created_date', 100);
  return normalizeListResult(result);
}

export async function getAllReviewsForProduct(productId) {
  const result = await appClient.entities.Review.filter({ product_id: productId }, '-created_date', 100);
  return normalizeListResult(result);
}

export async function hasVerifiedDeliveredOrder(userEmail, productId) {
  if (!userEmail || !productId) return false;
  const result = await appClient.entities.Order.filter({ customer_email: userEmail, status: 'delivered' }, '-created_date', 200);
  const orders = normalizeListResult(result);
  return orders.some((order) => Array.isArray(order?.items) && order.items.some((item) => item?.product_id === productId));
}

export async function hasExistingReview(userEmail, productId) {
  if (!userEmail || !productId) return false;
  const result = await appClient.entities.Review.filter({ user_email: userEmail, product_id: productId }, '-created_date', 20);
  const reviews = normalizeListResult(result);
  return reviews.length > 0;
}

export async function syncProductReviewStats(productId) {
  if (!productId) return { count: 0, average: 0 };
  const reviews = await getApprovedReviews(productId);
  const stats = calculateReviewStats(reviews);
  await appClient.entities.Product.update(productId, {
    rating: stats.count > 0 ? stats.average : null,
    reviews_count: stats.count,
  });
  return stats;
}
