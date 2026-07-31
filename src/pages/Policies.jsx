import React, { useState, useEffect, useMemo } from 'react';
import { appClient } from '@/api/appClient.js';
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

const DEFAULT_PRIVACY_POLICY = `Privacy Policy for FMM CLASSICO

1. INFORMATION WE COLLECT
- Contact details you provide during checkout or account creation, such as your name, phone number and email address
- Delivery details, order information and customer-service messages
- Technical usage information needed to keep the website secure and working properly

2. HOW WE USE YOUR INFORMATION
- To process orders, arrange delivery and provide customer support
- To send service-related updates about your account or orders
- To improve the reliability, security and performance of the website
- To meet legal, tax and fraud-prevention obligations when required

3. HOW WE SHARE INFORMATION
- We only share information with service providers or partners when it is necessary to complete your order, process payments, deliver products or operate the website
- We may also share information when the law requires it or to protect our business, customers or the public

4. COOKIES AND LOCAL STORAGE
- FMM CLASSICO may use cookies or similar browser storage to remember your session, cart activity, preferences and basic site analytics
- You can manage these settings through your browser, but some features may work less smoothly if storage is disabled

5. DATA SECURITY
- We use reasonable administrative and technical safeguards to protect customer information
- No internet-based system is completely risk-free, so we encourage customers to use strong passwords and protect their devices

6. YOUR CHOICES
- You can contact us to update your information, ask questions about your data or request support related to your account
- Some order and transaction records may need to be retained for legal, accounting or operational reasons

7. CONTACT
- For privacy questions, contact FMM CLASSICO at fmmclassico@gmail.com`;

const DEFAULT_TERMS_OF_SERVICE = `Terms of Service for FMM CLASSICO

1. ACCEPTANCE OF TERMS
- By accessing or using FMM CLASSICO, you agree to use the website lawfully and in line with these terms

2. PRODUCT AND PRICING INFORMATION
- We aim to keep product details, pricing and availability accurate, but occasional errors or delays can happen
- FMM CLASSICO may correct errors, update information or cancel affected orders when necessary

3. ORDERS AND PAYMENTS
- Placing an order does not guarantee acceptance until the order is reviewed and confirmed
- Customers are responsible for providing accurate contact, payment and delivery information

4. ACCOUNT RESPONSIBILITIES
- If you create an account, you are responsible for keeping your login details secure and for activity carried out under your account

5. ACCEPTABLE USE
- You must not misuse the website, interfere with its security, attempt unauthorized access or use the platform for fraudulent activity

6. RETURNS, CANCELLATIONS AND SUPPORT
- Returns and cancellations are handled according to the applicable store policies published by FMM CLASSICO
- Support requests can be directed through the available customer-service channels on the website

7. LIMITATION OF LIABILITY
- To the fullest extent allowed by law, FMM CLASSICO is not responsible for indirect, incidental or consequential losses arising from use of the website or inability to use it

8. CHANGES TO THESE TERMS
- FMM CLASSICO may update these terms from time to time by publishing the revised version on the website

9. CONTACT
- Questions about these terms can be sent to fmmclassico@gmail.com`;

const POLICY_CONTENT = {
  return_policy: DEFAULT_RETURN_POLICY,
  cancellation_policy: DEFAULT_CANCELLATION_POLICY,
  privacy_policy: DEFAULT_PRIVACY_POLICY,
  terms_of_service: DEFAULT_TERMS_OF_SERVICE,
};

