import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Upload, Loader2, Save, PlayCircle, Video } from 'lucide-react';
import { toast } from "sonner";


export default function AdminPageContent() {
  const [user, setUser] = useState(null);
  const [steps, setSteps] = useState([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      const isAuth = await base44.auth.isAuthenticated();
      if (!isAuth) {
        toast.error('Please login as admin');
        return;
      }
      const userData = await base44.auth.me();
      if (userData.role !== 'admin') {
        toast.error('Admin access required');
        return;
      }
      setUser(userData);
    };
    checkAdmin();
  }, []);

  const { data: settings = [], refetch: refetchSettings } = useQuery({
    queryKey: ['appSettings'],
    queryFn: () => base44.entities.AppSetting.list(),
    enabled: !!user,
  });

  const videoSetting = settings.find(s => s.key === 'tutorial_video');
  const videoUrl = videoSetting?.value || null;

  // Fetch or initialize steps
  useEffect(() => {
    const fetchSteps = async () => {
      const stepsSetting = settings.find(s => s.key === 'howto_steps');
      if (stepsSetting?.value) {
        try {
          setSteps(JSON.parse(stepsSetting.value));
        } catch {
          setSteps(defaultSteps);
        }
      } else {
        setSteps(defaultSteps);
      }
    };
    if (settings.length) fetchSteps();
  }, [settings]);

  const defaultSteps = [
    { step: '1', title: 'Browse Products', desc: 'Go to Shop or Categories to find what you need.' },
    { step: '2', title: 'Add to Cart', desc: 'Tap "Add to Cart" on any product you want to buy.' },
    { step: '3', title: 'Checkout', desc: 'Go to your Cart, select a delivery zone, then tap Checkout.' },
    { step: '4', title: 'Fill Delivery Info', desc: 'Enter your name, active phone number and delivery address.' },
    { step: '5', title: 'Pay on Paystack', desc: 'Complete payment via Mobile Money or Card on Paystack.' },
    { step: '6', title: 'Track Your Order', desc: 'After payment, track your order status in real-time from "My Orders" page.' },
  ];

  const handleVideoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('video/')) {
      toast.error('Please upload a video file.');
      return;
    }
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      if (videoSetting?.id) {
        await base44.entities.AppSetting.update(videoSetting.id, { value: file_url });
      } else {
        await base44.entities.AppSetting.create({ key: 'tutorial_video', value: file_url });
      }
      refetchSettings();
      toast.success('Video uploaded successfully!');
    } catch (error) {
      toast.error('Failed to upload video');
    } finally {
      setUploading(false);
    }
  };

  const handleStepChange = (index, field, value) => {
    const newSteps = [...steps];
    newSteps[index][field] = value;
    setSteps(newSteps);
  };

  const handleSaveSteps = async () => {
    const stepsSetting = settings.find(s => s.key === 'howto_steps');
    if (stepsSetting?.id) {
      await base44.entities.AppSetting.update(stepsSetting.id, { value: JSON.stringify(steps) });
    } else {
      await base44.entities.AppSetting.create({ key: 'howto_steps', value: JSON.stringify(steps) });
    }
    refetchSettings();
    toast.success('Steps saved! Changes are now live.');
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card className="p-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-800" />
          <p className="text-gray-600">Loading...</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Edit "How to Use" Page Content</h1>

      {/* Video Upload Section */}
      <Card className="p-5 mb-6 shadow-md">
        <h2 className="font-bold text-gray-800 mb-4">Tutorial Video</h2>
        {videoUrl ? (
          <div className="rounded-xl overflow-hidden bg-black aspect-video mb-4">
            <video src={videoUrl} controls className="w-full h-full" />
          </div>
        ) : (
          <div className="rounded-xl bg-gray-100 aspect-video mb-4 flex flex-col items-center justify-center text-gray-400 gap-2">
            <Video className="h-12 w-12 opacity-30" />
            <p className="text-sm">No tutorial video uploaded yet</p>
          </div>
        )}
        <label className="block">
          <input
            type="file"
            accept="video/*"
            className="hidden"
            onChange={handleVideoUpload}
            disabled={uploading}
          />
          <Button
            type="button"
            variant="outline"
            className="gap-2 cursor-pointer w-full"
            disabled={uploading}
            onClick={() => document.querySelector('input[type=file]').click()}
          >
            {uploading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Uploading video...</>
            ) : (
              <><Upload className="h-4 w-4" /> {videoUrl ? 'Replace Video' : 'Upload Tutorial Video'}</>
            )}
          </Button>
        </label>
      </Card>

      {/* Steps Editor */}
      <Card className="p-5 mb-6 shadow-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-bold text-gray-800">Step-by-Step Guide</h2>
          <Button onClick={handleSaveSteps} className="gap-2">
            <Save className="h-4 w-4" /> Save Changes
          </Button>
        </div>
        <div className="space-y-4">
          {steps.map((step, index) => (
            <div key={index} className="border rounded-lg p-4 bg-gray-50">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-blue-800 text-white font-bold text-sm flex items-center justify-center">
                  {step.step}
                </div>
                <h3 className="font-semibold text-gray-700">Step {step.step}</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-gray-500">Step Number</Label>
                  <Input
                    value={step.step}
                    onChange={(e) => handleStepChange(index, 'step', e.target.value)}
                    className="h-8"
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Title</Label>
                  <Input
                    value={step.title}
                    onChange={(e) => handleStepChange(index, 'title', e.target.value)}
                    className="h-8"
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Description</Label>
                  <Textarea
                    value={step.desc}
                    onChange={(e) => handleStepChange(index, 'desc', e.target.value)}
                    className="h-20"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
        <Button onClick={handleSaveSteps} className="w-full mt-4 gap-2">
          <Save className="h-4 w-4" /> Save All Changes
        </Button>
      </Card>

      <div className="text-center text-sm text-gray-500">
        <p>Changes will be reflected on the "How to Use" page immediately after saving.</p>
      </div>
    </div>
  );
}