
import { InventoryItem } from "../types";

const STORAGE_KEY = 'omnivault_inventory';

export const saveInventory = (items: InventoryItem[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
};

export const loadInventory = (): InventoryItem[] => {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
};
