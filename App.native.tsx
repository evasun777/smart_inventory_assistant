
import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  FlatList,
  Image,
  SafeAreaView,
  StatusBar,
  Modal,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { 
  Package, 
  Search, 
  Grid, 
  List as ListIcon, 
  Plus, 
  MessageSquare, 
  ShoppingCart, 
  Mic, 
  X, 
  Camera, 
  MapPin, 
  ChevronLeft, 
  Check, 
  Trash2, 
  Sparkles, 
  BrainCircuit, 
  Send,
  Zap,
  RotateCcw
} from 'lucide-react-native';
import { InventoryItem, Category, ChatMessage } from './types';
import { loadInventory, saveInventory } from './services/storageService.native';
import { analyzeStoragePhoto, getShoppingAdvice, chatWithAssistant } from './services/geminiService';

const { width } = Dimensions.get('window');

const AppNative = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  
  // Modals
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isAdvisorOpen, setIsAdvisorOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);

  // Review state
  const [pendingItems, setPendingItems] = useState<InventoryItem[]>([]);
  const [reviewPhoto, setReviewPhoto] = useState<string | null>(null);

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: "Hello! I'm your Ownly Assistant. I know everything in your vault. How can I help?" }
  ]);
  const [chatInput, setChatInput] = useState('');

  // Advisor state
  const [advisorPhoto, setAdvisorPhoto] = useState<string | null>(null);
  const [advisorAdvice, setAdvisorAdvice] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const data = await loadInventory();
      setItems(data);
    })();
  }, []);

  const handlePickImage = async (type: 'camera' | 'library', context: 'inventory' | 'advisor') => {
    const permission = type === 'camera' 
      ? await ImagePicker.requestCameraPermissionsAsync() 
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert("Permission Denied", "Camera/Gallery access is required.");
      return;
    }

    const result = type === 'camera'
      ? await ImagePicker.launchCameraAsync({ base64: true, quality: 0.5 })
      : await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.5 });

    if (!result.canceled && result.assets[0].base64) {
      const base64 = result.assets[0].base64;
      const uri = result.assets[0].uri;

      if (context === 'inventory') {
        processInventoryPhoto(base64, uri);
      } else {
        processAdvisorPhoto(base64, uri);
      }
    }
  };

  const processInventoryPhoto = async (base64: string, uri: string) => {
    setIsLoading(true);
    setLoadingStep('Accelerated Sync...');
    try {
      const detected = await analyzeStoragePhoto(base64);
      const mapped: InventoryItem[] = detected.map((d) => ({
        id: Math.random().toString(36).substr(2, 9),
        name: d.name || 'Object',
        brand: (d as any).brand || '',
        description: d.description || '',
        category: (d.category as any) || Category.OTHER,
        storageLocation: d.storageLocation || 'Sector A',
        dateAdded: new Date().toLocaleDateString(),
        price: d.price || 0,
        imageUrl: uri,
      }));
      setPendingItems(mapped);
      setReviewPhoto(uri);
      setIsReviewing(true);
      setIsAdding(false);
    } catch (err) {
      Alert.alert("AI Error", "Failed to analyze photo.");
    } finally {
      setIsLoading(false);
    }
  };

  const processAdvisorPhoto = async (base64: string, uri: string) => {
    setAdvisorPhoto(uri);
    setIsLoading(true);
    setLoadingStep('Checking Vault History...');
    try {
      const advice = await getShoppingAdvice(base64, items);
      setAdvisorAdvice(advice);
    } catch (err) {
      setAdvisorAdvice("Error communicating with Ownly AI.");
    } finally {
      setIsLoading(false);
    }
  };

  const saveBatch = async () => {
    const updated = [...pendingItems, ...items];
    setItems(updated);
    await saveInventory(updated);
    setIsReviewing(false);
    setPendingItems([]);
    Alert.alert("Success", "Vault updated.");
  };

  const sendMessage = async () => {
    if (!chatInput.trim()) return;
    const msg = chatInput;
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: msg }]);
    
    setIsLoading(true);
    try {
      const reply = await chatWithAssistant(msg, items);
      setChatMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch (err) {
      setChatMessages(prev => [...prev, { role: 'assistant', content: "Vault link unstable." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredItems = items.filter(i => 
    i.name.toLowerCase().includes(searchQuery.toLowerCase()) && 
    (selectedCategory === 'All' || i.category === selectedCategory)
  );

  const renderItem = ({ item }: { item: InventoryItem }) => (
    <TouchableOpacity 
      style={viewMode === 'grid' ? styles.gridCard : styles.listCard}
      onPress={() => setSelectedItem(item)}
    >
      <Image source={{ uri: item.imageUrl }} style={viewMode === 'grid' ? styles.gridImage : styles.listImage} />
      <View style={styles.cardContent}>
        <Text style={styles.itemCategory}>{item.category}</Text>
        <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
        <View style={styles.locationRow}>
          <MapPin size={12} color="#10b981" />
          <Text style={styles.locationText}>{item.storageLocation}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoRow}>
          <View style={styles.logoBox}>
            <Image source={{ uri: 'logo.png' }} style={styles.logoImage} />
          </View>
          <Text style={styles.logoText}>Ownly</Text>
        </View>
        <View style={styles.headerButtons}>
          <TouchableOpacity onPress={() => setIsChatOpen(true)} style={styles.iconBtn}>
            <MessageSquare size={20} color="#10b981" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setIsAdvisorOpen(true)} style={[styles.iconBtn, { backgroundColor: '#f0fdf4' }]}>
            <ShoppingCart size={20} color="#059669" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search & Categories */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Search size={18} color="#94a3b8" style={styles.searchIcon} />
          <TextInput 
            placeholder="Find belongings..." 
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
          {['All', ...Object.values(Category)].map(cat => (
            <TouchableOpacity 
              key={cat} 
              onPress={() => setSelectedCategory(cat)}
              style={[styles.catBtn, selectedCategory === cat && styles.catBtnActive]}
            >
              <Text style={[styles.catBtnText, selectedCategory === cat && styles.catBtnTextActive]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Inventory List */}
      <FlatList 
        data={filteredItems}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        numColumns={viewMode === 'grid' ? 2 : 1}
        key={viewMode}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Image source={{ uri: 'logo.png' }} style={{ width: 100, height: 100, opacity: 0.1, marginBottom: 20 }} />
            <Text style={styles.emptyText}>Vault is Empty</Text>
          </View>
        }
      />

      {/* Bottom FABs */}
      <View style={styles.fabDock}>
        <TouchableOpacity style={styles.voiceFab} onPress={() => setIsChatOpen(true)}>
          <Mic size={28} color="#10b981" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.addFab} onPress={() => setIsAdding(true)}>
          <Plus size={40} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Detail Modal */}
      {selectedItem && (
        <Modal animationType="slide" transparent={true}>
          <View style={styles.modalOverlay}>
            <View style={styles.detailContainer}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setSelectedItem(null)}><X size={24} color="#94a3b8"/></TouchableOpacity>
              </View>
              <Image source={{ uri: selectedItem.imageUrl }} style={styles.detailImage} />
              <View style={styles.detailBody}>
                <Text style={styles.detailBrand}>{selectedItem.brand || 'Archived'}</Text>
                <Text style={styles.detailName}>{selectedItem.name}</Text>
                <Text style={styles.detailDesc}>{selectedItem.description}</Text>
                <View style={styles.detailMetaGrid}>
                  <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>Sector</Text>
                    <Text style={styles.metaValue}>{selectedItem.storageLocation}</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>Added</Text>
                    <Text style={styles.metaValue}>{selectedItem.dateAdded}</Text>
                  </View>
                </View>
              </View>
              <TouchableOpacity 
                style={styles.deleteBtn}
                onPress={async () => {
                  const updated = items.filter(i => i.id !== selectedItem.id);
                  setItems(updated);
                  await saveInventory(updated);
                  setSelectedItem(null);
                }}
              >
                <Trash2 size={20} color="#ef4444" />
                <Text style={styles.deleteBtnText}>Purge from Vault</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#10b981" />
          <Text style={styles.loadingText}>Analyzing your belongings photo</Text>
          <View style={{ marginTop: 40, width: '80%', gap: 15 }}>
             <TouchableOpacity style={styles.retakeBtn} onPress={() => setIsLoading(false)}>
                <RotateCcw size={18} color="#000" />
                <Text style={{ fontWeight: '900', textTransform: 'uppercase', fontSize: 12 }}>Retake Photo</Text>
             </TouchableOpacity>
             <TouchableOpacity style={{ alignSelf: 'center' }} onPress={() => setIsLoading(false)}>
                <Text style={{ color: '#94a3b8', fontWeight: '900', textTransform: 'uppercase', fontSize: 10 }}>Cancel</Text>
             </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: '#fff' },
  logoRow: { flexDirection: 'row', alignItems: 'center' },
  logoBox: { width: 45, height: 45, borderRadius: 12, backgroundColor: '#fff', padding: 2, borderWidth: 1, borderColor: '#f0fdf4', justifyContent: 'center', alignItems: 'center' },
  logoImage: { width: '100%', height: '100%', borderRadius: 10 },
  logoText: { fontSize: 24, fontWeight: '900', marginLeft: 10, letterSpacing: -1, color: '#064e3b' },
  headerButtons: { flexDirection: 'row', gap: 10 },
  iconBtn: { backgroundColor: '#f1f5f9', padding: 12, borderRadius: 15 },
  searchContainer: { padding: 20, backgroundColor: '#fff' },
  searchInputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9', borderRadius: 15, paddingHorizontal: 15 },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, height: 50, fontWeight: '700' },
  catScroll: { marginTop: 15 },
  catBtn: { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: '#fff', borderRadius: 12, marginRight: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  catBtnActive: { backgroundColor: '#10b981', borderColor: '#10b981' },
  catBtnText: { fontSize: 10, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase' },
  catBtnTextActive: { color: '#fff' },
  listContent: { padding: 15 },
  gridCard: { width: (width - 45) / 2, backgroundColor: '#fff', borderRadius: 25, marginBottom: 15, marginRight: 15, overflow: 'hidden', elevation: 2 },
  gridImage: { width: '100%', height: 150 },
  cardContent: { padding: 15 },
  itemCategory: { fontSize: 8, fontWeight: '900', color: '#10b981', textTransform: 'uppercase', marginBottom: 5 },
  itemName: { fontSize: 14, fontWeight: '900' },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginTop: 5, gap: 4 },
  locationText: { fontSize: 10, color: '#94a3b8', fontWeight: '800' },
  fabDock: { position: 'absolute', bottom: 30, width: '100%', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 20 },
  voiceFab: { backgroundColor: '#fff', width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 10 },
  addFab: { backgroundColor: '#10b981', width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', elevation: 15 },
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyText: { color: '#cbd5e1', fontWeight: '900', marginTop: 20, fontSize: 18 },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center', alignItems: 'center', zIndex: 100, padding: 40 },
  loadingText: { color: '#fff', fontWeight: '900', marginTop: 20, textTransform: 'uppercase', textAlign: 'center', letterSpacing: 1 },
  retakeBtn: { backgroundColor: '#fff', padding: 18, borderRadius: 20, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, width: '100%' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  detailContainer: { backgroundColor: '#fff', borderTopLeftRadius: 40, borderTopRightRadius: 40, padding: 30, height: '85%' },
  modalHeader: { alignItems: 'flex-end', marginBottom: 10 },
  detailImage: { width: '100%', height: 300, borderRadius: 30 },
  detailBody: { marginTop: 25 },
  detailBrand: { color: '#10b981', fontWeight: '900', fontSize: 12, textTransform: 'uppercase', marginBottom: 5 },
  detailName: { fontSize: 32, fontWeight: '900', letterSpacing: -1 },
  detailDesc: { color: '#64748b', fontSize: 16, marginTop: 10, lineHeight: 24 },
  detailMetaGrid: { flexDirection: 'row', gap: 15, marginTop: 25 },
  metaItem: { flex: 1, backgroundColor: '#f8fafc', padding: 20, borderRadius: 25 },
  metaLabel: { fontSize: 10, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase' },
  metaValue: { fontSize: 18, fontWeight: '900', marginTop: 5 },
  deleteBtn: { marginTop: 'auto', padding: 20, backgroundColor: '#fef2f2', borderRadius: 20, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
  deleteBtnText: { color: '#ef4444', fontWeight: '900', fontSize: 16 }
});

export default AppNative;
