
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
  RefreshCcw,
  ChevronLeft
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
  
  // Review state
  const [pendingItems, setPendingItems] = useState<InventoryItem[]>([]);
  const [reviewPhoto, setReviewPhoto] = useState<string | null>(null);
  const [isReviewing, setIsReviewing] = useState(false);

  // Modal states
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isAdvisorOpen, setIsAdvisorOpen] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize data
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      setLoadingStep('Accessing Vault...');
      const data = await loadInventory();
      setItems(data);
      setIsLoading(false);
    };
    init();
  }, []);

  // Save to IndexedDB (Debounced to avoid hanging on every minor state change)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (items.length > 0) {
        saveInventory(items).catch(err => console.error("Auto-save failed", err));
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [items]);

  // High-performance image compression to speed up Gemini and DB
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
      img.onerror = () => resolve(base64Str);
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setLoadingStep('Compressing Image...');
    
    const reader = new FileReader();
    reader.onloadend = async () => {
      const rawBase64 = reader.result as string;
      const compressed = await compressImage(rawBase64);
      const base64DataOnly = compressed.split(',')[1];
      
      setLoadingStep('AI Vision Analysis...');
      try {
        const detected = await analyzeStoragePhoto(base64DataOnly);
        
        if (!detected || detected.length === 0) {
          alert("AI didn't find any distinct items. Try a closer photo!");
          setIsLoading(false);
          return;
        }

        const mapped: InventoryItem[] = detected.map((d) => {
          // Normalization logic
          let normalizedCategory = Category.OTHER;
          const aiCat = (d.category || '').toLowerCase();
          if (aiCat.includes('food')) normalizedCategory = Category.FOOD;
          else if (aiCat.includes('cloth')) normalizedCategory = Category.CLOTHES;
          else if (aiCat.includes('gym') || aiCat.includes('fit')) normalizedCategory = Category.GYM;
          else if (aiCat.includes('tool')) normalizedCategory = Category.TOOLS;
          else if (aiCat.includes('elect')) normalizedCategory = Category.ELECTRONICS;

          return {
            id: crypto.randomUUID(),
            name: d.name || 'Unnamed Object',
            brand: (d as any).brand || '',
            color: (d as any).color || '',
            size: (d as any).size || '',
            description: d.description || '',
            category: normalizedCategory,
            storageLocation: d.storageLocation || 'Unknown Area',
            dateAdded: new Date().toISOString().split('T')[0],
            datePurchased: (d as any).datePurchased || '',
            expiryDate: (d as any).expiryDate || '',
            price: d.price || 0,
            imageUrl: compressed,
          };
        });

        setPendingItems(mapped);
        setReviewPhoto(compressed);
        setIsReviewing(true);
        setIsAdding(false);
      } catch (err) {
        alert("Neural Analysis timed out. Check connection.");
      } finally {
        setIsLoading(false);
      }
    };
    reader.readAsDataURL(file);
    // Reset input for same file upload
    event.target.value = '';
  };

  const saveReviewedItems = async () => {
    if (pendingItems.length === 0) {
      setIsReviewing(false);
      return;
    }

    setIsLoading(true);
    setLoadingStep('Updating Vault Archive...');
    
    try {
      // Mark duplicates before merging
      const batchWithDups = pendingItems.map(ni => {
        const exists = items.some(ei => 
          ei.name.toLowerCase() === ni.name.toLowerCase() && 
          (ei.brand || '').toLowerCase() === (ni.brand || '').toLowerCase()
        );
        return { ...ni, isDuplicate: exists };
      });

      const updatedItems = [...batchWithDups, ...items];
      
      // Critical: Save directly before state update to ensure it's on disk
      await saveInventory(updatedItems);
      
      setItems(updatedItems);
      setIsReviewing(false);
      setPendingItems([]);
      setReviewPhoto(null);
      setSelectedCategory('All'); // Force view all to show new items
      setSearchQuery('');
      
      setShowSyncSuccess(true);
      setTimeout(() => setShowSyncSuccess(false), 3000);
    } catch (e) {
      alert("Failed to save to device database.");
    } finally {
      setIsLoading(false);
    }
  };

  const updatePendingItem = (id: string, updates: Partial<InventoryItem>) => {
    setPendingItems(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const removePendingItem = (id: string) => {
    setPendingItems(prev => prev.filter(p => p.id !== id));
  };

  const deleteItem = async (id: string) => {
    const updated = items.filter(i => i.id !== id);
    setItems(updated);
    setSelectedItem(null);
    await saveInventory(updated);
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
    <div className="min-h-screen pb-32 text-slate-900 bg-[#f8fafc] font-medium transition-all">
      {/* Navbar */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-200 px-4 py-4 flex flex-col gap-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2.5 rounded-2xl text-white shadow-xl shadow-indigo-200 animate-in zoom-in duration-500">
              <Package size={22} strokeWidth={3} />
            </div>
            <h1 className="text-2xl font-black tracking-tighter">OmniVault</h1>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-3 bg-slate-100 rounded-2xl hover:bg-slate-200 transition-all active:scale-90 opacity-40 cursor-not-allowed">
              <MessageSquare size={20} />
            </button>
            <button className="p-3 bg-slate-100 rounded-2xl hover:bg-slate-200 transition-all active:scale-90 opacity-40 cursor-not-allowed">
              <ShoppingCart size={20} />
            </button>
          </div>
        </div>

        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
          <input 
            type="text" 
            placeholder="Search brand, name, color..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-12 py-4 bg-slate-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:outline-none transition-all border border-transparent focus:border-indigo-100 font-bold text-sm shadow-inner"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {['All', ...Object.values(Category)].map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-5 py-2.5 rounded-xl text-[10px] font-black whitespace-nowrap transition-all uppercase tracking-widest ${
                selectedCategory === cat 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100 scale-105' 
                  : 'bg-white text-slate-400 border border-slate-200 hover:border-slate-300'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </header>

      {/* Main Grid */}
      <main className="p-5 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8 px-1">
          <div className="flex flex-col">
            <h2 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">
              VAULT STATUS
            </h2>
            <p className="text-xs font-black text-slate-500">{items.length} INDEXED OBJECTS</p>
          </div>
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
              <Package size={80} className="text-slate-100 mx-auto animate-pulse" strokeWidth={1} />
            </div>
            <h3 className="text-2xl font-black text-slate-400 tracking-tighter">Vault Empty</h3>
            <p className="text-slate-300 text-sm mt-3 font-bold uppercase tracking-widest">Awaiting Neural Input</p>
          </div>
        ) : (
          <div className={viewMode === 'grid' ? "grid grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}>
            {filteredItems.map((item, idx) => (
              <div 
                key={item.id} 
                onClick={() => setSelectedItem(item)}
                className={`bg-white rounded-[2.5rem] border border-slate-200/50 overflow-hidden shadow-sm hover:shadow-2xl hover:-translate-y-1 active:scale-[0.98] transition-all cursor-pointer group animate-in slide-in-from-bottom duration-500`}
                style={{ animationDelay: `${idx * 30}ms` }}
              >
                <div className={`${viewMode === 'grid' ? 'aspect-square' : 'w-28 h-28'} bg-slate-50 relative overflow-hidden flex-shrink-0`}>
                  {item.imageUrl ? (
                    <img src={item.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" alt={item.name} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-indigo-50 text-indigo-200">
                      <Package size={40} />
                    </div>
                  )}
                  <div className="absolute bottom-4 left-4">
                     <span className="px-3 py-1 bg-white/95 backdrop-blur-md rounded-xl text-[9px] font-black text-slate-900 uppercase tracking-widest shadow-sm border border-slate-100">
                       {item.category}
                     </span>
                  </div>
                  {item.isDuplicate && (
                    <div className="absolute top-4 right-4 bg-amber-500 text-white p-2 rounded-full shadow-lg ring-4 ring-white">
                      <AlertTriangle size={12} fill="currentColor" />
                    </div>
                  )}
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
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"></div>
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
                          onChange={(e) => updatePendingItem(item.id, { name: e.target.value })}
                          className="w-full bg-slate-50 border-none rounded-2xl py-4 px-5 font-black text-lg focus:ring-4 focus:ring-indigo-100 transition-all shadow-inner"
                        />
                      </div>
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Brand Label</label>
                        <input 
                          type="text" 
                          value={item.brand} 
                          onChange={(e) => updatePendingItem(item.id, { brand: e.target.value })}
                          className="w-full bg-slate-50 border-none rounded-2xl py-4 px-5 font-bold shadow-inner"
                          placeholder="Detected Brand..."
                        />
                      </div>
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Category</label>
                        <select 
                          value={item.category}
                          onChange={(e) => updatePendingItem(item.id, { category: e.target.value as Category })}
                          className="w-full bg-slate-50 border-none rounded-2xl py-4 px-5 font-black uppercase text-xs shadow-inner appearance-none cursor-pointer"
                        >
                          {Object.values(Category).map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vault Sector</label>
                        <input 
                          type="text" 
                          value={item.storageLocation} 
                          onChange={(e) => updatePendingItem(item.id, { storageLocation: e.target.value })}
                          className="w-full bg-slate-50 border-none rounded-2xl py-4 px-5 font-bold shadow-inner"
                        />
                      </div>
                    </div>

                    <button 
                      onClick={() => removePendingItem(item.id)}
                      className="w-full py-5 border-2 border-dashed border-red-100 text-red-400 text-[10px] font-black uppercase tracking-[0.2em] rounded-3xl hover:bg-red-50 hover:border-red-200 transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
                    >
                      <Trash2 size={16} /> Purge This Detection
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-3xl" onClick={() => setSelectedItem(null)} />
          <div className="relative bg-white w-full max-w-4xl rounded-t-[3.5rem] sm:rounded-[4rem] shadow-2xl flex flex-col max-h-[95vh] overflow-hidden animate-in slide-in-from-bottom duration-500">
            <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-white z-10">
              <div className="flex items-center gap-3">
                <span className="bg-indigo-50 text-indigo-600 text-[10px] font-black px-5 py-2 rounded-full uppercase tracking-[0.2em] shadow-sm">{selectedItem.category}</span>
                {selectedItem.isDuplicate && <span className="bg-amber-500 text-white text-[10px] font-black px-5 py-2 rounded-full uppercase tracking-[0.2em] shadow-lg">DUPLICATE DETECTED</span>}
              </div>
              <button onClick={() => setSelectedItem(null)} className="p-4 bg-slate-100 rounded-full hover:bg-slate-200 transition-all active:scale-90"><X size={24} strokeWidth={3} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-10 no-scrollbar bg-white">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="rounded-[3rem] overflow-hidden shadow-3xl aspect-square bg-slate-50 border-[8px] border-white relative group">
                  {selectedItem.imageUrl ? (
                    <img src={selectedItem.imageUrl} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-indigo-50 text-indigo-200"><Package size={80}/></div>
                  )}
                  {selectedItem.price ? (
                    <div className="absolute bottom-6 left-6 bg-white/95 backdrop-blur-xl px-6 py-3 rounded-[2rem] shadow-2xl border border-white">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Asset Value</p>
                      <p className="text-2xl font-black text-indigo-600 leading-none">${selectedItem.price}</p>
                    </div>
                  ) : null}
                </div>

                <div className="space-y-10 py-4">
                  <div>
                    <p className="text-sm font-black text-indigo-400 uppercase tracking-[0.4em] mb-3">{selectedItem.brand || 'Unbranded'}</p>
                    <h2 className="text-5xl font-black tracking-tighter text-slate-900 leading-[0.9]">{selectedItem.name}</h2>
                    <p className="text-slate-400 mt-6 text-xl font-medium leading-relaxed italic">"{selectedItem.description || "Stored securely within the vault."}"</p>
                  </div>

                  <div className="grid grid-cols-2 gap-5">
                    <div className="bg-slate-50 p-7 rounded-[2.5rem] border border-slate-100 shadow-inner">
                      <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2"><MapPin size={14} className="text-indigo-400" /> Vault Sector</p>
                      <p className="text-slate-900 font-black text-xl tracking-tight">{selectedItem.storageLocation}</p>
                    </div>
                    <div className="bg-slate-50 p-7 rounded-[2.5rem] border border-slate-100 shadow-inner">
                      <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2"><Tag size={14} className="text-indigo-400" /> Key Features</p>
                      <p className="text-slate-900 font-black text-xl tracking-tight">{selectedItem.color || 'Indexed'}</p>
                    </div>
                  </div>

                  <div className="bg-slate-950 p-10 rounded-[3rem] text-white space-y-8 shadow-3xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
                    <h4 className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-500 flex items-center gap-3">
                      <Clock size={16} /> Archive Log
                    </h4>
                    <div className="grid grid-cols-2 gap-10">
                      <div>
                        <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] mb-2">Vault Entry</p>
                        <p className="font-black text-2xl tracking-tighter">{selectedItem.dateAdded}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] mb-2">Acquisition</p>
                        <p className="font-black text-2xl tracking-tighter">{selectedItem.datePurchased || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-10 border-t border-slate-50 bg-white">
              <button 
                onClick={() => deleteItem(selectedItem.id)} 
                className="w-full py-6 bg-red-50 text-red-600 font-black rounded-[2rem] flex items-center justify-center gap-4 hover:bg-red-100 transition-all active:scale-[0.98] text-xl tracking-tight"
              >
                <Trash2 size={24} strokeWidth={3} /> PURGE FROM VAULT
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add FAB */}
      {!isReviewing && (
        <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-40 flex items-center gap-8 animate-in slide-in-from-bottom duration-700">
          <button 
            onClick={() => setIsAdding(true)} 
            className="bg-indigo-600 text-white w-28 h-28 rounded-[3rem] shadow-[0_30px_70px_-10px_rgba(79,70,229,0.5)] flex items-center justify-center active:scale-95 transition-all group overflow-hidden"
          >
            <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <Plus size={56} strokeWidth={4} />
          </button>
        </div>
      )}

      {/* Sync Success HUD */}
      {showSyncSuccess && (
        <div className="fixed top-12 left-1/2 -translate-x-1/2 z-[100] bg-indigo-600 text-white px-8 py-5 rounded-[2rem] shadow-2xl flex items-center gap-4 animate-in fade-in slide-in-from-top duration-300">
          <Zap size={24} fill="white" className="animate-bounce" />
          <span className="font-black uppercase tracking-widest text-sm">Vault Archive Updated</span>
        </div>
      )}

      {/* Upload Modal */}
      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-8">
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-3xl" onClick={() => setIsAdding(false)} />
          <div className="relative bg-white w-full max-w-sm rounded-[4rem] p-14 text-center space-y-12 animate-in zoom-in-95">
            <div className="w-28 h-28 bg-indigo-50 rounded-full flex items-center justify-center mx-auto text-indigo-600 shadow-inner">
              <Camera size={56} strokeWidth={2} />
            </div>
            <div>
              <h3 className="text-4xl font-black text-slate-900 tracking-tighter leading-none">Scan Storage</h3>
              <p className="text-slate-400 mt-5 font-bold text-sm leading-relaxed max-w-[200px] mx-auto opacity-70">Capture containers or loose items for neural indexing.</p>
            </div>
            <div className="flex flex-col gap-5">
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-full bg-indigo-600 text-white font-black py-7 rounded-[2rem] shadow-3xl shadow-indigo-100 active:scale-95 transition-all text-2xl tracking-tight"
              >
                Snap Space
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
              <button onClick={() => setIsAdding(false)} className="text-slate-300 font-black text-xs uppercase tracking-[0.4em] py-2 hover:text-slate-900 transition-colors">Go Back</button>
            </div>
          </div>
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
          <h2 className="text-4xl font-black tracking-tighter mb-4 animate-pulse">PROCESSING</h2>
          <p className="text-slate-500 font-black text-[10px] uppercase tracking-[0.6em] max-w-[320px] leading-loose opacity-60">
            {loadingStep}
          </p>
        </div>
      )}

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes scan { 0% { top: 0; opacity: 0; } 50% { opacity: 1; } 100% { top: 100%; opacity: 0; } }
      `}</style>
    </div>
  );
};

export default App;
