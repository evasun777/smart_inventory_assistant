
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
  BrainCircuit, 
  RotateCcw, 
  Store, 
  Edit3, 
  TrendingUp, 
  Palette, 
  Save, 
  ArrowRight, 
  Clock, 
  Home, 
  Users, 
  Share2, 
  Calendar, 
  Maximize2 
} from 'lucide-react';
import { InventoryItem, ViewMode, ChatMessage, Category } from './types';
import { loadInventory, saveInventory } from './services/storageService';
import { analyzeStoragePhoto, chatWithAssistant } from './services/geminiService';

/**
 * OwnlyLogo - Inline SVG recreation of the branding image provided by the user.
 */
const OwnlyLogo: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div className={`relative flex items-center justify-center overflow-hidden rounded-2xl bg-white shadow-sm border border-teal-50 ${className || 'w-14 h-14'}`}>
      <svg viewBox="0 0 100 100" className="w-full h-full p-1.5">
        <defs>
          <linearGradient id="binGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#81d8db" />
            <stop offset="100%" stopColor="#309bad" />
          </linearGradient>
          <linearGradient id="leafGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#a3e3c3" />
            <stop offset="100%" stopColor="#4bbba4" />
          </linearGradient>
        </defs>
        <path d="M30,35 C20,20 40,20 35,35 Z" fill="#4bbba4" opacity="0.8" />
        <path d="M35,30 C30,10 50,10 45,30 Z" fill="#a3e3c3" />
        <circle cx="40" cy="20" r="4" fill="#a3e3c3" />
        <rect x="60" y="25" width="25" height="20" rx="2" fill="#81d8db" />
        <path d="M60,30 L85,30 M72.5,25 L72.5,45" stroke="white" strokeWidth="1" opacity="0.5" />
        <path d="M72.5,25 C68,20 77,20 72.5,25" fill="none" stroke="#4bbba4" strokeWidth="2" />
        <rect x="50" y="32" width="10" height="15" rx="1" fill="#f97316" opacity="0.6" />
        <path d="M22,42 L78,42 L74,85 L26,85 Z" fill="url(#binGrad)" />
        <path d="M22,42 C22,38 78,38 78,42 L78,50 L22,50 Z" fill="#a8e3e6" />
        <rect x="42" y="60" width="16" height="5" rx="2.5" fill="white" opacity="0.5" />
        <path d="M50,10 L52,18 L60,20 L52,22 L50,30 L48,22 L40,20 L48,18 Z" fill="#f97316" />
        <path d="M75,25 L76,29 L80,30 L76,31 L75,35 L74,31 L70,30 L74,29 Z" fill="#f97316" opacity="0.7" />
      </svg>
    </div>
  );
};

