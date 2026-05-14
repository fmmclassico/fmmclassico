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
  const [isGranting, setIsGranting] = useState(null);
  const [isRevoking, setIsRevoking] = useState(null);
  const queryClient = useQueryClient();

  const MASTER_ADMIN_EMAIL = 'fmmclassico@gmail.com';
  
  const ALLOWED_EMAILS = [
    'fmmclassico@gmail.com',
    'fmmcompanylimited@gmail.com',
    'mensahfedramartha@gmail.com',
    'marthamensahfedra@gmail.com',
    'lovelyfedra@gmail.com'
  ];

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

  const adminUsers = allUsers.filter(u => ALLOWED_EMAILS.includes(u.email) && u.role === 'admin');
  const regularUsers = allUsers.filter(u => ALLOWED_EMAILS.includes(u.email) && u.role === 'user');

  const handleToggleAdmin = async (userId, userEmail, currentRole) => {
    if (userEmail === MASTER_ADMIN_EMAIL) {
      toast.error('Cannot revoke master admin access');
      return;
    }

    if (!confirm(`${currentRole === 'admin' ? 'Remove' : 'Grant'} admin access for ${userEmail}?`)) {
      return;
    }

    setIsGranting(userEmail);
    try {
      if (currentRole === 'admin') {
        // Revoke admin access
        await base44.entities.User.update(userId, { role: 'user' });
        toast.success(`✅ Admin access revoked for ${userEmail}`);
      } else {
        // Grant admin access
        const userInfo = allUsers.find(u => u.email === userEmail);
        if (userInfo && userInfo.id) {
          // User exists - update role
          await base44.entities.User.update(userInfo.id, { role: 'admin' });
          toast.success(`✅ Admin access granted to ${userEmail}`);
        } else {
          // User doesn't exist - invite them as admin
          await base44.users.inviteUser(userEmail, 'admin');
          toast.success(`✅ Admin invitation sent to ${userEmail}`);
        }
      }
      queryClient.invalidateQueries({ queryKey: ['allUsers'] });
    } catch (error) {
      toast.error('Failed to update access: ' + error.message);
    } finally {
      setIsGranting(null);
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
        <div className="flex items-center gap-2 mb-4">
          <Shield className="h-5 w-5 text-blue-800" />
          <h2 className="font-bold text-gray-800">Authorized Emails</h2>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Only these {ALLOWED_EMAILS.length} emails can be granted admin access. Click the toggle button to grant or revoke access.
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
                  <Button
                    variant={isAdmin ? "destructive" : "default"}
                    size="sm"
                    onClick={() => handleToggleAdmin(userInfo?.id, email, isAdmin ? 'admin' : 'user')}
                    disabled={isGranting === email}
                    className={isAdmin ? "bg-red-600 hover:bg-red-700" : "bg-blue-800 hover:bg-blue-900"}
                  >
                    {isGranting === email ? (
                      <><Loader2 className="h-3 w-3 animate-spin mr-2" /> Updating...</>
                    ) : isAdmin ? (
                      <><ShieldOff className="h-3 w-3 mr-2" /> Revoke</>
                    ) : (
                      <><Shield className="h-3 w-3 mr-2" /> Grant</>
                    )}
                  </Button>
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
              <li>Granting admin access gives full control over all app features</li>
              <li>You cannot remove your own (master admin) access</li>
              <li>Additional emails cannot be added to this list</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}