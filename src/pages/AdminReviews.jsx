import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Star, Trash2, CheckCircle2, XCircle, ToggleLeft, ToggleRight, CheckCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { appClient } from '@/api/appClient.js';
import { syncProductReviewStats } from '@/lib/reviews';

export default function AdminReviews() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [autoApprove, setAutoApprove] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    appClient.auth.me().then((authUser) => {
      setUser(authUser);
      setIsAdmin(authUser?.role === 'admin');
    }).catch(() => {});
  }, []);

  const { data: settings = [] } = useQuery({
    queryKey: ['appSettings'],
    queryFn: async () => {
      const result = await appClient.entities.AppSetting.list();
      return Array.isArray(result) ? result : result?.data || [];
    },
    enabled: isAdmin,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    const setting = settings.find((entry) => entry.key === 'auto_approve_reviews');
    setAutoApprove(setting?.value === 'true');
  }, [settings]);

  const { data: reviews = [], isLoading: loadingReviews } = useQuery({
    queryKey: ['adminReviews'],
    queryFn: async () => {
      const result = await appClient.entities.Review.list('-created_date', 200);
      return Array.isArray(result) ? result : result?.data || [];
    },
    enabled: isAdmin,
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => appClient.entities.Product.list('-created_date', 200),
    enabled: isAdmin,
  });

  const refreshProductStats = async (productIds = []) => {
    const uniqueIds = [...new Set((Array.isArray(productIds) ? productIds : [productIds]).filter(Boolean))];
    await Promise.all(uniqueIds.map((productId) => syncProductReviewStats(productId)));
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['adminReviews'] }),
      queryClient.invalidateQueries({ queryKey: ['products'] }),
    ]);
  };

  const saveAutoApproveMutation = useMutation({
    mutationFn: async (enabled) => {
      const existing = settings.find((entry) => entry.key === 'auto_approve_reviews');
      if (existing) {
        return appClient.entities.AppSetting.update(existing.id, { value: String(enabled) });
      }
      return appClient.entities.AppSetting.create({ key: 'auto_approve_reviews', value: String(enabled) });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['appSettings'] }),
  });

  const approveMutation = useMutation({
    mutationFn: async (review) => {
      const updated = await appClient.entities.Review.update(review.id, { approved: !review.approved });
      await refreshProductStats([review.product_id]);
      return updated;
    },
    onSuccess: () => {
      toast.success('Review updated!');
    },
  });

  const approveAllMutation = useMutation({
    mutationFn: async () => {
      const pendingReviews = reviews.filter((review) => !review.approved);
      await Promise.all(pendingReviews.map((review) => appClient.entities.Review.update(review.id, { approved: true })));
      await refreshProductStats(pendingReviews.map((review) => review.product_id));
    },
    onSuccess: () => {
      toast.success('All pending reviews approved!');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (review) => {
      await appClient.entities.Review.delete(review.id);
      await refreshProductStats([review.product_id]);
    },
    onSuccess: () => {
      toast.success('Review deleted.');
    },
  });

  const toggleReviewsMutation = useMutation({
    mutationFn: ({ productId, enabled }) => appClient.entities.Product.update(productId, { review_enabled: enabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Review setting updated!');
    },
  });

  const handleAutoApproveToggle = (value) => {
    setAutoApprove(value);
    saveAutoApproveMutation.mutate(value);
    if (value) {
      approveAllMutation.mutate();
    }
  };

  const pending = useMemo(() => reviews.filter((review) => !review.approved), [reviews]);
  const approved = useMemo(() => reviews.filter((review) => review.approved), [reviews]);

  if (!isAdmin && user) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <h2 className="text-xl font-bold text-gray-800">Access Denied</h2>
      </div>
    );
  }

  if (!user) {
    return <div className="container mx-auto px-4 py-12 text-center text-gray-400">Loading...</div>;
  }

  return (
    <div className="container mx-auto space-y-8 px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Admin – Reviews & Ratings</h1>
          <p className="mt-1 text-sm text-gray-500">Verified-purchase enforcement and rating sync are now applied when reviews are created, approved, unapproved, or deleted.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5">
            <Switch checked={autoApprove} onCheckedChange={handleAutoApproveToggle} id="auto-approve" />
            <label htmlFor="auto-approve" className="cursor-pointer text-sm font-medium text-blue-800">
              Auto-Approve New Reviews
            </label>
          </div>
          {pending.length > 0 ? (
            <Button onClick={() => approveAllMutation.mutate()} disabled={approveAllMutation.isPending} className="gap-2 bg-green-600 hover:bg-green-700">
              <CheckCheck className="h-4 w-4" /> Approve All ({pending.length})
            </Button>
          ) : null}
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-bold text-gray-700">Enable / Disable Reviews per Product</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {products.map((product) => (
            <Card key={product.id} className="flex items-center justify-between gap-3 p-3">
              <div className="flex min-w-0 flex-1 items-center gap-2">
                {product.image_url ? <img src={product.image_url} alt="" className="h-10 w-10 flex-shrink-0 rounded object-cover" loading="lazy" /> : null}
                <div className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-gray-800">{product.name}</span>
                  <span className="text-xs text-gray-500">{Number(product.reviews_count || 0)} reviews • {Number(product.rating || 0).toFixed(product.rating ? 1 : 0)}★</span>
                </div>
              </div>
              <button
                onClick={() => toggleReviewsMutation.mutate({ productId: product.id, enabled: !product.review_enabled })}
                className={`flex flex-shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${product.review_enabled !== false ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
              >
                {product.review_enabled !== false ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                {product.review_enabled !== false ? 'ON' : 'OFF'}
              </button>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-bold text-orange-600">Pending Approval ({pending.length})</h2>
        {loadingReviews ? (
          <div className="space-y-3">{[1, 2].map((index) => <Skeleton key={index} className="h-24 rounded-xl" />)}</div>
        ) : pending.length === 0 ? (
          <Card className="p-6 text-center text-gray-400">No pending reviews</Card>
        ) : (
          <div className="space-y-3">
            {pending.map((review) => {
              const product = products.find((entry) => entry.id === review.product_id);
              return (
                <Card key={review.id} className="border-l-4 border-orange-400 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-800">{review.user_name}</span>
                        {review.verified_purchase ? <Badge className="bg-green-100 text-[10px] text-green-700">Verified</Badge> : null}
                        <div className="flex">{[1, 2, 3, 4, 5].map((index) => <Star key={index} className={`h-3.5 w-3.5 ${index <= review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`} />)}</div>
                        <Badge variant="outline" className="text-[10px]">{product?.name || 'Product'}</Badge>
                      </div>
                      <p className="text-sm text-gray-600">{review.comment}</p>
                    </div>
                    <div className="flex flex-shrink-0 gap-2">
                      <Button size="sm" className="gap-1 bg-green-600 hover:bg-green-700" onClick={() => approveMutation.mutate(review)}>
                        <CheckCircle2 className="h-4 w-4" /> Approve
                      </Button>
                      <Button size="sm" variant="destructive" className="gap-1" onClick={() => deleteMutation.mutate(review)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-lg font-bold text-green-700">Approved Reviews ({approved.length})</h2>
        {approved.length === 0 ? (
          <Card className="p-6 text-center text-gray-400">No approved reviews</Card>
        ) : (
          <div className="space-y-3">
            {approved.map((review) => {
              const product = products.find((entry) => entry.id === review.product_id);
              return (
                <Card key={review.id} className="border-l-4 border-green-400 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-800">{review.user_name}</span>
                        {review.verified_purchase ? <Badge className="bg-green-100 text-[10px] text-green-700">Verified</Badge> : null}
                        <div className="flex">{[1, 2, 3, 4, 5].map((index) => <Star key={index} className={`h-3.5 w-3.5 ${index <= review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`} />)}</div>
                        <Badge variant="outline" className="text-[10px]">{product?.name || 'Product'}</Badge>
                        <Badge className="bg-green-100 text-[10px] text-green-700">Live</Badge>
                      </div>
                      <p className="text-sm text-gray-600">{review.comment}</p>
                    </div>
                    <div className="flex flex-shrink-0 gap-2">
                      <Button size="sm" variant="outline" className="gap-1 border-orange-400 text-orange-600" onClick={() => approveMutation.mutate(review)}>
                        <XCircle className="h-4 w-4" /> Unapprove
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => deleteMutation.mutate(review)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
