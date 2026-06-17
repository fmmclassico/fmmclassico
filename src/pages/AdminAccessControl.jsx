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

export default function AdminAccessControl() {
  const [user, setUser] = useState(null);
  const [isGranting, setIsGranting] = useState(null);
  const [isRevoking, setIsRevoking] = useState(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pendingEmail, setPendingEmail] = useState(null);
  const [adminPassword, setAdminPassword] = useState('');
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [verificationStep, setVerificationStep] = useState(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [sentCodeEmail, setSentCodeEmail] = useState('');
  const queryClient = useQueryClient();

  const MASTER_ADMIN_EMAIL = 'fmmclassico@gmail.com';
  const VERIFICATION_EMAILS = ['fmmclassico@gmail.com', 'mensahfedramartha@gmail.com'];
  
  const ALLOWED_EMAILS = [
    'fmmclassico@gmail.com',
    'fmmcompanylimited@gmail.com',
    'mensahfedramartha@gmail.com',
    'marthamensahfedra@gmail.com',
    'lovelyfedra@gmail.com'
  ];

  const DEFAULT_ADMIN_PASSWORD = '0599676419fmm';

  useEffect(() => {
    const checkMasterAdmin = async () => {
      const isAuth = await base44.auth.isAuthenticated();
      if (!isAuth) {
        toast.error('Please login');
        return;
      }
      const userData = await base44.auth.me();
      if (userData.role !== 'admin') {
        toast.error('Admin access required');
        return;
      }
      if (userData.email !== MASTER_ADMIN_EMAIL) {
        toast.error('Only fmmclassico@gmail.com can access this page');
        return;
      }
      setUser(userData);
    };
    checkMasterAdmin();
  }, []);

  const { data: allUsers = [], isLoading } = useQuery({
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

  const adminUsers = allUsers.filter(u => ALLOWED_EMAILS.includes(u.email) && u.role === 'admin');
  const regularUsers = allUsers.filter(u => ALLOWED_EMAILS.includes(u.email) && u.role === 'user');

  const handleGrantClick = (userEmail) => {
    if (userEmail === MASTER_ADMIN_EMAIL) {
      toast.error('Cannot modify master admin access');
      return;
    }
    setPendingEmail(userEmail);
    setShowPasswordModal(true);
    setAdminPassword('');
  };

  const verifyPasswordAndGrant = async () => {
    if (!adminPassword) {
      toast.error('Please enter the admin password');
      return;
    }

    // Verify password
    if (adminPassword !== currentAdminPassword) {
      toast.error('Incorrect password');
      return;
    }

    setShowPasswordModal(false);
    
    // Now grant admin access
    const userInfo = allUsers.find(u => u.email === pendingEmail);
    setIsGranting(pendingEmail);
    try {
      if (userInfo && userInfo.id) {
        await base44.entities.User.update(userInfo.id, { role: 'admin' });
        toast.success(`✅ Admin access granted to ${pendingEmail}`);
      } else {
        // User doesn't exist - invite them first with user role, then grant admin
        await base44.users.inviteUser(pendingEmail, 'user');
        toast.success(`✅ Invitation sent to ${pendingEmail}. Once they register, you can grant admin access.`);
      }
      queryClient.invalidateQueries({ queryKey: ['allUsers'] });
    } catch (error) {
      console.error('Grant error:', error);
      toast.error(error.message || 'Failed to grant access');
    } finally {
      setIsGranting(null);
      setPendingEmail(null);
      setAdminPassword('');
    }
  };

  const handleChangePasswordClick = () => {
    setShowChangePassword(true);
    setVerificationStep('password');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const sendVerificationCode = async () => {
    if (!currentPassword || currentPassword !== currentAdminPassword) {
      toast.error('Current password is incorrect');
      return;
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    try {
      // Send to both verification emails
      for (const email of VERIFICATION_EMAILS) {
        await base44.entities.VerificationCode.create({
          email,
          code,
          purpose: 'password_change',
          expires_at: expiresAt,
          is_used: false
        });
        
        // Send email notification
        await base44.integrations.Core.SendEmail({
          to: email,
          subject: 'Admin Password Change Verification Code',
          body: `Your verification code is: ${code}\n\nThis code expires in 10 minutes.\n\nIf you did not request this, please ignore this email.`
        });
      }

      setSentCodeEmail(VERIFICATION_EMAILS.join(' and '));
      setVerificationStep('code');
      toast.success(`✅ Verification code sent to ${VERIFICATION_EMAILS.join(' and ')}`);
    } catch (error) {
      console.error('Send code error:', error);
      toast.error('Failed to send verification code: ' + error.message);
    }
  };

  const verifyCodeAndChangePassword = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast.error('Please enter the 6-digit verification code');
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

    try {
      // Verify code for both emails
      let validCode = null;
      for (const email of VERIFICATION_EMAILS) {
        const codes = await base44.entities.VerificationCode.filter({
          email,
          code: verificationCode,
          purpose: 'password_change',
          is_used: false
        });
        
        const valid = codes.find(c => new Date(c.expires_at) > new Date());
        if (valid) {
          validCode = valid;
          break;
        }
      }

      if (!validCode) {
        toast.error('Invalid or expired verification code');
        return;
      }

      // Mark code as used
      await base44.entities.VerificationCode.update(validCode.id, { is_used: true });

      // Update password
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

      toast.success('✅ Admin password changed successfully!');
      setShowChangePassword(false);
      queryClient.invalidateQueries({ queryKey: ['adminPassword'] });
    } catch (error) {
      console.error('Change password error:', error);
      toast.error('Failed to change password: ' + error.message);
    }
  };

  const handleRevokeAdmin = async (userId, userEmail) => {
    if (userEmail === MASTER_ADMIN_EMAIL) {
      toast.error('Cannot revoke master admin access');
      return;
    }

    if (!confirm(`Are you sure you want to remove admin access from ${userEmail}?`)) {
      return;
    }

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

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card className="p-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-800" />
          <p className="text-gray-600">Verifying access...</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <Link to={createPageUrl('Home')}>
          <Button variant="outline" className="gap-2">
            ← Back to Home
          </Button>
        </Link>
      </div>

      {/* Header */}
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

      {/* Authorized Emails */}
      <Card className="p-6 mb-6 shadow-md border-2 border-blue-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-800" />
            <h2 className="font-bold text-gray-800">Authorized Emails</h2>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleChangePasswordClick}
            className="text-blue-800 border-blue-800 hover:bg-blue-50"
          >
            <Settings className="h-4 w-4 mr-2" />
            Change Admin Password
          </Button>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Only these {ALLOWED_EMAILS.length} emails can be granted admin access. Enter the admin password to grant access.
        </p>
        <div className="space-y-2">
          {ALLOWED_EMAILS.map((email) => {
            const userInfo = allUsers.find(u => u.email === email);
            const isAdmin = userInfo?.role === 'admin';
            const isMasterAdmin = email === MASTER_ADMIN_EMAIL;
            
            return (
              <div 
                key={email}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  isMasterAdmin 
                    ? 'bg-blue-50 border-blue-200' 
                    : isAdmin 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    isMasterAdmin 
                      ? 'bg-blue-800 text-white' 
                      : isAdmin 
                        ? 'bg-green-600 text-white' 
                        : 'bg-gray-200 text-gray-600'
                  }`}>
                    <Mail className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-800 text-sm">{email}</p>
                    <div className="flex gap-2 mt-1">
                      {isMasterAdmin ? (
                        <Badge className="text-xs bg-blue-800 text-white">
                          <Shield className="h-3 w-3 mr-1" />
                          Master Admin
                        </Badge>
                      ) : isAdmin ? (
                        <Badge className="text-xs bg-green-600 text-white">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Admin Access
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs text-gray-600">
                          No Admin Access
                        </Badge>
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
                        {isRevoking === userInfo?.id ? (
                          <><Loader2 className="h-3 w-3 animate-spin mr-2" /> Removing...</>
                        ) : (
                          <><ShieldOff className="h-3 w-3 mr-2" /> Revoke</>
                        )}
                      </Button>
                    ) : (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleGrantClick(email)}
                        disabled={isGranting === email}
                        className="bg-blue-800 hover:bg-blue-900"
                      >
                        {isGranting === email ? (
                          <><Loader2 className="h-3 w-3 animate-spin mr-2" /> Granting...</>
                        ) : (
                          <><Shield className="h-3 w-3 mr-2" /> Grant</>
                        )}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>



      {/* Info Box */}
      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="flex items-start gap-2">
          <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
          <div className="text-sm text-yellow-800">
            <p className="font-semibold mb-1">Important Notes:</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Only <strong>fmmclassico@gmail.com</strong> can access this page</li>
              <li>Only the {ALLOWED_EMAILS.length} authorized emails listed above can be granted admin access</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Enter Admin Password</h3>
            <p className="text-sm text-gray-600 mb-4">
              Grant admin access to <strong>{pendingEmail}</strong>
            </p>
            <Input
              type="password"
              placeholder="Enter admin password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && verifyPasswordAndGrant()}
              className="mb-4"
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowPasswordModal(false);
                  setPendingEmail(null);
                  setAdminPassword('');
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={verifyPasswordAndGrant}
                disabled={isGranting === pendingEmail}
                className="bg-blue-800 hover:bg-blue-900"
              >
                {isGranting === pendingEmail ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Granting...</>
                ) : (
                  'Grant Access'
                )}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Change Password Modal */}
      {showChangePassword && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-lg w-full p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-2">Change Admin Password</h3>
            <p className="text-sm text-gray-600 mb-4">
              Verification will be sent to: <strong>{VERIFICATION_EMAILS.join(' and ')}</strong>
            </p>

            {verificationStep === 'password' && (
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
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowChangePassword(false);
                      setVerificationStep(null);
                      setCurrentPassword('');
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={sendVerificationCode}
                    className="bg-blue-800 hover:bg-blue-900"
                  >
                    Send Verification Code
                  </Button>
                </div>
              </div>
            )}

            {verificationStep === 'code' && (
              <div className="space-y-4">
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800">
                    ✅ Verification code sent to <strong>{sentCodeEmail}</strong>
                  </p>
                </div>
                <div>
                  <Label>Verification Code</Label>
                  <Input
                    type="text"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="Enter 6-digit code"
                    className="mt-1"
                    maxLength={6}
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
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowChangePassword(false);
                      setVerificationStep(null);
                      setCurrentPassword('');
                      setNewPassword('');
                      setConfirmPassword('');
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={verifyCodeAndChangePassword}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Change Password
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}