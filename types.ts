
export interface InventoryItem {
  id: string;
  name: string;
  description: string;
  category: string;
  storageLocation: string;
  dateAdded: string;
  expiryDate?: string;
  datePurchased?: string;
  price?: number;
  imageUrl?: string;
  isDuplicate?: boolean;
  color?: string;
  size?: string;
  brand?: string;
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
