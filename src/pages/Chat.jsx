import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Send,
  Bot,
  User,
  Loader2,
  MessageCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

export default function Chat() {
  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef(null);
  const merchantPhone = import.meta.env.VITE_MERCHANT_PHONE || '0509896035';
  const merchantEmail = import.meta.env.VITE_MERCHANT_EMAIL || 'merchant@example.com';

  const { data: products = [] } = useQuery({
    queryKey: ['products-chat'],
    queryFn: async () => {
      const result = await base44.entities.Product.list('-created_date', 100);
      return Array.isArray(result) ? result : result?.data || [];
    },
  });

  useEffect(() => {
    const getUser = async () => {
      try {
        const isAuth = await base44.auth.isAuthenticated();
        if (isAuth) {
          const userData = await base44.auth.me();
          setUser(userData);
          loadChatHistory(userData.email);
        } else {
          base44.auth.redirectToLogin(window.location.href);
        }
      } catch (err) {
        console.error('Auth check failed:', err);
        base44.auth.redirectToLogin(window.location.href);
      }
    };
    getUser();
  }, []);

  const loadChatHistory = async (email) => {
    try {
      const history = await base44.entities.ChatMessage.filter(
        { user_email: email },
        'created_date',
        50
      );
      const data = Array.isArray(history) ? history : history?.data || [];
      setMessages(data.map(m => ({ role: m.role, content: m.content })));
    } catch (err) {
      console.error('Failed to load chat history:', err);
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');

    // Add user message to UI immediately
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);

    // Save user message in background
    base44.entities.ChatMessage.create({
      user_email: user.email,
      role: 'user',
      content: userMessage
    }).catch(() => {});

    setIsLoading(true);

    try {
      // Build product catalog for AI context
      const productCatalog = products.slice(0, 50).map(p =>
        `- ${p.name} | Category: ${p.category} | Price: ₵${p.price}${p.original_price ? ` (was ₵${p.original_price})` : ''} | ${p.description?.slice(0, 80) || 'No description'} | Stock: ${p.stock ?? 'available'}`
      ).join('\n');

      // Build conversation history for context (last 10 messages)
      const recentMessages = messages.slice(-10).map(m =>
        `${m.role === 'user' ? 'Customer' : 'Assistant'}: ${m.content}`
      ).join('\n');

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `You are FMM CLASSICO's AI shopping assistant. You are friendly, helpful, and knowledgeable about all products in the store. You reply like a real customer service agent would on WhatsApp: concise, warm, and action-oriented.

About FMM CLASSICO:
- CEO/Owner/Developer: Fedra Martha
- Locations: Ashongman Estate, Accra (Close to Awo Dede - Purewater) AND Airport Residential Area, Accra (at Libi Kraal)
- Phone: ${merchantPhone} | Email: ${merchantEmail}
- Payments: Hubtel (Mobile Money, Bank Card, Bank Transfer)

Delivery Rates:
- Ashongman Estate Pickup (our location): FREE
- Airport Residential Pickup (our location): FREE
- UMAT Campus Pickup/Meeting Point: FREE
- UMAT Campus Doorstep: ₵10
- Tarkwa Station/Car: ₵20
- Tarkwa Doorstep: ₵25
- Accra Station/Car: ₵25
- Delivery Within Accra: ₵25
- Outside Accra & Tarkwa: ₵50
- Yango/Uber/Bolt: Customer pays rider fee on delivery

PRODUCT CATALOG:
${productCatalog || 'Products are being loaded.'}

CONVERSATION HISTORY:
${recentMessages || '(new conversation)'}

INSTRUCTIONS:
- Answer product questions with specific prices and details from the catalog
- Help customers choose products based on their needs
- If they want to order, tell them to add the product to cart and checkout
- If they ask about something not in the catalog, say you'll check with the team
- Always be helpful and never say "I cannot" — find a way to assist
- Keep responses under 150 words unless the customer asks for details
- Use emojis occasionally to be friendly
- If asked who made/owns the app: "Fedra Martha, the CEO of FMM CLASSICO"

Customer says: ${userMessage}

Respond naturally and helpfully:`,
      });

      // Parse AI response (handle different response shapes)
      let assistantMessage = '';
      if (typeof response === 'string') {
        assistantMessage = response;
      } else if (response?.response) {
        assistantMessage = response.response;
      } else if (response?.text) {
        assistantMessage = response.text;
      } else if (response?.result) {
        assistantMessage = response.result;
      } else if (response?.content) {
        assistantMessage = response.content;
      } else if (response?.message) {
        assistantMessage = response.message;
      } else {
        assistantMessage = "I'm having trouble right now. Please try again or contact us on WhatsApp: " + merchantPhone;
      }

      // Add assistant message to UI
      setMessages(prev => [...prev, { role: 'assistant', content: assistantMessage }]);

      // Save in background
      base44.entities.ChatMessage.create({
        user_email: user.email,
        role: 'assistant',
        content: assistantMessage
      }).catch(() => {});

    } catch (error) {
      console.error('AI response error:', error);
      const fallback = `Sorry, I'm having a connection issue right now. Please try again in a moment, or reach us directly on WhatsApp: ${merchantPhone} 📱`;
      setMessages(prev => [...prev, { role: 'assistant', content: fallback }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto h-[calc(100vh-180px)] flex flex-col">
      <Card className="flex-1 flex flex-col overflow-hidden rounded-2xl border-0 shadow-lg">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#031725] to-[#0A2E60] p-4 text-white">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-full">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-bold">Chat Support</h2>
              <p className="text-xs text-white/70">Ask us anything about our products or orders</p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          <div className="space-y-4">
            {/* Welcome Message */}
            {messages.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-3"
              >
                <div className="w-8 h-8 bg-[#0A2E60] rounded-full flex items-center justify-center flex-shrink-0">
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <div className="bg-gray-100 rounded-2xl rounded-tl-sm p-3 max-w-[80%]">
                  <p className="text-sm">👋 Hello! Welcome to FMM CLASSICO support. I'm here to help you with any questions about our products, orders, or services. How can I assist you today?</p>
                </div>
              </motion.div>
            )}

            {messages.map((message, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : ''}`}
              >
                {message.role === 'assistant' && (
                  <div className="w-8 h-8 bg-[#0A2E60] rounded-full flex items-center justify-center flex-shrink-0">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                )}
                <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                  message.role === 'user'
                    ? 'bg-[#2E86C1] text-white rounded-tr-sm'
                    : 'bg-gray-100 text-gray-800 rounded-tl-sm'
                }`}>
                  {message.role === 'assistant' ? (
                    <ReactMarkdown className="prose prose-sm max-w-none">{message.content}</ReactMarkdown>
                  ) : (
                    <p>{message.content}</p>
                  )}
                </div>
                {message.role === 'user' && (
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="h-4 w-4 text-gray-600" />
                  </div>
                )}
              </motion.div>
            ))}

            {isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-3"
              >
                <div className="w-8 h-8 bg-[#0A2E60] rounded-full flex items-center justify-center flex-shrink-0">
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <div className="bg-gray-100 rounded-2xl rounded-tl-sm p-3">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                    <span className="text-sm text-gray-500">Typing...</span>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="border-t p-3">
          <form onSubmit={sendMessage} className="flex gap-2">
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 bg-white"
              disabled={isLoading}
            />
            <Button type="submit" disabled={isLoading || !inputMessage.trim()} className="bg-[#2E86C1] hover:bg-[#2578ae]">
              <Send className="h-4 w-4" />
            </Button>
          </form>
          <p className="text-[10px] text-gray-400 text-center mt-2">Our AI assistant is available 24/7 to help you</p>
        </div>
      </Card>

      {/* Quick Questions */}
      <div className="mt-3 pb-20">
        <p className="text-xs text-gray-500 mb-2">Quick questions:</p>
        <div className="flex flex-wrap gap-1.5">
          {[
            "What products do you sell?",
            "How long does delivery take?",
            "What are your delivery charges?",
            "What payment methods do you accept?",
            "I want to place an order",
            "Show me your best products"
          ].map((question) => (
            <button
              key={question}
              className="text-xs bg-white border border-gray-200 rounded-full px-3 py-1.5 text-gray-700 hover:bg-gray-50 transition-colors"
              onClick={() => setInputMessage(question)}
            >
              {question}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