const INITIAL_TOYS: InventoryItem[] = [
  { id: 'toy-1', name: 'Vintage Plush Bear', brand: 'Steiff', color: 'Brown', description: 'Classic collector bear.', category: Category.OTHER, storageLocation: 'Upper Shelf', dateAdded: '2023-11-01', price: 120, imageUrl: 'https://images.unsplash.com/photo-1591337676887-a217a6970a8a?auto=format&fit=crop&q=80&w=400' },
  { id: 'toy-2', name: 'RC Monster Truck', brand: 'Traxxas', color: 'Red', description: 'High-speed 4WD truck.', category: Category.ELECTRONICS, storageLocation: 'Toy Box B', dateAdded: '2023-12-05', price: 350, imageUrl: 'https://images.unsplash.com/photo-1594787318286-3d835c1d207f?auto=format&fit=crop&q=80&w=400' },
  { id: 'toy-3', name: 'Soccer Ball Pro', brand: 'Adidas', color: 'White', description: 'Official size 5.', category: Category.GYM, storageLocation: 'Backyard', dateAdded: '2024-01-10', price: 45, imageUrl: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&q=80&w=400' },
  { id: 'toy-4', name: 'Coffee Grinder', brand: 'Fellow', color: 'Matte Black', description: 'Burr grinder for drip.', category: Category.ELECTRONICS, storageLocation: 'Kitchen', dateAdded: '2024-02-14', price: 195, imageUrl: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?auto=format&fit=crop&q=80&w=400' },
  { id: 'toy-5', name: 'Yoga Mat', brand: 'Lululemon', color: 'Green', description: '5mm reversible mat.', category: Category.GYM, storageLocation: 'Hallway Closet', dateAdded: '2024-02-20', price: 88, imageUrl: 'https://images.unsplash.com/photo-1592432676556-2640d820bc20?auto=format&fit=crop&q=80&w=400' },
  { id: 'toy-6', name: 'Leather Jacket', brand: 'Schott', color: 'Black', description: 'Classic cafe racer.', category: Category.CLOTHES, storageLocation: 'Master Closet', dateAdded: '2024-01-05', price: 850, imageUrl: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&q=80&w=400' },
  { id: 'toy-7', name: 'Cordless Drill', brand: 'DeWalt', color: 'Yellow', description: '20V Max XR Brushless.', category: Category.TOOLS, storageLocation: 'Garage', dateAdded: '2023-10-15', price: 159, imageUrl: 'https://images.unsplash.com/photo-1504148455328-497c5efdf13a?auto=format&fit=crop&q=80&w=400' },
  { id: 'toy-8', name: 'Wireless Headphones', brand: 'Sony', color: 'Silver', description: 'WH-1000XM5 Noise Cancelling.', category: Category.ELECTRONICS, storageLocation: 'Office', dateAdded: '2024-03-01', price: 399, imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=400' },
  { id: 'toy-9', name: 'Running Shoes', brand: 'Nike', color: 'Neon', description: 'Vaporfly Next% 2.', category: Category.GYM, storageLocation: 'Shoe Rack', dateAdded: '2024-02-25', price: 250, imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=400' },
  { id: 'toy-10', name: 'Mechanical Watch', brand: 'Seiko', color: 'Steel', description: 'Alpinist SPB121.', category: Category.OTHER, storageLocation: 'Bedroom Safe', dateAdded: '2023-09-20', price: 725, imageUrl: 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?auto=format&fit=crop&q=80&w=400' },
  { id: 'toy-11', name: 'Frying Pan', brand: 'Le Creuset', color: 'Flame Orange', description: 'Cast iron skillet.', category: Category.OTHER, storageLocation: 'Kitchen Pantry', dateAdded: '2024-01-30', price: 180, imageUrl: 'https://images.unsplash.com/photo-1590400541360-394723c92e6d?auto=format&fit=crop&q=80&w=400' },
  { id: 'toy-12', name: 'Hoodie', brand: 'Patagonia', color: 'Navy', description: 'Better Sweater fleece.', category: Category.CLOTHES, storageLocation: 'Master Closet', dateAdded: '2023-12-15', price: 139, imageUrl: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&q=80&w=400' },
  { id: 'toy-13', name: 'Dumbbell Set', brand: 'Bowflex', color: 'Black/Red', description: 'SelectTech 552 adjustable.', category: Category.GYM, storageLocation: 'Garage Gym', dateAdded: '2024-01-22', price: 429, imageUrl: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?auto=format&fit=crop&q=80&w=400' },
  { id: 'toy-14', name: 'Gaming Laptop', brand: 'Razer', color: 'Black', description: 'Blade 15 Advanced.', category: Category.ELECTRONICS, storageLocation: 'Office', dateAdded: '2024-03-05', price: 2400, imageUrl: 'https://images.unsplash.com/photo-1593642702821-c8da6771f0c6?auto=format&fit=crop&q=80&w=400' },
  { id: 'toy-15', name: 'Screwdriver Set', brand: 'Wera', color: 'Green/Black', description: 'Kraftform Kompakt 25.', category: Category.TOOLS, storageLocation: 'Garage', dateAdded: '2023-11-28', price: 55, imageUrl: 'https://images.unsplash.com/photo-1530124560676-4fbc91bcb833?auto=format&fit=crop&q=80&w=400' },
  { id: 'toy-16', name: 'Backpack', brand: 'Peak Design', color: 'Charcoal', description: 'Everyday Backpack 20L.', category: Category.OTHER, storageLocation: 'Hallway Closet', dateAdded: '2024-02-02', price: 279, imageUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&q=80&w=400' },
  { id: 'toy-17', name: 'Sunglasses', brand: 'Ray-Ban', color: 'Gold', description: 'Aviator Classic.', category: Category.CLOTHES, storageLocation: 'Entryway Table', dateAdded: '2023-08-14', price: 163, imageUrl: 'https://images.unsplash.com/photo-1511499767390-903390e6fbc4?auto=format&fit=crop&q=80&w=400' },
  { id: 'toy-18', name: 'Game Console', brand: 'Sony', color: 'White', description: 'PlayStation 5 Disk Edition.', category: Category.ELECTRONICS, storageLocation: 'Living Room', dateAdded: '2023-12-24', price: 499, imageUrl: 'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?auto=format&fit=crop&q=80&w=400' },
  { id: 'toy-19', name: 'Whey Protein', brand: 'Optimum Nutrition', color: 'Gold Standard', description: 'Chocolate 5lb tub.', category: Category.FOOD, storageLocation: 'Kitchen Pantry', dateAdded: '2024-03-10', price: 75, imageUrl: 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?auto=format&fit=crop&q=80&w=400' },
  { id: 'toy-20', name: 'Torque Wrench', brand: 'Tekton', color: 'Silver', description: '1/2 inch drive 10-150 ft-lb.', category: Category.TOOLS, storageLocation: 'Garage', dateAdded: '2023-10-30', price: 45, imageUrl: 'https://images.unsplash.com/photo-1581147036324-c17ac41dfa6c?auto=format&fit=crop&q=80&w=400' }
];

type ScreenType = 'dashboard' | 'inventory' | 'community';

const App: React.FC = () => {
  const [activeScreen, setActiveScreen] = useState<ScreenType>('dashboard');
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isAdding, setIsAdding] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [isEditingDetail, setIsEditingDetail] = useState(false);
  const [editBuffer, setEditBuffer] = useState<InventoryItem | null>(null);

  // Selection states
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());

  const [showSyncSuccess, setShowSyncSuccess] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [isFilterTrayOpen, setIsFilterTrayOpen] = useState(false);

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);

  const [pendingItems, setPendingItems] = useState<InventoryItem[]>([]);
  const [reviewPhoto, setReviewPhoto] = useState<string | null>(null);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: "Hello! I'm your Ownly Assistant. I've indexed your vault. How can I help you find or manage your belongings today?" }
  ]);
  const [chatInput, setChatInput] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  useEffect(() => {
    const init = async () => {
      const data = await loadInventory();
      if (data.length === 0) {
        setItems(INITIAL_TOYS);
        await saveInventory(INITIAL_TOYS);
      } else {
        setItems(data);
      }
    };
    init();
  }, []);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (item.brand || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = activeCategory === 'All' || item.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [items, searchQuery, activeCategory]);

  const latestItems = useMemo(() => {
    return [...items].slice(0, 2);
  }, [items]);

  const toggleItemSelection = (id: string) => {
    setSelectedItemIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkDelete = async () => {
    if (selectedItemIds.size === 0) return;
    const updated = items.filter(i => !selectedItemIds.has(i.id));
    setItems(updated);
    await saveInventory(updated);
    setSelectedItemIds(new Set());
    setIsSelectionMode(false);
    setShowSyncSuccess(true);
    setTimeout(() => setShowSyncSuccess(false), 3000);
  };

  const handleBulkShare = () => {
    if (selectedItemIds.size === 0) return;
    alert(`Sharing ${selectedItemIds.size} items with vault permissions...`);
    setSelectedItemIds(new Set());
    setIsSelectionMode(false);
  };

  const handleBulkSell = () => {
    if (selectedItemIds.size === 0) return;
    alert(`Listing ${selectedItemIds.size} items on the Community Trading Post...`);
    setSelectedItemIds(new Set());
    setIsSelectionMode(false);
    setActiveScreen('community');
  };

  /**
   * Crops an image from a base64 source using normalized coordinates [ymin, xmin, ymax, xmax] (0-1000).
   */
  const cropImage = (base64: string, box: number[]): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const [ymin, xmin, ymax, xmax] = box;
        
        const width = (xmax - xmin) / 1000 * img.width;
        const height = (ymax - ymin) / 1000 * img.height;
        const x = xmin / 1000 * img.width;
        const y = ymin / 1000 * img.height;

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject('No context');

        ctx.drawImage(img, x, y, width, height, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = reject;
      img.src = base64;
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setIsLoading(true);
    setLoadingStep('Analyzing scan...');
    
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const originalBase64 = reader.result as string;
        const base64DataOnly = originalBase64.split(',')[1];
        
        const detected = await analyzeStoragePhoto(base64DataOnly);
        
        const mapped: InventoryItem[] = await Promise.all(detected.map(async (d) => {
          let croppedUrl = originalBase64;
          if (d.box_2d && d.box_2d.length === 4) {
             try {
               croppedUrl = await cropImage(originalBase64, d.box_2d);
             } catch (e) {
               console.error("Cropping failed", e);
             }
          }

          return {
            id: crypto.randomUUID(),
            name: d.name || 'Object',
            brand: (d as any).brand || '',
            color: (d as any).color || '',
            size: (d as any).size || '',
            description: d.description || '',
            category: (d.category as any) || Category.OTHER,
            storageLocation: d.storageLocation || 'Main Closet',
            dateAdded: new Date().toLocaleDateString(),
            datePurchased: (d as any).datePurchased || '',
            price: d.price || 0,
            imageUrl: croppedUrl,
          };
        }));

        setPendingItems(mapped);
        setReviewPhoto(originalBase64);
        setIsReviewing(true);
        setIsAdding(false);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const saveBatch = async () => {
    const updated = [...pendingItems, ...items];
    setItems(updated);
    await saveInventory(updated);
    setIsReviewing(false);
    setPendingItems([]);
    setShowSyncSuccess(true);
    setTimeout(() => setShowSyncSuccess(false), 3000);
  };

  const handleChatSubmit = async (e?: React.FormEvent, overrideText?: string) => {
    e?.preventDefault();
    const messageToSend = overrideText || chatInput;
    if (!messageToSend.trim()) return;
    
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: messageToSend }]);
    setIsChatOpen(true);
    
    setIsLoading(true);
    try {
      const reply = await chatWithAssistant(messageToSend, items);
      setChatMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch (err) {
      setChatMessages(prev => [...prev, { role: 'assistant', content: "Vault link unstable." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const startEditing = () => {
    if (selectedItem) {
      setEditBuffer({ ...selectedItem });
      setIsEditingDetail(true);
    }
  };

  const saveEdit = async () => {
    if (editBuffer) {
      const updated = items.map(i => i.id === editBuffer.id ? editBuffer : i);
      setItems(updated);
      await saveInventory(updated);
      setSelectedItem(editBuffer);
      setIsEditingDetail(false);
      setEditBuffer(null);
      setShowSyncSuccess(true);
      setTimeout(() => setShowSyncSuccess(false), 3000);
    }
  };

  const chatSuggestions = [
    "I need some space, what are the things that I can drop",
    "Shall I buy any new stuff",
    "I wanna find my soccer ball, where is it"
  ];

  return (
    <div className="min-h-screen pb-12 bg-[#f4f7f8] text-slate-800 font-medium">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-teal-100 px-6 py-5 flex flex-col gap-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            {activeScreen !== 'dashboard' ? (
              <button onClick={() => { setActiveScreen('dashboard'); setIsSelectionMode(false); setSelectedItemIds(new Set()); }} className="p-3 bg-slate-100 rounded-2xl text-slate-600 active:scale-90 transition-all">
                <ChevronLeft size={24} strokeWidth={3} />
              </button>
            ) : (
              <OwnlyLogo />
            )}
            <div className="flex-1">
              <h1 className="text-3xl font-black tracking-tighter text-teal-900 leading-none">Ownly</h1>
              <p className="text-[10px] font-black text-teal-500 uppercase tracking-widest mt-1">Know what you own. Buy smarter. Live lighter.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => { setActiveScreen('dashboard'); setIsSelectionMode(false); setSelectedItemIds(new Set()); }} 
              className={`p-4 rounded-2xl transition-all active:scale-95 ${activeScreen === 'dashboard' ? 'bg-teal-600 text-white shadow-lg' : 'bg-teal-50 text-teal-600 hover:bg-teal-100'}`}
            >
              <Home size={22} strokeWidth={2.5} />
            </button>
            <button 
              onClick={() => { setActiveScreen('community'); setIsSelectionMode(false); setSelectedItemIds(new Set()); }} 
              className={`p-4 rounded-2xl transition-all active:scale-95 ${activeScreen === 'community' ? 'bg-teal-600 text-white shadow-lg' : 'bg-teal-50 text-teal-600 hover:bg-teal-100'}`}
            >
              <Store size={22} strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {activeScreen === 'inventory' && (
          <div className="flex items-center gap-3 animate-in fade-in duration-300">
            <div className="relative flex-1">
              <Search className="absolute left-0 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-6 pr-4 py-2 bg-transparent border-b border-slate-200 focus:border-teal-500 transition-all font-medium text-sm outline-none"
              />
            </div>
            
            <button 
              onClick={() => {
                setIsSelectionMode(!isSelectionMode);
                if (isSelectionMode) setSelectedItemIds(new Set());
              }} 
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isSelectionMode ? 'bg-teal-600 text-white shadow-lg' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
            >
              {isSelectionMode ? 'Done' : 'Select'}
            </button>

            <button onClick={() => setIsFilterTrayOpen(!isFilterTrayOpen)} className={`p-2 rounded-xl transition-all ${isFilterTrayOpen ? 'text-teal-600' : 'text-slate-400 hover:text-slate-600'}`}>
              <Filter size={18} />
            </button>
            <button onClick={() => setIsAdding(true)} className="p-2 text-teal-600 hover:text-teal-700 active:scale-95 transition-all">
              <Camera size={20} />
            </button>
          </div>
        )}

        {activeScreen === 'inventory' && isFilterTrayOpen && (
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 animate-in slide-in-from-top duration-300">
            {['All', ...Object.values(Category)].map(cat => (
              <button 
                key={cat} 
                onClick={() => setActiveCategory(cat)}
                className={`px-5 py-2.5 rounded-xl text-xs font-black whitespace-nowrap transition-all uppercase tracking-widest ${activeCategory === cat ? 'bg-teal-600 text-white shadow-lg shadow-teal-100' : 'bg-white border border-slate-200 text-slate-400'}`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* Floating Action Buttons */}
      {activeScreen === 'inventory' && !isSelectionMode && (
        <button 
          onClick={() => setIsAdding(true)}
          className="fixed bottom-8 right-8 z-40 bg-teal-600 text-white px-6 py-4 rounded-[2rem] shadow-2xl flex items-center gap-3 active:scale-90 transition-all hover:bg-teal-700 animate-in slide-in-from-bottom duration-500"
        >
          <Camera size={24} />
          <span className="font-black uppercase tracking-widest text-[10px]">Add new items</span>
        </button>
      )}

      {/* Multi-Action Bar for Selection */}
      {activeScreen === 'inventory' && isSelectionMode && selectedItemIds.size > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[45] bg-slate-900 text-white px-8 py-5 rounded-[2.5rem] shadow-2xl flex items-center gap-10 animate-in slide-in-from-bottom duration-300">
          <div className="flex items-center gap-3 border-r border-slate-700 pr-8">
             <span className="text-teal-400 font-black text-xl">{selectedItemIds.size}</span>
             <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Selected</span>
          </div>
          <div className="flex items-center gap-6">
            <button onClick={handleBulkShare} className="flex flex-col items-center gap-1 group">
              <div className="p-3 bg-white/10 rounded-2xl group-hover:bg-white/20 group-active:scale-90 transition-all">
                <Share2 size={20} />
              </div>
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Share</span>
            </button>
            <button onClick={handleBulkSell} className="flex flex-col items-center gap-1 group">
              <div className="p-3 bg-teal-600/50 text-teal-400 rounded-2xl group-hover:bg-teal-600 group-active:scale-90 transition-all">
                <ShoppingCart size={20} />
              </div>
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Sell</span>
            </button>
            <button onClick={handleBulkDelete} className="flex flex-col items-center gap-1 group">
              <div className="p-3 bg-red-600/50 text-red-400 rounded-2xl group-hover:bg-red-600 group-active:scale-90 transition-all">
                <Trash2 size={20} />
              </div>
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Purge</span>
            </button>
          </div>
          <button onClick={() => setSelectedItemIds(new Set())} className="ml-4 p-2 text-slate-500 hover:text-white transition-colors">
            <RotateCcw size={16} />
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <main className="p-6 max-w-5xl mx-auto">
        {activeScreen === 'dashboard' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom duration-700">
            <div className="bg-white rounded-[3rem] p-10 shadow-sm border border-slate-100 hover:shadow-2xl transition-all group relative overflow-hidden">
              <div onClick={() => setActiveScreen('inventory')} className="flex items-center justify-between mb-8 cursor-pointer">
                <div>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tighter mb-2">View/Edit/Find my belongings</h2>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-teal-500 rounded-full animate-pulse"></div>
                    <p className="text-xs font-black text-slate-600 uppercase tracking-tighter">{items.length} ITEMS Added</p>
                  </div>
                </div>
                <div className="p-5 bg-teal-50 text-teal-600 rounded-3xl group-hover:bg-teal-600 group-hover:text-white transition-all">
                  <ArrowRight size={28} strokeWidth={3} />
                </div>
              </div>

              <div className="bg-slate-50/50 rounded-[2.5rem] p-6 border border-slate-100">
                <div className="flex items-center gap-2 mb-4">
                  <Clock size={14} className="text-slate-400" />
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">RECENTLY ADDED</span>
                </div>
                <div className="flex flex-row gap-4 overflow-x-auto no-scrollbar">
                  {latestItems.map(item => (
                    <div key={item.id} onClick={() => { setSelectedItem(item); setActiveScreen('inventory'); }} className="flex-none w-48 bg-white p-3 rounded-2xl shadow-sm border border-slate-50 cursor-pointer hover:-translate-y-1 transition-transform">
                      <div className="aspect-square rounded-xl overflow-hidden bg-slate-100 mb-3">
                        <img src={item.imageUrl} className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-900 truncate">{item.name}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">{item.storageLocation}</p>
                      </div>
                    </div>
                  ))}
                  <div onClick={() => setIsAdding(true)} className="flex-none w-48 bg-teal-600 p-5 rounded-[2rem] shadow-xl border border-teal-500 cursor-pointer hover:bg-teal-700 transition-all flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-2 bg-white/20 rounded-xl"><Plus className="text-white" size={20} strokeWidth={3} /></div>
                      </div>
                      <h3 className="text-lg font-black text-white tracking-tighter mb-2 leading-tight">Add new items</h3>
                      <p className="text-[10px] font-bold text-teal-100">Capture and sync instantly</p>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-[9px] font-black text-white uppercase tracking-widest opacity-60">
                      <Camera size={12} /> Sync
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div onClick={() => setIsChatOpen(true)} className="bg-teal-600 rounded-[3rem] p-10 shadow-2xl shadow-teal-100 hover:-translate-y-1 transition-all cursor-pointer group relative overflow-hidden">
              <div className="absolute top-0 right-0 p-12 opacity-10 text-white"><BrainCircuit size={160} strokeWidth={1} /></div>
              <div className="flex items-center justify-between mb-8 relative z-10">
                <h2 className="text-3xl font-black text-white tracking-tighter mb-2">Talk to the Ownly Agent!</h2>
                <div className="p-5 bg-white/20 text-white rounded-3xl backdrop-blur-md group-hover:bg-white group-hover:text-teal-600 transition-all"><Mic size={28} strokeWidth={3} /></div>
              </div>
              <div className="space-y-3 relative z-10">
                <p className="text-[10px] font-black text-teal-200 uppercase tracking-widest mb-4">Sample Queries</p>
                {chatSuggestions.map((suggestion, idx) => (
                  <button key={idx} onClick={(e) => { e.stopPropagation(); handleChatSubmit(undefined, suggestion); }} className="w-full text-left bg-white/10 hover:bg-white/20 border border-white/20 p-4 rounded-2xl transition-all flex items-center justify-between">
                    <span className="text-xs font-bold text-white pr-4">{suggestion}</span>
                    <Sparkles size={14} className="text-teal-300" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeScreen === 'inventory' && (
          <div className="animate-in fade-in slide-in-from-right duration-500">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-1">MY INVENTORY</h2>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-teal-500 rounded-full animate-pulse"></div>
                  <p className="text-xs font-black text-slate-600 uppercase tracking-tighter">{filteredItems.length} ITEMS Added</p>
                </div>
              </div>
              <div className="flex bg-slate-200/40 p-1 rounded-2xl">
                <button onClick={() => setViewMode('grid')} className={`p-2.5 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-teal-600' : 'text-slate-400'}`}><Grid size={16} strokeWidth={2.5} /></button>
                <button onClick={() => setViewMode('list')} className={`p-2.5 rounded-xl transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-teal-600' : 'text-slate-400'}`}><ListIcon size={16} strokeWidth={2.5} /></button>
              </div>
            </div>

            <div className={viewMode === 'grid' ? "grid grid-cols-2 lg:grid-cols-3 gap-6 mb-24" : "space-y-4 mb-24"}>
              {filteredItems.map(item => {
                const isSelected = selectedItemIds.has(item.id);
                return (
                  <div 
                    key={item.id} 
                    onClick={() => {
                      if (isSelectionMode) toggleItemSelection(item.id);
                      else setSelectedItem(item);
                    }} 
                    className={`bg-white rounded-[2.5rem] border overflow-hidden shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all cursor-pointer group relative ${isSelected ? 'border-teal-500 ring-2 ring-teal-500/20' : 'border-slate-100'}`}
                  >
                    {isSelectionMode && (
                      <div className="absolute top-4 right-4 z-10">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${isSelected ? 'bg-teal-600 border-teal-600 text-white shadow-lg' : 'bg-white/80 backdrop-blur-md border-slate-300'}`}>
                          {isSelected && <Check size={16} strokeWidth={4} />}
                        </div>
                      </div>
                    )}

                    <div className="aspect-square bg-slate-50 relative overflow-hidden">
                      <img src={item.imageUrl} className={`w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 ${isSelected ? 'opacity-70' : ''}`} />
                      {!isSelectionMode && (
                        <div className="absolute top-4 left-4">
                          <span className="px-3 py-1 bg-white/90 backdrop-blur-md rounded-xl text-[9px] font-black text-teal-700 uppercase tracking-widest shadow-sm border border-teal-50">{item.category}</span>
                        </div>
                      )}
                    </div>
                    <div className="p-6">
                      <h3 className="font-black text-slate-900 text-base truncate">{item.name}</h3>
                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                          <MapPin size={12} className="text-teal-400" /> {item.storageLocation}
                        </div>
                        {item.price && <span className="text-[10px] font-black text-teal-600 bg-teal-50 px-2 py-0.5 rounded-lg">${item.price}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeScreen === 'community' && (
          <div className="animate-in fade-in slide-in-from-bottom duration-700">
            <div className="flex-1 p-12 text-center flex flex-col items-center justify-center space-y-10 min-h-[60vh] bg-white rounded-[4rem] shadow-sm border border-teal-50">
              <div className="relative">
                <div className="absolute -inset-8 bg-teal-100/50 rounded-full blur-3xl"></div>
                <div className="w-32 h-32 bg-teal-600 rounded-[3rem] flex items-center justify-center text-white shadow-2xl relative"><Store size={64} strokeWidth={2.5} /></div>
              </div>
              <div className="space-y-4 max-w-lg mx-auto">
                <h2 className="text-5xl font-black tracking-tighter text-slate-900 leading-none">Ownly Community</h2>
                <p className="text-[11px] font-black text-teal-600 uppercase tracking-[0.4em]">The Trading Post</p>
                <p className="text-slate-500 font-bold text-lg leading-relaxed pt-4">A hyper-local marketplace for items you no longer need. Swap, sell, or drop items directly into the hands of neighbors who value them.</p>
              </div>
              <div className="grid grid-cols-2 gap-4 w-full max-w-md pt-8">
                <div className="bg-slate-50 p-6 rounded-[2.5rem] border border-slate-100 text-left">
                  <TrendingUp className="text-teal-600 mb-3" size={24} /><p className="text-sm font-black text-slate-900">Live Value Tracking</p>
                </div>
                <div className="bg-slate-50 p-6 rounded-[2.5rem] border border-slate-100 text-left">
                  <Users className="text-teal-600 mb-3" size={24} /><p className="text-sm font-black text-slate-900">Direct Neighbor Trade</p>
                </div>
              </div>
              <button onClick={() => setActiveScreen('dashboard')} className="mt-8 px-12 py-5 bg-teal-600 text-white font-black rounded-3xl shadow-xl shadow-teal-100 active:scale-95 transition-all text-lg tracking-tight">Back to my belongings</button>
            </div>
          </div>
        )}
      </main>

      {/* AI Chat Modal */}
      {isChatOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white animate-in slide-in-from-right">
          <header className="p-6 border-b border-slate-100 flex items-center justify-between">
            <button onClick={() => setIsChatOpen(false)} className="p-2 text-slate-400"><ChevronLeft size={28} strokeWidth={3} /></button>
            <div className="text-center">
              <h2 className="text-xl font-black text-teal-600 flex items-center gap-2 tracking-tighter"><BrainCircuit size={20} /> Ownly AI</h2>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Neural Link Established</p>
            </div>
            <div className="w-10"></div>
          </header>
          <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
            {chatMessages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-5 rounded-[2rem] text-sm font-bold shadow-sm ${m.role === 'user' ? 'bg-teal-600 text-white rounded-tr-none' : 'bg-white text-slate-700 rounded-tl-none border border-slate-100'}`}>{m.content}</div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <form onSubmit={handleChatSubmit} className="p-6 border-t border-slate-100 flex items-center gap-3">
            <input value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Query your inventory..." className="flex-1 bg-slate-100 rounded-2xl py-5 px-6 font-bold text-sm border-none focus:ring-4 focus:ring-teal-100" />
            <button type="submit" disabled={!chatInput.trim()} className="p-5 bg-teal-600 text-white rounded-2xl transition-all"><Send size={20} /></button>
          </form>
        </div>
      )}

      {/* Add Modal */}
      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-8">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl" onClick={() => setIsAdding(false)} />
          <div className="relative bg-white w-full max-w-sm rounded-[4rem] p-12 text-center space-y-10 animate-in zoom-in-95 shadow-2xl">
            <div className="w-24 h-24 bg-teal-50 rounded-full flex items-center justify-center mx-auto text-teal-600"><Camera size={48} strokeWidth={2.5} /></div>
            <h3 className="text-4xl font-black text-slate-900 tracking-tighter">Add new items</h3>
            <button onClick={() => fileInputRef.current?.click()} className="w-full bg-teal-600 text-white font-black py-6 rounded-[2rem] shadow-xl text-xl tracking-tight active:scale-95 transition-all">Open Camera</button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
          </div>
        </div>
      )}

      {/* Loading Screen */}
      {isLoading && (
        <div className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-3xl flex flex-col items-center justify-center text-white text-center p-12">
          <Loader2 size={64} className="text-teal-400 animate-spin mb-8" />
          <h2 className="text-3xl font-black tracking-tighter mb-4 uppercase tracking-widest">Analyzing photo</h2>
          <p className="text-teal-500/60 font-black text-[10px] uppercase tracking-[0.6em] mb-12">{loadingStep}</p>
          <div className="flex flex-col gap-4 w-full max-w-xs">
            <button 
              onClick={() => { setIsLoading(false); fileInputRef.current?.click(); }}
              className="w-full bg-white text-slate-900 font-black py-4 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
              <RotateCcw size={18} /> Retake Photo
            </button>
            <button 
              onClick={() => setIsLoading(false)}
              className="text-slate-400 font-black text-xs uppercase tracking-widest hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Review Screen */}
      {isReviewing && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-white animate-in slide-in-from-bottom">
          <header className="p-6 border-b border-slate-100 flex items-center justify-between gap-4">
            <button onClick={() => setIsReviewing(false)} className="text-slate-400 shrink-0"><ChevronLeft size={28} /></button>
            <div className="text-center hidden sm:block">
              <h2 className="text-xl font-black tracking-tighter">New Entry</h2>
              <p className="text-[9px] font-black text-teal-600 uppercase tracking-widest">{pendingItems.length} OBJECTS FOUND</p>
            </div>
            <div className="flex items-center gap-2">
               <button 
                onClick={() => { setIsReviewing(false); setIsAdding(false); }}
                className="px-4 py-3 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-slate-600 transition-colors"
               >
                 Cancel
               </button>
               <button 
                onClick={() => { setIsReviewing(false); fileInputRef.current?.click(); }}
                className="px-4 py-3 bg-slate-100 text-slate-700 font-black rounded-2xl text-[10px] uppercase tracking-widest flex items-center gap-2 active:scale-95 transition-all"
               >
                 <RotateCcw size={14} /> Retake
               </button>
               <button onClick={saveBatch} className="bg-teal-600 text-white px-6 py-3 rounded-2xl font-black shadow-lg flex items-center gap-2 active:scale-95 transition-all">
                 <Check size={18} strokeWidth={3} /> Save Items
               </button>
            </div>
          </header>
          <div className="flex-1 overflow-y-auto bg-slate-50 p-6 space-y-8">
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center gap-3">
              <Sparkles className="text-amber-500" size={20} />
              <p className="text-[11px] font-black text-amber-700 uppercase tracking-widest">Please edit and save any missing info below</p>
            </div>
            <div className="rounded-[3rem] overflow-hidden shadow-xl aspect-video bg-slate-900 border-[8px] border-white">
              {reviewPhoto && <img src={reviewPhoto} className="w-full h-full object-contain opacity-80" />}
            </div>
            {pendingItems.map((item, idx) => (
              <div key={item.id} className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-200/50 space-y-6 relative overflow-hidden">
                <div className="flex flex-col md:flex-row gap-8">
                  {/* Cropped Item Preview */}
                  <div className="w-full md:w-1/3 aspect-square rounded-[2rem] overflow-hidden bg-slate-100 border border-slate-200">
                    <img src={item.imageUrl} className="w-full h-full object-cover" />
                  </div>

                  <div className="flex-1 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><Tag size={10} /> Name</label>
                        <input type="text" value={item.name} onChange={e => { const n = [...pendingItems]; n[idx].name = e.target.value; setPendingItems(n); }} className="w-full bg-slate-50 border-none rounded-xl py-3 px-4 font-black text-sm" placeholder="Enter name..." />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><Edit3 size={10} /> Brand</label>
                        <input type="text" value={item.brand} onChange={e => { const n = [...pendingItems]; n[idx].brand = e.target.value; setPendingItems(n); }} className="w-full bg-slate-50 border-none rounded-xl py-3 px-4 font-black text-sm" placeholder="Enter brand..." />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><ListIcon size={10} /> Description</label>
                      <textarea value={item.description} onChange={e => { const n = [...pendingItems]; n[idx].description = e.target.value; setPendingItems(n); }} className="w-full bg-slate-50 border-none rounded-xl py-3 px-4 font-bold text-sm h-20 resize-none" placeholder="Enter basic description..." />
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><Palette size={10} /> Color</label>
                        <input type="text" value={item.color} onChange={e => { const n = [...pendingItems]; n[idx].color = e.target.value; setPendingItems(n); }} className="w-full bg-slate-50 border-none rounded-xl py-3 px-4 font-black text-xs" placeholder="Color..." />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><Maximize2 size={10} /> Size</label>
                        <input type="text" value={item.size} onChange={e => { const n = [...pendingItems]; n[idx].size = e.target.value; setPendingItems(n); }} className="w-full bg-slate-50 border-none rounded-xl py-3 px-4 font-black text-xs" placeholder="Size..." />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><DollarSign size={10} /> Value</label>
                        <input type="number" value={item.price} onChange={e => { const n = [...pendingItems]; n[idx].price = parseFloat(e.target.value) || 0; setPendingItems(n); }} className="w-full bg-slate-50 border-none rounded-xl py-3 px-4 font-black text-xs" placeholder="Value..." />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><Calendar size={10} /> Date Purchased</label>
                        <input type="text" value={item.datePurchased} onChange={e => { const n = [...pendingItems]; n[idx].datePurchased = e.target.value; setPendingItems(n); }} className="w-full bg-slate-50 border-none rounded-xl py-3 px-4 font-black text-xs" placeholder="YYYY-MM-DD..." />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><MapPin size={10} /> Sector</label>
                      <input type="text" value={item.storageLocation} onChange={e => { const n = [...pendingItems]; n[idx].storageLocation = e.target.value; setPendingItems(n); }} className="w-full bg-slate-50 border-none rounded-xl py-3 px-4 font-bold text-sm" placeholder="Sector/Location..." />
                    </div>
                  </div>
                </div>

                {/* Drop Item button */}
                <button 
                  onClick={() => {
                    const next = [...pendingItems];
                    next.splice(idx, 1);
                    setPendingItems(next);
                    if (next.length === 0) setIsReviewing(false);
                  }}
                  className="absolute top-8 right-8 p-3 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all"
                  title="Drop this item"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            ))}
            <div className="h-20" />
          </div>
        </div>
      )}

      {/* Item Detail Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-3xl" onClick={() => { setSelectedItem(null); setIsEditingDetail(false); }} />
          <div className="relative bg-white w-full max-w-2xl rounded-[3.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95">
            <div className="p-8 border-b border-slate-50 flex items-center justify-between">
               <span className="bg-teal-50 text-teal-600 text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest">{selectedItem.category}</span>
               <div className="flex items-center gap-2">
                  {!isEditingDetail ? (
                    <><button onClick={startEditing} className="p-2 text-slate-400 hover:bg-slate-50 rounded-full transition-all"><Edit3 size={20} /></button><button className="p-2 text-slate-400 hover:bg-slate-50 rounded-full transition-all"><Share2 size={20} /></button></>
                  ) : (
                    <button onClick={saveEdit} className="p-2 text-teal-600 bg-teal-50 rounded-full transition-all flex items-center gap-2 px-4"><Save size={18} /> <span className="text-[10px] font-black uppercase tracking-widest">Save</span></button>
                  )}
                  <button onClick={() => { setSelectedItem(null); setIsEditingDetail(false); }} className="p-2 text-slate-300 hover:text-slate-600"><X size={24} /></button>
               </div>
            </div>
            <div className="flex-1 overflow-y-auto p-8 space-y-10 no-scrollbar">
              <div className="rounded-[2.5rem] overflow-hidden shadow-lg aspect-square border-[6px] border-white relative">
                 <img src={selectedItem.imageUrl} className="w-full h-full object-cover" />
                 {isEditingDetail && <div className="absolute inset-0 bg-black/10 flex items-center justify-center backdrop-blur-[2px]"><span className="bg-white/90 px-4 py-2 rounded-xl text-[10px] font-black text-slate-600 uppercase shadow-sm">Editing Metadata</span></div>}
              </div>
              <div className="space-y-4">
                {isEditingDetail && editBuffer ? (
                  <div className="space-y-4">
                    <input className="w-full bg-slate-50 border-none rounded-xl py-4 px-4 font-black text-2xl text-slate-900" value={editBuffer.name} onChange={e => setEditBuffer({...editBuffer, name: e.target.value})} />
                    <textarea className="w-full bg-slate-50 border-none rounded-xl py-4 px-4 font-bold text-sm" value={editBuffer.description} onChange={e => setEditBuffer({...editBuffer, description: e.target.value})} placeholder="Item description..." />
                  </div>
                ) : (
                  <><p className="text-sm font-black text-teal-500 uppercase tracking-widest">{selectedItem.brand || 'Original'}</p><h2 className="text-4xl font-black tracking-tighter text-slate-900 leading-none">{selectedItem.name}</h2><p className="text-slate-500 font-medium leading-relaxed italic">"{selectedItem.description || "Archived in vault."}"</p></>
                )}
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-50 p-5 rounded-[2rem] border border-slate-100"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1"><MapPin size={10} /> Sector</p><p className="text-slate-900 font-black text-sm truncate">{selectedItem.storageLocation}</p></div>
                <div className="bg-slate-50 p-5 rounded-[2rem] border border-slate-100"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1"><DollarSign size={10} /> Value</p><p className="text-slate-900 font-black text-sm">${selectedItem.price || '0.00'}</p></div>
                <div className="bg-slate-50 p-5 rounded-[2rem] border border-slate-100"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1"><Palette size={10} /> Color</p><p className="text-slate-900 font-black text-sm truncate">{selectedItem.color || 'N/A'}</p></div>
                <div className="bg-slate-50 p-5 rounded-[2rem] border border-slate-100"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1"><Tag size={10} /> Brand</p><p className="text-slate-900 font-black text-sm truncate">{selectedItem.brand || 'Original'}</p></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => { alert('Listing item for sale in Community...'); setSelectedItem(null); setActiveScreen('community'); }} className="py-5 bg-teal-600 text-white font-black rounded-[2.5rem] flex items-center justify-center gap-3 active:scale-95 transition-all shadow-lg"><DollarSign size={20} /> Sell Item</button>
                <button onClick={async () => { const updated = items.filter(i => i.id !== selectedItem.id); setItems(updated); await saveInventory(updated); setSelectedItem(null); }} className="py-5 bg-red-50 text-red-600 font-black rounded-[2.5rem] flex items-center justify-center gap-3 active:scale-95 transition-all"><Trash2 size={20} /> Drop Item</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showSyncSuccess && (
        <div className="fixed top-12 left-1/2 -translate-x-1/2 z-[100] bg-teal-600 text-white px-8 py-4 rounded-full shadow-2xl flex items-center gap-4 animate-in fade-in slide-in-from-top duration-300">
          <Zap size={20} fill="white" className="animate-bounce" />
          <span className="font-black uppercase tracking-widest text-xs">Neural Sync Successful</span>
        </div>
      )}

      <style>{`.no-scrollbar::-webkit-scrollbar { display: none; } .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }`}</style>
    </div>
  );
};

export default App;
