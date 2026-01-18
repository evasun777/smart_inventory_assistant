
import { GoogleGenAI, Type } from "@google/genai";
import { InventoryItem, Category } from "../types";

const API_KEY = process.env.API_KEY || '';

export const analyzeStoragePhoto = async (base64Image: string): Promise<Partial<InventoryItem>[]> => {
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  const allowedCategories = Object.values(Category).join(", ");
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [
      {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Image,
            },
          },
          {
            text: `Analyze this photo of storage. Identify every distinct item. 
            For each item, return a JSON object with:
            - 'name': specific name
            - 'brand': brand name (if visible)
            - 'color': primary color
            - 'size': dimensions or size (S/M/L or cm/in)
            - 'description': short detail
            - 'category': MUST be exactly one of: [${allowedCategories}]
            - 'price': estimated numeric value
            - 'storageLocation': where it is in the photo
            - 'datePurchased': YYYY-MM-DD (estimate if unknown)
            - 'expiryDate': YYYY-MM-DD (if applicable)
            
            Return ONLY a JSON array.`,
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
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
            datePurchased: { type: Type.STRING },
            expiryDate: { type: Type.STRING },
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
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  const inventorySummary = currentInventory
    .map(i => `${i.brand || ''} ${i.name} (${i.color || ''})`)
    .slice(0, 20) // Limit to avoid token issues
    .join(', ');

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [
      {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Image,
            },
          },
          {
            text: `The user wants to buy this. They already have: [${inventorySummary}]. Should they buy it? Be decisive and helpful.`,
          },
        ],
      },
    ],
  });

  return response.text || "I'm not sure. Check your vault manually!";
};

export const chatWithAssistant = async (query: string, inventory: InventoryItem[]): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  const context = inventory.map(i => `${i.name} (${i.category}) in ${i.storageLocation}`).join("\n");

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Inventory:\n${context}\n\nUser Question: ${query}\n\nYou are OmniVault AI. Answer based on the inventory list provided above.`,
  });

  return response.text || "I don't have enough info to answer that.";
};
