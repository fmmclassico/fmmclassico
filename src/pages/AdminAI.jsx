import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bot, Send, Loader2, Sparkles, Trash2, User, Image, Download, X } from 'lucide-react';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';

const QUICK_PROMPTS = [
  '🎨 Generate a flyer for a 20% off flash sale on phones',
  '🖼️ Show me an image of AirPods Pro on white background',
  '🖼️ Photo of iPhone 15 charger – product image',
  '🎨 Create a promotional banner for Tecno Spark 20 at ₵1,200',
  '📣 Write a WhatsApp broadcast for a weekend sale',
  '📝 Write a product description for Samsung Galaxy A15',
  '💡 Suggest promotions for the Donkomi deals section',
  '🛒 Give me 5 upsell ideas for phone cases',
];

export default function AdminAI() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hello! I'm your **CLASSICO AI Assistant** — powered by advanced AI.\n\nI can help you with anything for your store:\n\n- 🖼️ **Generate product images** — say *\"design a product image for iPhone 15 Pro Max\"* to get a photorealistic product photo\n- 🎨 **Generate flyers & banners** — say *\"create a flyer for 20% off sale\"* to get a downloadable marketing image\n- 📣 **Marketing copy** — WhatsApp broadcasts, product descriptions, promo campaigns\n- 💡 **Business advice** — pricing strategies, promotions, upsell ideas for the Ghana market\n- 🛒 **Store content** — banner text (title, subtitle, CTA, gradient), notification messages\n- 📊 **Sales strategy** — deal ideas, seasonal campaigns, customer retention tips\n- ✍️ **Any writing task** — emails, announcements, customer replies\n\nJust type what you need or pick a quick prompt below!" }
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

  const isImageRequest = (msg) => {
    const lower = msg.toLowerCase();
    return (
      lower.includes('flyer') || lower.includes('banner') || lower.includes('poster') ||
      lower.includes('generate image') || lower.includes('create image') ||
      lower.includes('design a') || lower.includes('design product') ||
      lower.includes('make a flyer') || lower.includes('make a banner') ||
      lower.includes('product image') || lower.includes('product photo') ||
      lower.includes('product picture') || lower.includes('generate a photo') ||
      lower.includes('draw') || lower.includes('create a picture') ||
      lower.includes('generate a picture') || lower.includes('show me') ||
      lower.includes('image of') || lower.includes('picture of') ||
      lower.includes('photo of') || lower.includes('generate only')
    );
  };

  const isPureProductImage = (msg) => {
    const lower = msg.toLowerCase();
    return (
      lower.includes('product image') || lower.includes('product photo') ||
      lower.includes('product picture') || lower.includes('design product') ||
      lower.includes('image of') || lower.includes('picture of') ||
      lower.includes('photo of') || lower.includes('show me') ||
      lower.includes('generate only') ||
      // If it has a product name but NOT a marketing term
      (!lower.includes('flyer') && !lower.includes('banner') && !lower.includes('poster') &&
       (lower.includes('airpods') || lower.includes('iphone') || lower.includes('samsung') ||
        lower.includes('charger') || lower.includes('earphone') || lower.includes('earbuds') ||
        lower.includes('cable') || lower.includes('phone case') || lower.includes('power bank') ||
        lower.includes('speaker') || lower.includes('watch') || lower.includes('laptop') ||
        lower.includes('tablet') || lower.includes('tv') || lower.includes('fridge') ||
        lower.includes('blender') || lower.includes('microwave') || lower.includes('headphone')))
    );
  };

  const sendMessage = async (text) => {
    const msg = (text || input).trim();
    if (!msg) return;
    setInput('');
    setMessages(m => [...m, { role: 'user', content: msg }]);
    setLoading(true);

    if (isImageRequest(msg)) {
      // Generate image flyer
      try {
        const isProductImg = isPureProductImage(msg);
        setMessages(m => [...m, { role: 'assistant', content: isProductImg ? '🖼️ Generating product image... this takes about 10-15 seconds...' : '🎨 Generating your flyer... this takes about 10-15 seconds...', isTemp: true }]);
        const imagePrompt = isProductImg
          ? `Ultra-realistic professional product photography. Subject: ${msg}. Pure white background, studio soft-box lighting from top-left, crisp shadows, hyper-detailed, 8K resolution, commercial e-commerce product shot, no text, no logos, no watermarks, isolated product only, photorealistic render.`
          : `Professional high-quality advertising flyer for FMM CLASSICO Ghana store. ${msg}. Include bold text layout, vibrant colors, modern design, clean typography, product imagery. Style: photoshop-quality commercial banner, 4K resolution, professional marketing material.`;
        const { url } = await base44.integrations.Core.GenerateImage({ prompt: imagePrompt });
        setMessages(m => {
          const filtered = m.filter(x => !x.isTemp);
          return [...filtered, { role: 'assistant', content: isProductImg ? '✅ Here is your generated product image!' : '✅ Here is your generated flyer!', image_url: url }];
        });
      } catch (e) {
        setMessages(m => m.filter(x => !x.isTemp));
        setMessages(m => [...m, { role: 'assistant', content: 'Sorry, I could not generate the image. Please try again.' }]);
      }
      setLoading(false);
      return;
    }

    const history = messages.map(m => `${m.role === 'user' ? 'Admin' : 'AI'}: ${m.content}`).join('\n');
    const response = await base44.integrations.Core.InvokeLLM({
      model: 'claude_sonnet_4_6',
      prompt: `You are the AI assistant for FMM CLASSICO, a premium online store in Ghana selling phones, phone accessories, electronics, and home appliances.

Store context:
- Store name: FMM CLASSICO (also known as FMMCLASSICO)
- Locations: Tarkwa (UMAT Campus) and Accra (Ashongman Estate)
- Currency: GHS (₵)
- Key brands: Apple, Samsung, Tecno, Infinix, Oraimo, JBL, TCL, Hisense, Roch, Silver Crest, Midea, Nasco, Hoffman
- Sections: CLASSICO Deals (flash sales), Donkomi Sales (best prices), New Arrivals, Top Selling
- Payment: Mobile Money, Card
- WhatsApp: 0509 896 035

You can help the admin with:
- Writing product descriptions, promo copy, marketing messages
- Creating WhatsApp broadcast messages
- Suggesting promotional strategies, pricing ideas, discount campaigns
- Generating promo banner text (title, subtitle, badge, gradient, CTA)
- Writing customer emails or notifications
- Giving business advice specific to the Ghana electronics market
- Analyzing sales strategies for the store
- Any other business or content task the admin needs

Previous conversation:
${history}

Admin's latest message: ${msg}

Respond in a helpful, practical and detailed way. Be specific to the Ghana/West Africa market context. If asked to create promo banner text, provide all fields: title, subtitle, badge text, Tailwind gradient classes, and call-to-action button text.`,
    });

    setMessages(m => [...m, { role: 'assistant', content: response }]);
    setLoading(false);
  };

  const handleDownload = async (url) => {
    try {
      const a = document.createElement('a');
      a.href = url;
      a.download = `classico-flyer-${Date.now()}.png`;
      a.target = '_blank';
      a.click();
      toast.success('Downloading flyer...');
    } catch {
      window.open(url, '_blank');
    }
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
          <p className="text-gray-500 text-sm">Generate flyers, product images, banners, promo copy & business advice</p>
        </div>
        <Badge className="ml-auto bg-green-100 text-green-700 border-green-200">Admin Only</Badge>
      </div>

      {/* Quick prompts */}
      <div className="flex flex-wrap gap-2 mb-4">
        {QUICK_PROMPTS.map(p => (
          <button key={p} onClick={() => sendMessage(p)}
            className="text-xs px-3 py-1.5 rounded-full border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors font-medium">
            {p.includes('flyer') || p.includes('banner') ? '🎨 ' : ''}{p}
          </button>
        ))}
      </div>

      {/* Chat window */}
      <Card className="mb-4 overflow-hidden">
        <div className="h-[55vh] overflow-y-auto p-4 space-y-4 bg-gray-50">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Bot className="h-4 w-4 text-white" />
                </div>
              )}
              <div className={`max-w-[85%] ${msg.role === 'user' ? '' : ''}`}>
                {msg.content && (
                  <div className={`rounded-2xl px-4 py-2.5 text-sm ${msg.role === 'user' ? 'bg-gray-800 text-white' : 'bg-white border border-gray-200 text-gray-800'}`}>
                    {msg.role === 'assistant'
                      ? <ReactMarkdown className="prose prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">{msg.content}</ReactMarkdown>
                      : <p>{msg.content}</p>
                    }
                  </div>
                )}
                {msg.image_url && (
                  <div className="mt-2 bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-md">
                    <img src={msg.image_url} alt="Generated flyer" className="w-full object-cover" style={{ maxHeight: 400 }} />
                    <div className="flex gap-2 p-3 bg-gray-50 border-t border-gray-100">
                      <Button size="sm" className="bg-blue-600 hover:bg-blue-700 gap-1.5 flex-1" onClick={() => handleDownload(msg.image_url)}>
                        <Download className="h-4 w-4" /> Download Image
                      </Button>
                      <Button size="sm" variant="outline" className="gap-1.5" onClick={() => window.open(msg.image_url, '_blank')}>
                        Open Full Size
                      </Button>
                    </div>
                  </div>
                )}
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
        <div className="p-3 border-t bg-white flex gap-2 items-end">
          <div className="flex-1">
            <Textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder='Ask anything or say "Generate a flyer for..." to create a downloadable image...'
              className="resize-none text-sm min-h-[44px] max-h-32"
              rows={2}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            />
            <p className="text-[10px] text-gray-400 mt-1">💡 Say "design a product image for..." or "generate a flyer for..." to create downloadable images</p>
          </div>
          <Button onClick={() => sendMessage()} disabled={loading || !input.trim()}
            className="bg-blue-600 hover:bg-blue-700 self-end px-3 mb-5">
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