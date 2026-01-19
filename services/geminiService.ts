import { GoogleGenAI, Type } from "@google/genai";
import { InventoryItem, Category } from "../types";

// Always obtain the API key exclusively from the environment variable process.env.API_KEY.
// Initialization should occur right before making a call to ensure the latest config is used.

export const analyzeStoragePhoto = async (base64Image: string): Promise<Partial<InventoryItem>[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const allowedCategories = Object.values(Category).join(", ");
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: base64Image,
          },
        },
        {
          text: `Detect all items. Return JSON array: [{name, brand, color, size, description, category, price, storageLocation}]. Categories: [${allowedCategories}].`,
        },
      ],
    },
    config: {
      responseMimeType: "application/json",
      thinkingConfig: { thinkingBudget: 0 },
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            brand: { type: Type.STRING },
            color: { type: Type.STRING },
            size: { type: Type.STRING },
            description: { type: Type.STRING },
            category: { type: Type.STRING },
            price: { type: Type.NUMBER },
            storageLocation: { type: Type.STRING },
          },
          required: ["name", "category"],
        },
      },
    },
  });

  try {
    const text = response.text || "[]";
    return JSON.parse(text);
  } catch (e) {
    console.error("Failed to parse AI response", e);
    return [];
  }
};

export const getShoppingAdvice = async (base64Image: string, currentInventory: InventoryItem[]): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const inventorySummary = currentInventory
    .map(i => `${i.brand || ''} ${i.name}`)
    .slice(0, 40)
    .join(', ');

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: base64Image,
          },
        },
        {
          text: `User owns: [${inventorySummary}]. Should they buy this? 1-sentence sharp advice.`,
        },
      ],
    },
    config: {
      thinkingConfig: { thinkingBudget: 0 }
    }
  });

  return response.text || "Unsure. Check vault.";
};

export const chatWithAssistant = async (query: string, inventory: InventoryItem[]): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const context = inventory.map(i => `${i.name} (${i.category}) in ${i.storageLocation}`).join("\n");

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Inventory:\n${context}\n\nUser Question: ${query}\n\nYou are Ownly AI. Accurate, short answers only.`,
    config: {
      thinkingConfig: { thinkingBudget: 0 }
    }
  });

  return response.text || "Insufficient data.";
};