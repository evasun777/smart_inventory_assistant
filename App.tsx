
import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Search, 
  Grid, 
  List as ListIcon, 
  Camera, 
  MessageSquare, 
  ShoppingCart, 
  Trash2,
  AlertTriangle,
  Package,
  X,
  Check,
  Tag,
  MapPin,
  Clock,
  DollarSign,
  Zap,
  Loader2,
  ChevronLeft,
  Mic,
  Send,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  BrainCircuit,
  Volume2
} from 'lucide-react';
import { InventoryItem, ViewMode, ChatMessage, Category } from './types';
import { loadInventory, saveInventory } from './services/storageService';
import { analyzeStoragePhoto, getShoppingAdvice, chatWithAssistant } from './services/geminiService';

const App: React.FC = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isAdding, setIsAdding] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [showSyncSuccess, setShowSyncSuccess] = useState(false);
  
  // Modal states
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isAdvisorOpen, setIsAdvisorOpen] = useState(false);

  // Review state
  const [pendingItems, setPendingItems] = useState<InventoryItem[]>([]);
  const [reviewPhoto, setReviewPhoto] = useState<string | null>(null);
  const [isReviewing, setIsReviewing] = useState(false);

  // Assistant state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: "Hello! I'm your Ownly Assistant. I have indexed your entire inventory. How can I help you find or manage your belongings today?" }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isListening, setIsListening] = useState(false);

  // Advisor state
  const [advisorPhoto, setAdvisorPhoto] = useState<string | null>(null);
  const [advisorAdvice, setAdvisorAdvice] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const advisorInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Load items
  useEffect(() => {
    const init = async () => {
      const data = await loadInventory();
      setItems(data);
    };
    init();
  }, []);

  // Save to IndexedDB
  useEffect(() => {
    if (items.length > 0) {
      saveInventory(items).catch(err => console.error(err));
    }
  }, [items]);

  const compressImage = (base64Str: string, maxWidth = 800): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = Math.min(1, maxWidth / img.width);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.6));
      };
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsLoading(true);
    setLoadingStep('Neural Processing...');
    const reader = new FileReader();
    reader.onloadend = async () => {
      const compressed = await compressImage(reader.result as string);
      try {
        const detected = await analyzeStoragePhoto(compressed.split(',')[1]);
        const mapped: InventoryItem[] = detected.map((d) => ({
          id: crypto.randomUUID(),
          name: d.name || 'Unnamed Object',
          brand: (d as any).brand || '',
          color: (d as any).color || '',
          size: (d as any).size || '',
          description: d.description || '',
          category: (d.category as any) || Category.OTHER,
          storageLocation: d.storageLocation || 'Unknown Sector',
          dateAdded: new Date().toISOString().split('T')[0],
          price: d.price || 0,
          imageUrl: compressed,
        }));
        setPendingItems(mapped);
        setReviewPhoto(compressed);
        setIsReviewing(true);
        setIsAdding(false);
      } catch (err) { alert("Analysis failed."); } finally { setIsLoading(false); }
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const handleAdvisorUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsLoading(true);
    setLoadingStep('Comparing with Ownly Vault...');
    const reader = new FileReader();
    reader.onloadend = async () => {
      const compressed = await compressImage(reader.result as string);
      setAdvisorPhoto(compressed);
      try {
        const advice = await getShoppingAdvice(compressed.split(',')[1], items);
        setAdvisorAdvice(advice);
      } catch (err) { setAdvisorAdvice("Unable to analyze shopping item."); } finally { setIsLoading(false); }
    };
    reader.readAsDataURL(file);
  };

  const triggerAssistantReply = async (msg: string) => {
    setIsLoading(true);
    setLoadingStep('Consulting Ownly AI...');
    try {
      const reply = await chatWithAssistant(msg, items);
      setChatMessages(prev => [...prev, { role: 'assistant', content: reply }]);
      // If we wanted to add voice output here, we'd trigger TTS
    } catch (err) {
      setChatMessages(prev => [...prev, { role: 'assistant', content: "I'm having trouble accessing the vault data right now." }]);
    } finally { setIsLoading(false); }
  };

  const handleChatSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!chatInput.trim()) return;
    const msg = chatInput;
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: msg }]);
    await triggerAssistantReply(msg);
  };

  const toggleVoiceSearch = () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert("Voice recognition not supported in this browser.");
      return;
    }
    const recognition = new (window as any).webkitSpeechRecognition();
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setSearchQuery(transcript);
    };
    recognition.start();
  };

  const startVoiceAssistant = () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert("Voice recognition not supported.");
      return;
    }
    
    setIsChatOpen(true);
    const recognition = new (window as any).webkitSpeechRecognition();
    recognition.lang = 'en-US';
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    
    recognition.onresult = async (event: any) => {
      const transcript = event.results[0][0].transcript;
      if (transcript.trim()) {
        setChatMessages(prev => [...prev, { role: 'user', content: transcript }]);
        await triggerAssistantReply(transcript);
      }
    };
    
    recognition.start();
  };

  const saveReviewedItems = async () => {
    const updated = [...pendingItems, ...items];
    setItems(updated);
    setIsReviewing(false);
    setPendingItems([]);
    setReviewPhoto(null);
    setShowSyncSuccess(true);
    setTimeout(() => setShowSyncSuccess(false), 3000);
  };

  const deleteItem = async (id: string) => {
    const updated = items.filter(i => i.id !== id);
    setItems(updated);
    setSelectedItem(null);
    await saveInventory(updated);
  };

  const filteredItems = items.filter(item => {
    const query = searchQuery.toLowerCase();
    return item.name.toLowerCase().includes(query) || (item.brand || '').toLowerCase().includes(query) || (item.category || '').toLowerCase().includes(query);
  });

  return (
    <div className="min-h-screen pb-32 text-slate-900 bg-[#f8fafc] font-medium transition-all selection:bg-indigo-100">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-2xl border-b border-slate-200 px-4 py-5 flex flex-col gap-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2.5 rounded-2xl text-white shadow-xl shadow-indigo-100">
              <Package size={22} strokeWidth={3} />
            </div>
            <h1 className="text-2xl font-black tracking-tighter">Ownly</h1>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setIsChatOpen(true)} className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl hover:bg-indigo-100 transition-all active:scale-90 relative">
              <MessageSquare size={20} strokeWidth={2.5} />
              <div className="absolute top-2 right-2 w-2 h-2 bg-indigo-600 rounded-full border-2 border-white"></div>
            </button>
            <button onClick={() => setIsAdvisorOpen(true)} className="p-3 bg-amber-50 text-amber-600 rounded-2xl hover:bg-amber-100 transition-all active:scale-90">
              <ShoppingCart size={20} strokeWidth={2.5} />
            </button>
          </div>
        </div>

        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Find items, locations, brands..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-14 py-4 bg-slate-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:outline-none transition-all border-none font-bold text-sm shadow-inner"
          />
          <button onClick={toggleVoiceSearch} className={`absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-all ${isListening ? 'bg-red-100 text-red-600 animate-pulse' : 'text-slate-400 hover:bg-slate-200'}`}>
            <Mic size={18} strokeWidth={2.5} />
          </button>
        </div>
      </header>

      {/* Main Grid */}
      <main className="p-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8 px-1">
          <div className="flex flex-col">
            <h2 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em] mb-1">Ownly Inventory</h2>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <p className="text-xs font-black text-slate-600">{items.length} ARCHIVED OBJECTS</p>
            </div>
          </div>
          <div className="flex bg-slate-200/50 p-1 rounded-2xl">
            <button onClick={() => setViewMode('grid')} className={`p-2.5 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}><Grid size={16} strokeWidth={2.5} /></button>
            <button onClick={() => setViewMode('list')} className={`p-2.5 rounded-xl transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}><ListIcon size={16} strokeWidth={2.5} /></button>
          </div>
        </div>

        {filteredItems.length === 0 ? (
          <div className="py-40 text-center animate-in fade-in zoom-in duration-700">
            <div className="bg-white w-32 h-32 rounded-[3rem] shadow-2xl shadow-slate-200/50 flex items-center justify-center mx-auto mb-8 border border-slate-100">
              <Package size={48} className="text-slate-100" />
            </div>
            <h3 className="text-2xl font-black text-slate-400 tracking-tighter">Inventory Empty</h3>
          </div>
        ) : (
          <div className={viewMode === 'grid' ? "grid grid-cols-2 lg:grid-cols-3 gap-8" : "space-y-4"}>
            {filteredItems.map((item, idx) => (
              <div 
                key={item.id} 
                onClick={() => setSelectedItem(item)}
                className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all cursor-pointer group animate-in slide-in-from-bottom"
                style={{ animationDelay: `${idx * 20}ms` }}
              >
                <div className="aspect-square bg-slate-50 relative overflow-hidden">
                  {item.imageUrl ? <img src={item.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" /> : <div className="w-full h-full flex items-center justify-center text-slate-200"><Package size={40}/></div>}
                  <div className="absolute top-4 left-4">
                     <span className="px-3 py-1 bg-white/95 backdrop-blur-md rounded-xl text-[9px] font-black text-slate-900 uppercase tracking-widest shadow-sm border border-slate-100">{item.category}</span>
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="font-black text-slate-900 text-base truncate">{item.name}</h3>
                  <div className="mt-2 flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                    <MapPin size={12} className="text-indigo-400" /> {item.storageLocation}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* AI Assistant Chat Modal */}
      {isChatOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white animate-in slide-in-from-right duration-500">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10 shadow-sm">
            <button onClick={() => setIsChatOpen(false)} className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"><ChevronLeft size={28} strokeWidth={3} /></button>
            <div className="text-center">
              <h2 className="text-xl font-black tracking-tighter flex items-center gap-2 justify-center text-indigo-600">
                <BrainCircuit size={20} /> Ownly Assistant
              </h2>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">Knowledge Agent Active</p>
            </div>
            <div className="w-10">
              {isListening && <div className="w-3 h-3 bg-red-500 rounded-full animate-ping mx-auto"></div>}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50 no-scrollbar">
            {chatMessages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom duration-300`}>
                <div className={`max-w-[85%] p-5 rounded-[2rem] text-sm font-bold shadow-sm ${m.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none shadow-indigo-100' : 'bg-white text-slate-700 rounded-tl-none border border-slate-100'}`}>
                  {m.content}
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <div className="p-6 border-t border-slate-100 bg-white">
            <form onSubmit={handleChatSubmit} className="relative flex items-center gap-3">
              <input 
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask about your inventory..."
                className="flex-1 bg-slate-100 rounded-2xl py-5 px-6 font-bold text-sm border-none focus:ring-4 focus:ring-indigo-100 focus:bg-white transition-all shadow-inner"
              />
              <button type="submit" className="p-5 bg-indigo-600 text-white rounded-2xl shadow-xl shadow-indigo-100 active:scale-90 transition-all">
                <Send size={20} strokeWidth={2.5} />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Shopping Advisor Modal */}
      {isAdvisorOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white animate-in slide-in-from-bottom duration-500">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
            <button onClick={() => { setIsAdvisorOpen(false); setAdvisorPhoto(null); setAdvisorAdvice(null); }} className="p-2 text-slate-400"><X size={28} strokeWidth={3} /></button>
            <div className="text-center">
              <h2 className="text-xl font-black tracking-tighter flex items-center gap-2 justify-center text-amber-600">
                <Sparkles size={20} /> Shopping Advisor
              </h2>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">Purchase Intelligence</p>
            </div>
            <div className="w-10"></div>
          </div>
          <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50 no-scrollbar">
            <div className="max-w-md mx-auto space-y-8">
              {!advisorPhoto ? (
                <div className="text-center py-20 space-y-6">
                  <div className="w-24 h-24 bg-amber-50 rounded-full flex items-center justify-center mx-auto text-amber-500 shadow-inner">
                    <Camera size={40} />
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tighter">Check Before Buy</h3>
                  <p className="text-slate-400 font-bold text-sm leading-relaxed">Snap a photo of something you want to purchase. I will check your inventory for duplicates or similar items.</p>
                  <button onClick={() => advisorInputRef.current?.click()} className="w-full bg-amber-500 text-white font-black py-5 rounded-2xl shadow-xl shadow-amber-100 active:scale-95 transition-all text-lg">Scan New Item</button>
                </div>
              ) : (
                <div className="space-y-8 animate-in fade-in zoom-in duration-500">
                  <div className="rounded-[3rem] overflow-hidden shadow-2xl bg-white border-[8px] border-white aspect-square">
                    <img src={advisorPhoto} className="w-full h-full object-cover" />
                  </div>
                  {advisorAdvice ? (
                    <div className="bg-white p-8 rounded-[3rem] shadow-xl border border-slate-100 space-y-6">
                      <div className="flex items-center gap-3">
                        <div className="bg-amber-100 p-2 rounded-xl text-amber-600"><Sparkles size={20}/></div>
                        <h4 className="font-black text-lg tracking-tight">AI Recommendation</h4>
                      </div>
                      <p className="text-slate-600 font-bold leading-relaxed">{advisorAdvice}</p>
                      <button onClick={() => { setAdvisorPhoto(null); setAdvisorAdvice(null); }} className="w-full py-4 bg-slate-100 rounded-2xl font-black text-slate-400 uppercase text-xs tracking-widest hover:bg-slate-200 transition-all">Scan Another</button>
                    </div>
                  ) : (
                    <div className="text-center py-10 animate-pulse text-slate-400 font-black uppercase text-xs tracking-widest">Consulting Ownly History...</div>
                  )}
                </div>
              )}
            </div>
          </div>
          <input ref={advisorInputRef} type="file" accept="image/*" className="hidden" onChange={handleAdvisorUpload} />
        </div>
      )}

      {/* Item Detail & Sync Success */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-3xl" onClick={() => setSelectedItem(null)} />
          <div className="relative bg-white w-full max-w-4xl rounded-t-[3.5rem] sm:rounded-[4rem] shadow-2xl flex flex-col max-h-[95vh] overflow-hidden animate-in slide-in-from-bottom duration-500">
            <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-white z-10">
              <span className="bg-indigo-50 text-indigo-600 text-[10px] font-black px-5 py-2 rounded-full uppercase tracking-widest">{selectedItem.category}</span>
              <button onClick={() => setSelectedItem(null)} className="p-4 bg-slate-100 rounded-full hover:bg-slate-200 transition-all"><X size={24} strokeWidth={3} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-10 no-scrollbar bg-white">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="rounded-[3rem] overflow-hidden shadow-3xl aspect-square bg-slate-50 border-[8px] border-white relative group">
                  {selectedItem.imageUrl ? <img src={selectedItem.imageUrl} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" /> : <div className="w-full h-full flex items-center justify-center bg-indigo-50 text-indigo-200"><Package size={80}/></div>}
                </div>
                <div className="space-y-10 py-4">
                  <div>
                    <p className="text-sm font-black text-indigo-400 uppercase tracking-[0.4em] mb-3">{selectedItem.brand || 'Unbranded'}</p>
                    <h2 className="text-5xl font-black tracking-tighter text-slate-900 leading-[0.9]">{selectedItem.name}</h2>
                    <p className="text-slate-400 mt-6 text-xl font-medium leading-relaxed italic">"{selectedItem.description || "Stored securely in your Ownly vault."}"</p>
                  </div>
                  <div className="grid grid-cols-2 gap-5">
                    <div className="bg-slate-50 p-7 rounded-[2.5rem] border border-slate-100 shadow-inner">
                      <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2"><MapPin size={14} className="text-indigo-400" /> Sector</p>
                      <p className="text-slate-900 font-black text-xl">{selectedItem.storageLocation}</p>
                    </div>
                    <div className="bg-slate-50 p-7 rounded-[2.5rem] border border-slate-100 shadow-inner">
                      <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2"><DollarSign size={14} className="text-indigo-400" /> Value</p>
                      <p className="text-slate-900 font-black text-xl">${selectedItem.price || '0.00'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-10 border-t border-slate-50 bg-white">
              <button 
                onClick={() => deleteItem(selectedItem.id)} 
                className="w-full py-6 bg-red-50 text-red-600 font-black rounded-[2rem] flex items-center justify-center gap-4 hover:bg-red-100 transition-all text-xl"
              >
                <Trash2 size={24} strokeWidth={3} /> PURGE FROM VAULT
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sync Success HUD */}
      {showSyncSuccess && (
        <div className="fixed top-12 left-1/2 -translate-x-1/2 z-[100] bg-indigo-600 text-white px-8 py-5 rounded-[2rem] shadow-2xl flex items-center gap-4 animate-in fade-in slide-in-from-top duration-300">
          <Zap size={24} fill="white" className="animate-bounce" />
          <span className="font-black uppercase tracking-widest text-sm">Vault Archive Updated</span>
        </div>
      )}

      {/* Review Screen */}
      {isReviewing && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-white animate-in slide-in-from-bottom duration-500 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10 shadow-sm">
            <button onClick={() => { setIsReviewing(false); setPendingItems([]); }} className="text-slate-300 hover:text-slate-600 p-2 transition-colors">
              <ChevronLeft size={28} strokeWidth={3} />
            </button>
            <div className="text-center">
              <h2 className="text-2xl font-black tracking-tighter">Review Batch</h2>
              <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em]">{pendingItems.length} OBJECTS DETECTED</p>
            </div>
            <button 
              onClick={saveReviewedItems}
              disabled={pendingItems.length === 0}
              className="bg-indigo-600 disabled:bg-slate-300 text-white px-8 py-3.5 rounded-2xl font-black shadow-2xl shadow-indigo-200 flex items-center gap-3 active:scale-95 transition-all"
            >
              <Check size={20} strokeWidth={4} /> Finalize Sync
            </button>
          </div>
          <div className="flex-1 overflow-y-auto bg-slate-50/50 p-6 no-scrollbar">
            <div className="max-w-2xl mx-auto space-y-10 pb-40">
              <div className="rounded-[3rem] overflow-hidden shadow-2xl bg-slate-900 border-[12px] border-white aspect-video relative group">
                {reviewPhoto && <img src={reviewPhoto} className="w-full h-full object-contain opacity-80" alt="Master Scan" />}
              </div>
              <div className="space-y-6">
                {pendingItems.map((item, idx) => (
                  <div key={item.id} className="bg-white p-8 rounded-[3.5rem] shadow-xl border border-slate-200/50 space-y-8 animate-in fade-in slide-in-from-bottom duration-500" style={{ animationDelay: `${idx * 100}ms` }}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                          <Tag size={12} className="text-indigo-500" /> Identity
                        </label>
                        <input 
                          type="text" 
                          value={item.name} 
                          onChange={(e) => { const n = [...pendingItems]; n[idx].name = e.target.value; setPendingItems(n); }}
                          className="w-full bg-slate-50 border-none rounded-2xl py-4 px-5 font-black text-lg focus:ring-4 focus:ring-indigo-100 transition-all shadow-inner"
                        />
                      </div>
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vault Sector</label>
                        <input 
                          type="text" 
                          value={item.storageLocation} 
                          onChange={(e) => { const n = [...pendingItems]; n[idx].storageLocation = e.target.value; setPendingItems(n); }}
                          className="w-full bg-slate-50 border-none rounded-2xl py-4 px-5 font-bold shadow-inner"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Bottom Dock (FABs) */}
      {!isReviewing && !isChatOpen && !isAdvisorOpen && (
        <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-40 flex items-center gap-6 animate-in slide-in-from-bottom duration-1000">
          <button 
            onClick={startVoiceAssistant} 
            className={`w-20 h-20 rounded-[2.5rem] shadow-2xl flex items-center justify-center active:scale-90 transition-all group relative overflow-hidden border-4 border-white ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-white text-indigo-600'}`}
          >
            <Mic size={32} strokeWidth={3} className={isListening ? 'animate-bounce' : ''} />
            {isListening && <div className="absolute inset-0 bg-red-400/20 animate-ping"></div>}
          </button>
          
          <button 
            onClick={() => setIsAdding(true)} 
            className="bg-indigo-600 text-white w-28 h-28 rounded-[3.5rem] shadow-[0_30px_70px_-10px_rgba(79,70,229,0.5)] flex items-center justify-center active:scale-95 transition-all group relative overflow-hidden border-4 border-white"
          >
            <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <Plus size={56} strokeWidth={4} />
          </button>
        </div>
      )}

      {/* Global Loading Screen */}
      {isLoading && (
        <div className="fixed inset-0 z-[110] bg-slate-950/95 backdrop-blur-3xl flex flex-col items-center justify-center text-white p-12 text-center animate-in fade-in duration-700">
          <div className="relative mb-14">
            <div className="w-44 h-44 border-[1px] border-indigo-400/20 rounded-full"></div>
            <div className="absolute inset-0 w-44 h-44 border-[5px] border-indigo-500 border-t-transparent rounded-full animate-spin [animation-duration:1s]"></div>
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
               <Loader2 size={52} className="text-indigo-400 animate-spin" strokeWidth={3} />
            </div>
          </div>
          <h2 className="text-4xl font-black tracking-tighter mb-4 animate-pulse uppercase">Syncing Ownly Core</h2>
          <p className="text-slate-500 font-black text-[10px] uppercase tracking-[0.6em] max-w-[320px] leading-loose opacity-60">
            {loadingStep}
          </p>
        </div>
      )}

      {/* Add Modal */}
      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-8">
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-3xl" onClick={() => setIsAdding(false)} />
          <div className="relative bg-white w-full max-w-sm rounded-[4rem] p-14 text-center space-y-12 animate-in zoom-in-95 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)]">
            <div className="w-28 h-28 bg-indigo-50 rounded-full flex items-center justify-center mx-auto text-indigo-600 shadow-inner">
              <Camera size={56} strokeWidth={2} />
            </div>
            <div>
              <h3 className="text-4xl font-black text-slate-900 tracking-tighter leading-none">Ownly Vision</h3>
              <p className="text-slate-400 mt-5 font-bold text-sm leading-relaxed max-w-[200px] mx-auto opacity-70">Capture a photo to index items in your storage.</p>
            </div>
            <div className="flex flex-col gap-5">
              <button onClick={() => fileInputRef.current?.click()} className="w-full bg-indigo-600 text-white font-black py-7 rounded-[2rem] shadow-3xl shadow-indigo-100 active:scale-95 transition-all text-2xl tracking-tight">Snap Space</button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
              <button onClick={() => setIsAdding(false)} className="text-slate-300 font-black text-xs uppercase tracking-[0.4em] py-2">Go Back</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

export default App;
