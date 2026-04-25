import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, ImageIcon, MessageSquare, Loader2, Upload, 
  Trash2, History, Plus, RotateCcw, Save, X, ArrowLeftCircle,
  Maximize2, Minimize2, PanelLeftClose, PanelLeft
} from 'lucide-react';
import { ChatMessage, ChatSession, QuickSource } from '../types';
import { callNeuralEngine } from '../services/neuralEngine';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

type Mode = 'chat' | 'vision' | 'history';

export const AIStudio: React.FC = () => {
  const [mode, setMode] = useState<Mode>('chat');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', text: 'Hello! I am your AI assistant. How can I help you today?' }
  ]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatSession[]>(() => {
    const saved = localStorage.getItem('dps_chat_history');
    return saved ? JSON.parse(saved) : [];
  });
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('dps_chat_history', JSON.stringify(chatHistory));
  }, [chatHistory]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setSelectedImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSend = async () => {
    if (!input.trim() && !selectedImage) return;
    setLoading(true);
    try {
      if (mode === 'chat' || mode === 'vision') {
        const userMsg: ChatMessage = { role: 'user', text: input, image: selectedImage || undefined };
        setMessages(prev => [...prev, userMsg]);
        const currentInput = input;
        const currentImage = selectedImage;
        setInput('');
        setSelectedImage(null);

        if (currentImage) {
            const base64Data = currentImage.split(',')[1];
            const mimeType = currentImage.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,.*/)?.[1] || 'image/png';
            
            const fileContext: QuickSource = { data: base64Data, mimeType };
            const response = await callNeuralEngine(
              'gemini-3.1-pro-preview', 
              currentInput || "Analyze this image in detail.", 
              "You are a highly professional personal development AI assistant, combining the energizing, transformational style of Tony Robbins with the structured, high-performance coaching of Brendon Burchard. Your tone should be empowering, highly structured, professional, and actionable. You should structure your responses using markdown, with tables when appropriate.",
              fileContext
            );
            setMessages(prev => [...prev, { role: 'model', text: response.text || 'Could not analyze image.' }]);
        } else {
            const response = await callNeuralEngine(
                'gemini-3.1-pro-preview',
                currentInput,
                "You are a highly professional personal development AI assistant, combining the energizing, transformational style of Tony Robbins with the structured, high-performance coaching of Brendon Burchard. Your tone should be empowering, highly structured, professional, and actionable. You should structure your responses using markdown, with tables when appropriate."
            );
            const responseText = response.text || 'No response.';
            setMessages(prev => [...prev, { role: 'model', text: responseText }]);
        }
      }
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'model', text: 'Error processing request.' }]);
    } finally {
      setLoading(false);
    }
  };

  const saveCurrentChat = () => {
    if (messages.length <= 1) return;
    const firstUserMsg = messages.find(m => m.role === 'user')?.text || 'New Conversation';
    const newSession: ChatSession = {
      id: uuidv4(),
      title: firstUserMsg.slice(0, 40) + (firstUserMsg.length > 40 ? '...' : ''),
      timestamp: new Date().toISOString(),
      messages: [...messages]
    };
    setChatHistory(prev => [newSession, ...prev]);
    alert("Chat saved to history.");
  };

  const restoreChat = (session: ChatSession) => {
    setMessages(session.messages);
    setMode('chat');
  };

  const deleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Delete this session from history?")) {
        setChatHistory(prev => prev.filter(s => s.id !== id));
    }
  };

  const renderHistory = () => (
    <div className="flex flex-col h-full bg-slate-50 p-4 md:p-8 overflow-hidden">
        <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
                <button onClick={() => setMode('chat')} className="p-2 text-slate-400 hover:text-primary-500 hover:bg-white rounded-full transition-all">
                    <ArrowLeftCircle size={28} />
                </button>
                <div>
                    <h2 className="text-2xl font-black text-purple-700 uppercase flex items-center gap-3">
                        <History className="text-primary-500" /> Chat History
                    </h2>
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">Restore and continue previous AI sessions</p>
                </div>
            </div>
            <button onClick={saveCurrentChat} className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-xl text-[10px] font-black uppercase shadow-lg hover:scale-105 active:scale-95 transition-all">
                <Save size={16} /> Save Active
            </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4">
            {chatHistory.length === 0 ? (
                <div className="bg-white/40 backdrop-blur-md rounded-[32px] p-16 border border-white/20 text-center text-slate-400">
                    <RotateCcw size={48} className="mx-auto mb-4 opacity-10" />
                    <p className="font-black uppercase text-xs tracking-[4px]">Empty Archives</p>
                </div>
            ) : chatHistory.map(session => (
                <div 
                    key={session.id} 
                    onClick={() => restoreChat(session)}
                    className="bg-white/60 backdrop-blur-md p-5 rounded-[24px] border border-white/40 shadow-sm flex items-center justify-between hover:border-primary-400 hover:shadow-md transition-all cursor-pointer group animate-in slide-in-from-bottom-2"
                >
                    <div className="flex items-center gap-5 overflow-hidden">
                        <div className="w-12 h-12 bg-white/60 rounded-2xl flex items-center justify-center text-slate-400 flex-shrink-0 group-hover:bg-primary-50 group-hover:text-primary-500 transition-colors backdrop-blur-sm">
                            <MessageSquare size={24} />
                        </div>
                        <div className="truncate">
                            <h4 className="font-black text-purple-700 text-sm uppercase truncate pr-4">{session.title}</h4>
                            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">{format(new Date(session.timestamp), 'PPP p')}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={(e) => deleteSession(session.id, e)} 
                            className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                            title="Delete permanently"
                        >
                            <Trash2 size={20}/>
                        </button>
                        <button className="px-6 py-3 bg-primary-500 text-white rounded-xl text-[10px] font-black uppercase shadow-lg shadow-primary-500/20 hover:bg-primary-600 transition-all">
                            Restore Chat
                        </button>
                    </div>
                </div>
            ))}
        </div>
    </div>
  );

  return (
    <div className={`flex bg-white/70 backdrop-blur-2xl shadow-2xl border border-white/20 overflow-hidden transition-all duration-300 ${isFullscreen ? 'fixed inset-0 z-50 m-0 rounded-none h-screen' : 'h-full md:h-[calc(100vh-100px)] rounded-[24px] m-2 md:m-4'}`}>
      {/* Sidebar - Easy access to history and new chat */}
      <div className={`hidden lg:flex w-64 bg-white/40 border-r border-slate-200 p-6 flex-col gap-3 backdrop-blur-xl transition-all duration-300 ${!isSidebarVisible ? '-ml-64 hidden' : ''}`}>
        <div className="flex items-center gap-3 mb-8 px-2">
            <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg">AI</div>
            <h3 className="font-black text-purple-700 uppercase text-sm tracking-tight">Portal Studio</h3>
        </div>
        
        <button onClick={() => setMode('chat')} className={`flex items-center gap-3 px-5 py-4 rounded-xl text-[10px] font-black uppercase transition-all ${mode === 'chat' ? 'bg-purple-600 text-white shadow-xl scale-[1.02]' : 'text-slate-500 hover:bg-white/50 hover:text-black hover:backdrop-blur-sm'}`}>
          <MessageSquare size={18} /> Smart Assistant
        </button>
        <button onClick={() => setMode('vision')} className={`flex items-center gap-3 px-5 py-4 rounded-xl text-[10px] font-black uppercase transition-all ${mode === 'vision' ? 'bg-purple-600 text-white shadow-xl scale-[1.02]' : 'text-slate-500 hover:bg-white/50 hover:text-black hover:backdrop-blur-sm'}`}>
          <ImageIcon size={18} /> Vision Analysis
        </button>
        <button onClick={() => setMode('history')} className={`flex items-center gap-3 px-5 py-4 rounded-xl text-[10px] font-black uppercase transition-all ${mode === 'history' ? 'bg-primary-500 text-white shadow-xl scale-[1.02]' : 'text-slate-500 hover:bg-white/50 hover:text-black hover:backdrop-blur-sm'}`}>
          <History size={18} /> Restore History
        </button>

        <div className="mt-auto space-y-4">
            <div className="bg-purple-600 p-4 rounded-2xl text-white space-y-3 shadow-inner">
                <p className="text-[9px] font-black text-white/40 uppercase tracking-[2px]">Engine Status</p>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                    <p className="text-[11px] font-bold">System Online</p>
                </div>
            </div>
            <button onClick={() => { setMessages([{role:'model', text:'New session started. How can I help?'}]); setMode('chat'); }} className="w-full py-3.5 bg-primary-500 text-white rounded-xl text-[10px] font-black uppercase hover:bg-primary-600 shadow-lg active:scale-95 transition-all">
                <Plus size={16} className="inline-block mr-2" /> Start New Chat
            </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden bg-transparent relative">
        <div className="absolute top-4 right-4 z-10 hidden lg:flex gap-2">
            <button onClick={() => setIsSidebarVisible(!isSidebarVisible)} className="p-2.5 bg-white/40 backdrop-blur-md rounded-xl text-slate-600 hover:text-purple-600 border border-white/20 shadow-sm transition-all" title={isSidebarVisible ? "Hide Sidebar" : "Show Sidebar"}>
                {isSidebarVisible ? <PanelLeftClose size={18} /> : <PanelLeft size={18} />}
            </button>
            <button onClick={() => setIsFullscreen(!isFullscreen)} className="p-2.5 bg-white/40 backdrop-blur-md rounded-xl text-slate-600 hover:text-purple-600 border border-white/20 shadow-sm transition-all" title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}>
                {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
        </div>
        {/* Mobile Header / Mode Switcher */}
        <div className="lg:hidden flex items-center justify-between p-4 border-b border-white/20 bg-white/40 backdrop-blur-md">
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center text-white font-black">AI</div>
                <span className="font-black text-purple-700 uppercase text-xs">AI Studio</span>
            </div>
            <div className="flex bg-white/40 backdrop-blur-md p-1 rounded-xl shadow-sm border border-white/20">
                <button onClick={() => setMode('chat')} className={`p-2 rounded-lg ${mode === 'chat' ? 'bg-purple-600 text-white' : 'text-slate-400'}`}><MessageSquare size={16}/></button>
                <button onClick={() => setMode('vision')} className={`p-2 rounded-lg ${mode === 'vision' ? 'bg-purple-600 text-white' : 'text-slate-400'}`}><ImageIcon size={16}/></button>
                <button onClick={() => setMode('history')} className={`p-2 rounded-lg ${mode === 'history' ? 'bg-purple-600 text-white' : 'text-slate-400'}`}><History size={16}/></button>
            </div>
        </div>

        {mode === 'history' ? renderHistory() : (
            <>
                <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 bg-transparent custom-scrollbar">
                    {messages.map((msg, idx) => (
                        <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in duration-300`}>
                            <div className={`max-w-[85%] md:max-w-[75%] rounded-[24px] p-5 shadow-lg ${msg.role === 'user' ? 'bg-purple-600 text-white rounded-br-none' : 'bg-white/40 backdrop-blur-md text-black border border-white/60 rounded-bl-none'}`}>
                                {msg.image && <img src={msg.image} className="w-full h-auto rounded-2xl mb-4 shadow-sm" alt="User upload" />}
                                {msg.role === 'model' ? (
                                    <div className="markdown-body text-sm md:text-base font-medium leading-relaxed tracking-tight">
                                        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>{msg.text}</ReactMarkdown>
                                    </div>
                                ) : (
                                    <p className="whitespace-pre-wrap text-sm md:text-base font-medium leading-relaxed tracking-tight">{msg.text}</p>
                                )}
                            </div>
                        </div>
                    ))}
                    {loading && (
                        <div className="flex justify-start">
                            <div className="bg-white/60 backdrop-blur-md text-slate-800 rounded-full py-3 px-8 shadow-md flex items-center gap-4 border border-white/40">
                                <Loader2 className="animate-spin text-primary-500" size={20} /> 
                                <span className="text-[10px] font-black uppercase tracking-[3px]">Thinking...</span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 md:p-6 bg-white/40 backdrop-blur-md border-t border-white/20">
                    <div className="max-w-5xl mx-auto flex gap-3 items-end">
                        <label className={`w-14 h-14 md:w-16 md:h-16 bg-white/60 backdrop-blur-md border border-white/40 rounded-2xl flex items-center justify-center cursor-pointer hover:bg-white/80 transition-all text-slate-500 hover:text-primary-500 shadow-sm flex-shrink-0 ${mode === 'vision' ? 'border-primary-500 border-2 bg-primary-50/80 text-primary-600' : ''}`}>
                            <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                            <Upload size={24} />
                        </label>
                        <div className="flex-1 relative">
                            {selectedImage && (
                                <div className="absolute bottom-full left-0 mb-4 bg-white/80 backdrop-blur-xl p-2 rounded-2xl shadow-2xl border border-white/40 group animate-in slide-in-from-bottom-2">
                                    <img src={selectedImage} className="h-24 w-auto rounded-xl" alt="Preview" />
                                    <button onClick={() => setSelectedImage(null)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg"><X size={12}/></button>
                                </div>
                            )}
                            <textarea 
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                                placeholder={selectedImage ? "Describe what to analyze..." : "Ask AI to generate records, check behavior..."}
                                rows={1}
                                className="w-full min-h-[56px] max-h-40 pl-6 pr-16 py-4 bg-white/60 backdrop-blur-md border border-white/40 rounded-[24px] outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all font-medium text-sm md:text-base resize-none overflow-hidden"
                                style={{ height: 'auto' }}
                            />
                            <button 
                                onClick={handleSend} 
                                disabled={loading || (!input.trim() && !selectedImage)} 
                                className="absolute right-2.5 bottom-2.5 w-11 h-11 bg-primary-500 text-white rounded-[18px] flex items-center justify-center shadow-lg hover:bg-primary-600 active:scale-95 disabled:opacity-30 transition-all"
                            >
                                <Send size={20} />
                            </button>
                        </div>
                    </div>
                </div>
            </>
        )}
      </div>
    </div>
  );
};