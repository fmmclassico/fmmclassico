import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { 
  Mail, 
  Phone, 
  MessageCircle, 
  Save, 
  Loader2, 
  AlertCircle,
  Settings
} from 'lucide-react';
import { toast } from "sonner";
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';

export default function AdminContactSettings() {
  const [user, setUser] = useState(null);
  const [editingKey, setEditingKey] = useState(null);
  const [editValue, setEditValue] = useState('');
  const queryClient = useQueryClient();

  const MASTER_ADMIN_EMAIL = import.meta.env.VITE_MASTER_ADMIN_EMAIL || 'admin@example.com';

  useEffect(() => {
    const checkAdmin = async () => {
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
      setUser(userData);
    };
    checkAdmin();
  }, []);

  const { data: contactSettings = [], isLoading } = useQuery({
    queryKey: ['contactSettings'],
    queryFn: () => base44.entities.ContactSetting.list(),
    enabled: !!user,
  });

  const updateSettingMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      return await base44.entities.ContactSetting.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contactSettings'] });
      setEditingKey(null);
      toast.success('✅ Contact setting updated!');
    },
    onError: (error) => {
      toast.error('Failed to update: ' + error.message);
    }
  });

  const handleSave = (setting) => {
    if (!editValue.trim()) {
      toast.error('Value cannot be empty');
      return;
    }
    updateSettingMutation.mutate({
      id: setting.id,
      data: { setting_value: editValue }
    });
  };

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }) => {
      return await base44.entities.ContactSetting.update(id, { is_active: !isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contactSettings'] });
      toast.success('✅ Setting updated!');
    },
    onError: (error) => {
      toast.error('Failed to update: ' + error.message);
    }
  });

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

  const getIcon = (key) => {
    if (key.includes('email')) return <Mail className="h-5 w-5" />;
    if (key.includes('phone') || key.includes('whatsapp')) return <Phone className="h-5 w-5" />;
    return <MessageCircle className="h-5 w-5" />;
  };

  const getEmailIcon = (key) => {
    if (key.includes('email')) return <Mail className="h-5 w-5 text-blue-600" />;
    if (key.includes('phone')) return <Phone className="h-5 w-5 text-green-600" />;
    if (key.includes('whatsapp')) return <MessageCircle className="h-5 w-5 text-green-500" />;
    return <Settings className="h-5 w-5 text-gray-600" />;
  };

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
          <Settings className="h-8 w-8 text-blue-800" />
        </div>
        <h1 className="text-2xl font-black text-gray-800 mb-1">Contact Settings</h1>
        <p className="text-gray-500 text-sm">Manage where customer messages and notifications are sent</p>
      </div>

      {isLoading ? (
        <Card className="p-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-800" />
          <p className="text-gray-600">Loading settings...</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {contactSettings.map((setting) => (
            <Card key={setting.id} className={`p-6 shadow-md border-2 ${setting.is_active ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    setting.setting_key.includes('email') ? 'bg-blue-100' : 
                    setting.setting_key.includes('whatsapp') ? 'bg-green-100' : 'bg-gray-100'
                  }`}>
                    {getEmailIcon(setting.setting_key)}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800">{setting.description}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">Key: {setting.setting_key}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">{setting.is_active ? 'Active' : 'Inactive'}</span>
                  <Switch
                    checked={setting.is_active}
                    onCheckedChange={() => toggleActiveMutation.mutate({ id: setting.id, isActive: setting.is_active })}
                  />
                </div>
              </div>

              <div className="mt-4">
                {editingKey === setting.setting_key ? (
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">New Value</Label>
                    <Input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      placeholder={setting.setting_key.includes('email') ? 'email@example.com' : '+233XXXXXXXXX'}
                      className="w-full"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleSave(setting)}
                        disabled={updateSettingMutation.isPending}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {updateSettingMutation.isPending ? (
                          <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Saving...</>
                        ) : (
                          <><Save className="h-4 w-4 mr-2" /> Save Changes</>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setEditingKey(null);
                          setEditValue('');
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {setting.setting_key.includes('email') ? (
                        <Mail className="h-4 w-4 text-blue-600" />
                      ) : setting.setting_key.includes('whatsapp') ? (
                        <MessageCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <Phone className="h-4 w-4 text-gray-600" />
                      )}
                      <span className="font-medium text-gray-800 text-lg">{setting.setting_value}</span>
                    </div>
                    {setting.is_active && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingKey(setting.setting_key);
                          setEditValue(setting.setting_value);
                        }}
                        className="text-blue-600 hover:bg-blue-50"
                      >
                        Edit
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Info Box */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start gap-2">
          <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-semibold mb-1">How it works:</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Change the email address to redirect customer messages and notifications</li>
              <li>Update phone numbers for SMS and WhatsApp communications</li>
              <li>Toggle settings on/off to control which contact methods are active</li>
              <li>All changes take effect immediately across the app</li>
              <li>Only admins can modify these settings</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}