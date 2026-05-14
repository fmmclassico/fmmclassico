import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Plus, 
  Trash2, 
  Shield, 
  ShieldOff, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  Mail
} from 'lucide-react';
import { toast } from "sonner";
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';

export default function AdminAccessControl() {
  const [user, setUser] = useState(null);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [isGranting, setIsGranting] = useState(false);
  const [isRevoking, setIsRevoking] = useState(null);
  const queryClient = useQueryClient();

  const MASTER_ADMIN_EMAIL = 'fmmclassico@gmail.com';

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

  const adminUsers = allUsers.filter(u => u.role === 'admin');
  const regularUsers = allUsers.filter(u => u.role === 'user');

  const handleGrantAdmin = async (e) => {
    e.preventDefault();
    if (!newAdminEmail.trim()) {
      toast.error('Please enter an email address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newAdminEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setIsGranting(true);
    try {
      // Find user by email
      const existingUser = allUsers.find(u => u.email === newAdminEmail);
      
      if (existingUser) {
        // Update existing user
        await base44.entities.User.update(existingUser.id, { role: 'admin' });
        toast.success(`✅ ${newAdminEmail} is now an admin!`);
      } else {
        // User doesn't exist - invite them
        await base44.users.inviteUser(newAdminEmail, 'admin');
        toast.success(`✅ Admin invitation sent to ${newAdminEmail}`);
      }
      
      setNewAdminEmail('');
      queryClient.invalidateQueries({ queryKey: ['allUsers'] });
    } catch (error) {
      toast.error('Failed to grant admin access: ' + error.message);
    } finally {
      setIsGranting(false);
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

      {/* Grant Admin Access */}
      <Card className="p-6 mb-6 shadow-md border-2 border-blue-200">
        <div className="flex items-center gap-2 mb-4">
          <Plus className="h-5 w-5 text-blue-800" />
          <h2 className="font-bold text-gray-800">Grant Admin Access</h2>
        </div>
        
        <form onSubmit={handleGrantAdmin} className="space-y-4">
          <div>
            <Label className="text-sm font-medium text-gray-700">Email Address</Label>
            <div className="flex gap-2 mt-2">
              <Input
                type="email"
                placeholder="Enter email to grant admin access"
                value={newAdminEmail}
                onChange={(e) => setNewAdminEmail(e.target.value)}
                className="flex-1"
                disabled={isGranting}
              />
              <Button 
                type="submit" 
                className="bg-blue-800 hover:bg-blue-900 whitespace-nowrap"
                disabled={isGranting}
              >
                {isGranting ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Granting...</>
                ) : (
                  <><Shield className="h-4 w-4 mr-2" /> Grant Admin</>
                )}
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Enter an email address. If the user exists, they'll become admin immediately. If not, they'll receive an invitation.
            </p>
          </div>
        </form>
      </Card>

      {/* Current Admins */}
      <Card className="p-6 mb-6 shadow-md">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-800" />
            <h2 className="font-bold text-gray-800">Current Admins ({adminUsers.length})</h2>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-blue-800" />
            <p className="text-gray-500 text-sm mt-2">Loading admins...</p>
          </div>
        ) : adminUsers.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <ShieldOff className="h-12 w-12 mx-auto mb-2 opacity-30" />
            <p>No admins found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {adminUsers.map((admin) => (
              <div 
                key={admin.id} 
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  admin.email === MASTER_ADMIN_EMAIL 
                    ? 'bg-blue-50 border-blue-200' 
                    : 'bg-white border-gray-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    admin.email === MASTER_ADMIN_EMAIL 
                      ? 'bg-blue-800 text-white' 
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    <Mail className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-800 text-sm">{admin.email}</p>
                    {admin.email === MASTER_ADMIN_EMAIL && (
                      <Badge className="text-xs bg-blue-800 text-white">
                        <Shield className="h-3 w-3 mr-1" />
                        Master Admin
                      </Badge>
                    )}
                    <p className="text-xs text-gray-500">
                      Added: {new Date(admin.created_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                {admin.email !== MASTER_ADMIN_EMAIL && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRevokeAdmin(admin.id, admin.email)}
                    disabled={isRevoking === admin.id}
                    className="text-red-600 hover:bg-red-50 border-red-200"
                  >
                    {isRevoking === admin.id ? (
                      <><Loader2 className="h-3 w-3 animate-spin mr-2" /> Removing...</>
                    ) : (
                      <><Trash2 className="h-3 w-3 mr-2" /> Remove</>
                    )}
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Regular Users */}
      <Card className="p-6 shadow-md">
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-5 w-5 text-gray-600" />
          <h2 className="font-bold text-gray-800">Regular Users ({regularUsers.length})</h2>
        </div>

        {regularUsers.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Users className="h-12 w-12 mx-auto mb-2 opacity-30" />
            <p>No regular users yet</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {regularUsers.map((user) => (
              <div 
                key={user.id} 
                className="flex items-center justify-between p-2 rounded-lg border bg-white border-gray-200"
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                    <Mail className="h-4 w-4 text-gray-600" />
                  </div>
                  <p className="text-sm text-gray-700">{user.email}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setNewAdminEmail(user.email)}
                  className="text-blue-600 hover:bg-blue-50"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Make Admin
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Info Box */}
      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="flex items-start gap-2">
          <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
          <div className="text-sm text-yellow-800">
            <p className="font-semibold mb-1">Important Notes:</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Only <strong>fmmclassico@gmail.com</strong> can access this page</li>
              <li>Granting admin access gives full control over all app features</li>
              <li>You cannot remove your own (master admin) access</li>
              <li>New admins can immediately access all admin panels</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}