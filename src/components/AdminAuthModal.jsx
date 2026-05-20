import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Lock, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';

const ADMIN_PASSWORD = '0244129908fmm';
const OWNER_EMAIL = 'fmmclassico@gmail.com';

// Generate a 6-digit code
function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export default function AdminAuthModal({ isOpen, onClose, onSuccess, userEmail }) {
  const [step, setStep] = useState('password'); // 'password' | 'otp'
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (password !== ADMIN_PASSWORD) {
      toast.error('Invalid password');
      return;
    }
    setLoading(true);
    const code = generateCode();
    setGeneratedCode(code);

    try {
      // Send verification code to OWNER's email only (do NOT show destination to user)
      await base44.integrations.Core.SendEmail({
        to: OWNER_EMAIL,
        subject: 'FMM CLASSICO — Admin Verification Code',
        body: `Someone is trying to access the admin panel.\n\nVerification Code: ${code}\n\nThis code expires in 10 minutes.\n\nIf this wasn't you, please change your admin password immediately.`,
      });
      toast.success('Verification code sent. Please enter it below.');
      setStep('otp');
    } catch {
      toast.error('Failed to send verification code. Try again.');
    }
    setLoading(false);
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    if (otp.trim() !== generatedCode) {
      toast.error('Incorrect verification code');
      return;
    }
    toast.success('Admin access granted!');
    setPassword('');
    setOtp('');
    setStep('password');
    onSuccess();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step === 'password' ? (
              <><Lock className="h-5 w-5 text-red-500" /> Admin Access Required</>
            ) : (
              <><ShieldCheck className="h-5 w-5 text-blue-500" /> Two-Step Verification</>
            )}
          </DialogTitle>
        </DialogHeader>

        {step === 'password' ? (
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <p className="text-sm text-gray-500">Enter your admin password to continue.</p>
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
            <Button type="submit" disabled={loading || !password} className="w-full gap-2">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? 'Sending verification code...' : 'Continue'}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleOtpSubmit} className="space-y-4">
            <p className="text-sm text-gray-500">
              A verification code has been sent. Please enter it below to complete login.
            </p>
            <div>
              <label className="text-sm font-semibold text-gray-700">Verification Code</label>
              <Input
                type="text"
                placeholder="Enter 6-digit code"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="mt-1 text-center text-xl tracking-widest font-bold"
                maxLength={6}
                autoFocus
              />
            </div>
            <Button type="submit" disabled={loading || otp.length < 6} className="w-full gap-2">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Verify & Access Admin
            </Button>
            <button
              type="button"
              className="w-full text-xs text-gray-400 hover:text-gray-600 underline"
              onClick={() => { setStep('password'); setOtp(''); setGeneratedCode(''); }}
            >
              Back to password
            </button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}