
export interface InventoryItem {
  id: string;
  name: string;
  description: string;
  category: string;
  storageLocation: string;
  dateAdded: string;
  expiryDate?: string;
  price?: number;
  imageUrl?: string;
  isDuplicate?: boolean;
}

export type ViewMode = 'grid' | 'list';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export enum Category {
  FOOD = 'Food',
  CLOTHES = 'Clothes',
  GYM = 'Gym',
  TOOLS = 'Tools',
  ELECTRONICS = 'Electronics',
  OTHER = 'Other'
}
