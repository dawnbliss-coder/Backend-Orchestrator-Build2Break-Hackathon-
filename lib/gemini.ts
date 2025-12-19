import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function callGemini(content: string, modelName: string) {
  try {
    // 1. Check if we are doing an embedding or a text generation
    if (modelName === "text-embedding-004") {
      const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
      const result = await model.embedContent(content);
      return result.embedding.values;
    }

    // 2. For Chat/Text generation
    // IMPORTANT: Use gemini-1.5-flash here
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(content);
    const response = await result.response;
    return response.text();

  } catch (error) {
    console.error("GEMINI API ERROR:", error);
    throw error;
  }
}