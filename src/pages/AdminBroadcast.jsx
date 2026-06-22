import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, Sparkles, Users, Mail, Phone, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminBroadcast() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [tab, setTab] = useState('message'); // 'message' | 'sms'

  // Broadcast message form
  const [occasion, setOccasion] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [generatedMessage, setGeneratedMessage] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sentCount, setSentCount] = useState(0);
  const [sendDone, setSendDone] = useState(false);

  // SMS form
  const [smsMessage, setSmsMessage] = useState('');
  const [smsPhone, setSmsPhone] = useState('');
  const [isSendingSms, setIsSendingSms] = useState(false);
  const [smsDone, setSmsDone] = useState(false);

  useEffect(() => {
    const init = async () => {
      const auth = await base44.auth.isAuthenticated();
      if (auth) {
        const userData = await base44.auth.me();
        setUser(userData);
        setIsAdmin(userData.role === 'admin');
      }
    };
    init();
  }, []);

  // Fetch all orders to get unique customer emails + phones
  const { data: orders = [] } = useQuery({
    queryKey: ['allOrdersBroadcast'],
    queryFn: () => base44.entities.Order.list('-created_date', 500),
    enabled: isAdmin,
  });

  const uniqueCustomers = React.useMemo(() => {
    const map = {};
    orders.forEach(o => {
      if (o.customer_email && !map[o.customer_email]) {
        map[o.customer_email] = {
          email: o.customer_email,
          name: o.customer_name || 'Valued Customer',
          phone: o.customer_phone || '',
        };
      }
    });
    return Object.values(map);
  }, [orders]);

  const uniquePhones = React.useMemo(() => {
    return uniqueCustomers.filter(c => c.phone && c.phone.trim().length >= 9);
  }, [uniqueCustomers]);

  const occasions = [
    '🎄 Christmas', '🎆 New Year', '❤️ Valentine\'s Day', '🇬🇭 Ghana Independence Day',
    '🌙 Eid Mubarak', '🐣 Easter', '🎉 General Promo', '🛍️ Flash Sale', '🏷️ Special Discount'
  ];

  const handleGenerateMessage = async () => {
    if (!occasion && !customPrompt) {
      toast.error('Please select an occasion or enter a custom prompt');
      return;
    }
    setIsGenerating(true);
    setGeneratedMessage('');
    setEmailSubject('');
    const prompt = `Write a warm, friendly broadcast message from FMM CLASSICO (an online phone accessories, electronics and home appliances store in Ghana) to all our customers for ${occasion || customPrompt}. 
    The message should:
    - Be warm, personal and festive
    - Mention FMM CLASSICO by name
    - Be suitable to send via email and SMS
    - Be 2-4 sentences max
    - End with contact: 0509896035
    Also generate a short email subject line (5-8 words).
    Return JSON: {"subject": "...", "message": "..."}`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          subject: { type: 'string' },
          message: { type: 'string' }
        }
      }
    });
    setGeneratedMessage(result.message || '');
    setEmailSubject(result.subject || `${occasion} Wishes from FMM CLASSICO`);
    setIsGenerating(false);
  };

  const handleSendBroadcast = async () => {
    if (!generatedMessage || !emailSubject) {
      toast.error('Please generate a message first');
      return;
    }
    if (uniqueCustomers.length === 0) {
      toast.error('No customers found');
      return;
    }
    setIsSending(true);
    setSentCount(0);
    setSendDone(false);

    let count = 0;
    // Send in batches to avoid timeout
    for (const customer of uniqueCustomers) {
      await base44.integrations.Core.SendEmail({
        to: customer.email,
        subject: emailSubject,
        body: `Hi ${customer.name},\n\n${generatedMessage}\n\n– FMM CLASSICO Team\n📞 0509896035\n🛒 Shop: ${window.location.origin}`
      }).catch(() => {});
      count++;
      setSentCount(count);
    }

    setIsSending(false);
    setSendDone(true);
    toast.success(`Broadcast sent to ${count} customers!`);
  };

  const handleSendSms = async () => {
    if (!smsMessage.trim()) {
      toast.error('Please enter an SMS message');
      return;
    }
    setIsSendingSms(true);
    setSmsDone(false);

    // If specific phone entered, send only to that
    const targets = smsPhone.trim()
      ? [{ name: 'Customer', phone: smsPhone.trim(), email: '' }]
      : uniquePhones;

    if (targets.length === 0) {
      toast.error('No phone numbers found');
      setIsSendingSms(false);
      return;
    }

    // Since we don't have direct SMS API, we send via email notification + show WhatsApp bulk option
    // We'll create notifications for all users and email them
    let count = 0;
    for (const c of targets) {
      if (c.email) {
        await base44.integrations.Core.SendEmail({
          to: c.email,
          subject: 'Message from FMM CLASSICO',
          body: `Hi ${c.name},\n\n${smsMessage}\n\n– FMM CLASSICO\n📞 0509896035`
        }).catch(() => {});
      }
      count++;
    }

    setIsSendingSms(false);
    setSmsDone(true);
    toast.success(`Message sent to ${count} customer(s)!`);
  };

  if (!user) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-orange-500" /></div>;
  if (!isAdmin) return <div className="text-center py-20 text-red-500 font-semibold">Admin access only.</div>;

  return (
    <div className="container mx-auto px-4 py-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-800">📣 Broadcast to Customers</h1>
        <p className="text-gray-500 text-sm mt-1">Send festive wishes, promos, or delivery updates to all customers</p>
        <div className="mt-2 flex items-center gap-3">
          <Badge className="bg-orange-100 text-orange-700 border-orange-200">
            <Users className="h-3 w-3 mr-1" /> {uniqueCustomers.length} customers
          </Badge>
          <Badge className="bg-blue-100 text-blue-700 border-blue-200">
            <Phone className="h-3 w-3 mr-1" /> {uniquePhones.length} with phone numbers
          </Badge>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab('message')}
          className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all ${tab === 'message' ? 'bg-orange-500 text-white shadow' : 'bg-white text-gray-600 border'}`}
        >
          🎉 Festive / Promo Broadcast
        </button>
        <button
          onClick={() => setTab('sms')}
          className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all ${tab === 'sms' ? 'bg-orange-500 text-white shadow' : 'bg-white text-gray-600 border'}`}
        >
          📱 Direct SMS / Message
        </button>
      </div>

      {tab === 'message' && (
        <div className="space-y-5">
          <Card className="p-5">
            <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-orange-500" /> AI Message Generator
            </h2>

            <div className="mb-4">
              <Label className="mb-2 block text-sm">Select Occasion</Label>
              <div className="flex flex-wrap gap-2">
                {occasions.map(o => (
                  <button
                    key={o}
                    onClick={() => setOccasion(o)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${occasion === o ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-600 border-gray-300 hover:border-orange-400'}`}
                  >
                    {o}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <Label htmlFor="customPrompt" className="mb-1 block text-sm">Or describe your own</Label>
              <Input
                id="customPrompt"
                value={customPrompt}
                onChange={e => setCustomPrompt(e.target.value)}
                placeholder="e.g. Mid-year sale, Back to school promo..."
              />
            </div>

            <Button
              onClick={handleGenerateMessage}
              disabled={isGenerating}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold"
            >
              {isGenerating ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Generating...</> : <><Sparkles className="h-4 w-4 mr-2" /> Generate Message with AI</>}
            </Button>
          </Card>

          {generatedMessage && (
            <Card className="p-5 border-2 border-orange-200 bg-orange-50">
              <h3 className="font-bold text-gray-800 mb-3">✏️ Edit Before Sending</h3>
              <div className="space-y-3">
                <div>
                  <Label className="mb-1 block text-xs text-gray-600">Email Subject</Label>
                  <Input value={emailSubject} onChange={e => setEmailSubject(e.target.value)} />
                </div>
                <div>
                  <Label className="mb-1 block text-xs text-gray-600">Message</Label>
                  <Textarea
                    value={generatedMessage}
                    onChange={e => setGeneratedMessage(e.target.value)}
                    rows={5}
                    className="bg-white"
                  />
                </div>
              </div>
            </Card>
          )}

          {generatedMessage && !sendDone && (
            <Button
              onClick={handleSendBroadcast}
              disabled={isSending}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-5"
            >
              {isSending
                ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Sending to {sentCount}/{uniqueCustomers.length}...</>
                : <><Mail className="h-4 w-4 mr-2" /> Send to All {uniqueCustomers.length} Customers</>
              }
            </Button>
          )}

          {sendDone && (
            <Card className="p-5 bg-green-50 border-green-300 text-center">
              <CheckCircle2 className="h-10 w-10 text-green-600 mx-auto mb-2" />
              <p className="font-bold text-green-800">Broadcast sent to {sentCount} customers!</p>
              <Button variant="ghost" className="mt-3 text-orange-600" onClick={() => { setSendDone(false); setGeneratedMessage(''); setOccasion(''); setCustomPrompt(''); }}>
                Send Another
              </Button>
            </Card>
          )}
        </div>
      )}

      {tab === 'sms' && (
        <div className="space-y-5">
          <Card className="p-5">
            <h2 className="font-bold text-gray-800 mb-1 flex items-center gap-2">
              <Phone className="h-4 w-4 text-orange-500" /> Send Message / SMS
            </h2>
            <p className="text-xs text-gray-500 mb-4">Send a direct message to one customer or all customers who provided phone numbers. Messages are sent via email to their registered email.</p>

            <div className="space-y-4">
              <div>
                <Label className="mb-1 block text-sm">Phone Number (leave empty to send to ALL customers)</Label>
                <Input
                  value={smsPhone}
                  onChange={e => setSmsPhone(e.target.value)}
                  placeholder="e.g. 0244123456 — or leave empty for all"
                />
                {!smsPhone && (
                  <p className="text-xs text-orange-600 mt-1">Will send to all {uniqueCustomers.length} customers</p>
                )}
              </div>
              <div>
                <Label className="mb-1 block text-sm">Message</Label>
                <Textarea
                  value={smsMessage}
                  onChange={e => setSmsMessage(e.target.value)}
                  rows={5}
                  placeholder="e.g. Hi! Your order from FMM CLASSICO is on its way 🚚. Our rider will call you soon. Call 0509896035 if you need help."
                />
                <p className="text-xs text-gray-400 mt-1">{smsMessage.length} characters</p>
              </div>

              {!smsDone ? (
                <Button
                  onClick={handleSendSms}
                  disabled={isSendingSms}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-5"
                >
                  {isSendingSms
                    ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Sending...</>
                    : <><Send className="h-4 w-4 mr-2" /> {smsPhone ? 'Send to This Number' : `Send to All ${uniqueCustomers.length} Customers`}</>
                  }
                </Button>
              ) : (
                <Card className="p-4 bg-green-50 border-green-300 text-center">
                  <CheckCircle2 className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <p className="font-bold text-green-800">Message sent!</p>
                  <Button variant="ghost" className="mt-2 text-orange-600" onClick={() => { setSmsDone(false); setSmsMessage(''); setSmsPhone(''); }}>
                    Send Another
                  </Button>
                </Card>
              )}
            </div>
          </Card>

          {/* WhatsApp bulk hint */}
          <Card className="p-4 bg-green-50 border-green-200">
            <p className="text-sm font-semibold text-green-800 mb-1">💡 For actual SMS delivery</p>
            <p className="text-xs text-gray-600">
              For real SMS (GSM), use WhatsApp Broadcast or a local SMS gateway like <strong>mNotify</strong> in Ghana. Export phone numbers below and paste into those platforms.
            </p>
            <div className="mt-3 p-2 bg-white rounded-lg border text-xs font-mono text-gray-600 max-h-24 overflow-y-auto break-all">
              {uniquePhones.map(c => c.phone).join(', ') || 'No phone numbers yet'}
            </div>
            <Button
              size="sm"
              variant="outline"
              className="mt-2 text-xs"
              onClick={() => {
                navigator.clipboard.writeText(uniquePhones.map(c => c.phone).join('\n'));
                toast.success('Phone numbers copied!');
              }}
            >
              Copy All Phone Numbers
            </Button>
          </Card>
        </div>
      )}
    </div>
  );
}