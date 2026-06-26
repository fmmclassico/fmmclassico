import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

export default function AdminAuthModal({ isOpen, onClose, onSuccess, userEmail }) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.rpc('verify_admin_password', {
        input_password: password
      });

      if (error) {
        console.error('Verification error:', error);
        toast.error('Unable to verify. Please try again.');
      } else if (data === true) {
        onSuccess();
        toast.success('Admin access granted!');
        setPassword('');
      } else {
        toast.error('Invalid password');
      }
    } catch (err) {
      console.error('Admin auth error:', err);
      toast.error('Something went wrong. Please try again.');
    }

    setLoading(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5" />
            Admin Access Required
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Email</label>
            <p className="text-sm text-gray-600">{userEmail}</p>
          </div>
          <div>
            <label className="text-sm font-medium">Admin Password</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1"
              autoFocus
            />
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Verify
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
