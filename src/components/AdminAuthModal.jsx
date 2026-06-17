import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Lock } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminAuthModal({ isOpen, onClose, onSuccess, userEmail }) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Admin password verification - load from environment variables
    const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD;
    
    if (password === ADMIN_PASSWORD) {
      onSuccess();
      toast.success('Admin access granted!');
      setPassword('');
    } else {
      toast.error('Invalid password');
    }

    setLoading(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-red-500" />
            Admin Access Required
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-gray-700">Email</label>
            <p className="text-sm text-gray-600 mt-1">{userEmail}</p>
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700">Admin Password</label>
            <Input
              type="password"
              placeholder="Enter admin password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1"
              autoFocus
            />
          </div>
          <Button type="submit" disabled={loading} className="w-full gap-2">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Verify
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}