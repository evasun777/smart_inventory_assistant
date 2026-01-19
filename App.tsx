
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Grid, 
  List as ListIcon, 
  Camera, 
  MessageSquare, 
  ShoppingCart, 
  Trash2,
  Package,
  X,
  Check,
  Tag,
  MapPin,
  DollarSign,
  Zap,
  Loader2,
  ChevronLeft,
  Mic,
  Send,
  Sparkles,
  Filter,
  ArrowUpDown,
  Calendar,
  Palette,
  ArrowRight,
  BrainCircuit,
  RotateCcw
} from 'lucide-react';
import { InventoryItem, ViewMode, ChatMessage, Category } from './types';
import { loadInventory, saveInventory } from './services/storageService';
import { analyzeStoragePhoto, getShoppingAdvice, chatWithAssistant } from './services/geminiService';

const App: React.FC = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Advanced Filter/Sort states
  const [isFilterTrayOpen, setIsFilterTrayOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [activeColor, setActiveColor] = useState<string>('All');
  const [activeLocation, setActiveLocation] = useState<string>('All');
  const [activePriceRange, setActivePriceRange] = useState<string>('All');
  const [activeMonth, setActiveMonth] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'date' | 'price' | 'name'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // UI States
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

  // Derived filter options
  const colors = useMemo(() => Array.from(new Set(items.map(i => i.color).filter(Boolean).sort())), [items]);
  const locations = useMemo(() => Array.from(new Set(items.map(i => i.storageLocation).filter(Boolean).sort())), [items]);
  const priceRanges = ['All', '<$10', '$10-$50', '$50-$100', '$100+'];
  const months = useMemo(() => {
    const m = items.map(i => {
      const d = new Date(i.dateAdded);
      return d.toLocaleString('default', { month: 'long', year: 'numeric' });
    });
    return Array.from(new Set(m)).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  }, [items]);

  // Filtering Logic
  const filteredAndSortedItems = useMemo(() => {
    let result = items.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (item.brand || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = activeCategory === 'All' || item.category === activeCategory;
      const matchesColor = activeColor === 'All' || item.color === activeColor;
      const matchesLocation = activeLocation === 'All' || item.storageLocation === activeLocation;
      
      let matchesPrice = true;
      if (activePriceRange !== 'All') {
        const p = item.price || 0;
        if (activePriceRange === '<$10') matchesPrice = p < 10;
        else if (activePriceRange === '$10-$50') matchesPrice = p >= 10 && p <= 50;
        else if (activePriceRange === '$50-$100') matchesPrice = p > 50 && p <= 100;
        else if (activePriceRange === '$100+') matchesPrice = p > 100;
      }

      let matchesDate = true;
      if (activeMonth !== 'All') {
        const d = new Date(item.dateAdded).toLocaleString('default', { month: 'long', year: 'numeric' });
        matchesDate = d === activeMonth;
      }

      return matchesSearch && matchesCategory && matchesColor && matchesLocation && matchesPrice && matchesDate;
    });

    result.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'date') comparison = new Date(a.dateAdded).getTime() - new Date(b.dateAdded).getTime();
      else if (sortBy === 'price') comparison = (a.price || 0) - (b.price || 0);
      else if (sortBy === 'name') comparison = a.name.localeCompare(b.name);
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [items, searchQuery, activeCategory, activeColor, activeLocation, activePriceRange, activeMonth, sortBy, sortOrder]);

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

  const compressImage = (base64Str: string, maxWidth = 640): Promise<string> => {
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
        resolve(canvas.toDataURL('image/jpeg', 0.5));
      };
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsLoading(true);
    setLoadingStep('Accelerated Sync...');
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const compressed = await compressImage(reader.result as string);
        const detected = await analyzeStoragePhoto(compressed.split(',')[1]);
        if (!detected || detected.length === 0) throw new Error("No items detected");
        const mapped: InventoryItem[] = detected.map((d) => ({
          id: crypto.randomUUID(),
          name: d.name || 'Object',
          brand: (d as any).brand || '',
          color: (d as any).color || '',
          size: (d as any).size || '',
          description: d.description || '',
          category: (d.category as any) || Category.OTHER,
          storageLocation: d.storageLocation || 'Unsorted',
          dateAdded: new Date().toISOString().split('T')[0],
          price: d.price || 0,
          imageUrl: compressed,
        }));
        setPendingItems(mapped);
        setReviewPhoto(compressed);
        setIsReviewing(true);
        setIsAdding(false);
      } catch (err) { 
        // We only alert if it wasn't a manual cancel by setting isLoading to false elsewhere
        console.error("Sync error:", err);
      } finally { 
        setIsLoading(false); 
      }
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const triggerAssistantReply = async (msg: string) => {
    setIsLoading(true);
    setLoadingStep('Consulting AI...');
    try {
      const reply = await chatWithAssistant(msg, items);
      setChatMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch (err) {
      setChatMessages(prev => [...prev, { role: 'assistant', content: "Vault link unstable." }]);
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

  const handleSuggestion = async (text: string) => {
    setChatMessages(prev => [...prev, { role: 'user', content: text }]);
    await triggerAssistantReply(text);
  };

  const startVoiceCapture = () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert("Voice not supported in this browser.");
      return;
    }
    const recognition = new (window as any).webkitSpeechRecognition();
    recognition.lang = 'en-US';
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setChatInput(transcript);
    };
    recognition.start();
  };

  const saveReviewedItems = async () => {
    const updated = [...pendingItems, ...items];
    setItems(updated);
    await saveInventory(updated);
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

  const cancelLoading = () => {
    setIsLoading(false);
    setIsAdding(false);
  };

  const retakePhoto = () => {
    setIsLoading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  return (
    <div className="min-h-screen pb-32 text-slate-900 bg-[#f8fafc] font-medium transition-all">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-slate-200 px-6 py-6 flex flex-col gap-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-600 p-2.5 rounded-2xl text-white shadow-lg">
                <Package size={22} strokeWidth={3} />
              </div>
              <h1 className="text-3xl font-black tracking-tighter">Ownly</h1>
            </div>
            <p className="text-[11px] font-bold text-slate-500 mt-1 uppercase tracking-wider">Ownly: Know what you own. Buy smarter. Live lighter.</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setIsChatOpen(true)} className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl hover:bg-indigo-100 transition-all active:scale-90 relative">
              <MessageSquare size={22} strokeWidth={2.5} />
              <div className="absolute top-3 right-3 w-2.5 h-2.5 bg-indigo-600 rounded-full border-2 border-white"></div>
            </button>
            <button onClick={() => setIsAdvisorOpen(true)} className="p-4 bg-amber-50 text-amber-600 rounded-2xl hover:bg-amber-100 transition-all">
              <ShoppingCart size={22} strokeWidth={2.5} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search your vault..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-slate-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-indigo-100 transition-all border-none font-bold text-sm shadow-inner"
            />
          </div>
          <button onClick={() => setIsFilterTrayOpen(true)} className="p-4 bg-slate-100 text-slate-600 rounded-2xl hover:bg-slate-200 transition-all relative">
            <Filter size={20} />
            {(activeCategory !== 'All' || activeColor !== 'All' || activeLocation !== 'All' || activePriceRange !== 'All' || activeMonth !== 'All') && (
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-indigo-600 rounded-full text-[9px] text-white flex items-center justify-center font-black border-2 border-white">!</div>
            )}
          </button>
        </div>
      </header>

      {/* Main Grid */}
      <main className="p-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8 px-1">
          <div className="flex flex-col">
            <h2 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em] mb-1">Vault Inventory</h2>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <p className="text-xs font-black text-slate-600">{filteredAndSortedItems.length} OBJECTS LISTED</p>
            </div>
          </div>
          <div className="flex bg-slate-200/50 p-1 rounded-2xl">
            <button onClick={() => setViewMode('grid')} className={`p-2.5 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}><Grid size={16} strokeWidth={2.5} /></button>
            <button onClick={() => setViewMode('list')} className={`p-2.5 rounded-xl transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}><ListIcon size={16} strokeWidth={2.5} /></button>
          </div>
        </div>

        {filteredAndSortedItems.length === 0 ? (
          <div className="py-24 md:py-40 text-center animate-in fade-in zoom-in duration-700 max-w-lg mx-auto">
            <div className="bg-white w-32 h-32 md:w-40 md:h-40 rounded-[2.5rem] md:rounded-[3rem] shadow-xl shadow-slate-200/50 flex items-center justify-center mx-auto mb-8 border border-slate-100">
              <Plus size={48} className="text-slate-200" />
            </div>
            <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tighter mb-8 leading-tight">
              {items.length === 0 ? "Click + to start adding your belongings into Ownly!" : "No matches found."}
            </h3>
            
            {items.length === 0 && (
              <div className="space-y-4 text-left bg-white/50 p-6 md:p-8 rounded-[2rem] border border-slate-100 shadow-sm animate-in slide-in-from-bottom duration-1000 delay-300">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-black text-xs">1</div>
                  <p className="text-sm font-bold text-slate-600 leading-snug">
                    <span className="text-slate-900 font-black">Step 1:</span> Snap a photo of an item — or multiple items at once.
                  </p>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-black text-xs">2</div>
                  <p className="text-sm font-bold text-slate-600 leading-snug">
                    <span className="text-slate-900 font-black">Step 2:</span> Ownly analyzes the photo and organizes everything for you.
                  </p>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-black text-xs">3</div>
                  <p className="text-sm font-bold text-slate-600 leading-snug">
                    <span className="text-slate-900 font-black">Step 3:</span> Review and adjust anything before saving.
                  </p>
                </div>
              </div>
            )}

            {items.length > 0 && (
              <button onClick={() => { setActiveCategory('All'); setActiveColor('All'); setActiveLocation('All'); setActivePriceRange('All'); setActiveMonth('All'); setSearchQuery(''); }} className="text-indigo-600 font-bold text-sm underline">Reset all filters</button>
            )}
          </div>
        ) : (
          <div className={viewMode === 'grid' ? "grid grid-cols-2 lg:grid-cols-3 gap-8" : "space-y-4"}>
            {filteredAndSortedItems.map((item, idx) => (
              <div 
                key={item.id} 
                onClick={() => setSelectedItem(item)}
                className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all cursor-pointer group"
              >
                <div className="aspect-square bg-slate-50 relative overflow-hidden">
                  {item.imageUrl ? <img src={item.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" /> : <div className="w-full h-full flex items-center justify-center text-slate-200"><Package size={40}/></div>}
                  <div className="absolute top-4 left-4">
                     <span className="px-3 py-1 bg-white/95 backdrop-blur-md rounded-xl text-[9px] font-black text-slate-900 uppercase tracking-widest shadow-sm border border-slate-100">{item.category}</span>
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="font-black text-slate-900 text-base truncate">{item.name}</h3>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                      <MapPin size={12} className="text-indigo-400" /> {item.storageLocation}
                    </div>
                    {item.price && <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg">${item.price}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Filter Tray Modal */}
      {isFilterTrayOpen && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setIsFilterTrayOpen(false)}></div>
          <div className="relative bg-white w-full max-w-sm h-full shadow-2xl flex flex-col animate-in slide-in-from-right">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xl font-black tracking-tighter">Refine Vault</h3>
              <button onClick={() => setIsFilterTrayOpen(false)} className="p-2 text-slate-400 hover:bg-slate-50 rounded-full transition-all"><X size={24}/></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 space-y-10 no-scrollbar pb-20">
              {/* Category */}
              <div className="space-y-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2"><Tag size={12}/> Category</p>
                <div className="flex flex-wrap gap-2">
                  {['All', ...Object.values(Category)].map(cat => (
                    <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeCategory === cat ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}>{cat}</button>
                  ))}
                </div>
              </div>

              {/* Color */}
              <div className="space-y-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2"><Palette size={12}/> Color</p>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => setActiveColor('All')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeColor === 'All' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-50 text-slate-600'}`}>All</button>
                  {colors.map(color => (
                    <button key={color} onClick={() => setActiveColor(color)} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeColor === color ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-50 text-slate-600'}`}>{color}</button>
                  ))}
                </div>
              </div>

              {/* Price Range */}
              <div className="space-y-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2"><DollarSign size={12}/> Price Range</p>
                <div className="flex flex-wrap gap-2">
                  {priceRanges.map(pr => (
                    <button key={pr} onClick={() => setActivePriceRange(pr)} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activePriceRange === pr ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-50 text-slate-600'}`}>{pr}</button>
                  ))}
                </div>
              </div>

              {/* Location */}
              <div className="space-y-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2"><MapPin size={12}/> Location</p>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => setActiveLocation('All')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeLocation === 'All' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-50 text-slate-600'}`}>All</button>
                  {locations.map(loc => (
                    <button key={loc} onClick={() => setActiveLocation(loc)} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeLocation === loc ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-50 text-slate-600'}`}>{loc}</button>
                  ))}
                </div>
              </div>

              {/* Date Added */}
              <div className="space-y-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2"><Calendar size={12}/> Date Added</p>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => setActiveMonth('All')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeMonth === 'All' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-50 text-slate-600'}`}>All</button>
                  {months.map(m => (
                    <button key={m} onClick={() => setActiveMonth(m)} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeMonth === m ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-50 text-slate-600'}`}>{m}</button>
                  ))}
                </div>
              </div>

              {/* Sorting */}
              <div className="space-y-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2"><ArrowUpDown size={12}/> Sort Order</p>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { key: 'date', label: 'Added Date' },
                    { key: 'price', label: 'Value' },
                    { key: 'name', label: 'Alphabetical' },
                  ].map(opt => (
                    <button 
                      key={opt.key}
                      onClick={() => {
                        if (sortBy === opt.key) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                        else { setSortBy(opt.key as any); setSortOrder('desc'); }
                      }}
                      className={`flex items-center justify-between p-4 rounded-2xl font-bold text-sm transition-all ${sortBy === opt.key ? 'bg-indigo-50 text-indigo-600 border border-indigo-200 shadow-sm' : 'bg-slate-50 text-slate-600 border border-transparent'}`}
                    >
                      {opt.label}
                      {sortBy === opt.key && (sortOrder === 'asc' ? <ArrowUpDown size={14} className="opacity-50" /> : <ArrowUpDown size={14} className="rotate-180 opacity-50" />)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-8 bg-slate-50 absolute bottom-0 w-full border-t border-slate-200">
              <button 
                onClick={() => { setActiveCategory('All'); setActiveColor('All'); setActiveLocation('All'); setActivePriceRange('All'); setActiveMonth('All'); setSortBy('date'); setSortOrder('desc'); }}
                className="w-full py-4 bg-white border border-slate-200 rounded-2xl font-black text-xs uppercase tracking-widest text-slate-400 hover:text-slate-600 hover:border-slate-300 transition-all"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Assistant Chat Modal */}
      {isChatOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white animate-in slide-in-from-right duration-500">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10 shadow-sm">
            <button onClick={() => setIsChatOpen(false)} className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"><ChevronLeft size={28} strokeWidth={3} /></button>
            <div className="text-center">
              <h2 className="text-xl font-black tracking-tighter flex items-center gap-2 justify-center text-indigo-600">
                <BrainCircuit size={20} /> Ownly AI
              </h2>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">Knowledge Link Established</p>
            </div>
            <div className="w-10">
              {isListening && <div className="w-3 h-3 bg-red-500 rounded-full animate-ping mx-auto"></div>}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50 no-scrollbar">
            {chatMessages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom duration-300`}>
                <div className={`max-w-[85%] p-5 rounded-[2rem] text-sm font-bold shadow-sm ${m.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white text-slate-700 rounded-tl-none border border-slate-100'}`}>
                  {m.content}
                </div>
              </div>
            ))}

            {chatMessages.length === 1 && (
              <div className="grid grid-cols-1 gap-3 px-4 mt-8 animate-in fade-in slide-in-from-bottom duration-1000 delay-300">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Vault Commands:</p>
                {[
                  { text: 'I need some space, what are the things that I can drop', icon: <Trash2 size={16}/> },
                  { text: 'Shall I buy any new stuff', icon: <ShoppingCart size={16}/> },
                  { text: 'I wanna find my soccer ball, where is it', icon: <Search size={16}/> }
                ].map((s, i) => (
                  <button 
                    key={i} 
                    onClick={() => handleSuggestion(s.text)}
                    className="flex items-center gap-3 p-5 bg-white border border-slate-100 rounded-2xl text-left text-sm font-bold text-slate-700 hover:bg-indigo-50 hover:border-indigo-100 transition-all shadow-sm"
                  >
                    <div className="text-indigo-500 bg-indigo-50 p-2 rounded-lg">{s.icon}</div>
                    {s.text}
                  </button>
                ))}
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
          <div className="p-6 border-t border-slate-100 bg-white">
            <div className="relative flex items-center gap-3">
              <div className="flex-1 relative group">
                <input 
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask about your inventory..."
                  className="w-full bg-slate-100 rounded-2xl py-5 pl-6 pr-14 font-bold text-sm border-none focus:ring-4 focus:ring-indigo-100 focus:bg-white transition-all shadow-inner"
                />
                <button 
                  onClick={startVoiceCapture}
                  className={`absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'text-slate-400 hover:bg-slate-200'}`}
                >
                  <Mic size={20} strokeWidth={2.5} />
                </button>
              </div>
              <button 
                onClick={handleChatSubmit}
                disabled={!chatInput.trim()}
                className="p-5 bg-indigo-600 text-white rounded-2xl shadow-xl shadow-indigo-100 active:scale-90 transition-all disabled:opacity-50"
              >
                <Send size={20} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Bottom Dock (FABs) */}
      {!isReviewing && !isChatOpen && !isAdvisorOpen && (
        <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-40 flex items-center gap-6 animate-in slide-in-from-bottom duration-1000">
          <button 
            onClick={() => setIsChatOpen(true)} 
            className={`w-28 h-28 rounded-[3.5rem] shadow-[0_30px_70px_-10px_rgba(255,255,255,0.3)] flex items-center justify-center active:scale-90 transition-all group relative overflow-hidden border-4 border-white bg-white text-indigo-600`}
          >
            <Mic size={42} strokeWidth={3} />
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
          <h2 className="text-4xl font-black tracking-tighter mb-4 animate-pulse uppercase tracking-widest">Analyzing your belongings photo</h2>
          <p className="text-slate-500 font-black text-[10px] uppercase tracking-[0.6em] max-w-[320px] mb-12 leading-loose opacity-60">
            {loadingStep}
          </p>

          <div className="flex flex-col gap-4 w-full max-w-xs animate-in slide-in-from-bottom duration-1000">
            <button 
              onClick={retakePhoto}
              className="w-full py-5 bg-white text-slate-950 rounded-2xl font-black flex items-center justify-center gap-3 active:scale-95 transition-all text-sm uppercase tracking-widest shadow-xl"
            >
              <RotateCcw size={18} /> Retake Photo
            </button>
            <button 
              onClick={cancelLoading}
              className="w-full py-4 text-slate-400 font-black text-xs uppercase tracking-[0.4em] active:scale-95 transition-all"
            >
              Cancel
            </button>
          </div>
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
              <h3 className="text-4xl font-black text-slate-900 tracking-tighter leading-none">Scan Space</h3>
              <p className="text-slate-400 mt-5 font-bold text-sm leading-relaxed max-w-[200px] mx-auto opacity-70">Capture a photo to sync items into your vault.</p>
            </div>
            <div className="flex flex-col gap-5">
              <button onClick={() => fileInputRef.current?.click()} className="w-full bg-indigo-600 text-white font-black py-7 rounded-[2rem] shadow-3xl shadow-indigo-100 active:scale-95 transition-all text-2xl tracking-tight">Open Camera</button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
              <button onClick={() => setIsAdding(false)} className="text-slate-300 font-black text-xs uppercase tracking-[0.4em] py-2">Go Back</button>
            </div>
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
                  <p className="text-slate-400 font-bold text-sm leading-relaxed">Snap a photo to check for duplicates in your vault.</p>
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
                        <h4 className="font-black text-lg tracking-tight">AI Verdict</h4>
                      </div>
                      <p className="text-slate-600 font-bold leading-relaxed">{advisorAdvice}</p>
                      <button onClick={() => { setAdvisorPhoto(null); setAdvisorAdvice(null); }} className="w-full py-4 bg-slate-100 rounded-2xl font-black text-slate-400 uppercase text-xs tracking-widest hover:bg-slate-200 transition-all">Scan Another</button>
                    </div>
                  ) : (
                    <div className="text-center py-10 animate-pulse text-slate-400 font-black uppercase text-xs tracking-widest">Cross-referencing vault...</div>
                  )}
                </div>
              )}
            </div>
          </div>
          <input ref={advisorInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
        </div>
      )}

      {/* Item Detail Modal */}
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
                    <p className="text-slate-500 mt-6 text-xl font-medium leading-relaxed italic">"{selectedItem.description || "Stored securely in your vault."}"</p>
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
                <Trash2 size={24} strokeWidth={3} /> PURGE OBJECT
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sync Success HUD */}
      {showSyncSuccess && (
        <div className="fixed top-12 left-1/2 -translate-x-1/2 z-[100] bg-indigo-600 text-white px-8 py-5 rounded-[2rem] shadow-2xl flex items-center gap-4 animate-in fade-in slide-in-from-top duration-300">
          <Zap size={24} fill="white" className="animate-bounce" />
          <span className="font-black uppercase tracking-widest text-sm">Neural Sync Successful</span>
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
              <h2 className="text-2xl font-black tracking-tighter">Vault Entry</h2>
              <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em]">{pendingItems.length} DETECTED</p>
            </div>
            <button 
              onClick={saveReviewedItems}
              disabled={pendingItems.length === 0}
              className="bg-indigo-600 disabled:bg-slate-300 text-white px-8 py-3.5 rounded-2xl font-black shadow-2xl shadow-indigo-200 flex items-center gap-3 active:scale-95 transition-all"
            >
              <Check size={20} strokeWidth={4} /> Finalize
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
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sector</label>
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

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

export default App;
