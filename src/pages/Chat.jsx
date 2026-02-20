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

export default function Chat() {
  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef(null);

  const { data: products = [] } = useQuery({
    queryKey: ['products-chat'],
    queryFn: () => base44.entities.Product.list('-created_date', 100),
  });

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

    // Build product catalog string for AI context
    const productCatalog = products.slice(0, 50).map(p =>
      `- ${p.name} | Category: ${p.category} | Price: ₵${p.price}${p.original_price ? ` (was ₵${p.original_price})` : ''} | ${p.description || ''} | In stock: ${p.stock ?? 'yes'}`
    ).join('\n');

    // Get AI response
    const response = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a helpful AI shopping assistant for FMM CLASSICO, an online store selling phone accessories, electronic appliances, and home appliances. 
      
      About FMM CLASSICO:
      - CEO: Miss Fedra
      - Locations: UMAT Main Campus (Tarkwa) and Ashongman Estate (Accra)
      - Phone: 0599676419 | Email: fmmcompanylimited@gmail.com
      - Payments: Mobile Money, Paystack
      
      Delivery Rates:
      - UMAT Campus: FREE (instant)
      - Tarkwa (outside UMAT): ₵25 or FREE on orders over ₵300 (instant)
      - Within Accra: ₵25-₵40 via Yango (1-2 days)
      - Outside Accra/Tarkwa: ₵50 or FREE on orders over ₵500 (2-3 days)
      
      CURRENT PRODUCT CATALOG:
      ${productCatalog || 'No products listed yet.'}
      
      IMPORTANT CAPABILITIES:
      - You CAN answer questions about specific products, prices, descriptions, availability.
      - You CAN help a customer place an order by collecting: their name, phone, delivery address, city, and which product they want. Tell them to go to the Cart/Checkout page to complete payment.
      - You CAN tell them about any product price, specs, or description from the catalog above.
      - Always be friendly and helpful.
      
      Customer message: ${userMessage}
      
      If asked about the CEO, say it's Miss Fedra. Keep responses concise and helpful.`,
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
            "What products do you sell?",
            "How long does delivery take?",
            "What are your delivery charges?",
            "What payment methods do you accept?",
            "I want to place an order",
            "Show me your best products"
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