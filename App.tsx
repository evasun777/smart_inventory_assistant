
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Plus, 
  Search, 
  Grid, 
  List as ListIcon, 
  Camera, 
  MessageSquare, 
  ShoppingCart, 
  Filter,
  Trash2,
  Info,
  Mic,
  AlertTriangle,
  ChevronRight,
  Package,
  X,
  History
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
  
  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  
  // File input ref
  const fileInputRef = useRef<HTMLInputElement>(null);
  const advisorInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setItems(loadInventory());
  }, []);

  useEffect(() => {
    saveInventory(items);
  }, [items]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = (reader.result as string).split(',')[1];
      const detectedItems = await analyzeStoragePhoto(base64);
      
      const newItems: InventoryItem[] = detectedItems.map((di, idx) => ({
        id: crypto.randomUUID(),
        name: di.name || 'Unknown Item',
        description: di.description || '',
        category: di.category || 'Other',
        storageLocation: di.storageLocation || 'Main Storage',
        dateAdded: new Date().toISOString().split('T')[0],
        price: di.price,
        imageUrl: reader.result as string, // For demo, using the source photo for all items in it
      }));

      // Check for duplicates
      const updatedItems = [...items];
      newItems.forEach(ni => {
        const isDuplicate = updatedItems.some(existing => 
          existing.name.toLowerCase() === ni.name.toLowerCase() && 
          existing.category === ni.category
        );
        if (isDuplicate) ni.isDuplicate = true;
        updatedItems.unshift(ni);
      });

      setItems(updatedItems);
      setIsLoading(false);
      setIsAdding(false);
    };
    reader.readAsDataURL(file);
  };

  const handleShoppingAdvice = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = (reader.result as string).split(',')[1];
      const advice = await getShoppingAdvice(base64, items);
      setChatMessages(prev => [
        ...prev, 
        { role: 'user', content: 'Should I buy this? (Photo attached)' },
        { role: 'assistant', content: advice }
      ]);
      setIsChatOpen(true);
      setIsAdvisorOpen(false);
      setIsLoading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleChatSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!chatInput.trim()) return;

    const userMessage = chatInput;
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    
    setIsLoading(true);
    const response = await chatWithAssistant(userMessage, items);
    setChatMessages(prev => [...prev, { role: 'assistant', content: response }]);
    setIsLoading(false);
  };

  const startVoiceSearch = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setSearchQuery(transcript);
      };
      recognition.start();
    } else {
      alert("Voice recognition not supported in this browser.");
    }
  };

  const deleteItem = (id: string) => {
    setItems(items.filter(i => i.id !== id));
    setSelectedItem(null);
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 py-3 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-lg text-white">
              <Package size={24} />
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">OmniVault</h1>
          </div>
          <div className="flex items-center gap-2">
             <button 
              onClick={() => setIsChatOpen(true)}
              className="p-2 text-slate-600 hover:bg-slate-100 rounded-full transition-colors relative"
            >
              <MessageSquare size={22} />
              {chatMessages.length > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-indigo-500 rounded-full"></span>}
            </button>
            <button 
              onClick={() => setIsAdvisorOpen(true)}
              className="p-2 text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
            >
              <ShoppingCart size={22} />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
          <input 
            type="text" 
            placeholder="Search items or storage..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-12 py-2 bg-slate-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:outline-none border-transparent focus:border-indigo-500 transition-all text-sm"
          />
          <button 
            onClick={startVoiceSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors"
          >
            <Mic size={18} />
          </button>
        </div>

        {/* Categories Bar */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
          {['All', ...Object.values(Category)].map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all border ${
                selectedCategory === cat 
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200' 
                  : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
            Inventory ({filteredItems.length})
          </h2>
          <div className="flex bg-slate-100 p-1 rounded-lg">
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}
            >
              <Grid size={16} />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}
            >
              <ListIcon size={16} />
            </button>
          </div>
        </div>

        {filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="bg-slate-100 p-6 rounded-full mb-4">
              <Package size={48} className="text-slate-300" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">No items found</h3>
            <p className="text-slate-500 text-sm max-w-xs mt-1">
              Start by taking a photo of a storage box or adding items manually.
            </p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 gap-4">
            {filteredItems.map(item => (
              <div 
                key={item.id} 
                onClick={() => setSelectedItem(item)}
                className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm active:scale-95 transition-transform"
              >
                <div className="aspect-square bg-slate-200 relative">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package size={32} className="text-slate-400" />
                    </div>
                  )}
                  {item.isDuplicate && (
                    <div className="absolute top-2 right-2 bg-amber-500 text-white p-1 rounded-full shadow-lg">
                      <AlertTriangle size={14} />
                    </div>
                  )}
                  <div className="absolute bottom-2 left-2 bg-black/50 backdrop-blur-md text-white text-[10px] px-2 py-0.5 rounded-full">
                    {item.category}
                  </div>
                </div>
                <div className="p-3">
                  <h3 className="font-semibold text-slate-900 text-sm truncate">{item.name}</h3>
                  <p className="text-xs text-slate-500 truncate">{item.storageLocation}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredItems.map(item => (
              <div 
                key={item.id} 
                onClick={() => setSelectedItem(item)}
                className="bg-white p-3 rounded-xl border border-slate-100 flex items-center gap-4 shadow-sm active:bg-slate-50 transition-colors"
              >
                <div className="w-16 h-16 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package size={20} className="text-slate-400" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 truncate">{item.name}</h3>
                    {item.isDuplicate && <AlertTriangle size={14} className="text-amber-500" />}
                  </div>
                  <p className="text-xs text-slate-500 mb-1">{item.storageLocation}</p>
                  <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-600">{item.category}</span>
                </div>
                <ChevronRight size={18} className="text-slate-300" />
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Item Detail Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setSelectedItem(null)} />
          <div className="relative bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in slide-in-from-bottom duration-300">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-lg text-slate-900">Item Details</h3>
              <button onClick={() => setSelectedItem(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X size={20} className="text-slate-400" />
              </button>
            </div>
            <div className="overflow-y-auto p-4 flex-1">
              <div className="rounded-2xl overflow-hidden mb-6 aspect-video bg-slate-100">
                {selectedItem.imageUrl ? (
                  <img src={selectedItem.imageUrl} alt={selectedItem.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package size={64} className="text-slate-300" />
                  </div>
                )}
              </div>
              
              <div className="space-y-6">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-2xl font-bold text-slate-900">{selectedItem.name}</h2>
                    {selectedItem.isDuplicate && (
                      <span className="bg-amber-100 text-amber-700 text-[10px] px-2 py-1 rounded-full font-bold flex items-center gap-1">
                        <AlertTriangle size={10} /> POSSIBLY DUPLICATE
                      </span>
                    )}
                  </div>
                  <p className="text-slate-500">{selectedItem.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Location</p>
                    <p className="text-slate-700 font-medium">{selectedItem.storageLocation}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Category</p>
                    <p className="text-slate-700 font-medium">{selectedItem.category}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Added On</p>
                    <p className="text-slate-700 font-medium">{selectedItem.dateAdded}</p>
                  </div>
                  {selectedItem.price && (
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Estimated Price</p>
                      <p className="text-slate-700 font-medium">${selectedItem.price.toFixed(2)}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-slate-100 flex gap-3">
              <button 
                onClick={() => deleteItem(selectedItem.id)}
                className="flex-1 bg-red-50 text-red-600 font-semibold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-red-100 transition-colors"
              >
                <Trash2 size={18} /> Delete Item
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Button (Add Photo) */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 flex items-center gap-4">
        <button 
          onClick={() => setIsChatOpen(true)}
          className="bg-white text-slate-900 w-12 h-12 rounded-full shadow-xl border border-slate-100 flex items-center justify-center active:scale-90 transition-transform"
        >
          <MessageSquare size={20} />
        </button>
        <button 
          onClick={() => setIsAdding(true)}
          className="bg-indigo-600 text-white w-16 h-16 rounded-full shadow-2xl shadow-indigo-400 flex items-center justify-center active:scale-95 transition-all group overflow-hidden"
        >
          <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <Plus size={32} />
        </button>
        <button 
          onClick={() => setIsAdvisorOpen(true)}
          className="bg-white text-slate-900 w-12 h-12 rounded-full shadow-xl border border-slate-100 flex items-center justify-center active:scale-90 transition-transform"
        >
          <ShoppingCart size={20} />
        </button>
      </div>

      {/* Add Item Panel */}
      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={() => setIsAdding(false)} />
          <div className="relative bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl text-center space-y-6 animate-in zoom-in-95 duration-200">
            <div className="bg-indigo-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto text-indigo-600">
              <Camera size={32} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">Add New Items</h3>
              <p className="text-slate-500 text-sm mt-1">Take a photo of a storage box, shelf, or item. Our AI will automatically identify and list everything for you.</p>
            </div>
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-full bg-indigo-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-colors"
              >
                Snap or Upload Photo
              </button>
              <input 
                ref={fileInputRef}
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={handleFileUpload} 
              />
              <button 
                onClick={() => setIsAdding(false)}
                className="text-slate-400 font-medium py-2 hover:text-slate-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shopping Advisor Panel */}
      {isAdvisorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={() => setIsAdvisorOpen(false)} />
          <div className="relative bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl text-center space-y-6 animate-in zoom-in-95 duration-200">
            <div className="bg-amber-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto text-amber-600">
              <ShoppingCart size={32} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">Shopping Assistant</h3>
              <p className="text-slate-500 text-sm mt-1">Found something you like? Snap a photo at the store, and I'll check if you already have something similar or if it fits your home.</p>
            </div>
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => advisorInputRef.current?.click()}
                className="w-full bg-amber-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-amber-200 hover:bg-amber-600 transition-colors"
              >
                Scan Item to Buy
              </button>
              <input 
                ref={advisorInputRef}
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={handleShoppingAdvice} 
              />
              <button 
                onClick={() => setIsAdvisorOpen(false)}
                className="text-slate-400 font-medium py-2"
              >
                Not right now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chat / Assistant Sidebar (Modal for mobile) */}
      {isChatOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-stretch sm:justify-end">
          <div className="absolute inset-0 bg-slate-900/20 sm:hidden" onClick={() => setIsChatOpen(false)} />
          <div className="relative bg-white w-full sm:w-96 h-[80vh] sm:h-screen shadow-2xl flex flex-col animate-in slide-in-from-bottom sm:slide-in-from-right duration-300">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
                  <MessageSquare size={16} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 leading-none">Assistant</h3>
                  <span className="text-[10px] text-green-500 font-bold uppercase tracking-tighter">Online</span>
                </div>
              </div>
              <button onClick={() => setIsChatOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X size={20} className="text-slate-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
              {chatMessages.length === 0 && (
                <div className="py-8 text-center space-y-4">
                  <div className="bg-slate-50 p-4 rounded-2xl text-xs text-slate-500 leading-relaxed border border-slate-100">
                    "Where are my winter coats?"<br/>
                    "What should I get rid of?"<br/>
                    "Find items in the pantry category."
                  </div>
                  <p className="text-sm text-slate-400">Ask me anything about your inventory.</p>
                </div>
              )}
              {chatMessages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm ${
                    msg.role === 'user' 
                      ? 'bg-indigo-600 text-white rounded-tr-none' 
                      : 'bg-slate-100 text-slate-700 rounded-tl-none'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-100 px-4 py-2.5 rounded-2xl text-sm text-slate-400 italic rounded-tl-none flex items-center gap-2">
                    <div className="flex gap-1">
                      <div className="w-1 h-1 bg-slate-400 rounded-full animate-bounce"></div>
                      <div className="w-1 h-1 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                      <div className="w-1 h-1 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                    </div>
                    Thinking...
                  </div>
                </div>
              )}
            </div>

            <form onSubmit={handleChatSubmit} className="p-4 border-t border-slate-100 bg-white">
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="Ask a question..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  className="flex-1 bg-slate-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                />
                <button 
                  disabled={!chatInput.trim() || isLoading}
                  className="bg-indigo-600 text-white w-12 h-12 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100 disabled:opacity-50 disabled:bg-slate-300 transition-all"
                >
                  <ChevronRight size={24} />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {isLoading && !isChatOpen && (
        <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-md flex flex-col items-center justify-center text-white p-8 animate-in fade-in duration-300">
          <div className="w-16 h-16 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin mb-6"></div>
          <h2 className="text-xl font-bold mb-2 text-center">AI is analyzing your space...</h2>
          <p className="text-indigo-200 text-center text-sm">Identifying items and cataloging them for effortless retrieval.</p>
        </div>
      )}
    </div>
  );
};

export default App;
