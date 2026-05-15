import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Lock } from 'lucide-react';
import { toast } from 'sonner';

const ADMIN_PASSWORD = '0244129908fmm';
const OWNER_EMAIL = 'fmmclassico@gmail.com';

export default function AdminAuthModal({ isOpen, onClose, onSuccess, userEmail }) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // If the logged in user is the owner email, let them in immediately
    if (userEmail === OWNER_EMAIL) {
      toast.success('Welcome back! Admin access granted.');
      setPassword('');
      onSuccess();
      setLoading(false);
      return;
    }

    // For all other emails, check the password
    if (password !== ADMIN_PASSWORD) {
      toast.error('Invalid password. Please try again.');
      setLoading(false);
      return;
    }

    toast.success('Admin access granted!');
    setPassword('');
    onSuccess();
    setLoading(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-red-500" /> Admin Access Required
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {userEmail === OWNER_EMAIL ? (
            <p className="text-sm text-gray-500">
              Welcome! Click below to access the admin platform.
            </p>
          ) : (
            <>
              <p className="text-sm text-gray-500">
                Enter the admin password to continue.
              </p>
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
            </>
          )}

          <Button
            type="submit"
            disabled={loading || (userEmail !== OWNER_EMAIL && !password)}
            className="w-full gap-2"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? 'Checking...' : 'Access Admin Platform'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}