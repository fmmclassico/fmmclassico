import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, Image, FileText, Sparkles, Download } from 'lucide-react';
import { toast } from 'sonner';

var AI_BASE_URL = import.meta.env.VITE_AI_BASE_URL || 'https://api.freetheai.xyz/v1';
var AI_API_KEY = import.meta.env.VITE_AI_API_KEY || '';

async function chatWithAI(messages) {
  var response = await fetch(AI_BASE_URL + '/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + AI_API_KEY },
    body: JSON.stringify({ model: 'gpt-4o', messages: messages, max_tokens: 2000 }),
  });
  var data = await response.json();
  if (data.choices && data.choices[0] && data.choices[0].message) {
    return data.choices[0].message.content;
  }
  if (data.error) throw new Error(data.error.message || 'AI request failed');
  throw new Error('Unexpected AI response');
}

async function generateImage(prompt) {
  var response = await fetch(AI_BASE_URL + '/images/generations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + AI_API_KEY },
    body: JSON.stringify({ model: 'vhr/gpt_image_2', prompt: prompt }),
  });
  var data = await response.json();
  if (data.data && data.data[0]) {
    if (data.data[0].url) return { type: 'url', value: data.data[0].url };
    if (data.data[0].b64_json) return { type: 'base64', value: 'data:image/png;base64,' + data.data[0].b64_json };
  }
  if (data.error) throw new Error(data.error.message || 'Image generation failed');
  throw new Error('No image in response');
}

