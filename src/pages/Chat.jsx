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

export default function Chat() {
  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    const getUser = async () => {
      const isAuth = await base44.auth.isAuthenticated();
      if (isAuth) {
        const userData = await base44.auth.me();
        setUser(userData);
        loadChatHistory(userData.email);
      } else {
        base44.auth.redirectToLogin(window.location.href);
      }
    };
    getUser();
  }, []);

  const loadChatHistory = async (email) => {
    const history = await base44.entities.ChatMessage.filter(
      { user_email: email },
      'created_date',
      50
    );
    setMessages(history.map(m => ({ role: m.role, content: m.content })));
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
    
    // Add user message
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    
    // Save user message
    await base44.entities.ChatMessage.create({
      user_email: user.email,
      role: 'user',
      content: userMessage
    });

    setIsLoading(true);

    // Get AI response
    const response = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a helpful customer support assistant for FMM CLASSICO, an online store selling phone accessories and gadgets. 
      
      About FMM CLASSICO:
      - We sell phone cases, chargers, earphones, cables, power banks, screen protectors, phone holders, and speakers
      - We offer free delivery on orders over ₵50
      - We have a 30-day return policy
      - Our products come with warranty
      - We accept Cash on Delivery and Mobile Money payments
      - Delivery typically takes 3-7 business days
      
      Customer question: ${userMessage}
      
      Provide a helpful, friendly, and concise response. If the customer asks about specific products, suggest checking our shop. If they have order issues, suggest checking the Orders page or contacting us.`,
    });

    const assistantMessage = typeof response === 'string' ? response : response.response || "I'm sorry, I couldn't process that request. Please try again.";

    // Add and save assistant message
    setMessages(prev => [...prev, { role: 'assistant', content: assistantMessage }]);
    
    await base44.entities.ChatMessage.create({
      user_email: user.email,
      role: 'assistant',
      content: assistantMessage
    });

    setIsLoading(false);
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 rounded-full bg-orange-100">
          <MessageCircle className="h-6 w-6 text-orange-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Chat Support</h1>
          <p className="text-gray-500">Ask us anything about our products or orders</p>
        </div>
      </div>

      <Card className="shadow-lg overflow-hidden">
        {/* Chat Messages */}
        <ScrollArea 
          ref={scrollRef}
          className="h-[60vh] p-4"
        >
          <div className="space-y-4">
            {/* Welcome Message */}
            {messages.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-3"
              >
                <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0">
                  <Bot className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1 bg-gray-100 rounded-2xl rounded-tl-none p-4 max-w-[80%]">
                  <p className="text-gray-800">
                    👋 Hello! Welcome to FMM CLASSICO support. I'm here to help you with any questions about our products, orders, or services. How can I assist you today?
                  </p>
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
                    <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0">
                      <Bot className="h-5 w-5 text-white" />
                    </div>
                  )}
                  <div className={`
                    max-w-[80%] rounded-2xl p-4
                    ${message.role === 'user' 
                      ? 'bg-orange-500 text-white rounded-tr-none' 
                      : 'bg-gray-100 text-gray-800 rounded-tl-none'}
                  `}>
                    {message.role === 'assistant' ? (
                      <ReactMarkdown className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0">
                        {message.content}
                      </ReactMarkdown>
                    ) : (
                      <p>{message.content}</p>
                    )}
                  </div>
                  {message.role === 'user' && (
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                      <User className="h-5 w-5 text-gray-600" />
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-3"
              >
                <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0">
                  <Bot className="h-5 w-5 text-white" />
                </div>
                <div className="bg-gray-100 rounded-2xl rounded-tl-none p-4">
                  <div className="flex items-center gap-2 text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Typing...</span>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </ScrollArea>

        {/* Input */}
        <form onSubmit={sendMessage} className="p-4 border-t bg-gray-50">
          <div className="flex gap-2">
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 bg-white"
              disabled={isLoading}
            />
            <Button 
              type="submit" 
              className="bg-orange-500 hover:bg-orange-600"
              disabled={isLoading || !inputMessage.trim()}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-gray-400 mt-2 text-center">
            Our AI assistant is available 24/7 to help you
          </p>
        </form>
      </Card>

      {/* Quick Questions */}
      <div className="mt-6">
        <p className="text-sm text-gray-500 mb-3">Quick questions:</p>
        <div className="flex flex-wrap gap-2">
          {[
            "What's your return policy?",
            "How long does delivery take?",
            "Do you offer warranty?",
            "What payment methods do you accept?"
          ].map((question) => (
            <Button
              key={question}
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => {
                setInputMessage(question);
              }}
            >
              {question}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}