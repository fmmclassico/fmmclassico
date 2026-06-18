import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlayCircle, Upload, Loader2, Video } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';

const steps = [
  { step: '1', title: 'Browse Products', desc: 'Go to Shop or Categories to find what you need.' },
  { step: '2', title: 'Add to Cart', desc: 'Tap "Add to Cart" on any product you want to buy.' },
  { step: '3', title: 'Checkout', desc: 'Go to your Cart, select a delivery zone, then tap Checkout.' },
  { step: '4', title: 'Fill Delivery Info', desc: 'Enter your name, active phone number and delivery address.' },
  { step: '5', title: 'Pay with Hubtel', desc: 'Complete payment via Mobile Money, Card, or Bank Transfer on Hubtel.' },
  { step: '6', title: 'Track Your Order', desc: 'After payment, track your order status in real-time from "My Orders" page.' },
];

export default function HowToUse() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  useEffect(() => {
    const getUser = async () => {
      const isAuth = await base44.auth.isAuthenticated();
      if (isAuth) {
        const userData = await base44.auth.me();
        setUser(userData);
        setIsAdmin(userData.role === 'admin');
      }
    };
    getUser();
  }, []);

  const { data: settings = [], refetch } = useQuery({
    queryKey: ['appSettings', 'tutorial_video'],
    queryFn: () => base44.entities.AppSetting.filter({ key: 'tutorial_video' }),
  });

  const videoUrl = settings?.[0]?.value || null;

  const handleVideoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('video/')) {
      setUploadError('Please upload a video file.');
      return;
    }
    setUploadError('');
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    if (settings?.[0]?.id) {
      await base44.entities.AppSetting.update(settings[0].id, { value: file_url });
    } else {
      await base44.entities.AppSetting.create({ key: 'tutorial_video', value: file_url });
    }
    setUploading(false);
    refetch();
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-3">
          <PlayCircle className="h-8 w-8 text-blue-800" />
        </div>
        <h1 className="text-2xl font-black text-gray-800 mb-1">How to Use FMM CLASSICO</h1>
        <p className="text-gray-500 text-sm">Follow these simple steps to shop with us</p>
      </div>

      {/* Video Section */}
      <Card className="p-5 mb-6 shadow-md">
        <div className="flex items-center gap-2 mb-4">
          <Video className="h-5 w-5 text-blue-800" />
          <h2 className="font-bold text-gray-800">Tutorial Video</h2>
        </div>

        {videoUrl ? (
          <div className="rounded-xl overflow-hidden bg-black aspect-video">
            <video
              src={videoUrl}
              controls
              className="w-full h-full"
              poster=""
            />
          </div>
        ) : (
          <div className="rounded-xl bg-gray-100 aspect-video flex flex-col items-center justify-center text-gray-400 gap-2">
            <Video className="h-12 w-12 opacity-30" />
            <p className="text-sm">No tutorial video uploaded yet</p>
            {!isAdmin && <p className="text-xs">Check back soon!</p>}
          </div>
        )}

        {/* Admin upload */}
        {isAdmin && (
          <div className="mt-4">
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
            {uploadError && <p className="text-red-500 text-xs mt-2">{uploadError}</p>}
            <p className="text-xs text-gray-400 mt-1 text-center">Only you (admin) can see this upload button</p>
        <Link to={createPageUrl('AdminPageContent')}>
          <Button variant="outline" className="gap-2 w-full mt-2">
            📝 Edit This Page Content
          </Button>
        </Link>
          </div>
        )}
      </Card>

      {/* Step-by-step guide */}
      <Card className="p-5 shadow-md mb-6">
        <h2 className="font-bold text-gray-800 mb-4">Step-by-Step Guide</h2>
        <div className="space-y-4">
          {steps.map((s) => (
            <div key={s.step} className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-800 text-white font-bold text-sm flex items-center justify-center">
                {s.step}
              </div>
              <div>
                <p className="font-semibold text-gray-800 text-sm">{s.title}</p>
                <p className="text-xs text-gray-500">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* CTA */}
      <div className="text-center space-y-3">
        <div className="grid grid-cols-1 gap-3">
          <Link to={createPageUrl('Shop')}>
            <Button className="w-full bg-blue-800 hover:bg-blue-900 font-bold">
              Start Shopping Now
            </Button>
          </Link>
          <Link to={createPageUrl('Orders')}>
            <Button variant="outline" className="w-full gap-2">
              📦 Track My Orders
            </Button>
          </Link>
          <a href="https://wa.me/233599676419" target="_blank" rel="noopener noreferrer">
            <Button variant="outline" className="w-full gap-2 text-green-700 border-green-300 hover:bg-green-50">
              Need Help? WhatsApp Us
            </Button>
          </a>
        </div>
      </div>
    </div>
  );
}