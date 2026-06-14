import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Star, Trash2, CheckCircle2, XCircle, ToggleLeft, ToggleRight, CheckCheck } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminReviews() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [autoApprove, setAutoApprove] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      setIsAdmin(u.role === 'admin');
    }).catch(() => {});
  }, []);

  const { data: settings = [] } = useQuery({
    queryKey: ['appSettings'],
    queryFn: () => base44.entities.AppSetting.list(),
    enabled: isAdmin,
  });

  // Load auto-approve setting from DB
  useEffect(() => {
    const setting = settings.find(s => s.key === 'auto_approve_reviews');
    setAutoApprove(setting?.value === 'true');
  }, [settings]);

  const saveAutoApproveMutation = useMutation({
    mutationFn: async (enabled) => {
      const existing = settings.find(s => s.key === 'auto_approve_reviews');
      if (existing) return base44.entities.AppSetting.update(existing.id, { value: String(enabled) });
      return base44.entities.AppSetting.create({ key: 'auto_approve_reviews', value: String(enabled) });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['appSettings'] }),
  });

  const handleAutoApproveToggle = (val) => {
    setAutoApprove(val);
    saveAutoApproveMutation.mutate(val);
  };

  const { data: reviews = [], isLoading: loadingReviews } = useQuery({
    queryKey: ['adminReviews'],
    queryFn: () => base44.entities.Review.list('-created_date', 200),
    enabled: isAdmin,
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.list(),
    enabled: isAdmin,
  });

  const approveMutation = useMutation({
    mutationFn: (review) => base44.entities.Review.update(review.id, { approved: !review.approved }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminReviews'] });
      toast.success('Review updated!');
    }
  });

  const approveAllMutation = useMutation({
    mutationFn: async () => {
      const pendingReviews = reviews.filter(r => !r.approved);
      await Promise.all(pendingReviews.map(r => base44.entities.Review.update(r.id, { approved: true })));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminReviews'] });
      toast.success('All pending reviews approved!');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Review.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminReviews'] });
      toast.success('Review deleted.');
    }
  });

  const toggleReviewsMutation = useMutation({
    mutationFn: ({ productId, enabled }) => base44.entities.Product.update(productId, { review_enabled: enabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Review setting updated!');
    }
  });

  // Auto-approve new reviews when toggle is on
  useEffect(() => {
    if (!autoApprove || !isAdmin) return;
    const pending = reviews.filter(r => !r.approved);
    if (pending.length > 0) {
      Promise.all(pending.map(r => base44.entities.Review.update(r.id, { approved: true }))).then(() => {
        queryClient.invalidateQueries({ queryKey: ['adminReviews'] });
      });
    }
  }, [autoApprove, reviews, isAdmin]);

  if (!isAdmin && user) return (
    <div className="container mx-auto px-4 py-12 text-center">
      <h2 className="text-xl font-bold text-gray-800">Access Denied</h2>
    </div>
  );

  if (!user) return <div className="container mx-auto px-4 py-12 text-center text-gray-400">Loading...</div>;

  const pending = reviews.filter(r => !r.approved);
  const approved = reviews.filter(r => r.approved);

  return (
    <div className="container mx-auto px-4 py-6 space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-800">Admin – Reviews & Ratings</h1>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-full px-3 py-1.5">
            <Switch
              checked={autoApprove}
              onCheckedChange={handleAutoApproveToggle}
              id="auto-approve"
            />
            <label htmlFor="auto-approve" className="text-sm font-medium text-blue-800 cursor-pointer">
              Auto-Approve New Reviews
            </label>
          </div>
          {pending.length > 0 && (
            <Button
              onClick={() => approveAllMutation.mutate()}
              disabled={approveAllMutation.isPending}
              className="bg-green-600 hover:bg-green-700 gap-2"
            >
              <CheckCheck className="h-4 w-4" /> Approve All ({pending.length})
            </Button>
          )}
        </div>
      </div>

      {/* Per-product review toggle */}
      <div>
        <h2 className="text-lg font-bold text-gray-700 mb-3">Enable / Disable Reviews per Product</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {products.map(p => (
            <Card key={p.id} className="p-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {p.image_url && <img src={p.image_url} alt="" className="w-10 h-10 rounded object-cover flex-shrink-0" />}
                <span className="text-sm font-semibold text-gray-800 truncate">{p.name}</span>
              </div>
              <button
                onClick={() => toggleReviewsMutation.mutate({ productId: p.id, enabled: !p.review_enabled })}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors flex-shrink-0 ${
                  p.review_enabled !== false
                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {p.review_enabled !== false ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                {p.review_enabled !== false ? 'ON' : 'OFF'}
              </button>
            </Card>
          ))}
        </div>
      </div>

      {/* Pending reviews */}
      <div>
        <h2 className="text-lg font-bold text-orange-600 mb-3">Pending Approval ({pending.length})</h2>
        {loadingReviews ? (
          <div className="space-y-3">{[1,2].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
        ) : pending.length === 0 ? (
          <Card className="p-6 text-center text-gray-400">No pending reviews</Card>
        ) : (
          <div className="space-y-3">
            {pending.map(review => {
              const product = products.find(p => p.id === review.product_id);
              return (
                <Card key={review.id} className="p-4 border-l-4 border-orange-400">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm text-gray-800">{review.user_name}</span>
                        <div className="flex">
                          {[1,2,3,4,5].map(i => <Star key={i} className={`h-3.5 w-3.5 ${i <= review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`} />)}
                        </div>
                        <Badge variant="outline" className="text-[10px]">{product?.name || 'Product'}</Badge>
                      </div>
                      <p className="text-sm text-gray-600">{review.comment}</p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Button size="sm" className="bg-green-600 hover:bg-green-700 gap-1"
                        onClick={() => approveMutation.mutate(review)}>
                        <CheckCircle2 className="h-4 w-4" /> Approve
                      </Button>
                      <Button size="sm" variant="destructive" className="gap-1"
                        onClick={() => deleteMutation.mutate(review.id)}>
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

      {/* Approved reviews */}
      <div>
        <h2 className="text-lg font-bold text-green-700 mb-3">Approved Reviews ({approved.length})</h2>
        {approved.length === 0 ? (
          <Card className="p-6 text-center text-gray-400">No approved reviews</Card>
        ) : (
          <div className="space-y-3">
            {approved.map(review => {
              const product = products.find(p => p.id === review.product_id);
              return (
                <Card key={review.id} className="p-4 border-l-4 border-green-400">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm text-gray-800">{review.user_name}</span>
                        <div className="flex">
                          {[1,2,3,4,5].map(i => <Star key={i} className={`h-3.5 w-3.5 ${i <= review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`} />)}
                        </div>
                        <Badge variant="outline" className="text-[10px]">{product?.name || 'Product'}</Badge>
                        <Badge className="bg-green-100 text-green-700 text-[10px]">Live</Badge>
                      </div>
                      <p className="text-sm text-gray-600">{review.comment}</p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Button size="sm" variant="outline" className="gap-1 text-orange-600 border-orange-400"
                        onClick={() => approveMutation.mutate(review)}>
                        <XCircle className="h-4 w-4" /> Unapprove
                      </Button>
                      <Button size="sm" variant="destructive"
                        onClick={() => deleteMutation.mutate(review.id)}>
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