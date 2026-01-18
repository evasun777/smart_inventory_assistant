
import { GoogleGenAI, Type } from "@google/genai";
import { InventoryItem } from "../types";

const API_KEY = process.env.API_KEY || '';

export const analyzeStoragePhoto = async (base64Image: string): Promise<Partial<InventoryItem>[]> => {
  const ai = new GoogleGenAI({ apiKey: API_KEY });
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
            text: "Analyze this photo of a storage box or area. Identify all distinct items inside. Return a JSON array of objects with the following keys: 'name', 'description', 'category' (one of: Food, Clothes, Gym, Tools, Electronics, Other), 'estimatedPrice' (numeric), and 'storageLocation' (based on context of photo or box label).",
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
            description: { type: Type.STRING },
            category: { type: Type.STRING },
            estimatedPrice: { type: Type.NUMBER },
            storageLocation: { type: Type.STRING },
          },
          required: ["name", "category"],
        },
      },
    },
  });

  try {
    return JSON.parse(response.text || "[]");
  } catch (e) {
    console.error("Failed to parse AI response", e);
    return [];
  }
};

export const getShoppingAdvice = async (base64Image: string, currentInventory: InventoryItem[]): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  const inventorySummary = currentInventory
    .map(i => `${i.name} (${i.category}) in ${i.storageLocation}`)
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
            text: `The user is considering buying the item in this photo. Based on their current inventory: [${inventorySummary}], should they buy it? If they have something similar, tell them where it is. If it's a good addition, explain why. Keep it concise and helpful.`,
          },
        ],
      },
    ],
  });

  return response.text || "I'm not sure, but checking your inventory is always a good idea!";
};

export const chatWithAssistant = async (query: string, inventory: InventoryItem[]): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  const inventoryContext = JSON.stringify(inventory.map(i => ({
    name: i.name,
    location: i.storageLocation,
    cat: i.category,
    added: i.dateAdded
  })));

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `User Query: "${query}"\n\nInventory Data: ${inventoryContext}\n\nYou are a helpful home inventory assistant. Answer questions about where things are, suggest what to declutter (oldest items), or find items by description.`,
  });

  return response.text || "I couldn't find an answer to that.";
};
