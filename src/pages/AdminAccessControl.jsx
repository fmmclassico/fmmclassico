import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Shield, Loader2, Mail, Lock } from 'lucide-react';
import { toast } from "sonner";
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';

export default function AdminAccessControl() {
  const [user, setUser] = useState(null);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const queryClient = useQueryClient();

  const MASTER_ADMIN_EMAIL = import.meta.env.VITE_MASTER_ADMIN_EMAIL || 'fmmclassico@gmail.com';
  const ALLOWED_EMAILS = (import.meta.env.VITE_ALLOWED_ADMIN_EMAILS || MASTER_ADMIN_EMAIL)
    .split(',').map(function(e) { return e.trim(); }).filter(Boolean);
  const DEFAULT_ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || '';

  useEffect(function() {
    var checkAdmin = async function() {
      var isAuth = await base44.auth.isAuthenticated();
      if (!isAuth) { toast.error('Please login'); return; }
      var userData = await base44.auth.me();
      if (userData.role !== 'admin') { toast.error('Admin access required'); return; }
      setUser(userData);
    };
    checkAdmin();
  }, []);

  var { data: adminPasswordData = [] } = useQuery({
    queryKey: ['adminPassword'],
    queryFn: function() { return base44.entities.AdminPassword.list(); },
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
        await base44.entities.AdminPassword.update(existing.id, { password_hash: newPassword, created_by: user.email, last_changed: new Date().toISOString() });
      } else {
        await base44.entities.AdminPassword.create({ password_hash: newPassword, created_by: user.email, last_changed: new Date().toISOString() });
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
          {ALLOWED_EMAILS.map(function(email) {
            var isMaster = email.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase();
            return (
              <div key={email} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium">{email}</span>
                </div>
                <Badge className={isMaster ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}>
                  {isMaster ? 'Master Admin' : 'Admin'}
                </Badge>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-gray-400 mt-3">To add or remove admin emails, update VITE_ALLOWED_ADMIN_EMAILS and VITE_ADMIN_EMAILS in your Vercel environment variables.</p>
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
