import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, X, Send, Cpu, MessageSquare } from 'lucide-react';
import api from '../api';

export default function AIAssistantWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { id: 1, text: "Greetings, Operative. I am the ULTRA ESPORTS AI Assistant. How can I optimize your competitive experience today?", isAi: true }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = { id: Date.now(), text: input, isAi: false };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    try {
      const res = await api.post('/ai/chat', { message: userMessage.text });
      const aiReply = { id: Date.now() + 1, text: res.data.reply, isAi: true };
      setMessages(prev => [...prev, aiReply]);
    } catch (err) {
      const errorReply = { id: Date.now() + 1, text: "System Error: Unable to reach AI neural core. Please try again later.", isAi: true };
      setMessages(prev => [...prev, errorReply]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <motion.button
        onClick={() => setIsOpen(true)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-primary flex items-center justify-center shadow-[0_0_20px_rgba(0,245,255,0.4)] text-black hover:bg-white transition-colors ${isOpen ? 'hidden' : 'block'}`}
      >
        <Bot size={28} />
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-6 right-6 z-50 w-[350px] h-[500px] flex flex-col bg-surface border-2 border-primary/30 rounded-2xl shadow-[0_0_30px_rgba(0,0,0,0.8)] overflow-hidden"
          >
            {/* Header */}
            <div className="bg-background border-b border-primary/20 p-4 flex justify-between items-center relative overflow-hidden">
              <div className="absolute inset-0 bg-primary/5"></div>
              <div className="flex items-center gap-2 relative z-10">
                <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary flex items-center justify-center text-primary">
                  <Cpu size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-white uppercase tracking-wider text-sm">Ultra AI</h3>
                  <p className="text-[10px] text-primary flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-neonGreen animate-pulse"></span>
                    Neural Link Online
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-textMuted hover:text-white relative z-10 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-void">
              {messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.isAi ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-[80%] rounded-xl p-3 text-sm ${
                    msg.isAi 
                    ? 'bg-surface border border-white/10 text-white/90 rounded-tl-none' 
                    : 'bg-primary/20 border border-primary/30 text-primary rounded-tr-none'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-surface border border-white/10 rounded-xl rounded-tl-none p-3 flex gap-1">
                    <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={handleSend} className="bg-background border-t border-white/10 p-3 flex gap-2">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Ask the AI Assistant..."
                className="flex-1 bg-surface border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary transition-colors"
              />
              <button 
                type="submit"
                disabled={!input.trim() || isTyping}
                className="bg-primary text-black rounded-lg w-10 h-10 flex items-center justify-center hover:bg-white transition-colors disabled:opacity-50"
              >
                <Send size={18} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
