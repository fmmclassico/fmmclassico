import React, { useState, useEffect, useMemo } from 'react';
import { appClient } from '@/api/appClient.js';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Shield, Loader2, Mail, Lock, Plus, Trash2 } from 'lucide-react';
import { toast } from "sonner";

export default function AdminAccessControl() {
  const [user, setUser] = useState(null);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const queryClient = useQueryClient();

  const MASTER_ADMIN_EMAIL = (import.meta.env.VITE_MASTER_ADMIN_EMAIL || 'fmmclassico@gmail.com').trim().toLowerCase();
  const ENV_ADMIN_EMAILS = [...new Set([
    ...(import.meta.env.VITE_ALLOWED_ADMIN_EMAILS || '').split(','),
    ...(import.meta.env.VITE_ADMIN_EMAILS || '').split(','),
    MASTER_ADMIN_EMAIL,
  ].map(function(value) { return value.trim().toLowerCase(); }).filter(Boolean))];
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const DEFAULT_ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || '';

  function parseStoredAdminEmails(value) {
    if (!value) return [];
    if (Array.isArray(value)) return value.map(function(item) { return String(item).trim().toLowerCase(); }).filter(Boolean);
    if (typeof value === 'string') {
      try {
        var parsed = JSON.parse(value);
        if (Array.isArray(parsed)) return parsed.map(function(item) { return String(item).trim().toLowerCase(); }).filter(Boolean);
      } catch (_) {}
      return value.split(/[,\n]/).map(function(item) { return item.trim().toLowerCase(); }).filter(Boolean);
    }
    return [];
  }

  function normalizeEmail(value) {
    return String(value || '').trim().toLowerCase();
  }

  useEffect(function() {
    var checkAdmin = async function() {
      try {
        var isAuth = await appClient.auth.isAuthenticated();
        if (!isAuth) { toast.error('Please login'); return; }
        var userData = await appClient.auth.me();
        if (!userData?.isAdmin) { toast.error('Admin access required'); return; }
        setUser(userData);
      } catch (err) {
        toast.error('Unable to verify admin access');
      }
    };
    checkAdmin();
  }, []);

  var { data: adminEmailSettings = [] } = useQuery({
    queryKey: ['adminAccessEmails'],
    queryFn: function() { return appClient.entities.AppSetting.filter({ key: 'admin_access_emails' }); },
    enabled: !!user,
  });

  var storedAdminEmailSetting = adminEmailSettings.length > 0 ? adminEmailSettings[0] : null;
  var storedAdminEmails = parseStoredAdminEmails(storedAdminEmailSetting?.value);

  var combinedAdminEmails = useMemo(function() {
    return [...new Set([].concat(ENV_ADMIN_EMAILS, storedAdminEmails).filter(Boolean))].sort();
  }, [storedAdminEmailSetting?.value]);

  var saveAdminEmailsMutation = useMutation({
    mutationFn: async function(nextEmails) {
      var payload = { key: 'admin_access_emails', value: JSON.stringify(nextEmails) };
      if (storedAdminEmailSetting?.id) return appClient.entities.AppSetting.update(storedAdminEmailSetting.id, payload);
      return appClient.entities.AppSetting.create(payload);
    },
    onSuccess: function() {
      setNewAdminEmail('');
      queryClient.invalidateQueries({ queryKey: ['adminAccessEmails'] });
      toast.success('Admin access list updated. Added users should sign out and sign back in to refresh access.');
    },
    onError: function(err) {
      toast.error('Failed to update admin emails: ' + (err?.message || 'Unknown error'));
    }
  });

  var handleAddAdminEmail = function() {
    var normalized = normalizeEmail(newAdminEmail);
    if (!normalized || !normalized.includes('@')) { toast.error('Enter a valid email address'); return; }
    if (combinedAdminEmails.includes(normalized)) { toast.error('That email already has admin access'); return; }
    saveAdminEmailsMutation.mutate([].concat(storedAdminEmails, [normalized]).filter(Boolean).sort());
  };

  var handleRemoveAdminEmail = function(email) {
    var normalized = normalizeEmail(email);
    if (normalized === MASTER_ADMIN_EMAIL) { toast.error('Master admin cannot be removed here'); return; }
    if (ENV_ADMIN_EMAILS.includes(normalized) && !storedAdminEmails.includes(normalized)) { toast.error('This email is locked by environment variables. Remove it in Vercel to disable access.'); return; }
    saveAdminEmailsMutation.mutate(storedAdminEmails.filter(function(item) { return item !== normalized; }));
  };

  var { data: adminPasswordData = [] } = useQuery({
    queryKey: ['adminPassword'],
    queryFn: function() { return appClient.entities.AdminPassword.list(); },
    enabled: !!user,
  });

  var currentAdminPassword = (adminPasswordData.length > 0 ? adminPasswordData[0].password_hash : null) || DEFAULT_ADMIN_PASSWORD;

  var handleChangePassword = async function() {
    if (!currentPassword) { toast.error('Enter current password'); return; }
    if (currentPassword !== currentAdminPassword) { toast.error('Current password is incorrect'); return; }
    if (!newPassword || newPassword.length < 6) { toast.error('New password must be at least 6 characters'); return; }
    if (newPassword !== confirmPassword) { toast.error('Passwords do not match'); return; }

    try {
      var existing = adminPasswordData.length > 0 ? adminPasswordData[0] : null;
      if (existing) {
        await appClient.entities.AdminPassword.update(existing.id, { password_hash: newPassword, created_by: user.email, last_changed: new Date().toISOString() });
      } else {
        await appClient.entities.AdminPassword.create({ password_hash: newPassword, created_by: user.email, last_changed: new Date().toISOString() });
      }
      toast.success('Admin password changed successfully!');
      setShowChangePassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      queryClient.invalidateQueries({ queryKey: ['adminPassword'] });
    } catch (err) {
      toast.error('Failed to change password: ' + err.message);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Shield className="w-5 h-5" /> Admin Access Control
        </h1>
        <p className="text-sm text-gray-500">Manage admin permissions for FMM CLASSICO</p>
        <p className="text-xs text-blue-600 mt-1">Logged in as: {user.email}</p>
      </div>

      {/* Authorized Emails List */}
      <Card className="p-4 rounded-2xl mb-4">
        <h2 className="font-bold text-gray-800 mb-3">Authorized Admin Emails</h2>
        <p className="text-xs text-gray-500 mb-3">These emails have admin access (configured in environment variables):</p>
        <div className="space-y-2">
          {combinedAdminEmails.map(function(email) {
            var isMaster = email === MASTER_ADMIN_EMAIL;
            var isEnvControlled = ENV_ADMIN_EMAILS.includes(email);
            return (
              <div key={email} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <Mail className="w-4 h-4 text-gray-400 shrink-0" />
                  <span className="text-sm font-medium break-all">{email}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge className={isMaster ? 'bg-purple-100 text-purple-700' : isEnvControlled ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}>
                    {isMaster ? 'Master Admin' : isEnvControlled ? 'Env Admin' : 'DB Admin'}
                  </Badge>
                  {!isMaster && <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-red-600 hover:text-red-700" onClick={function() { handleRemoveAdminEmail(email); }} disabled={saveAdminEmailsMutation.isPending}><Trash2 className="w-4 h-4" /></Button>}
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]">
          <Input type="email" value={newAdminEmail} onChange={function(e) { setNewAdminEmail(e.target.value); }} placeholder="Add admin email" />
          <Button type="button" className="bg-blue-800 text-white hover:bg-blue-900" onClick={handleAddAdminEmail} disabled={saveAdminEmailsMutation.isPending}><Plus className="w-4 h-4 mr-1" /> Add Email</Button>
        </div>
        <p className="text-xs text-gray-400 mt-3">Env Admin entries come from your Vercel variables. DB Admin entries can now be enabled or disabled directly here.</p>
      </Card>

      {/* Change Password */}
      <Card className="p-4 rounded-2xl">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-gray-800 flex items-center gap-2">
            <Lock className="w-4 h-4" /> Admin Password
          </h2>
          {!showChangePassword && (
            <Button size="sm" variant="outline" onClick={function() { setShowChangePassword(true); }}>Change Password</Button>
          )}
        </div>

        {showChangePassword ? (
          <div className="space-y-3">
            <div>
              <Label className="text-sm">Current Password</Label>
              <Input type="password" value={currentPassword} onChange={function(e) { setCurrentPassword(e.target.value); }} placeholder="Enter current admin password" className="mt-1" />
            </div>
            <div>
              <Label className="text-sm">New Password</Label>
              <Input type="password" value={newPassword} onChange={function(e) { setNewPassword(e.target.value); }} placeholder="Enter new password (min 6 chars)" className="mt-1" />
            </div>
            <div>
              <Label className="text-sm">Confirm New Password</Label>
              <Input type="password" value={confirmPassword} onChange={function(e) { setConfirmPassword(e.target.value); }} placeholder="Confirm new password" className="mt-1" />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={function() { setShowChangePassword(false); setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); }}>Cancel</Button>
              <Button className="bg-blue-800 text-white hover:bg-blue-900" onClick={handleChangePassword}>Save New Password</Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500">The admin password is used to verify identity when performing sensitive actions.</p>
        )}
      </Card>
    </div>
  );
}
