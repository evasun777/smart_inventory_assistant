
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
  Mic,
  AlertTriangle,
  ChevronRight,
  Package,
  X,
  Check,
  Tag,
  MapPin,
  Clock,
  DollarSign,
  Calendar,
  Layers,
  Zap
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
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isAdvisorOpen, setIsAdvisorOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [showSyncSuccess, setShowSyncSuccess] = useState(false);
  
  // Review state
  const [pendingItems, setPendingItems] = useState<InventoryItem[]>([]);
  const [reviewPhoto, setReviewPhoto] = useState<string | null>(null);
  const [isReviewing, setIsReviewing] = useState(false);

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  
  // File input refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const advisorInputRef = useRef<HTMLInputElement>(null);

  // Load items on mount
  useEffect(() => {
    const init = async () => {
      const data = await loadInventory();
      setItems(data);
    };
    init();
  }, []);

  // Sync to IndexedDB whenever items change
  useEffect(() => {
    if (items.length >= 0) {
      saveInventory(items);
    }
  }, [items]);

  // Fast image compression
  const compressImage = (base64Str: string, quality = 0.6): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1000;
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const rawBase64 = reader.result as string;
      // High speed compression
      const compressedBase64 = await compressImage(rawBase64);
      const base64DataOnly = compressedBase64.split(',')[1];
      
      try {
        const detected = await analyzeStoragePhoto(base64DataOnly);
        
        const mapped: InventoryItem[] = detected.map((d) => {
          // Robust Category Normalization
          let normalizedCategory = Category.OTHER;
          const aiCat = (d.category || '').toLowerCase();
          if (aiCat.includes('food')) normalizedCategory = Category.FOOD;
          else if (aiCat.includes('cloth')) normalizedCategory = Category.CLOTHES;
          else if (aiCat.includes('gym') || aiCat.includes('fit') || aiCat.includes('sport')) normalizedCategory = Category.GYM;
          else if (aiCat.includes('tool')) normalizedCategory = Category.TOOLS;
          else if (aiCat.includes('elect')) normalizedCategory = Category.ELECTRONICS;

          return {
            id: crypto.randomUUID(),
            name: d.name || 'Detected Item',
            brand: (d as any).brand || '',
            color: (d as any).color || '',
            size: (d as any).size || '',
            description: d.description || '',
            category: normalizedCategory,
            storageLocation: d.storageLocation || 'Main Unit',
            dateAdded: new Date().toISOString().split('T')[0],
            datePurchased: (d as any).datePurchased || '',
            expiryDate: (d as any).expiryDate || '',
            price: d.price || 0,
            imageUrl: compressedBase64,
          };
        });

        setPendingItems(mapped);
        setReviewPhoto(compressedBase64);
        setIsReviewing(true);
        setIsAdding(false);
      } catch (err) {
        alert("Vision timeout. Please try again with better lighting.");
      } finally {
        setIsLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const saveReviewedItems = async () => {
    setIsLoading(true);
    
    // Check for duplicates
    const finalBatch = pendingItems.map(ni => {
      const exists = items.some(ei => 
        ei.name.toLowerCase() === ni.name.toLowerCase() && 
        (ei.brand || '').toLowerCase() === (ni.brand || '').toLowerCase()
      );
      return { ...ni, isDuplicate: exists };
    });

    const newInventory = [...finalBatch, ...items];
    setItems(newInventory);
    
    // State reset
    setIsReviewing(false);
    setPendingItems([]);
    setReviewPhoto(null);
    setSelectedCategory('All');
    setIsLoading(false);
    
    // Show success feedback
    setShowSyncSuccess(true);
    setTimeout(() => setShowSyncSuccess(false), 2000);
  };

  const updatePendingItem = (id: string, updates: Partial<InventoryItem>) => {
    setPendingItems(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const removePendingItem = (id: string) => {
    setPendingItems(prev => prev.filter(p => p.id !== id));
  };

  const handleChatSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!chatInput.trim()) return;
    const msg = chatInput;
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: msg }]);
    setIsLoading(true);
    const reply = await chatWithAssistant(msg, items);
    setChatMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    setIsLoading(false);
  };

  const deleteItem = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
    setSelectedItem(null);
  };

  const filteredItems = items.filter(item => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = item.name.toLowerCase().includes(query) || 
                          (item.brand || '').toLowerCase().includes(query) ||
                          (item.color || '').toLowerCase().includes(query);
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen pb-24 text-slate-900 bg-slate-50 font-medium overflow-x-hidden">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 py-4 flex flex-col gap-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2.5 rounded-2xl text-white shadow-xl shadow-indigo-100">
              <Package size={22} strokeWidth={3} />
            </div>
            <h1 className="text-2xl font-black tracking-tighter">OmniVault</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setIsChatOpen(true)} className="p-3 bg-slate-100 rounded-2xl hover:bg-slate-200 transition-all active:scale-90">
              <MessageSquare size={20} />
            </button>
            <button onClick={() => setIsAdvisorOpen(true)} className="p-3 bg-slate-100 rounded-2xl hover:bg-slate-200 transition-all active:scale-90">
              <ShoppingCart size={20} />
            </button>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search vault..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-12 py-4 bg-slate-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:outline-none transition-all border-none font-bold text-sm"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {['All', ...Object.values(Category)].map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-5 py-2.5 rounded-xl text-[10px] font-black whitespace-nowrap transition-all uppercase tracking-[0.2em] ${
                selectedCategory === cat 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' 
                  : 'bg-white text-slate-400 border border-slate-200 hover:border-slate-300'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </header>

      {/* Main Vault Dashboard */}
      <main className="p-4 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8 px-2">
          <h2 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">
            ACTIVE STORAGE ARCHIVE • {filteredItems.length}
          </h2>
          <div className="flex bg-slate-200/50 p-1.5 rounded-2xl">
            <button onClick={() => setViewMode('grid')} className={`p-2 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-white shadow-md text-indigo-600' : 'text-slate-400'}`}>
              <Grid size={16} strokeWidth={2.5} />
            </button>
            <button onClick={() => setViewMode('list')} className={`p-2 rounded-xl transition-all ${viewMode === 'list' ? 'bg-white shadow-md text-indigo-600' : 'text-slate-400'}`}>
              <ListIcon size={16} strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {filteredItems.length === 0 ? (
          <div className="py-40 text-center animate-in fade-in zoom-in duration-700">
            <div className="bg-white p-12 rounded-[3.5rem] shadow-2xl shadow-slate-200/50 inline-block mb-8">
              <Package size={80} className="text-slate-100 mx-auto" strokeWidth={1} />
            </div>
            <h3 className="text-2xl font-black text-slate-300 tracking-tighter">Vault Empty</h3>
          </div>
        ) : (
          <div className={viewMode === 'grid' ? "grid grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}>
            {filteredItems.map((item, idx) => (
              <div 
                key={item.id} 
                onClick={() => setSelectedItem(item)}
                className={`bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-sm hover:shadow-2xl active:scale-[0.98] transition-all cursor-pointer group animate-in slide-in-from-bottom duration-500`}
                style={{ animationDelay: `${idx * 40}ms` }}
              >
                <div className={`${viewMode === 'grid' ? 'aspect-square' : 'w-28 h-28'} bg-slate-50 relative overflow-hidden flex-shrink-0`}>
                  {item.imageUrl ? (
                    <img src={item.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={item.name} />
                  ) : (
                    <Package className="w-full h-full p-10 text-slate-200" />
                  )}
                  {item.isDuplicate && (
                    <div className="absolute top-4 right-4 bg-amber-500 text-white p-2 rounded-full shadow-lg ring-4 ring-white">
                      <AlertTriangle size={12} fill="currentColor" />
                    </div>
                  )}
                  <div className="absolute bottom-4 left-4">
                     <span className="px-3 py-1 bg-white/90 backdrop-blur-md rounded-xl text-[9px] font-black text-slate-900 uppercase tracking-widest shadow-sm border border-white">
                       {item.category}
                     </span>
                  </div>
                </div>
                <div className="p-6 flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-3">
                    <h3 className="font-black text-slate-900 text-base truncate leading-tight flex-1">{item.name}</h3>
                    {item.price ? <span className="text-indigo-600 font-black text-sm">${item.price}</span> : null}
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                    <MapPin size={12} className="text-indigo-400" /> {item.storageLocation}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Review Interface */}
      {isReviewing && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-white animate-in slide-in-from-bottom duration-500">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
            <button onClick={() => { setIsReviewing(false); setPendingItems([]); }} className="text-slate-300 hover:text-slate-600 p-2">
              <X size={28} strokeWidth={3} />
            </button>
            <div className="text-center">
              <h2 className="text-2xl font-black tracking-tighter">Review Scan</h2>
              <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em]">Neural Verification</p>
            </div>
            <button 
              onClick={saveReviewedItems}
              className="bg-indigo-600 text-white px-8 py-3.5 rounded-2xl font-black shadow-2xl shadow-indigo-200 flex items-center gap-3 active:scale-95 transition-all"
            >
              <Check size={20} strokeWidth={4} /> Sync Vault
            </button>
          </div>

          <div className="flex-1 overflow-y-auto bg-slate-50/50 p-6 no-scrollbar">
            <div className="max-w-2xl mx-auto space-y-10 pb-40">
              <div className="rounded-[3rem] overflow-hidden shadow-2xl bg-black border-[12px] border-white aspect-video relative">
                {reviewPhoto && <img src={reviewPhoto} className="w-full h-full object-contain opacity-90" alt="Review Scan" />}
              </div>

              <div className="space-y-6">
                {pendingItems.map((item, idx) => (
                  <div key={item.id} className="bg-white p-8 rounded-[3.5rem] shadow-xl border border-slate-100 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Item Name</label>
                        <input 
                          type="text" 
                          value={item.name} 
                          onChange={(e) => updatePendingItem(item.id, { name: e.target.value })}
                          className="w-full bg-slate-50 border-none rounded-2xl py-4 px-5 font-black text-lg focus:ring-4 focus:ring-indigo-100 transition-all"
                        />
                      </div>
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Brand</label>
                        <input 
                          type="text" 
                          value={item.brand} 
                          onChange={(e) => updatePendingItem(item.id, { brand: e.target.value })}
                          className="w-full bg-slate-50 border-none rounded-2xl py-4 px-5 font-bold"
                        />
                      </div>
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Category</label>
                        <select 
                          value={item.category}
                          onChange={(e) => updatePendingItem(item.id, { category: e.target.value as Category })}
                          className="w-full bg-slate-50 border-none rounded-2xl py-4 px-5 font-black uppercase text-xs"
                        >
                          {Object.values(Category).map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Location</label>
                        <input 
                          type="text" 
                          value={item.storageLocation} 
                          onChange={(e) => updatePendingItem(item.id, { storageLocation: e.target.value })}
                          className="w-full bg-slate-50 border-none rounded-2xl py-4 px-5 font-bold"
                        />
                      </div>
                    </div>
                    <button 
                      onClick={() => removePendingItem(item.id)}
                      className="w-full py-4 text-red-400 text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-red-50 transition-all"
                    >
                      Discard Detection
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sync Success Feedback */}
      {showSyncSuccess && (
        <div className="fixed top-12 left-1/2 -translate-x-1/2 z-[100] bg-green-500 text-white px-8 py-4 rounded-[2rem] shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top duration-300">
          <Zap size={24} fill="white" />
          <span className="font-black uppercase tracking-widest text-xs">Archive Synchronized</span>
        </div>
      )}

      {/* Main View FABs */}
      {!isReviewing && (
        <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-40 flex items-center gap-8">
          <button onClick={() => setIsChatOpen(true)} className="bg-white text-slate-900 w-16 h-16 rounded-[2rem] shadow-2xl flex items-center justify-center active:scale-90 transition-all border border-slate-100">
            <MessageSquare size={28} />
          </button>
          <button 
            onClick={() => setIsAdding(true)} 
            className="bg-indigo-600 text-white w-28 h-28 rounded-[3rem] shadow-[0_30px_70px_-10px_rgba(79,70,229,0.5)] flex items-center justify-center active:scale-95 transition-all"
          >
            <Plus size={56} strokeWidth={4} />
          </button>
          <button onClick={() => setIsAdvisorOpen(true)} className="bg-white text-slate-900 w-16 h-16 rounded-[2rem] shadow-2xl flex items-center justify-center active:scale-90 transition-all border border-slate-100">
            <ShoppingCart size={28} />
          </button>
        </div>
      )}

      {/* Detail Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-2xl" onClick={() => setSelectedItem(null)} />
          <div className="relative bg-white w-full max-w-4xl rounded-t-[3.5rem] sm:rounded-[4rem] shadow-2xl flex flex-col max-h-[95vh] overflow-hidden">
            <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-white z-10">
              <span className="bg-indigo-50 text-indigo-600 text-[10px] font-black px-5 py-2 rounded-full uppercase tracking-widest">{selectedItem.category}</span>
              <button onClick={() => setSelectedItem(null)} className="p-4 bg-slate-100 rounded-full hover:bg-slate-200 transition-all"><X size={24} strokeWidth={3} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-10 no-scrollbar bg-white">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="rounded-[3rem] overflow-hidden shadow-3xl aspect-square bg-slate-50 border-[8px] border-white">
                  {selectedItem.imageUrl ? <img src={selectedItem.imageUrl} className="w-full h-full object-cover" /> : <Package className="w-full h-full p-24 text-slate-100" />}
                </div>
                <div className="space-y-10">
                  <div>
                    <p className="text-sm font-black text-indigo-400 uppercase tracking-[0.4em] mb-3">{selectedItem.brand || 'No Brand'}</p>
                    <h2 className="text-5xl font-black tracking-tighter text-slate-900 leading-[0.9]">{selectedItem.name}</h2>
                    <p className="text-slate-400 mt-6 text-xl font-medium leading-relaxed italic">"{selectedItem.description || "Stored within the OmniVault."}"</p>
                  </div>
                  <div className="grid grid-cols-2 gap-5">
                    <div className="bg-slate-50 p-7 rounded-[2.5rem] border border-slate-100">
                      <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2"><MapPin size={14} className="text-indigo-400" /> Sector</p>
                      <p className="text-slate-900 font-black text-xl">{selectedItem.storageLocation}</p>
                    </div>
                    <div className="bg-slate-50 p-7 rounded-[2.5rem] border border-slate-100">
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
                <Trash2 size={24} strokeWidth={3} /> PURGE ARCHIVE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Input Modal */}
      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-8">
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-3xl" onClick={() => setIsAdding(false)} />
          <div className="relative bg-white w-full max-w-sm rounded-[4rem] p-14 text-center space-y-12 animate-in zoom-in-95">
            <div className="w-28 h-28 bg-indigo-50 rounded-full flex items-center justify-center mx-auto text-indigo-600 shadow-inner">
              <Camera size={56} strokeWidth={2} />
            </div>
            <h3 className="text-4xl font-black text-slate-900 tracking-tighter">Vault Scan</h3>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="w-full bg-indigo-600 text-white font-black py-7 rounded-[2rem] shadow-3xl text-2xl active:scale-95 transition-all"
            >
              Snap Storage
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
            <button onClick={() => setIsAdding(false)} className="text-slate-300 font-black text-xs uppercase tracking-[0.4em]">Discard</button>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {isLoading && !isReviewing && (
        <div className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-3xl flex flex-col items-center justify-center text-white p-12 text-center animate-in fade-in">
          <div className="relative mb-14">
            <div className="w-40 h-40 border-[1px] border-indigo-400/20 rounded-full"></div>
            <div className="absolute inset-0 w-40 h-40 border-[5px] border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <Camera size={52} className="absolute inset-0 m-auto text-indigo-400 animate-pulse" />
          </div>
          <h2 className="text-4xl font-black tracking-tighter mb-5">INDEXING VAULT</h2>
          <p className="text-slate-500 font-black text-[10px] uppercase tracking-[0.5em] opacity-60">Mapping brands • Identifying colors • Syncing DB</p>
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
