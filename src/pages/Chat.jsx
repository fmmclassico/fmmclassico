import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Send, Loader2, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function Chat() {
  var [user, setUser] = useState(null);
  var [message, setMessage] = useState('');
  var [isAdmin, setIsAdmin] = useState(false);
  var messagesEndRef = useRef(null);
  var queryClient = useQueryClient();

  useEffect(function() {
    base44.auth.me().then(function(userData) {
      setUser(userData);
      setIsAdmin(userData.role === 'admin');
    }).catch(function() {});
  }, []);

  var { data: messages = [], isLoading } = useQuery({
    queryKey: ['chatMessages', user?.email, isAdmin],
    queryFn: function() {
      if (isAdmin) return base44.entities.ChatMessage.list('-created_date', 100);
      return base44.entities.ChatMessage.filter({ user_email: user.email }, 'created_date', 50);
    },
    enabled: !!user?.email,
    refetchInterval: 5000,
  });

  useEffect(function() {
    if (messagesEndRef.current) messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  var sendMutation = useMutation({
    mutationFn: async function(text) {
      await base44.entities.ChatMessage.create({
        user_email: user.email,
        message: text,
        sender: isAdmin ? 'admin' : 'user',
        is_admin: isAdmin,
        created_date: new Date().toISOString(),
      });

      // Notify admin if user sends message
      if (!isAdmin) {
        var adminEmails = (import.meta.env.VITE_ADMIN_EMAILS || '').split(',').map(function(e) { return e.trim(); }).filter(Boolean);
        for (var i = 0; i < adminEmails.length; i++) {
          await base44.entities.Notification.create({
            user_email: adminEmails[i],
            title: 'New Chat Message',
            message: 'From ' + (user.full_name || user.email) + ': ' + text.substring(0, 100),
            type: 'general',
            is_read: false,
            created_date: new Date().toISOString(),
          });
        }
      }
    },
    onSuccess: function() {
      setMessage('');
      queryClient.invalidateQueries({ queryKey: ['chatMessages'] });
    },
    onError: function() { toast.error('Failed to send message'); }
  });

  var handleSend = function(e) {
    e.preventDefault();
    if (!message.trim()) return;
    sendMutation.mutate(message.trim());
  };

  if (!user) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  // Group messages by user for admin view
  var displayMessages = messages;
  if (isAdmin) {
    // Admin sees all messages sorted by date
    displayMessages = [...messages].sort(function(a, b) { return new Date(a.created_date) - new Date(b.created_date); });
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 pb-32 flex flex-col h-[calc(100vh-120px)]">
      <div className="flex items-center gap-2 mb-4">
        <MessageCircle className="w-5 h-5 text-blue-600" />
        <h1 className="text-lg font-bold text-gray-900">{isAdmin ? 'Customer Messages' : 'Chat Support'}</h1>
      </div>

      {!isAdmin && (
        <div className="bg-blue-50 rounded-xl p-3 mb-4 text-xs text-blue-700">
          Send us a message and we will reply as soon as possible. For urgent issues, WhatsApp us at 0208207543.
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-4">
        {isLoading ? (
          <div className="text-center text-gray-400 text-sm py-8">Loading messages...</div>
        ) : displayMessages.length === 0 ? (
          <div className="text-center text-gray-400 text-sm py-8">{isAdmin ? 'No customer messages yet' : 'No messages yet. Send one below!'}</div>
        ) : (
          displayMessages.map(function(msg) {
            var isMe = (isAdmin && msg.is_admin) || (!isAdmin && !msg.is_admin);
            return (
              <div key={msg.id} className={'flex ' + (isMe ? 'justify-end' : 'justify-start')}>
                <div className={'max-w-[80%] rounded-2xl px-4 py-2 ' + (isMe ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800')}>
                  {isAdmin && !msg.is_admin && <p className="text-[10px] font-semibold mb-0.5 opacity-70">{msg.user_email}</p>}
                  <p className="text-sm">{msg.message}</p>
                  <p className={'text-[10px] mt-1 ' + (isMe ? 'text-blue-200' : 'text-gray-400')}>
                    {msg.created_date ? new Date(msg.created_date).toLocaleString() : ''}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Send */}
      <form onSubmit={handleSend} className="flex gap-2">
        <Input value={message} onChange={function(e) { setMessage(e.target.value); }} placeholder={isAdmin ? 'Reply to customer...' : 'Type your message...'} className="flex-1 rounded-xl" />
        <Button type="submit" disabled={sendMutation.isPending || !message.trim()} className="rounded-xl bg-blue-800 text-white hover:bg-blue-900">
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </div>
  );
}
