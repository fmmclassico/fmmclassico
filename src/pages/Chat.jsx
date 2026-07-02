import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Loader2, Bot } from 'lucide-react';
import { toast } from 'sonner';

var GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

var FMM_SYSTEM_PROMPT = 'You are the friendly customer support AI for FMM CLASSICO, an online store in Ghana.' +
  ' About FMM CLASSICO:' +
  ' - We sell phone accessories (cases, chargers, earphones, cables, power banks, screen protectors, holders, speakers, smart watches), electronic appliances, and home appliances.' +
  ' - Locations: Tarkwa (UMaT Campus), Accra (Ashongman Estate near Awo Dede Purewater, and Airport Residential Area at Libi Kraal), and Kumasi.' +
  ' - Phone/WhatsApp: 0208207543' +
  ' - Email: fmmclassico@gmail.com' +
  ' - Website: fmmclassico.vercel.app' +
  ' - Payment: Mobile Money, Debit Cards, Bank Transfer, and Wallet payments through Hubtel secure payment.' +
  ' - Delivery zones and fees: UMAT Campus pickup (free), UMAT doorstep (GHS 10), Tarkwa station (GHS 20), Tarkwa outside UMAT (GHS 25), Ashongman Estate pickup (free), Airport Residential pickup (free), Accra station (GHS 25), Accra delivery (GHS 25), Yango/Uber/Bolt (rider fee on delivery), Outside Accra and Tarkwa (GHS 50 flat rate).' +
  ' - Delivery time: 1 to 5 business days.' +
  ' - Cancellation: Only while order is Pending or Confirmed. Once packed/shipped, cannot cancel. Refunds via MoMo in 1 to 3 business days.' +
  ' - Returns: Contact WhatsApp 0208207543 within 3 days if product is defective.' +
  ' - Keep responses concise, friendly, helpful. Use simple English. If you do not know something specific, direct them to WhatsApp 0208207543.';

async function askGemini(conversationHistory) {
  try {
    var contents = conversationHistory.map(function(msg) {
      return { role: msg.role === 'user' ? 'user' : 'model', parts: [{ text: msg.content }] };
    });

    // Add system instruction as first user message if not present
    if (contents.length > 0 && contents[0].role !== 'model') {
      contents.unshift({ role: 'user', parts: [{ text: FMM_SYSTEM_PROMPT + ' Now respond to customers as this AI assistant.' }] });
      contents.splice(1, 0, { role: 'model', parts: [{ text: 'Understood! I am FMM CLASSICO AI support. I will help customers with their questions about products, delivery, payment, orders, and more.' }] });
    }

    var response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + GEMINI_API_KEY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: contents }),
    });

    var data = await response.json();

    if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
      return data.candidates[0].content.parts[0].text;
    }
    if (data.error) {
      console.error('[Gemini] Error:', data.error);
      return 'Sorry, I am having a brief issue. Please try again or contact us on WhatsApp: 0208207543';
    }
    return 'Sorry, I could not understand that. Please try again or WhatsApp us at 0208207543';
  } catch (err) {
    console.error('[Chat AI] Error:', err);
    return 'Sorry, I am temporarily unavailable. Please contact us on WhatsApp: 0208207543';
  }
}

export default function Chat() {
  var [user, setUser] = useState(null);
  var [messages, setMessages] = useState([]);
  var [input, setInput] = useState('');
  var [isTyping, setIsTyping] = useState(false);
  var messagesEndRef = useRef(null);
  var queryClient = useQueryClient();

  useEffect(function() {
    base44.auth.me().then(function(u) { setUser(u); }).catch(function() {});
  }, []);

  // Load previous messages from DB
  useEffect(function() {
    if (!user || !user.email) return;
    base44.entities.ChatMessage.filter({ user_email: user.email }, 'created_date', 30).then(function(dbMessages) {
      if (dbMessages && dbMessages.length > 0) {
        var loaded = dbMessages.map(function(m) {
          return { role: m.is_admin ? 'assistant' : 'user', content: m.message };
        });
        setMessages(loaded);
      } else {
        setMessages([{ role: 'assistant', content: 'Hi! Welcome to FMM CLASSICO. I am your AI shopping assistant, available 24/7. How can I help you today? Ask me about products, delivery, payments, or anything else!' }]);
      }
    }).catch(function() {
      setMessages([{ role: 'assistant', content: 'Hi! Welcome to FMM CLASSICO. How can I help you today?' }]);
    });
  }, [user]);

  useEffect(function() {
    if (messagesEndRef.current) messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  var handleSend = async function(e) {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    var userMessage = input.trim();
    setInput('');
    var newMessages = messages.concat([{ role: 'user', content: userMessage }]);
    setMessages(newMessages);
    setIsTyping(true);

    // Save user message to DB
    try {
      await base44.entities.ChatMessage.create({
        user_email: user.email,
        message: userMessage,
        sender: 'user',
        is_admin: false,
        created_date: new Date().toISOString(),
      });
    } catch (err) { console.error('Save msg error:', err); }

    // Get AI response from Gemini
    var aiResponse = await askGemini(newMessages.slice(-10));
    var finalMessages = newMessages.concat([{ role: 'assistant', content: aiResponse }]);
    setMessages(finalMessages);
    setIsTyping(false);

    // Save AI response to DB
    try {
      await base44.entities.ChatMessage.create({
        user_email: user.email,
        message: aiResponse,
        sender: 'admin',
        is_admin: true,
        created_date: new Date().toISOString(),
      });
    } catch (err) { console.error('Save AI msg error:', err); }
  };

  if (!user) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  return (
    <div className="max-w-lg mx-auto px-4 py-6 pb-32 flex flex-col h-[calc(100vh-120px)]">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
          <Bot className="w-4 h-4 text-blue-600" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-900">FMM CLASSICO Support</h1>
          <p className="text-[10px] text-green-600 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Online 24/7</p>
        </div>
      </div>

      <div className="bg-blue-50 rounded-xl p-3 mb-4 text-xs text-blue-700">
        Ask me anything about our products, delivery, payments, or orders. For urgent help, WhatsApp us at 0208207543.
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 mb-4">
        {messages.map(function(msg, i) {
          var isUser = msg.role === 'user';
          return (
            <div key={i} className={'flex ' + (isUser ? 'justify-end' : 'justify-start')}>
              <div className={'max-w-[85%] rounded-2xl px-4 py-2.5 ' + (isUser ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800')}>
                {!isUser && <p className="text-[10px] font-semibold text-blue-600 mb-0.5">FMM CLASSICO AI</p>}
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          );
        })}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-2xl px-4 py-2.5">
              <div className="flex gap-1"><span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span><span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></span><span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></span></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} className="flex gap-2">
        <Input value={input} onChange={function(e) { setInput(e.target.value); }} placeholder="Ask about products, delivery, orders..." className="flex-1 rounded-xl" disabled={isTyping} />
        <Button type="submit" disabled={isTyping || !input.trim()} className="rounded-xl bg-blue-800 text-white hover:bg-blue-900">
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </div>
  );
}
