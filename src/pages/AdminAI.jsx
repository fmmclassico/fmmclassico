import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bot, Send, Loader2, Sparkles, Trash2, User, Download, X, Paperclip } from 'lucide-react';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';

const QUICK_PROMPTS = [
  '🎨 Generate a flyer for a 20% off flash sale on phones',
  '🖼️ Show me an image of AirPods Pro on white background',
  '🖼️ Photo of iPhone 15 charger – product image',
  '🎨 Create a promotional banner for Tecno Spark 20 at ₵1,200',
  '🎬 Generate a 6-second video of iPhone 15 Pro',
  '📣 Write a WhatsApp broadcast for a weekend sale',
  '📝 Write a product description for Samsung Galaxy A15',
  '💡 Suggest promotions for the Donkomi deals section',
  '🛒 Give me 5 upsell ideas for phone cases',
];

export default function AdminAI() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hello! I'm your **CLASSICO AI Assistant** — powered by advanced AI.\n\nI can help you with anything for your store:\n\n- 🖼️ **Generate product images** — say *\"design a product image for iPhone 15 Pro Max\"* to get a photorealistic product photo\n- 🎬 **Generate videos** — say *\"create a 6-second video of AirPods Pro\"* for promotional videos\n- 💧 **Add watermark** — say *\"add FMM CLASSICO watermark\"* to any product image generation\n- 🎨 **Generate flyers & banners** — say *\"create a flyer for 20% off sale\"* to get a downloadable marketing image\n- 📣 **Marketing copy** — WhatsApp broadcasts, product descriptions, promo campaigns\n- 💡 **Business advice** — pricing strategies, promotions, upsell ideas for the Ghana market\n- 🛒 **Store content** — banner text (title, subtitle, CTA, gradient), notification messages\n- 📊 **Sales strategy** — deal ideas, seasonal campaigns, customer retention tips\n- ✍️ **Any writing task** — emails, announcements, customer replies\n\nJust type what you need or pick a quick prompt below!" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [attachedImage, setAttachedImage] = useState(null); // { url, file }
  const [uploadingImage, setUploadingImage] = useState(false);
  const [watermarkBrand, setWatermarkBrand] = useState('FMM CLASSICO');
  const bottomRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    base44.auth.me().then(u => { setUser(u); setIsAdmin(u?.role === 'admin'); }).catch(() => {});
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const PRODUCT_KEYWORDS = [
    'airpods', 'iphone', 'samsung', 'tecno', 'infinix', 'itel', 'oraimo',
    'charger', 'earphone', 'earbuds', 'earbud', 'cable', 'phone case', 'power bank',
    'speaker', 'watch', 'laptop', 'tablet', 'tv', 'fridge', 'blender', 'microwave',
    'headphone', 'headphones', 'keyboard', 'mouse', 'router', 'modem', 'printer',
    'camera', 'tripod', 'selfie stick', 'ring light', 'powerbank', 'adapter',
    'screen protector', 'tempered glass', 'phone holder', 'car charger', 'wireless charger',
    'bluetooth', 'neckband', 'TWS', 'air fryer', 'kettle', 'iron', 'fan', 'ac unit',
    'smart watch', 'smartwatch', 'washing machine', 'refrigerator', 'air conditioner',
    'jbl', 'apple', 'huawei', 'oppo', 'realme', 'xiaomi', 'redmi', 'nokia', 'itel',
    'product', 'gadget', 'device', 'accessory', 'accessories'
  ];

  const isVideoRequest = (msg) => {
   const lower = msg.toLowerCase();
   return lower.includes('video') || lower.includes('motion') || lower.includes('animate') || lower.includes('animated');
  };

  const isImageRequest = (msg) => {
   const lower = msg.toLowerCase();
   const hasMarketingWord = lower.includes('flyer') || lower.includes('banner') || lower.includes('poster') || lower.includes('promotional') || lower.includes('advertisement');
   const hasImageWord = lower.includes('generate') || lower.includes('create') || lower.includes('design') || lower.includes('make') || lower.includes('show') || lower.includes('draw') || lower.includes('render') || lower.includes('give me') || lower.includes('get me') || lower.includes('i want');
   const hasProductWord = PRODUCT_KEYWORDS.some(k => lower.includes(k));
   return (
     hasMarketingWord ||
     lower.includes('generate image') || lower.includes('create image') ||
     lower.includes('product image') || lower.includes('product photo') ||
     lower.includes('product picture') || lower.includes('generate a photo') ||
     lower.includes('generate a picture') || lower.includes('image of') ||
     lower.includes('picture of') || lower.includes('photo of') ||
     lower.includes('generate only') || lower.includes('show me an image') ||
     (hasImageWord && hasProductWord)
   );
  };

  const isPureProductImage = (msg) => {
    const lower = msg.toLowerCase();
    const hasMarketingWord = lower.includes('flyer') || lower.includes('banner') || lower.includes('poster') || lower.includes('advertisement');
    return !hasMarketingWord;
  };

  const handleImageAttach = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setAttachedImage({ url: file_url, name: file.name });
      toast.success('Image attached!');
    } catch {
      toast.error('Failed to upload image');
    }
    setUploadingImage(false);
    e.target.value = '';
  };

  const sendMessage = async (text) => {
    const msg = (text || input).trim();
    if (!msg && !attachedImage) return;
    const displayMsg = msg || '🖼️ [Image attached — generate/edit based on this]';
    setInput('');
    const imgUrl = attachedImage?.url || null;
    setAttachedImage(null);

    setMessages(m => [...m, { role: 'user', content: displayMsg, image_url: imgUrl }]);
    setLoading(true);

    // Handle video generation
    if (isVideoRequest(msg)) {
      try {
        setMessages(m => [...m, { role: 'assistant', content: '🎬 Generating your video... this takes about 30-60 seconds...', isTemp: true }]);
        const videoPrompt = `Create a cinematic, realistic 6-second video. ${msg}. High quality, well-lit, professional product showcase, smooth camera movement, modern style.`;
        const { url } = await base44.integrations.Core.GenerateVideo({ prompt: videoPrompt, label: 'Product Video' });
        setMessages(m => {
          const filtered = m.filter(x => !x.isTemp);
          return [...filtered, { role: 'assistant', content: '✅ Here is your generated video!', video_url: url }];
        });
      } catch (e) {
        setMessages(m => m.filter(x => !x.isTemp));
        setMessages(m => [...m, { role: 'assistant', content: 'Sorry, video generation failed. Please try again.' }]);
      }
      setLoading(false);
      return;
    }

    // If user attached an image, use it as reference for generation or editing
    if (imgUrl || isImageRequest(msg)) {
      try {
        const isProductImg = !imgUrl ? isPureProductImage(msg) : true;
        setMessages(m => [...m, {
          role: 'assistant',
          content: imgUrl ? '🖼️ Analyzing your image and generating... ~15 seconds...' : (isProductImg ? '🖼️ Generating product image... this takes about 10-15 seconds...' : '🎨 Generating your flyer... this takes about 10-15 seconds...'),
          isTemp: true
        }]);

        let imagePrompt;
        if (imgUrl && msg) {
          imagePrompt = `${msg}. Use the uploaded reference image as inspiration or as the subject to edit/recreate. Photorealistic, high quality, 4K.`;
        } else if (imgUrl) {
          imagePrompt = `Generate a high-quality photorealistic version of this product image. Clean white background, professional studio lighting, commercial e-commerce quality, no text, no logos.`;
        } else if (isProductImg) {
           const hasWatermark = msg.toLowerCase().includes('watermark') || msg.toLowerCase().includes(watermarkBrand.toLowerCase());
           imagePrompt = `Ultra-realistic professional product photography. Subject: ${msg}. Pure white background, studio soft-box lighting from top-left, crisp shadows, hyper-detailed, 8K resolution, commercial e-commerce product shot, isolated product only, photorealistic render.${hasWatermark ? ` Add a subtle semi-transparent watermark or badge with "${watermarkBrand}" in the corner.` : ' No text, no logos, no watermarks.'}`;
         } else {
          imagePrompt = `Professional high-quality advertising flyer for FMM CLASSICO Ghana store. ${msg}. Include bold text layout, vibrant colors, modern design, clean typography, product imagery. Style: photoshop-quality commercial banner, 4K resolution, professional marketing material.`;
        }

        const genPayload = { prompt: imagePrompt };
        if (imgUrl) genPayload.existing_image_urls = [imgUrl];

        const { url } = await base44.integrations.Core.GenerateImage(genPayload);
        setMessages(m => {
          const filtered = m.filter(x => !x.isTemp);
          return [...filtered, { role: 'assistant', content: '✅ Here is your generated image!', image_url: url }];
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
  if (!isAdmin) {
    const adminVerified = sessionStorage.getItem(`admin_verified_${user.email}`);
    if (!adminVerified) {
      return <div className="p-8 text-center text-gray-500">Admin password verification required. Please logout and login again.</div>;
    }
    return <div className="p-8 text-center text-gray-500">Your account does not have admin privileges.</div>;
  }

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
                {msg.role === 'user' && msg.image_url && (
                  <div className="mb-1">
                    <img src={msg.image_url} alt="attached" className="rounded-xl max-h-40 object-cover border border-gray-300" />
                  </div>
                )}
                {msg.content && (
                  <div className={`rounded-2xl px-4 py-2.5 text-sm ${msg.role === 'user' ? 'bg-gray-800 text-white' : 'bg-white border border-gray-200 text-gray-800'}`}>
                    {msg.role === 'assistant'
                      ? <ReactMarkdown className="prose prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">{msg.content}</ReactMarkdown>
                      : <p>{msg.content}</p>
                    }
                  </div>
                )}
                {msg.role === 'assistant' && msg.image_url && (
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
                {msg.role === 'assistant' && msg.video_url && (
                   <div className="mt-2 bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-md">
                     <video src={msg.video_url} controls className="w-full object-cover" style={{ maxHeight: 400 }} />
                     <div className="flex gap-2 p-3 bg-gray-50 border-t border-gray-100">
                       <Button size="sm" className="bg-green-600 hover:bg-green-700 gap-1.5 flex-1" onClick={() => window.open(msg.video_url, '_blank')}>
                         <Download className="h-4 w-4" /> Download Video
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

        {/* Watermark settings */}
          <div className="p-3 border-b bg-gray-50 flex gap-2 items-center">
            <label className="text-xs font-medium text-gray-600">Watermark Brand:</label>
            <input
              type="text"
              value={watermarkBrand}
              onChange={e => setWatermarkBrand(e.target.value)}
              placeholder="e.g., FMM CLASSICO"
              className="flex-1 text-xs border rounded px-2 py-1"
            />
            <span className="text-[10px] text-gray-500">Use in prompts: "add watermark" or "with FMM CLASSICO watermark"</span>
          </div>

          {/* Input */}
          <div className="p-3 border-t bg-white">
            {/* Attached image preview */}
            {attachedImage && (
            <div className="flex items-center gap-2 mb-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
              <img src={attachedImage.url} alt="attached" className="h-10 w-10 object-cover rounded" />
              <span className="text-xs text-blue-700 flex-1 truncate">{attachedImage.name}</span>
              <button onClick={() => setAttachedImage(null)} className="text-gray-400 hover:text-red-500"><X className="h-4 w-4" /></button>
            </div>
          )}
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <Textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder='Ask anything, generate a flyer, or attach an image to edit/recreate it...'
                className="resize-none text-sm min-h-[44px] max-h-32"
                rows={2}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              />
              <p className="text-[10px] text-gray-400 mt-1">💡 Attach an image 📎 to generate similar or edited versions. Or type to generate from scratch.</p>
            </div>
            <div className="flex flex-col gap-1 self-end mb-5">
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageAttach} />
              <Button size="icon" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploadingImage} title="Attach image">
                {uploadingImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
              </Button>
              <Button onClick={() => sendMessage()} disabled={loading || (!input.trim() && !attachedImage)}
                className="bg-blue-600 hover:bg-blue-700 px-3">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
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