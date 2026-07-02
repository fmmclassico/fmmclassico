import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Loader2, Send, FileText, Sparkles, Copy } from 'lucide-react';
import { toast } from 'sonner';

var GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

async function askGemini(prompt, systemContext) {
  try {
    var contents = [
      { role: 'user', parts: [{ text: systemContext }] },
      { role: 'model', parts: [{ text: 'Understood. I will help as requested.' }] },
      { role: 'user', parts: [{ text: prompt }] }
    ];

    var response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + GEMINI_API_KEY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: contents }),
    });

    var data = await response.json();

    if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
      return data.candidates[0].content.parts[0].text;
    }
    if (data.error) throw new Error(data.error.message || 'Gemini API error');
    throw new Error('No response from Gemini');
  } catch (err) {
    throw err;
  }
}

export default function AdminAI() {
  var [user, setUser] = useState(null);
  var [isAdmin, setIsAdmin] = useState(false);
  var [activeTab, setActiveTab] = useState('chat');
  var [chatMessages, setChatMessages] = useState([]);
  var [chatInput, setChatInput] = useState('');
  var [isLoading, setIsLoading] = useState(false);
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
      var systemContext = 'You are the AI business assistant for FMM CLASSICO, an online store in Ghana selling phone accessories, electronics, and home appliances. Locations: Tarkwa (UMaT Campus), Accra (Ashongman Estate), and Kumasi. Phone: 0208207543. Email: fmmclassico@gmail.com. Help the admin with product descriptions, marketing ideas, business advice, social media captions, pricing strategies, and any business questions.';
      var result = await askGemini(chatInput, systemContext);
      setChatMessages(newMessages.concat([{ role: 'assistant', content: result }]));
    } catch (err) {
      toast.error('AI Error: ' + err.message);
      setChatMessages(newMessages.concat([{ role: 'assistant', content: 'Error: ' + err.message }]));
    }
    setIsLoading(false);
  };

  var handleGenerateDescription = async function() {
    if (!descProduct.trim() || isLoading) return;
    setIsLoading(true);
    setGeneratedDesc('');
    try {
      var systemContext = 'You are a product copywriter for FMM CLASSICO, a phone accessories and electronics store in Ghana. Write compelling, SEO-friendly product descriptions. Include key features, benefits, and a call to action. Keep it concise but persuasive. Prices in GHS (Ghana cedis). Make it sound professional and appealing.';
      var result = await askGemini('Write a product description for: ' + descProduct, systemContext);
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
        <p className="text-sm text-gray-500">Generate descriptions, marketing copy, get business advice (powered by Google Gemini)</p>
      </div>

      <div className="flex gap-2 mb-6">
        <Button variant={activeTab === 'chat' ? 'default' : 'outline'} size="sm" onClick={function() { setActiveTab('chat'); }} className={'rounded-xl ' + (activeTab === 'chat' ? 'bg-blue-800 text-white' : '')}>
          <Send className="w-4 h-4 mr-1" /> AI Chat
        </Button>
        <Button variant={activeTab === 'description' ? 'default' : 'outline'} size="sm" onClick={function() { setActiveTab('description'); }} className={'rounded-xl ' + (activeTab === 'description' ? 'bg-blue-800 text-white' : '')}>
          <FileText className="w-4 h-4 mr-1" /> Product Description
        </Button>
      </div>

      {activeTab === 'chat' && (
        <Card className="p-4 rounded-2xl">
          <div className="h-[400px] overflow-y-auto mb-4 space-y-3">
            {chatMessages.length === 0 && (
              <div className="text-center text-gray-400 text-sm py-12">Ask me anything: product descriptions, marketing ideas, social media captions, business advice...</div>
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

      {activeTab === 'description' && (
        <Card className="p-4 rounded-2xl">
          <h2 className="font-bold text-gray-800 mb-3">Generate Product Description</h2>
          <p className="text-xs text-gray-500 mb-3">Enter product name or details. AI will write a selling description for your store.</p>
          <Input value={descProduct} onChange={function(e) { setDescProduct(e.target.value); }} placeholder="e.g. Samsung 20W Fast Charger USB-C, or paste product details..." className="mb-3 rounded-xl" />
          <Button onClick={handleGenerateDescription} disabled={isLoading || !descProduct.trim()} className="rounded-xl bg-blue-800 text-white mb-4">
            {isLoading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Generating...</> : <><FileText className="w-4 h-4 mr-2" /> Generate Description</>}
          </Button>
          {generatedDesc && (
            <div className="mt-4 bg-gray-50 rounded-xl p-4">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{generatedDesc}</p>
              <Button variant="outline" size="sm" className="mt-3 rounded-xl" onClick={function() { navigator.clipboard.writeText(generatedDesc); toast.success('Copied!'); }}>
                <Copy className="w-3 h-3 mr-1" /> Copy to Clipboard
              </Button>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
