import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Shield,
  ShieldOff,
  Loader2,
  CheckCircle,
  AlertCircle,
  Mail,
  Settings
} from 'lucide-react';
import { toast } from "sonner";
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';

const RESEND_API_KEY = 're_h3nmhgLi_H26Z9XqeoaqLnrTq2bxZ6nzr';
const MASTER_ADMIN_EMAIL = 'fmmclassico@gmail.com';

const ALLOWED_EMAILS = [
  'fmmclassico@gmail.com',
  'fmmcompanylimited@gmail.com',
  'mensahfedramartha@gmail.com',
  'marthamensahfedra@gmail.com',
  'lovelyfedra@gmail.com'
];

const DEFAULT_ADMIN_PASSWORD = '0599676419fmm';

async function sendEmailWithResend(to, subject, htmlBody) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'onboarding@resend.dev',
      to,
      subject,
      html: htmlBody
    })
  });
  if (!response.ok) throw new Error('Failed to send email');
}

export default function AdminAccessControl() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [isGranting, setIsGranting] = useState(null);
  const [isRevoking, setIsRevoking] = useState(null);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const isAuth = await base44.auth.isAuthenticated();
        if (!isAuth) {
          setAccessDenied(true);
          setLoading(false);
          return;
        }
        const userData = await base44.auth.me();
        if (userData.email !== MASTER_ADMIN_EMAIL) {
          setAccessDenied(true);
          setLoading(false);
          return;
        }
        setUser(userData);
        setLoading(false);
      } catch (error) {
        setAccessDenied(true);
        setLoading(false);
      }
    };
    loadUser();
  }, []);

  const { data: allUsers = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.list(),
    enabled: !!user,
  });

  const { data: adminPasswordData } = useQuery({
    queryKey: ['adminPassword'],
    queryFn: () => base44.entities.AdminPassword.list(),
    enabled: !!user,
  });

  const currentAdminPassword = adminPasswordData?.[0]?.password_hash || DEFAULT_ADMIN_PASSWORD;

  // Grant access directly — no password needed
  const handleGrantClick = async (userEmail) => {
    if (userEmail === MASTER_ADMIN_EMAIL) {
      toast.error('Cannot modify master admin access');
      return;
    }
    const userInfo = allUsers.find(u => u.email === userEmail);
    setIsGranting(userEmail);
    try {
      if (userInfo && userInfo.id) {
        await base44.entities.User.update(userInfo.id, { role: 'admin' });
        toast.success(`✅ Admin access granted to ${userEmail}`);
      } else {
        await base44.users.inviteUser(userEmail, 'user');
        toast.success(`✅ Invitation sent to ${userEmail}.`);
      }
      queryClient.invalidateQueries({ queryKey: ['allUsers'] });
    } catch (error) {
      toast.error(error.message || 'Failed to grant access');
    } finally {
      setIsGranting(null);
    }
  };

  // Revoke access directly — no password needed
  const handleRevokeAdmin = async (userId, userEmail) => {
    if (userEmail === MASTER_ADMIN_EMAIL) {
      toast.error('Cannot revoke master admin access');
      return;
    }
    if (!confirm(`Are you sure you want to remove admin access from ${userEmail}?`)) return;
    setIsRevoking(userId);
    try {
      await base44.entities.User.update(userId, { role: 'user' });
      toast.success(`✅ Admin access revoked for ${userEmail}`);
      queryClient.invalidateQueries({ queryKey: ['allUsers'] });
    } catch (error) {
      toast.error('Failed to revoke admin access: ' + error.message);
    } finally {
      setIsRevoking(null);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword) {
      toast.error('Please enter the current password');
      return;
    }
    if (currentPassword !== currentAdminPassword) {
      toast.error('Current password is incorrect');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    setChangingPassword(true);
    try {
      const existingPassword = adminPasswordData?.[0];
      if (existingPassword) {
        await base44.entities.AdminPassword.update(existingPassword.id, {
          password_hash: newPassword,
          created_by: user.email,
          last_changed: new Date().toISOString()
        });
      } else {
        await base44.entities.AdminPassword.create({
          password_hash: newPassword,
          created_by: user.email,
          last_changed: new Date().toISOString()
        });
      }
      await sendEmailWithResend(
        MASTER_ADMIN_EMAIL,
        'FMM CLASSICO — Admin Password Changed',
        `
          <div style="font-family: Arial, sans-serif; padding: 40px; text-align: center;">
            <h2>FMM CLASSICO Admin</h2>
            <p>Your admin password has been successfully changed.</p>
            <p style="color: grey; font-size: 12px;">
              If you did not do this, please contact support immediately.
            </p>
          </div>
        `
      );
      toast.success('✅ Password changed! A confirmation email has been sent.');
      setShowChangePassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      queryClient.invalidateQueries({ queryKey: ['adminPassword'] });
    } catch (error) {
      toast.error('Failed to change password: ' + error.message);
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card className="p-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-800" />
          <p className="text-gray-600">Loading...</p>
        </Card>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card className="p-8 text-center">
          <AlertCircle className="h-8 w-8 mx-auto mb-4 text-red-500" />
          <p className="text-red-600 font-bold">Access Denied</p>
          <p className="text-gray-500 text-sm mt-2">Only fmmclassico@gmail.com can access this page.</p>
          <Link to={createPageUrl('Home')}>
            <Button className="mt-4" variant="outline">← Back to Home</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <Link to={createPageUrl('Home')}>
          <Button variant="outline" className="gap-2">← Back to Home</Button>
        </Link>
      </div>

      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-3">
          <Shield className="h-8 w-8 text-blue-800" />
        </div>
        <h1 className="text-2xl font-black text-gray-800 mb-1">Admin Access Control</h1>
        <p className="text-gray-500 text-sm">Manage admin permissions for FMM CLASSICO</p>
        <Badge className="mt-2 bg-green-100 text-green-700 border-green-300">
          <CheckCircle className="h-3 w-3 mr-1" />
          Master Admin: {user.email}
        </Badge>
      </div>

      <Card className="p-6 mb-6 shadow-md border-2 border-blue-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-800" />
            <h2 className="font-bold text-gray-800">Authorized Emails</h2>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowChangePassword(true)}
            className="text-blue-800 border-blue-800 hover:bg-blue-50"
          >
            <Settings className="h-4 w-4 mr-2" />
            Change Admin Password
          </Button>
        </div>

        <div className="space-y-2">
          {ALLOWED_EMAILS.map((email) => {
            const userInfo = allUsers.find(u => u.email === email);
            const isAdmin = userInfo?.role === 'admin';
            const isMasterAdmin = email === MASTER_ADMIN_EMAIL;
            return (
              <div
                key={email}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  isMasterAdmin ? 'bg-blue-50 border-blue-200'
                  : isAdmin ? 'bg-green-50 border-green-200'
                  : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    isMasterAdmin ? 'bg-blue-800 text-white'
                    : isAdmin ? 'bg-green-600 text-white'
                    : 'bg-gray-200 text-gray-600'
                  }`}>
                    <Mail className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-800 text-sm">{email}</p>
                    <div className="flex gap-2 mt-1">
                      {isMasterAdmin ? (
                        <Badge className="text-xs bg-blue-800 text-white">
                          <Shield className="h-3 w-3 mr-1" /> Master Admin
                        </Badge>
                      ) : isAdmin ? (
                        <Badge className="text-xs bg-green-600 text-white">
                          <CheckCircle className="h-3 w-3 mr-1" /> Admin Access
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs text-gray-600">No Admin Access</Badge>
                      )}
                    </div>
                  </div>
                </div>
                {!isMasterAdmin && (
                  <div className="flex gap-2">
                    {isAdmin ? (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleRevokeAdmin(userInfo?.id, email)}
                        disabled={isRevoking === userInfo?.id}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        {isRevoking === userInfo?.id
                          ? <><Loader2 className="h-3 w-3 animate-spin mr-2" />Removing...</>
                          : <><ShieldOff className="h-3 w-3 mr-2" />Revoke</>}
                      </Button>
                    ) : (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleGrantClick(email)}
                        disabled={isGranting === email}
                        className="bg-blue-800 hover:bg-blue-900"
                      >
                        {isGranting === email
                          ? <><Loader2 className="h-3 w-3 animate-spin mr-2" />Granting...</>
                          : <><Shield className="h-3 w-3 mr-2" />Grant</>}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="flex items-start gap-2">
          <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
          <div className="text-sm text-yellow-800">
            <p className="font-semibold mb-1">Important Notes:</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Only <strong>fmmclassico@gmail.com</strong> can access this page</li>
              <li>Only the {ALLOWED_EMAILS.length} authorized emails above can be granted admin access</li>
            </ul>
          </div>
        </div>
      </div>

      {showChangePassword && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-lg w-full p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-2">Change Admin Password</h3>
            <p className="text-sm text-gray-600 mb-4">
              A confirmation email will be sent to <strong>{MASTER_ADMIN_EMAIL}</strong> after the change.
            </p>
            <div className="space-y-4">
              <div>
                <Label>Current Password</Label>
                <Input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>New Password</Label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Confirm New Password</Label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="mt-1"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => { setShowChangePassword(false); setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); }}>
                  Cancel
                </Button>
                <Button onClick={handleChangePassword} disabled={changingPassword} className="bg-green-600 hover:bg-green-700">
                  {changingPassword
                    ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Changing...</>
                    : 'Change Password'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}