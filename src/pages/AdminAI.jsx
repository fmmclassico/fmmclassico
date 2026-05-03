import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bot, Send, Loader2, Sparkles, Trash2, User } from 'lucide-react';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';

const QUICK_PROMPTS = [
  'Create a promo banner for a 20% off flash sale on phones',
  'What are the top selling product categories I should focus on?',
  'Write a WhatsApp broadcast message for a weekend sale',
  'Suggest product descriptions for Samsung Galaxy A15',
  'Create a catchy promo text for Oraimo earbuds at ₵150',
  'What promotions should I run for Donkomi deals section?',
];

export default function AdminAI() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hello! I'm your CLASSICO AI Assistant. I can help you:\n\n- **Create promo banners & flyers** for your homepage\n- **Write product descriptions** and marketing copy\n- **Suggest deals & promotions** for your store\n- **Generate WhatsApp broadcast messages**\n- **Advise on pricing, categories, and products**\n\nWhat would you like to do today?" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    base44.auth.me().then(u => { setUser(u); setIsAdmin(u?.role === 'admin'); }).catch(() => {});
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text) => {
    const msg = (text || input).trim();
    if (!msg) return;
    setInput('');
    setMessages(m => [...m, { role: 'user', content: msg }]);
    setLoading(true);

    const history = messages.map(m => `${m.role === 'user' ? 'Admin' : 'AI'}: ${m.content}`).join('\n');

    const response = await base44.integrations.Core.InvokeLLM({
      prompt: `You are the AI assistant for FMM CLASSICO, an online store in Ghana selling phones, phone accessories, electronics, and home appliances. The admin is asking you for help.

Store context:
- Store name: FMM CLASSICO
- Locations: Tarkwa (UMAT Campus) and Accra (Ashongman Estate)
- Currency: GHS (₵)
- Key brands: Apple, Samsung, Tecno, Infinix, Oraimo, JBL, TCL, Hisense, Roch, Silver Crest, Midea, Nasco, Hoffman
- Sections: CLASSICO Deals (flash sales), Donkomi Sales (best prices), New Arrivals, Top Selling
- Payment: Mobile Money, Card
- WhatsApp: 0509 896 035

Previous conversation:
${history}

Admin's latest message: ${msg}

Respond helpfully. If asked to create a promo banner or flyer text, provide: title, subtitle, badge text, a gradient suggestion (Tailwind classes), and call-to-action. Be specific and practical for the Ghana market.`,
    });

    setMessages(m => [...m, { role: 'assistant', content: response }]);
    setLoading(false);
  };

  if (!user) return <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto" /></div>;
  if (!isAdmin) return <div className="p-8 text-center text-gray-500">Admin access required.</div>;

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
          <Sparkles className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-gray-900">CLASSICO AI Assistant</h1>
          <p className="text-gray-500 text-sm">Your personal store assistant — banners, promo copy, product advice & more</p>
        </div>
        <Badge className="ml-auto bg-green-100 text-green-700 border-green-200">Admin Only</Badge>
      </div>

      {/* Quick prompts */}
      <div className="flex flex-wrap gap-2 mb-4">
        {QUICK_PROMPTS.map(p => (
          <button key={p} onClick={() => sendMessage(p)}
            className="text-xs px-3 py-1.5 rounded-full border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors font-medium">
            {p}
          </button>
        ))}
      </div>

      {/* Chat window */}
      <Card className="mb-4 overflow-hidden">
        <div className="h-[50vh] overflow-y-auto p-4 space-y-4 bg-gray-50">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Bot className="h-4 w-4 text-white" />
                </div>
              )}
              <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${msg.role === 'user' ? 'bg-gray-800 text-white' : 'bg-white border border-gray-200 text-gray-800'}`}>
                {msg.role === 'assistant'
                  ? <ReactMarkdown className="prose prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">{msg.content}</ReactMarkdown>
                  : <p>{msg.content}</p>
                }
              </div>
              {msg.role === 'user' && (
                <div className="w-7 h-7 rounded-lg bg-gray-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <User className="h-4 w-4 text-white" />
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex gap-3 justify-start">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="p-3 border-t bg-white flex gap-2">
          <Textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask me anything — create a banner, write promo text, get product advice..."
            className="resize-none text-sm min-h-[44px] max-h-32"
            rows={2}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
          />
          <Button onClick={() => sendMessage()} disabled={loading || !input.trim()}
            className="bg-blue-600 hover:bg-blue-700 self-end px-3">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </Card>

      <div className="flex justify-end">
        <button onClick={() => setMessages([{ role: 'assistant', content: "Chat cleared. How can I help you?" }])}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors">
          <Trash2 className="h-3.5 w-3.5" /> Clear chat
        </button>
      </div>
    </div>
  );
}