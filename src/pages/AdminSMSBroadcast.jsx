import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Send, Users, MessageSquare, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminSMSBroadcast() {
  const [message, setMessage] = useState('');
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [isSending, setIsSending] = useState(false);
  const [sendResults, setSendResults] = useState(null);

  const { data: contacts = [] } = useQuery({
    queryKey: ['smsContacts'],
    queryFn: () => base44.entities.SMSContact.list(),
  });

  const groups = [...new Set(contacts.map(c => c.group).filter(Boolean))];

  const toggleGroup = (group) => {
    setSelectedGroups(prev => 
      prev.includes(group) 
        ? prev.filter(g => g !== group)
        : [...prev, group]
    );
  };

  const selectAllGroups = () => {
    setSelectedGroups(groups);
  };

  const clearSelection = () => {
    setSelectedGroups([]);
  };

  const getSelectedContactsCount = () => {
    if (selectedGroups.length === 0) return 0;
    return contacts.filter(c => selectedGroups.includes(c.group)).length;
  };

  const handleSendBulkWhatsApp = async () => {
    if (!message.trim()) {
      toast.error('Please enter a message');
      return;
    }
    if (selectedGroups.length === 0) {
      toast.error('Please select at least one group');
      return;
    }

    const selectedContacts = contacts.filter(c => selectedGroups.includes(c.group));
    if (selectedContacts.length === 0) {
      toast.error('No contacts found in selected groups');
      return;
    }

    setIsSending(true);
    setSendResults(null);

    const results = { success: 0, failed: 0, failedNumbers: [] };

    // Send to each contact via WhatsApp click-to-chat
    for (const contact of selectedContacts) {
      try {
        // Format phone number for WhatsApp (remove leading 0, add 233)
        const phoneNumber = contact.phone.startsWith('0') 
          ? '233' + contact.phone.slice(1)
          : contact.phone;
        
        // Create WhatsApp message URL
        const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
        
        // Open WhatsApp in new tab (user will need to click send)
        window.open(whatsappUrl, '_blank');
        
        // Small delay between opens to prevent browser blocking
        await new Promise(resolve => setTimeout(resolve, 300));
        results.success++;
      } catch (error) {
        console.error('Failed to send to', contact.phone, error);
        results.failed++;
        results.failedNumbers.push(contact.phone);
      }
    }

    setSendResults(results);
    setIsSending(false);

    if (results.failed === 0) {
      toast.success(`Messages sent to ${results.success} contacts!`);
    } else {
      toast.error(`Sent to ${results.success}, failed: ${results.failed}`);
    }

    // Clear message after sending
    setMessage('');
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
          <Send className="h-7 w-7 text-[#1B3A6B]" />
          WhatsApp Bulk Broadcast
        </h1>
        <p className="text-gray-600 mt-2">
          Send messages to multiple contacts at once via WhatsApp
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Message Composition */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-[#1B3A6B]" />
              Compose Message
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="message">Your Message</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your broadcast message here..."
                rows={8}
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                {message.length} characters
              </p>
            </div>

            <Button
              onClick={handleSendBulkWhatsApp}
              disabled={isSending || !message.trim() || selectedGroups.length === 0}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-6"
            >
              {isSending ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-5 w-5" />
                  Send to {getSelectedContactsCount()} Contacts
                </>
              )}
            </Button>

            {sendResults && (
              <div className={`p-4 rounded-lg border-2 ${
                sendResults.failed === 0 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-yellow-50 border-yellow-200'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  {sendResults.failed === 0 ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-yellow-600" />
                  )}
                  <p className="font-bold text-gray-800">Broadcast Results</p>
                </div>
                <p className="text-sm text-gray-700">
                  ✅ Successful: {sendResults.success}
                </p>
                {sendResults.failed > 0 && (
                  <>
                    <p className="text-sm text-gray-700 mt-1">
                      ❌ Failed: {sendResults.failed}
                    </p>
                    <p className="text-xs text-gray-600 mt-2">
                      Failed numbers: {sendResults.failedNumbers.join(', ')}
                    </p>
                  </>
                )}
                <p className="text-xs text-gray-500 mt-3">
                  Note: Each WhatsApp message opens in a new tab. You'll need to click "Send" for each one.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Contact Groups Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-[#1B3A6B]" />
              Select Contact Groups
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button
                onClick={selectAllGroups}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                Select All
              </Button>
              <Button
                onClick={clearSelection}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                Clear
              </Button>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {groups.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  No contact groups found. Add contacts first.
                </p>
              ) : (
                groups.map(group => (
                  <div
                    key={group}
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedGroups.includes(group)
                        ? 'border-[#1B3A6B] bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => toggleGroup(group)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                          selectedGroups.includes(group)
                            ? 'bg-[#1B3A6B] border-[#1B3A6B]'
                            : 'border-gray-300'
                        }`}>
                          {selectedGroups.includes(group) && (
                            <CheckCircle className="h-3 w-3 text-white" />
                          )}
                        </div>
                        <span className="font-medium text-gray-800">{group}</span>
                      </div>
                      <span className="text-sm text-gray-500">
                        {contacts.filter(c => c.group === group).length} contacts
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {selectedGroups.length > 0 && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm font-semibold text-[#1B3A6B]">
                  📊 Total recipients: {getSelectedContactsCount()} contacts
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  Groups: {selectedGroups.join(', ')}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Instructions */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-gray-700">
            ℹ️ How It Works
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-2 text-sm text-gray-600">
            <li>1. Select one or more contact groups from the right panel</li>
            <li>2. Type your message in the composition box</li>
            <li>3. Click "Send to X Contacts"</li>
            <li>4. WhatsApp will open in new tabs for each contact with your message pre-filled</li>
            <li>5. Click "Send" in each WhatsApp tab to deliver the message</li>
          </ol>
          <p className="text-xs text-gray-500 mt-3">
            Note: Due to WhatsApp's security, messages must be sent manually. This tool opens all chats at once to save time.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}