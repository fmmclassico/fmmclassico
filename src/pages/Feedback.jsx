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
      try {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        urls.push(file_url);
      } catch (err) {
        console.error('Upload failed:', err);
      }
    }
    setUploadedImages(prev => [...prev, ...urls]);
    setIsUploading(false);
    if (urls.length > 0) toast.success(urls.length + ' image(s) uploaded');
  };

  const submitMutation = useMutation({
    mutationFn: async (data) => {
      // Save feedback to database
      var feedback = await base44.entities.Feedback.create(data);

      // Send notification to admin notification page
      var adminEmails = (import.meta.env.VITE_ADMIN_EMAILS || '').split(',').map(function(e) { return e.trim(); }).filter(Boolean);
      for (var i = 0; i < adminEmails.length; i++) {
        await base44.entities.Notification.create({
          user_email: adminEmails[i],
          title: 'New Customer Feedback: ' + (data.type || 'General'),
          message: 'From: ' + data.customer_name + ' (' + data.customer_email + ')' + (data.customer_phone ? ' Phone: ' + data.customer_phone : '') + (data.order_number ? ' Order: #' + data.order_number : '') + (data.subject ? ' Subject: ' + data.subject : '') + ' Message: ' + data.message,
          type: 'general',
          is_read: false,
          created_date: new Date().toISOString(),
        });
      }

      // Send email to admin
      var emailBody = 'New customer feedback received:' + String.fromCharCode(10) + String.fromCharCode(10) + 'Name: ' + data.customer_name + String.fromCharCode(10) + 'Email: ' + data.customer_email + String.fromCharCode(10) + 'Phone: ' + (data.customer_phone || 'N/A') + String.fromCharCode(10) + 'Type: ' + (data.type || 'N/A') + String.fromCharCode(10) + 'Subject: ' + (data.subject || 'N/A') + String.fromCharCode(10) + 'Order #: ' + (data.order_number || 'N/A') + String.fromCharCode(10) + String.fromCharCode(10) + 'Message:' + String.fromCharCode(10) + data.message;
      if (uploadedImages.length > 0) {
        emailBody += String.fromCharCode(10) + String.fromCharCode(10) + 'Attached images: ' + uploadedImages.join(', ');
      }

      var feedbackEmail = import.meta.env.VITE_FEEDBACK_EMAIL || import.meta.env.VITE_MERCHANT_EMAIL || 'fmmclassico@gmail.com';
      await base44.integrations.Core.SendEmail({
        to: feedbackEmail,
        from_name: 'FMM CLASSICO',
        subject: 'New Feedback: ' + (data.type ? data.type.toUpperCase() : 'GENERAL') + ' - ' + (data.subject || 'No subject'),
        body: emailBody,
      });

      return feedback;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myFeedbacks'] });
      setSubmitted(true);
    },
    onError: (err) => {
      console.error('Feedback submit error:', err);
      toast.error('Failed to submit. Try again.');
    },
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
    var dataWithImages = uploadedImages.length > 0
      ? { ...formData, message: formData.message + ' [Attached images: ' + uploadedImages.join(', ') + ']' }
      : formData;
    submitMutation.mutate(dataWithImages);
  };

  if (isAdmin) {
    return <AdminFeedbackView feedbacks={allFeedbacks} onRespond={(args) => respondMutation.mutate(args)} />;
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 pb-32">
      <Card className="p-6 rounded-2xl shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Customer Feedback</h1>
            <p className="text-xs text-gray-500">Share your experience or report an issue</p>
          </div>
        </div>

        {submitted ? (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-12">
            <CheckCircle2 className="mx-auto h-12 w-12 text-green-500 mb-4" />
            <h2 className="text-lg font-bold text-gray-900">Feedback Submitted!</h2>
            <p className="text-sm text-gray-500 mt-1">Thank you! FMM CLASSICO will review your feedback and get back to you.</p>
            <Button onClick={() => setSubmitted(false)} variant="outline" className="mt-4">Submit Another</Button>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm font-medium">Full Name *</Label>
                <Input value={formData.customer_name} onChange={(e) => setFormData(p => ({ ...p, customer_name: e.target.value }))} placeholder="Your name" required />
              </div>
              <div>
                <Label className="text-sm font-medium">Phone</Label>
                <Input value={formData.customer_phone} onChange={(e) => setFormData(p => ({ ...p, customer_phone: e.target.value }))} placeholder="0XX XXX XXXX" />
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">Feedback Type *</Label>
              <Select value={formData.type} onValueChange={(v) => setFormData(p => ({ ...p, type: v }))}>
                <SelectTrigger><SelectValue placeholder="Select type..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="complaint">Complaint</SelectItem>
                  <SelectItem value="order_issue">Order Issue</SelectItem>
                  <SelectItem value="delivery_issue">Delivery Issue</SelectItem>
                  <SelectItem value="suggestion">Suggestion</SelectItem>
                  <SelectItem value="compliment">Compliment</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium">Order Number (if applicable)</Label>
              <Input value={formData.order_number} onChange={(e) => setFormData(p => ({ ...p, order_number: e.target.value }))} placeholder="e.g. FMM123ABC" />
            </div>

            <div>
              <Label className="text-sm font-medium">Subject</Label>
              <Input value={formData.subject} onChange={(e) => setFormData(p => ({ ...p, subject: e.target.value }))} placeholder="Brief subject" />
            </div>

            <div>
              <Label className="text-sm font-medium">Your Message *</Label>
              <Textarea value={formData.message} onChange={(e) => setFormData(p => ({ ...p, message: e.target.value }))} placeholder="Describe your issue, suggestion, or experience in detail..." rows={4} required />
            </div>

            {/* Image Upload */}
            <div>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={handleImageUpload} />
              <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-blue-300 rounded-xl hover:bg-blue-50 transition-colors text-sm text-[#1B3A6B] font-medium">
                {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {isUploading ? 'Uploading...' : 'Tap to upload images or screenshots'}
              </button>
              {uploadedImages.length > 0 && (
                <div className="flex gap-2 mt-2 flex-wrap">
                  {uploadedImages.map((url, i) => (
                    <div key={i} className="relative w-16 h-16">
                      <img src={url} alt="" className="w-16 h-16 rounded-lg object-cover" />
                      <button type="button" onClick={() => setUploadedImages(prev => prev.filter((_, idx) => idx !== i))} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Button type="submit" disabled={submitMutation.isPending} className="w-full rounded-xl bg-blue-800 text-white py-3 font-semibold hover:bg-blue-900">
              {submitMutation.isPending ? (<><Loader2 className="w-4 h-4 animate-spin mr-2" /> Submitting...</>) : (<><Send className="w-4 h-4 mr-2" /> Submit Feedback</>)}
            </Button>
          </form>
        )}

        {/* My Previous Feedbacks */}
        {myFeedbacks.length > 0 && (
          <div className="mt-6 border-t pt-4">
            <button onClick={() => setShowHistory(!showHistory)} className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
              My Previous Feedbacks ({myFeedbacks.length})
              {showHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            <AnimatePresence>
              {showHistory && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-3">
                  {myFeedbacks.map(fb => (
                    <Card key={fb.id} className="p-3 rounded-xl">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={typeLabels[fb.type]?.color || 'bg-gray-100'}>{typeLabels[fb.type]?.label || fb.type}</Badge>
                        <Badge className={statusLabels[fb.status]?.color || 'bg-gray-100'}>{statusLabels[fb.status]?.label || fb.status}</Badge>
                      </div>
                      <p className="text-sm text-gray-700">{fb.message}</p>
                      {fb.admin_response && (
                        <div className="mt-2 bg-blue-50 rounded-lg p-2">
                          <p className="text-xs font-semibold text-blue-800">FMM CLASSICO Response:</p>
                          <p className="text-xs text-blue-700">{fb.admin_response}</p>
                        </div>
                      )}
                    </Card>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </Card>
    </div>
  );
}

function AdminFeedbackView({ feedbacks, onRespond }) {
  const [responses, setResponses] = useState({});
  const newCount = feedbacks.filter(f => f.status === 'new').length;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">Customer Feedback</h1>
        {newCount > 0 && <Badge className="bg-red-100 text-red-700">{newCount} New</Badge>}
      </div>

      {feedbacks.length === 0 ? (
        <p className="text-gray-400 text-sm">No feedbacks yet.</p>
      ) : (
        <div className="space-y-3">
          {feedbacks.map(fb => (
            <Card key={fb.id} className="p-4 rounded-2xl">
              <div className="flex items-center gap-2 mb-2">
                <Badge className={typeLabels[fb.type]?.color || 'bg-gray-100'}>{typeLabels[fb.type]?.label || fb.type}</Badge>
                <Badge className={statusLabels[fb.status]?.color || 'bg-gray-100'}>{statusLabels[fb.status]?.label || fb.status}</Badge>
                <span className="text-xs text-gray-400 ml-auto">{fb.created_date ? new Date(fb.created_date).toLocaleDateString() : ''}</span>
              </div>
              <p className="text-sm font-medium text-gray-800">{fb.customer_name} - {fb.customer_email}</p>
              {fb.customer_phone && <p className="text-xs text-gray-500">Phone: {fb.customer_phone}</p>}
              {fb.order_number && <p className="text-xs text-gray-500">Order: {fb.order_number}</p>}
              {fb.subject && <p className="text-sm font-semibold text-gray-700 mt-1">{fb.subject}</p>}
              <p className="text-sm text-gray-600 mt-1">{fb.message}</p>

              <div className="mt-3 space-y-2">
                <Textarea placeholder="Write your response..." value={responses[fb.id] || ''} onChange={(e) => setResponses(p => ({ ...p, [fb.id]: e.target.value }))} rows={2} className="text-sm" />
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => onRespond({ id: fb.id, response: responses[fb.id] || '', status: 'in_review' })}>Save Response</Button>
                  <Button size="sm" onClick={() => onRespond({ id: fb.id, response: responses[fb.id] || fb.admin_response || '', status: 'resolved' })}>Mark Resolved</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
