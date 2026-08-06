import React, { useState, useEffect, useMemo } from 'react';
import { appClient } from '@/api/appClient.js';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Shield, Loader2, Mail, Lock, ShieldCheck, ShieldOff } from 'lucide-react';
import { toast } from 'sonner';

function ensureArray(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  return [];
}

export default function AdminAccessControl() {
  const [user, setUser] = useState(null);
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const queryClient = useQueryClient();

  const MASTER_ADMIN_EMAIL = (import.meta.env.VITE_MASTER_ADMIN_EMAIL || 'fmmclassico@gmail.com').trim().toLowerCase();
  const APPROVED_EMAILS = [...new Set([
    ...(import.meta.env.VITE_ALLOWED_ADMIN_EMAILS || '').split(','),
    ...(import.meta.env.VITE_ADMIN_EMAILS || '').split(','),
    MASTER_ADMIN_EMAIL,
  ].map((value) => value.trim().toLowerCase()).filter(Boolean))];
  const DEFAULT_ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || '';

  function parseControls(value) {
    if (!value) return {};
    if (typeof value === 'object' && !Array.isArray(value)) return value;
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
      } catch (_) {
        return {};
      }
    }
    return {};
  }

  useEffect(() => {
    let active = true;

    const checkAdmin = async () => {
      try {
        const isAuth = await appClient.auth.isAuthenticated();
        if (!active) return;

        if (!isAuth) {
          toast.error('Please login');
          return;
        }

        const userData = await appClient.auth.me();
        if (!active) return;

        const hasAdminAccess = userData?.isAdmin === true || userData?.role === 'admin';
        if (!hasAdminAccess) {
          toast.error('Admin access required');
          return;
        }

        setUser(userData);
      } catch (error) {
        console.error('Admin access check failed:', error);
        toast.error('Unable to verify admin access right now.');
      } finally {
        if (active) {
          setIsCheckingAccess(false);
        }
      }
    };

    checkAdmin();

    return () => {
      active = false;
    };
  }, []);

  const { data: adminAccessSettingsRaw = [] } = useQuery({
    queryKey: ['adminAccessControls'],
    queryFn: async () => ensureArray(await appClient.entities.AppSetting.filter({ key: 'admin_access_controls' })),
    enabled: !!user,
  });

  const adminAccessSettings = useMemo(() => ensureArray(adminAccessSettingsRaw), [adminAccessSettingsRaw]);
  const accessControlSetting = adminAccessSettings.length > 0 ? adminAccessSettings[0] : null;
  const storedControls = useMemo(() => parseControls(accessControlSetting?.value), [accessControlSetting?.value]);

  const emailStates = useMemo(() => (
    APPROVED_EMAILS.map((email) => {
      const isMaster = email === MASTER_ADMIN_EMAIL;
      const enabled = isMaster ? true : storedControls[email]?.enabled !== false;
      return { email, isMaster, enabled };
    })
  ), [APPROVED_EMAILS, MASTER_ADMIN_EMAIL, storedControls]);

  const saveAccessMutation = useMutation({
    mutationFn: async (nextControls) => {
      const payload = { key: 'admin_access_controls', value: JSON.stringify(nextControls) };
      if (accessControlSetting?.id) return appClient.entities.AppSetting.update(accessControlSetting.id, payload);
      return appClient.entities.AppSetting.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminAccessControls'] });
      toast.success('Admin access updated. That email can sign in only when allowed and when the admin password is correct.');
    },
    onError: (error) => {
      toast.error(`Failed to update admin access: ${error?.message || 'Unknown error'}`);
    },
  });

  const handleToggleAccess = (email, nextEnabled) => {
    if (email === MASTER_ADMIN_EMAIL) return;
    const nextControls = { ...storedControls, [email]: { enabled: !!nextEnabled } };
    saveAccessMutation.mutate(nextControls);
  };

  const { data: adminPasswordDataRaw = [] } = useQuery({
    queryKey: ['adminPassword'],
    queryFn: async () => ensureArray(await appClient.entities.AdminPassword.list()),
    enabled: !!user,
  });

  const adminPasswordData = useMemo(() => ensureArray(adminPasswordDataRaw), [adminPasswordDataRaw]);
  const currentAdminPassword = (adminPasswordData.length > 0 ? adminPasswordData[0]?.password_hash : null) || DEFAULT_ADMIN_PASSWORD;

  const handleChangePassword = async () => {
    if (!currentPassword) {
      toast.error('Enter current password');
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
      toast.error('Passwords do not match');
      return;
    }

    try {
      const existing = adminPasswordData.length > 0 ? adminPasswordData[0] : null;
      const payload = {
        password_hash: newPassword,
        created_by: user.email,
        last_changed: new Date().toISOString(),
      };

      if (existing?.id) {
        await appClient.entities.AdminPassword.update(existing.id, payload);
      } else {
        await appClient.entities.AdminPassword.create(payload);
      }

      toast.success('Admin password changed successfully!');
      setShowChangePassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      queryClient.invalidateQueries({ queryKey: ['adminPassword'] });
    } catch (error) {
      toast.error(`Failed to change password: ${error?.message || 'Unknown error'}`);
    }
  };

  if (isCheckingAccess) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4 text-center text-sm text-gray-500">
        Admin access is required to manage this page.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-xl font-bold text-gray-900">
          <Shield className="h-5 w-5" /> Admin Access Control
        </h1>
        <p className="text-sm text-gray-500">Manage admin permissions for FMM CLASSICO</p>
        <p className="mt-1 text-xs text-blue-600">Logged in as: {user.email}</p>
      </div>

      <Card className="mb-4 rounded-2xl p-4">
        <h2 className="mb-3 font-bold text-gray-800">Authorized Admin Emails</h2>
        <p className="mb-3 text-xs text-gray-500">Only these approved emails can ever become admins. Use the buttons to allow or disable access without deleting any email.</p>
        <div className="space-y-2">
          {emailStates.map((item) => (
            <div key={item.email} className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 p-3">
              <div className="flex min-w-0 items-center gap-2">
                <Mail className="h-4 w-4 shrink-0 text-gray-400" />
                <span className="break-all text-sm font-medium">{item.email}</span>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge className={item.isMaster ? 'bg-purple-100 text-purple-700' : item.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700'}>
                  {item.isMaster ? 'Master Admin' : item.enabled ? 'Access Allowed' : 'Access Disabled'}
                </Badge>
                {item.isMaster ? (
                  <span className="text-[11px] text-gray-500">Always enabled</span>
                ) : item.enabled ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1 border-amber-200 text-amber-700 hover:bg-amber-50"
                    onClick={() => handleToggleAccess(item.email, false)}
                    disabled={saveAccessMutation.isPending}
                  >
                    <ShieldOff className="h-4 w-4" /> Disable
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    className="gap-1 bg-blue-800 text-white hover:bg-blue-900"
                    onClick={() => handleToggleAccess(item.email, true)}
                    disabled={saveAccessMutation.isPending}
                  >
                    <ShieldCheck className="h-4 w-4" /> Allow
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-gray-400">Allowed emails can continue only after they also enter the admin password. Disabled emails stay on the list but cannot access the admin area.</p>
      </Card>

      <Card className="rounded-2xl p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-bold text-gray-800">
            <Lock className="h-4 w-4" /> Admin Password
          </h2>
          {!showChangePassword && (
            <Button size="sm" variant="outline" onClick={() => setShowChangePassword(true)}>
              Change Password
            </Button>
          )}
        </div>

        {showChangePassword ? (
          <div className="space-y-3">
            <div>
              <Label className="text-sm">Current Password</Label>
              <Input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} placeholder="Enter current admin password" className="mt-1" />
            </div>
            <div>
              <Label className="text-sm">New Password</Label>
              <Input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="Enter new password (min 6 chars)" className="mt-1" />
            </div>
            <div>
              <Label className="text-sm">Confirm New Password</Label>
              <Input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Confirm new password" className="mt-1" />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowChangePassword(false);
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                }}
              >
                Cancel
              </Button>
              <Button className="bg-blue-800 text-white hover:bg-blue-900" onClick={handleChangePassword} disabled={saveAccessMutation.isPending}>
                Save New Password
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500">The admin password is used to verify identity when performing sensitive actions.</p>
        )}
      </Card>
    </div>
  );
}
