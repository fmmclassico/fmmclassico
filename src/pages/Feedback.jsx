import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Send, CheckCircle2, Loader2, ChevronDown, ChevronUp, Upload, ImageIcon, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

const typeLabels = {
  complaint: { label: 'Complaint', color: 'bg-red-100 text-red-700' },
  suggestion: { label: 'Suggestion', color: 'bg-blue-100 text-blue-700' },
  compliment: { label: 'Compliment', color: 'bg-green-100 text-green-700' },
  order_issue: { label: 'Order Issue', color: 'bg-blue-100 text-blue-700' },
  delivery_issue: { label: 'Delivery Issue', color: 'bg-purple-100 text-purple-700' },
  other: { label: 'Other', color: 'bg-gray-100 text-gray-700' },
};

const statusLabels = {
  new: { label: 'New', color: 'bg-yellow-100 text-yellow-700' },
  in_review: { label: 'In Review', color: 'bg-blue-100 text-blue-700' },
  resolved: { label: 'Resolved', color: 'bg-green-100 text-green-700' },
};

export default function Feedback() {
  const [user, setUser] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [uploadedImages, setUploadedImages] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    type: '',
    subject: '',
    message: '',
    order_number: '',
  });

  useEffect(() => {
    const getUser = async () => {
      const isAuth = await base44.auth.isAuthenticated();
      if (isAuth) {
        const userData = await base44.auth.me();
        setUser(userData);
        setIsAdmin(userData.role === 'admin');
        setFormData(prev => ({
          ...prev,
          customer_name: userData.full_name || '',
          customer_email: userData.email || '',
        }));
      }
    };
    getUser();
  }, []);

  const { data: myFeedbacks = [] } = useQuery({
    queryKey: ['myFeedbacks', user?.email],
    queryFn: () => base44.entities.Feedback.filter({ customer_email: user?.email }),
    enabled: !!user?.email && !isAdmin,
  });

  const { data: allFeedbacks = [] } = useQuery({
    queryKey: ['allFeedbacks'],
    queryFn: () => base44.entities.Feedback.list('-created_date', 100),
    enabled: isAdmin,
  });

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setIsUploading(true);
    const urls = [];
    for (const file of files) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      urls.push(file_url);
    }
    setUploadedImages(prev => [...prev, ...urls]);
    setIsUploading(false);
    toast.success(`${urls.length} image(s) uploaded`);
  };

  const submitMutation = useMutation({
    mutationFn: async (data) => {
      const feedback = await base44.entities.Feedback.create(data);
      // Notify admin
      const imageLines = uploadedImages.length > 0
        ? `\n\nAttached images:\n${uploadedImages.join('\n')}`
        : '';
      const feedbackEmail = import.meta.env.VITE_FEEDBACK_EMAIL || import.meta.env.VITE_MERCHANT_EMAIL || 'merchant@example.com';
      await base44.integrations.Core.SendEmail({
        to: feedbackEmail,
        subject: `📩 New Feedback: ${data.type?.toUpperCase()} – ${data.subject || 'No subject'}`,
        body: `New customer feedback received:\n\nName: ${data.customer_name}\nEmail: ${data.customer_email}\nPhone: ${data.customer_phone || 'N/A'}\nType: ${data.type}\nSubject: ${data.subject || 'N/A'}\nOrder #: ${data.order_number || 'N/A'}\n\nMessage:\n${data.message}${imageLines}`,
      });
      return feedback;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myFeedbacks'] });
      setSubmitted(true);
    },
    onError: () => toast.error('Failed to submit. Try again.'),
  });

  const respondMutation = useMutation({
    mutationFn: ({ id, response, status }) =>
      base44.entities.Feedback.update(id, { admin_response: response, status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allFeedbacks'] });
      toast.success('Response saved!');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.type || !formData.message || !formData.customer_name) {
      toast.error('Please fill in required fields');
      return;
    }
    const dataWithImages = uploadedImages.length > 0
      ? { ...formData, message: formData.message + '\n\n[Attached images: ' + uploadedImages.join(', ') + ']' }
      : formData;
    submitMutation.mutate(dataWithImages);
  };

  if (isAdmin) {
    return <AdminFeedbackView feedbacks={allFeedbacks} onRespond={respondMutation.mutate} />;
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-lg">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
          <MessageCircle className="h-5 w-5 text-[#1B3A6B]" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-800">Customer Feedback</h1>
          <p className="text-sm text-gray-500">Share your experience or report an issue</p>
        </div>
      </div>

      {submitted ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-12"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Feedback Submitted!</h2>
          <p className="text-gray-500 mb-6 text-sm">Thank you! FMM CLASSICO will review your feedback and get back to you.</p>
          <Button onClick={() => setSubmitted(false)} variant="outline">Submit Another</Button>
        </motion.div>
      ) : (
        <Card className="p-5 shadow-md">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="customer_name">Full Name *</Label>
                <Input
                  id="customer_name"
                  value={formData.customer_name}
                  onChange={e => setFormData(p => ({ ...p, customer_name: e.target.value }))}
                  placeholder="Your name"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="customer_phone">Phone</Label>
                <Input
                  id="customer_phone"
                  value={formData.customer_phone}
                  onChange={e => setFormData(p => ({ ...p, customer_phone: e.target.value }))}
                  placeholder="0XX XXX XXXX"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Feedback Type *</Label>
              <Select value={formData.type} onValueChange={v => setFormData(p => ({ ...p, type: v }))}>
                <SelectTrigger><SelectValue placeholder="Select type..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="complaint">😤 Complaint</SelectItem>
                  <SelectItem value="order_issue">📦 Order Issue</SelectItem>
                  <SelectItem value="delivery_issue">🚚 Delivery Issue</SelectItem>
                  <SelectItem value="suggestion">💡 Suggestion</SelectItem>
                  <SelectItem value="compliment">😊 Compliment</SelectItem>
                  <SelectItem value="other">📝 Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="order_number">Order Number (if applicable)</Label>
              <Input
                id="order_number"
                value={formData.order_number}
                onChange={e => setFormData(p => ({ ...p, order_number: e.target.value }))}
                placeholder="e.g. FMM123ABC"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={formData.subject}
                onChange={e => setFormData(p => ({ ...p, subject: e.target.value }))}
                placeholder="Brief subject"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="message">Your Message *</Label>
              <Textarea
                id="message"
                value={formData.message}
                onChange={e => setFormData(p => ({ ...p, message: e.target.value }))}
                placeholder="Describe your issue, suggestion, or experience in detail..."
                rows={4}
                required
              />
            </div>

            {/* Image Upload */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <ImageIcon className="h-3.5 w-3.5 text-[#1B3A6B]" />
                Upload Screenshots / Product Photos (optional)
              </Label>
              <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
              <button type="button" onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-blue-300 rounded-xl hover:bg-blue-50 transition-colors text-sm text-[#1B3A6B] font-medium">
                {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {isUploading ? 'Uploading...' : 'Tap to upload images or screenshots'}
              </button>
              {uploadedImages.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {uploadedImages.map((url, i) => (
                    <div key={i} className="relative">
                      <img src={url} alt={`upload-${i}`} className="h-16 w-16 object-cover rounded-lg border" />
                      <button type="button" onClick={() => setUploadedImages(prev => prev.filter((_, idx) => idx !== i))}
                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Button
              type="submit"
              className="w-full font-bold text-white"
              style={{ background: '#1B3A6B' }}
              disabled={submitMutation.isPending}
            >
              {submitMutation.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</>
              ) : (
                <><Send className="mr-2 h-4 w-4" /> Submit Feedback</>
              )}
            </Button>
          </form>
        </Card>
      )}

      {/* My Previous Feedbacks */}
      {myFeedbacks.length > 0 && (
        <div className="mt-6">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3"
          >
            My Previous Feedbacks ({myFeedbacks.length})
            {showHistory ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          <AnimatePresence>
            {showHistory && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-3"
              >
                {myFeedbacks.map(fb => (
                  <Card key={fb.id} className="p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${typeLabels[fb.type]?.color}`}>
                        {typeLabels[fb.type]?.label}
                      </span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusLabels[fb.status]?.color}`}>
                        {statusLabels[fb.status]?.label}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 mb-1">{fb.message}</p>
                    {fb.admin_response && (
                      <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-xs font-bold text-blue-800 mb-0.5">FMM CLASSICO Response:</p>
                        <p className="text-xs text-gray-700">{fb.admin_response}</p>
                      </div>
                    )}
                  </Card>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

function AdminFeedbackView({ feedbacks, onRespond }) {
  const [responses, setResponses] = useState({});
  const newCount = feedbacks.filter(f => f.status === 'new').length;

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-xl font-bold text-gray-800">Customer Feedback</h1>
        {newCount > 0 && <Badge className="bg-red-500">{newCount} New</Badge>}
      </div>

      {feedbacks.length === 0 ? (
        <div className="text-center py-12 text-gray-400">No feedbacks yet.</div>
      ) : (
        <div className="space-y-4">
          {feedbacks.map(fb => (
            <Card key={fb.id} className="p-4 shadow-sm">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${typeLabels[fb.type]?.color}`}>
                  {typeLabels[fb.type]?.label}
                </span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusLabels[fb.status]?.color}`}>
                  {statusLabels[fb.status]?.label}
                </span>
                <span className="text-xs text-gray-400 ml-auto">{new Date(fb.created_date).toLocaleDateString()}</span>
              </div>
              <p className="font-semibold text-sm text-gray-800">{fb.customer_name} – {fb.customer_email}</p>
              {fb.customer_phone && <p className="text-xs text-gray-500">📞 {fb.customer_phone}</p>}
              {fb.order_number && <p className="text-xs text-gray-500">Order: {fb.order_number}</p>}
              {fb.subject && <p className="text-sm font-medium text-gray-700 mt-1">{fb.subject}</p>}
              <p className="text-sm text-gray-600 mt-1 bg-gray-50 rounded p-2">{fb.message}</p>

              <div className="mt-3 space-y-2">
                <Textarea
                  placeholder="Type your response to this customer..."
                  value={responses[fb.id] || fb.admin_response || ''}
                  onChange={e => setResponses(p => ({ ...p, [fb.id]: e.target.value }))}
                  rows={2}
                  className="text-sm"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="text-white text-xs"
                    style={{ background: '#1B3A6B' }}
                    onClick={() => onRespond({ id: fb.id, response: responses[fb.id] || '', status: 'in_review' })}
                  >
                    Save Response
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-green-600 border-green-300 text-xs"
                    onClick={() => onRespond({ id: fb.id, response: responses[fb.id] || fb.admin_response || '', status: 'resolved' })}
                  >
                    ✓ Mark Resolved
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}