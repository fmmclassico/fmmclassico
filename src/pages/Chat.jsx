import React, { useState, useEffect, useRef } from 'react';
import { appClient } from '@/api/appClient.js';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Send, Bot, User, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || '';

export default function Chat() {
  const { user, isAuthenticated, navigateToLogin } = useAuth();
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef(null);

  const { data: products = [] } = useQuery({
    queryKey: ['products-chat'],
    queryFn: async () => {
      try {
        const result = await appClient.entities.Product.list('-created_date', 100);
        return Array.isArray(result) ? result : Array.isArray(result?.data) ? result.data : [];
      } catch (e) { return []; }
    },
  });

  useEffect(() => {
    if (!isAuthenticated) {
      navigateToLogin();
      return;
    }
    if (user?.email) {
      loadChatHistory(user.email);
    }
  }, [isAuthenticated, user]);

  const loadChatHistory = async (email) => {
    try {
      const history = await appClient.entities.ChatMessage.filter({ user_email: email }, 'created_date', 50);
      const data = Array.isArray(history) ? history : Array.isArray(history?.data) ? history.data : [];
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

  const callGroqAI = async (systemMsg, userMsg, history) => {
    if (!GROQ_API_KEY) return '';
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: systemMsg },
            ...history,
            { role: 'user', content: userMsg },
          ],
          temperature: 0.7,
          max_tokens: 500,
        }),
      });
      if (!response.ok) return '';
      const data = await response.json();
      return data.choices?.[0]?.message?.content || '';
    } catch (err) {
      console.error('Groq API error:', err);
      return '';
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);

    try {
      await appClient.entities.ChatMessage.create({ user_email: user.email, role: 'user', content: userMessage });
    } catch (err) {
      console.error('Failed to save message:', err);
    }

    setIsLoading(true);

    const safeProducts = Array.isArray(products) ? products : [];
    const productCatalog = safeProducts.slice(0, 30).map(p =>
      `${p.name} | GHS${p.price}${p.original_price > p.price ? ` (was GHS${p.original_price})` : ''} | ${p.category || ''}`
    ).join('; ');

    const recentHistory = messages.slice(-6).map(m => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.content
    }));

    const systemPrompt = `You are a helpful, friendly AI shopping assistant for FMM CLASSICO, an online store in Ghana. You ONLY answer questions about FMM CLASSICO, its products, orders, delivery, and services. Do NOT answer questions unrelated to FMM CLASSICO.

STORE INFO:
- Owner/CEO: Fedra Martha
- Locations: UMAT Campus (Tarkwa) + Ashongman Estate, Accra (close to Awo Dede Purewater) + Airport Residential, Accra (at Libi Kraal)
- WhatsApp: 0208207543
- Email: fmmclassico@gmail.com
- Payments: Mobile Money, Bank Transfer

DELIVERY RATES:
- UMAT Campus Pickup/Meeting Point: FREE
- UMAT Doorstep: GHS10
- Tarkwa Station: GHS20
- Tarkwa Doorstep (outside UMAT): GHS25
- Ashongman/Airport Pickup: FREE
- Within Accra delivery: GHS25
- Yango delivery: customer pays Yango fee on arrival
- Outside Accra/Tarkwa: GHS50

PRODUCTS AVAILABLE: ${productCatalog || 'Check our Shop page for all products'}

RULES:
- Be concise, friendly, helpful. Keep answers short.
- If asked who made/owns the app: Fedra Martha, CEO of FMM CLASSICO
- If you cannot help, suggest WhatsApp: 0208207543
- For ordering: tell them to add items to cart and checkout on the website
- Only answer questions about FMM CLASSICO. For anything else, politely say you can only help with FMM CLASSICO questions.`;

    let assistantMessage = '';

    assistantMessage = await callGroqAI(systemPrompt, userMessage, recentHistory);

    if (!assistantMessage || assistantMessage.trim().length === 0) {
      assistantMessage = `I'm having trouble right now. Here's how I can help:

- Browse products: Check our Shop page
- Place an order: Add items to cart and checkout
- Track your order: Go to My Orders
- Need help NOW? WhatsApp us at 0208207543

Try again or contact us directly!`;
    }

    setMessages(prev => [...prev, { role: 'assistant', content: assistantMessage }]);

    try {
      await appClient.entities.ChatMessage.create({ user_email: user.email, role: 'assistant', content: assistantMessage });
    } catch (err) {
      console.error('Failed to save AI response:', err);
    }

    setIsLoading(false);
  };

  if (!user) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin h-6 w-6 text-gray-400" /></div>;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] max-w-3xl mx-auto">
      <Card className="flex flex-col flex-1 overflow-hidden">
        <div className="p-4 border-b bg-gradient-to-r from-[#0A2E60] to-[#1a4a8a]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-white font-semibold">Chat Support</h2>
              <p className="text-white/70 text-xs">AI Assistant - Available 24/7</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
          {messages.length === 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-[#0A2E60] flex items-center justify-center flex-shrink-0">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[80%]">
                Hello! Welcome to FMM CLASSICO support. I can help you with products, orders, delivery info, and more. How can I help you today?
              </div>
            </motion.div>
          )}

          <AnimatePresence>
            {messages.map((message, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : ''}`}
              >
                {message.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-[#0A2E60] flex items-center justify-center flex-shrink-0">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                )}
                <div className={`rounded-2xl px-4 py-3 max-w-[80%] ${message.role === 'user' ? 'bg-[#0A2E60] text-white rounded-tr-sm' : 'bg-gray-100 text-gray-800 rounded-tl-sm'}`}>
                  {message.role === 'assistant' ? (
                    <ReactMarkdown className="prose prose-sm max-w-none">{message.content}</ReactMarkdown>
                  ) : (
                    <span>{message.content}</span>
                  )}
                </div>
                {message.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                    <User className="h-4 w-4 text-gray-600" />
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {isLoading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-[#0A2E60] flex items-center justify-center flex-shrink-0">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-3">
                <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
              </div>
            </motion.div>
          )}
        </div>

        <div className="p-4 border-t bg-white">
          <form onSubmit={sendMessage} className="flex gap-2">
            <Input value={inputMessage} onChange={(e) => setInputMessage(e.target.value)} placeholder="Type your message..." className="flex-1" disabled={isLoading} />
            <Button type="submit" disabled={isLoading || !inputMessage.trim()} size="icon"><Send className="h-4 w-4" /></Button>
          </form>
          <p className="text-xs text-gray-400 text-center mt-2">AI assistant available 24/7</p>
        </div>
      </Card>

      <div className="mt-3 pb-4">
        <p className="text-xs text-gray-500 mb-2">Quick questions:</p>
        <div className="flex flex-wrap gap-2">
          {['What products do you sell?', 'Delivery charges?', 'How to place an order?', 'Payment methods?', 'Where are you located?'].map((question) => (
            <button key={question} onClick={() => setInputMessage(question)} className="text-xs px-3 py-1.5 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">
              {question}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
