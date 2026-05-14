import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Send, 
  MessageCircle, 
  Bell, 
  User,
  Search,
  RefreshCw,
  Trash2,
  Plus
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function AdminMessages() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [notifTitle, setNotifTitle] = useState('');
  const [notifMessage, setNotifMessage] = useState('');
  const [notifTarget, setNotifTarget] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('messages'); // 'messages' | 'send_notification'
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const checkAdmin = async () => {
      const isAuth = await base44.auth.isAuthenticated();
      if (isAuth) {
        const userData = await base44.auth.me();
        setUser(userData);
        setIsAdmin(userData.role === 'admin');
      }
    };
    checkAdmin();
  }, []);

  // Fetch all chat messages
  const { data: allMessages = [], isLoading: messagesLoading, refetch } = useQuery({
    queryKey: ['adminChatMessages'],
    queryFn: () => base44.entities.ChatMessage.list('created_date', 200),
    enabled: isAdmin,
    refetchInterval: 10000,
  });

  // Group messages by user_email into conversations
  const conversations = React.useMemo(() => {
    const grouped = {};
    allMessages.forEach(msg => {
      if (!grouped[msg.user_email]) {
        grouped[msg.user_email] = { user_email: msg.user_email, messages: [] };
      }
      grouped[msg.user_email].messages.push(msg);
    });
    return Object.values(grouped).map(conv => ({
      ...conv,
      lastMessage: conv.messages[conv.messages.length - 1],
      unread: conv.messages.filter(m => m.role === 'user' && !m.admin_read).length,
    })).sort((a, b) => new Date(b.lastMessage?.created_date) - new Date(a.lastMessage?.created_date));
  }, [allMessages]);

  const filteredConversations = conversations.filter(c =>
    c.user_email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedMessages = selectedConversation
    ? allMessages.filter(m => m.user_email === selectedConversation).sort((a, b) => new Date(a.created_date) - new Date(b.created_date))
    : [];

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedMessages]);

  const deleteMessageMutation = useMutation({
    mutationFn: async (msgId) => {
      await base44.entities.ChatMessage.delete(msgId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminChatMessages'] });
      toast.success('Message deleted');
    }
  });

  const replyMutation = useMutation({
    mutationFn: async () => {
      if (!replyText.trim() || !selectedConversation) return;
      await base44.entities.ChatMessage.create({
        user_email: selectedConversation,
        role: 'assistant',
        content: replyText.trim(),
      });
    },
    onSuccess: () => {
      setReplyText('');
      queryClient.invalidateQueries({ queryKey: ['adminChatMessages'] });
      toast.success('Reply sent!');
    }
  });

  const sendNotificationMutation = useMutation({
    mutationFn: async () => {
      if (!notifTitle.trim() || !notifMessage.trim()) return;
      const target = notifTarget.trim();
      if (target) {
        // Send to specific email
        await base44.entities.Notification.create({
          user_email: target,
          title: notifTitle.trim(),
          message: notifMessage.trim(),
          type: 'general',
          is_read: false
        });
      } else {
        // Broadcast to all recent customers (from orders)
        const orders = await base44.entities.Order.list('-created_date', 100);
        const emails = [...new Set(orders.map(o => o.customer_email).filter(Boolean))];
        await Promise.all(emails.map(email =>
          base44.entities.Notification.create({
            user_email: email,
            title: notifTitle.trim(),
            message: notifMessage.trim(),
            type: 'general',
            is_read: false
          })
        ));
        toast.success(`Notification broadcast to ${emails.length} customers!`);
        setNotifTitle('');
        setNotifMessage('');
        setNotifTarget('');
        return;
      }
    },
    onSuccess: () => {
      toast.success('Notification sent successfully!');
      setNotifTitle('');
      setNotifMessage('');
      setNotifTarget('');
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  if (!isAdmin) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Access Denied</h2>
        <p className="text-gray-500">You must be an admin to view this page.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-100 rounded-full">
          <MessageCircle className="h-6 w-6 text-blue-800" />
        </div>
        <h1 className="text-2xl font-bold text-gray-800">Customer Messages & Notifications</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <Button
          variant={activeTab === 'messages' ? 'default' : 'outline'}
          className={activeTab === 'messages' ? 'bg-blue-800 hover:bg-blue-900' : ''}
          onClick={() => setActiveTab('messages')}
        >
          <MessageCircle className="h-4 w-4 mr-2" />
          Customer Messages
        </Button>
        <Button
          variant={activeTab === 'send_notification' ? 'default' : 'outline'}
          className={activeTab === 'send_notification' ? 'bg-blue-800 hover:bg-blue-900' : ''}
          onClick={() => setActiveTab('send_notification')}
        >
          <Bell className="h-4 w-4 mr-2" />
          Send Notification
        </Button>
      </div>

      {/* ── MESSAGES TAB ── */}
      {activeTab === 'messages' && (
        <div className="grid md:grid-cols-3 gap-4 h-[70vh]">
          {/* Sidebar */}
          <div className="md:col-span-1 bg-white rounded-xl border shadow-sm overflow-hidden flex flex-col">
            <div className="p-3 border-b flex items-center gap-2">
              <Search className="h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by email..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="border-0 p-0 h-auto text-sm focus-visible:ring-0"
              />
              <button onClick={() => refetch()} className="text-gray-400 hover:text-blue-800">
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {messagesLoading ? (
                <div className="p-3 space-y-3">
                  {[1,2,3].map(i => <Skeleton key={i} className="h-16" />)}
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="p-6 text-center text-gray-400 text-sm">No customer messages yet</div>
              ) : (
                filteredConversations.map(conv => (
                  <button
                    key={conv.user_email}
                    onClick={() => setSelectedConversation(conv.user_email)}
                    className={`w-full text-left p-3 border-b hover:bg-blue-50 transition-colors ${selectedConversation === conv.user_email ? 'bg-blue-50 border-l-4 border-l-blue-800' : ''}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                          <User className="h-4 w-4 text-gray-500" />
                        </div>
                        <span className="text-sm font-medium text-gray-800 truncate max-w-[120px]">{conv.user_email}</span>
                      </div>
                      {conv.unread > 0 && (
                        <Badge className="bg-blue-800 text-white text-xs px-1.5 py-0.5 min-w-[20px] text-center">
                          {conv.unread}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 truncate pl-10">
                      {conv.lastMessage?.content?.substring(0, 60)}...
                    </p>
                    <p className="text-xs text-gray-400 pl-10 mt-1">
                      {conv.lastMessage?.created_date && format(new Date(conv.lastMessage.created_date), 'MMM d, h:mm a')}
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Chat Window */}
          <div className="md:col-span-2 bg-white rounded-xl border shadow-sm overflow-hidden flex flex-col">
            {!selectedConversation ? (
              <div className="flex-1 flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <MessageCircle className="h-12 w-12 mx-auto mb-3 text-gray-200" />
                  <p>Select a conversation to view messages</p>
                </div>
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="p-4 border-b bg-gray-50 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center">
                    <User className="h-5 w-5 text-blue-800" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">{selectedConversation}</p>
                    <p className="text-xs text-gray-500">{selectedMessages.length} messages</p>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {selectedMessages.map((msg, i) => (
                    <div key={i} className={`flex gap-2 group ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                      {msg.role === 'user' && (
                        <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 mt-1">
                          <User className="h-4 w-4 text-gray-500" />
                        </div>
                      )}
                      <div className="flex flex-col gap-1">
                        <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${msg.role === 'user' ? 'bg-gray-100 text-gray-800 rounded-tl-none' : 'bg-blue-800 text-white rounded-tr-none'}`}>
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                          <p className={`text-xs mt-1 ${msg.role === 'user' ? 'text-gray-400' : 'text-blue-200'}`}>
                            {msg.created_date && format(new Date(msg.created_date), 'h:mm a')}
                            {msg.role === 'assistant' && ' · Admin'}
                          </p>
                        </div>
                        <button
                          onClick={() => { if (confirm('Delete this message?')) deleteMessageMutation.mutate(msg.id); }}
                          className="self-end opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-600 flex items-center gap-1 text-[11px]"
                        >
                          <Trash2 className="h-3 w-3" /> Delete
                        </button>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Reply Box */}
                <div className="p-3 border-t flex gap-2">
                  <Textarea
                    placeholder="Type your reply to the customer..."
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    rows={2}
                    className="resize-none flex-1"
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if (replyText.trim()) replyMutation.mutate();
                      }
                    }}
                  />
                  <Button
                    onClick={() => replyMutation.mutate()}
                    disabled={!replyText.trim() || replyMutation.isPending}
                    className="bg-blue-800 hover:bg-blue-900 self-end"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── SEND NOTIFICATION TAB ── */}
      {activeTab === 'send_notification' && (
        <Card className="max-w-xl p-6 shadow-md">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="h-5 w-5 text-blue-800" />
            <h2 className="text-lg font-bold text-gray-800">Send Notification to Customers</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Send to (email) <span className="text-gray-400 font-normal">– leave blank to broadcast to ALL</span>
              </label>
              <div className="flex gap-2">
                <Input
                  placeholder="customer@email.com  (or leave blank for all)"
                  value={notifTarget}
                  onChange={e => setNotifTarget(e.target.value)}
                />
                {notifTarget && (
                  <Button size="icon" variant="ghost" onClick={() => setNotifTarget('')}>
                    <Trash2 className="h-4 w-4 text-red-400" />
                  </Button>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notification Title *</label>
              <Input
                placeholder="e.g. 🎉 Special Offer for You!"
                value={notifTitle}
                onChange={e => setNotifTitle(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Message *</label>
              <Textarea
                placeholder="Write your message to the customer(s)..."
                value={notifMessage}
                onChange={e => setNotifMessage(e.target.value)}
                rows={4}
              />
            </div>
            <Button
              onClick={() => sendNotificationMutation.mutate()}
              disabled={!notifTitle.trim() || !notifMessage.trim() || sendNotificationMutation.isPending}
              className="w-full bg-blue-800 hover:bg-blue-900 text-white font-bold py-5"
            >
              <Bell className="h-4 w-4 mr-2" />
              {notifTarget ? `Send to ${notifTarget}` : '📢 Broadcast to All Customers'}
            </Button>
            {!notifTarget && (
              <p className="text-xs text-gray-400 text-center">This will send to all customers who have placed orders</p>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}