export default function AdminAI() {
  var [user, setUser] = useState(null);
  var [isAdmin, setIsAdmin] = useState(false);
  var [activeTab, setActiveTab] = useState('chat');
  var [chatMessages, setChatMessages] = useState([]);
  var [chatInput, setChatInput] = useState('');
  var [isLoading, setIsLoading] = useState(false);
  var [imagePrompt, setImagePrompt] = useState('');
  var [generatedImage, setGeneratedImage] = useState(null);
  var [descProduct, setDescProduct] = useState('');
  var [generatedDesc, setGeneratedDesc] = useState('');
  var messagesEndRef = useRef(null);

  useEffect(function() {
    base44.auth.me().then(function(u) { setUser(u); setIsAdmin(u.role === 'admin'); }).catch(function() {});
  }, []);

  useEffect(function() {
    if (messagesEndRef.current) messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  var handleChat = async function(e) {
    e.preventDefault();
    if (!chatInput.trim() || isLoading) return;
    var userMsg = { role: 'user', content: chatInput };
    var newMessages = chatMessages.concat([userMsg]);
    setChatMessages(newMessages);
    setChatInput('');
    setIsLoading(true);
    try {
      var systemMsg = { role: 'system', content: 'You are the AI assistant for FMM CLASSICO, an online store in Ghana selling phone accessories, electronics, and home appliances. Locations: Tarkwa (UMAT Campus) and Accra (Ashongman Estate). Phone: 0208207543. Help the admin with product descriptions, marketing ideas, business advice, and any questions about running the store.' };
      var result = await chatWithAI([systemMsg].concat(newMessages));
      setChatMessages(newMessages.concat([{ role: 'assistant', content: result }]));
    } catch (err) {
      toast.error('AI Error: ' + err.message);
      setChatMessages(newMessages.concat([{ role: 'assistant', content: 'Sorry, I could not process that request. Error: ' + err.message }]));
    }
    setIsLoading(false);
  };

  var handleGenerateImage = async function() {
    if (!imagePrompt.trim() || isLoading) return;
    setIsLoading(true);
    setGeneratedImage(null);
    try {
      var result = await generateImage(imagePrompt);
      setGeneratedImage(result.value);
      toast.success('Image generated!');
    } catch (err) {
      toast.error('Image Error: ' + err.message);
    }
    setIsLoading(false);
  };

  var handleGenerateDescription = async function() {
    if (!descProduct.trim() || isLoading) return;
    setIsLoading(true);
    setGeneratedDesc('');
    try {
      var result = await chatWithAI([
        { role: 'system', content: 'You are a product copywriter for FMM CLASSICO, a phone accessories and electronics store in Ghana. Write compelling, SEO-friendly product descriptions. Include key features, benefits, and a call to action. Keep it concise but persuasive. Use cedis currency.' },
        { role: 'user', content: 'Write a product description for: ' + descProduct }
      ]);
      setGeneratedDesc(result);
    } catch (err) {
      toast.error('Error: ' + err.message);
    }
    setIsLoading(false);
  };

  if (!user) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  if (!isAdmin) return <div className="p-8 text-center"><p className="text-gray-500">Admin access required</p></div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2"><Sparkles className="w-5 h-5 text-blue-600" /> AI Assistant</h1>
        <p className="text-sm text-gray-500">Generate descriptions, images, marketing copy and more</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {[{ id: 'chat', label: 'AI Chat', icon: Send }, { id: 'image', label: 'Generate Image', icon: Image }, { id: 'description', label: 'Product Description', icon: FileText }].map(function(tab) {
          return (
            <Button key={tab.id} variant={activeTab === tab.id ? 'default' : 'outline'} size="sm" onClick={function() { setActiveTab(tab.id); }} className={'rounded-xl ' + (activeTab === tab.id ? 'bg-blue-800 text-white' : '')}>
              <tab.icon className="w-4 h-4 mr-1" /> {tab.label}
            </Button>
          );
        })}
      </div>

      {/* AI Chat Tab */}
      {activeTab === 'chat' && (
        <Card className="p-4 rounded-2xl">
          <div className="h-[400px] overflow-y-auto mb-4 space-y-3">
            {chatMessages.length === 0 && (
              <div className="text-center text-gray-400 text-sm py-12">Ask me anything about your business, products, marketing ideas...</div>
            )}
            {chatMessages.map(function(msg, i) {
              var isUser = msg.role === 'user';
              return (
                <div key={i} className={'flex ' + (isUser ? 'justify-end' : 'justify-start')}>
                  <div className={'max-w-[80%] rounded-2xl px-4 py-2 ' + (isUser ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800')}>
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              );
            })}
            {isLoading && (
              <div className="flex justify-start"><div className="bg-gray-100 rounded-2xl px-4 py-2"><Loader2 className="w-4 h-4 animate-spin" /></div></div>
            )}
            <div ref={messagesEndRef} />
          </div>
          <form onSubmit={handleChat} className="flex gap-2">
            <Input value={chatInput} onChange={function(e) { setChatInput(e.target.value); }} placeholder="Ask AI anything..." className="flex-1 rounded-xl" />
            <Button type="submit" disabled={isLoading || !chatInput.trim()} className="rounded-xl bg-blue-800 text-white"><Send className="w-4 h-4" /></Button>
          </form>
        </Card>
      )}

      {/* Image Generation Tab */}
      {activeTab === 'image' && (
        <Card className="p-4 rounded-2xl">
          <h2 className="font-bold text-gray-800 mb-3">Generate Image</h2>
          <p className="text-xs text-gray-500 mb-3">Create flyers, product images, promotional graphics. Describe what you want.</p>
          <Textarea value={imagePrompt} onChange={function(e) { setImagePrompt(e.target.value); }} placeholder="Example: A professional product flyer for FMM CLASSICO showing phone accessories with blue and white branding, modern design, Ghana themed" rows={3} className="mb-3" />
          <Button onClick={handleGenerateImage} disabled={isLoading || !imagePrompt.trim()} className="rounded-xl bg-blue-800 text-white mb-4">
            {isLoading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Generating...</> : <><Image className="w-4 h-4 mr-2" /> Generate Image</>}
          </Button>
          {generatedImage && (
            <div className="mt-4">
              <img src={generatedImage} alt="Generated" className="w-full max-w-md rounded-xl shadow-lg mx-auto" />
              <div className="text-center mt-3">
                <a href={generatedImage} download="fmm-classico-image.png" target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm" className="rounded-xl"><Download className="w-4 h-4 mr-1" /> Download Image</Button>
                </a>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Product Description Tab */}
      {activeTab === 'description' && (
        <Card className="p-4 rounded-2xl">
          <h2 className="font-bold text-gray-800 mb-3">Generate Product Description</h2>
          <p className="text-xs text-gray-500 mb-3">Enter product name or paste product details. AI will write a selling description.</p>
          <Input value={descProduct} onChange={function(e) { setDescProduct(e.target.value); }} placeholder="e.g. Samsung 20W Fast Charger USB-C, or paste product details..." className="mb-3 rounded-xl" />
          <Button onClick={handleGenerateDescription} disabled={isLoading || !descProduct.trim()} className="rounded-xl bg-blue-800 text-white mb-4">
            {isLoading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Generating...</> : <><FileText className="w-4 h-4 mr-2" /> Generate Description</>}
          </Button>
          {generatedDesc && (
            <div className="mt-4 bg-gray-50 rounded-xl p-4">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{generatedDesc}</p>
              <Button variant="outline" size="sm" className="mt-3 rounded-xl" onClick={function() { navigator.clipboard.writeText(generatedDesc); toast.success('Copied!'); }}>Copy to Clipboard</Button>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