const PAGE_CONFIG = {
  'store-policies': {
    title: 'Store Policies',
    subtitle: 'Return Policy & Cancellation Policy',
    sections: [
      { key: 'return_policy', title: 'Return Policy' },
      { key: 'cancellation_policy', title: 'Cancellation Policy' },
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    subtitle: 'How FMM CLASSICO collects, uses and protects customer information',
    sections: [
      { key: 'privacy_policy', title: 'Privacy Policy' },
    ],
  },
  terms: {
    title: 'Terms of Service',
    subtitle: 'Terms that apply when using FMM CLASSICO',
    sections: [
      { key: 'terms_of_service', title: 'Terms of Service' },
    ],
  },
};

export default function Policies({ documentType = 'store-policies' }) {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editMode, setEditMode] = useState(null);
  const [policyValues, setPolicyValues] = useState(POLICY_CONTENT);

  useEffect(() => {
    appClient.auth.me().then((u) => {
      setUser(u);
      setIsAdmin(u?.role === 'admin');
    }).catch(() => {
      setUser(null);
      setIsAdmin(false);
    });
  }, []);

  const pageConfig = PAGE_CONFIG[documentType] || PAGE_CONFIG['store-policies'];
  const queryClient = useQueryClient();

  const { data: policies } = useQuery({
    queryKey: ['appPolicies'],
    queryFn: async () => {
      const keys = ['return_policy', 'cancellation_policy', 'privacy_policy', 'terms_of_service'];
      const results = await Promise.all(
        keys.map(async (key) => {
          const record = await appClient.entities.AppSetting.filter({ key }).then((response) => response[0]);
          return [key, record];
        })
      );

      return Object.fromEntries(results);
    },
  });

  useEffect(() => {
    setPolicyValues({
      return_policy: policies?.return_policy?.value || DEFAULT_RETURN_POLICY,
      cancellation_policy: policies?.cancellation_policy?.value || DEFAULT_CANCELLATION_POLICY,
      privacy_policy: policies?.privacy_policy?.value || DEFAULT_PRIVACY_POLICY,
      terms_of_service: policies?.terms_of_service?.value || DEFAULT_TERMS_OF_SERVICE,
    });
  }, [policies]);

  const savePolicyMutation = useMutation({
    mutationFn: async ({ key, value }) => {
      const existing = await appClient.entities.AppSetting.filter({ key }).then((response) => response[0]);
      if (existing) {
        return appClient.entities.AppSetting.update(existing.id, { value });
      }
      return appClient.entities.AppSetting.create({ key, value });
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

  const sectionByKey = useMemo(() => {
    return Object.fromEntries(pageConfig.sections.map((section) => [section.key, section]));
  }, [pageConfig.sections]);

  const handleSave = (key) => {
    savePolicyMutation.mutate({ key, value: policyValues[key] || '' });
  };

  const ASH = '#2E86C1';

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: ASH }}>
          <FileText className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-black text-gray-900">{pageConfig.title}</h1>
          <p className="text-gray-600 text-sm">{pageConfig.subtitle}</p>
        </div>
        {isAdmin && (
          <Badge className="ml-auto" style={{ background: ASH }}>Admin Access</Badge>
        )}
      </div>

      {pageConfig.sections.map((section) => {
        const value = policyValues[section.key] || POLICY_CONTENT[section.key];
        const isEditing = editMode === section.key;
        const isStorePolicy = section.key === 'return_policy' || section.key === 'cancellation_policy';
        const canEdit = isAdmin && (isStorePolicy || documentType !== 'store-policies');

        return (
          <Card key={section.key} className="mb-6">
            <CardHeader className="border-b" style={{ background: 'linear-gradient(90deg, #2E86C1 0%, #2578ae 100%)' }}>
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-white flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  {section.title}
                </CardTitle>
                {canEdit && !isEditing && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setEditMode(section.key)}
                    className="gap-1"
                  >
                    <Edit2 className="h-3 w-3" /> Edit
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {isEditing ? (
                <div className="space-y-4">
                  <Textarea
                    value={value}
                    onChange={(event) => setPolicyValues((current) => ({ ...current, [section.key]: event.target.value }))}
                    className="min-h-[400px] font-mono text-sm"
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleSave(section.key)}
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
                        setPolicyValues((current) => ({
                          ...current,
                          [section.key]: policies?.[section.key]?.value || POLICY_CONTENT[section.key],
                        }));
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="prose prose-sm max-w-none">
                  <pre className="whitespace-pre-wrap text-gray-700 font-sans text-sm leading-relaxed">
                    {value}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
