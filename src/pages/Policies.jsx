import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { FileText, Edit2, Save, Loader2, Shield } from 'lucide-react';
import { toast } from 'sonner';

const DEFAULT_RETURN_POLICY = `Return Policy for FMM CLASSICO

1. ELIGIBILITY FOR RETURNS
- Products can be returned within 7 days of delivery
- Item must be unused, in original packaging with all tags attached
- Proof of purchase (order confirmation) required
- Product must be in same condition as received

2. NON-RETURNABLE ITEMS
- Items on flash sale or marked as "final sale"
- Gift cards
- Personal care items (if seal is broken)
- Downloadable software or digital products

3. RETURN PROCESS
- Contact customer service via WhatsApp (0509 896 035) or email
- Provide order number and reason for return
- Receive return authorization and shipping instructions
- Ship item back to: UMAT Campus, Tarkwa OR Ashongman Estate, Accra
- Return shipping costs paid by customer (unless item is defective)

4. REFUNDS
- Refunds processed within 5-7 business days after inspection
- Refund issued to original payment method
- Mobile Money refunds processed to same number
- Card refunds processed to same card
- Original shipping charges are non-refundable

5. EXCHANGES
- Exchange for same item (different size/color) subject to availability
- Exchange shipping costs paid by customer
- Contact us to arrange exchange

6. DEFECTIVE ITEMS
- Contact us immediately for defective products
- We cover return shipping for defective items
- Full refund or replacement offered`;

const DEFAULT_CANCELLATION_POLICY = `Cancellation Policy for FMM CLASSICO

1. ORDER CANCELLATION
- Orders can be cancelled within 2 hours of placement
- After 2 hours, order enters processing and cannot be cancelled
- Contact customer service immediately: WhatsApp 0509 896 035

2. CANCELLATION PROCESS
- Provide order number and reason for cancellation
- Cancellation confirmation sent via SMS/email
- Refund initiated immediately upon cancellation approval

3. REFUND TIMELINE
- Mobile Money: Refund within 24 hours
- Card payments: Refund within 3-5 business days
- Bank transfer: Refund within 2-3 business days

4. CANCELLATION FEES
- No fee for cancellations within 2-hour window
- After processing begins, cancellation not allowed
- Customer must wait for delivery and initiate return instead

5. PAID-ON-DELIVERY ORDERS
- Can be cancelled before dispatch
- After dispatch, customer must refuse delivery
- Multiple refused POD orders may result in account restriction

6. SPECIAL CASES
- Flash sale items: Cannot be cancelled after 30 minutes
- Pre-order items: Can be cancelled before shipment date
- Custom orders: Non-cancellable once production begins`;

export default function Policies() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editMode, setEditMode] = useState(null); // 'return' | 'cancellation' | null
  const [returnPolicy, setReturnPolicy] = useState('');
  const [cancellationPolicy, setCancellationPolicy] = useState('');

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      setIsAdmin(u?.role === 'admin');
    }).catch(() => {});
  }, []);

  const { data: policies } = useQuery({
    queryKey: ['appPolicies'],
    queryFn: async () => {
      const results = await Promise.all([
        base44.entities.AppSetting.filter({ key: 'return_policy' }).then(r => r[0]),
        base44.entities.AppSetting.filter({ key: 'cancellation_policy' }).then(r => r[0]),
      ]);
      return {
        return_policy: results[0],
        cancellation_policy: results[1],
      };
    },
  });

  useEffect(() => {
    if (policies?.return_policy) {
      setReturnPolicy(policies.return_policy.value);
    } else {
      setReturnPolicy(DEFAULT_RETURN_POLICY);
    }
    if (policies?.cancellation_policy) {
      setCancellationPolicy(policies.cancellation_policy.value);
    } else {
      setCancellationPolicy(DEFAULT_CANCELLATION_POLICY);
    }
  }, [policies]);

  const queryClient = useQueryClient();

  const savePolicyMutation = useMutation({
    mutationFn: async ({ key, value }) => {
      const existing = await base44.entities.AppSetting.filter({ key }).then(r => r[0]);
      if (existing) {
        return base44.entities.AppSetting.update(existing.id, { value });
      } else {
        return base44.entities.AppSetting.create({ key, value });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appPolicies'] });
      setEditMode(null);
      toast.success('Policy updated successfully!');
    },
    onError: () => {
      toast.error('Failed to update policy');
    },
  });

  const handleSave = (policyType) => {
    const key = policyType === 'return' ? 'return_policy' : 'cancellation_policy';
    const value = policyType === 'return' ? returnPolicy : cancellationPolicy;
    savePolicyMutation.mutate({ key, value });
  };

  const ASH = '#2E86C1';

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: ASH }}>
          <FileText className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-black text-gray-900">Store Policies</h1>
          <p className="text-gray-600 text-sm">Return Policy & Cancellation Policy</p>
        </div>
        {isAdmin && (
          <Badge className="ml-auto" style={{ background: ASH }}>Admin Access</Badge>
        )}
      </div>

      {/* Return Policy */}
      <Card className="mb-6">
        <CardHeader className="border-b" style={{ background: 'linear-gradient(90deg, #2E86C1 0%, #2578ae 100%)' }}>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Return Policy
            </CardTitle>
            {isAdmin && editMode !== 'return' && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setEditMode('return')}
                className="gap-1"
              >
                <Edit2 className="h-3 w-3" /> Edit
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {editMode === 'return' ? (
            <div className="space-y-4">
              <Textarea
                value={returnPolicy}
                onChange={(e) => setReturnPolicy(e.target.value)}
                className="min-h-[400px] font-mono text-sm"
              />
              <div className="flex gap-2">
                <Button
                  onClick={() => handleSave('return')}
                  disabled={savePolicyMutation.isPending}
                  className="gap-2"
                  style={{ background: ASH }}
                >
                  {savePolicyMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  <Save className="h-4 w-4" /> Save Changes
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditMode(null);
                    setReturnPolicy(policies?.return_policy?.value || DEFAULT_RETURN_POLICY);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="prose prose-sm max-w-none">
              <pre className="whitespace-pre-wrap text-gray-700 font-sans text-sm leading-relaxed">
                {returnPolicy}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cancellation Policy */}
      <Card className="mb-6">
        <CardHeader className="border-b" style={{ background: 'linear-gradient(90deg, #2E86C1 0%, #2578ae 100%)' }}>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Cancellation Policy
            </CardTitle>
            {isAdmin && editMode !== 'cancellation' && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setEditMode('cancellation')}
                className="gap-1"
              >
                <Edit2 className="h-3 w-3" /> Edit
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {editMode === 'cancellation' ? (
            <div className="space-y-4">
              <Textarea
                value={cancellationPolicy}
                onChange={(e) => setCancellationPolicy(e.target.value)}
                className="min-h-[400px] font-mono text-sm"
              />
              <div className="flex gap-2">
                <Button
                  onClick={() => handleSave('cancellation')}
                  disabled={savePolicyMutation.isPending}
                  className="gap-2"
                  style={{ background: ASH }}
                >
                  {savePolicyMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  <Save className="h-4 w-4" /> Save Changes
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditMode(null);
                    setCancellationPolicy(policies?.cancellation_policy?.value || DEFAULT_CANCELLATION_POLICY);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="prose prose-sm max-w-none">
              <pre className="whitespace-pre-wrap text-gray-700 font-sans text-sm leading-relaxed">
                {cancellationPolicy}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>


    </div>
  );
}