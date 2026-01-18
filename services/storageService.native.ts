
import AsyncStorage from '@react-native-async-storage/async-storage';
import { InventoryItem } from "../types";

const STORAGE_KEY = '@ownly_inventory_data';

export const saveInventory = async (items: InventoryItem[]) => {
  try {
    const jsonValue = JSON.stringify(items);
    await AsyncStorage.setItem(STORAGE_KEY, jsonValue);
  } catch (e) {
    console.error("Native Save Error", e);
  }
};

export const loadInventory = async (): Promise<InventoryItem[]> => {
  try {
    const jsonValue = await AsyncStorage.getItem(STORAGE_KEY);
    return jsonValue != null ? JSON.parse(jsonValue) : [];
  } catch (e) {
    console.error("Native Load Error", e);
    return [];
  }
};

export const clearAllData = async () => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error("Native Clear Error", e);
  }
};
