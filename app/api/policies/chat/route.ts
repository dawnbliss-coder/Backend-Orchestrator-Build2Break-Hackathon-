import { NextResponse } from "next/server";
import { dbPromise } from "@/lib/mongodb";
import { callGemini } from "@/lib/gemini";

export async function POST(req: Request) {
  try {
    const { question, history = [] } = await req.json();
    const db = await dbPromise;

    // 1. Contextualize the search query
    // This turns "how do I apply?" into "How do I apply for the parental leave policy?"
    let searchQuery = question;
    if (history.length > 0) {
      const historySummary = history.slice(-3).map((m: any) => m.content).join(" ");
      const reformulatePrompt = `Based on this chat history: "${historySummary}", rewrite this user question into a standalone HR search query: "${question}"`;
      searchQuery = await callGemini(reformulatePrompt, "gemini-2.0-flash");
    }

    // 2. Vector Search
    const questionEmbedding = await callGemini(searchQuery, "text-embedding-004");
    
    const pipeline = [
      {
        $vectorSearch: {
          index: "vector_index", 
          path: "embedding",
          queryVector: questionEmbedding,
          numCandidates: 10,
          limit: 3,
        },
      },
      {
        $project: {
          _id: 0,
          text: 1,
          score: { $meta: "vectorSearchScore" },
        },
      },
    ];

    const results = await db.collection("policies").aggregate(pipeline).toArray() as any[];
    const contextText = results.filter(doc => doc.text).map(doc => doc.text).join("\n\n");

    if (!contextText && history.length === 0) {
        return NextResponse.json({ answer: "I couldn't find any specific policy matches for that." });
    }

    // 3. Final Answer
    const prompt = `
      You are an HR Assistant. Use the provided Policy Context to answer the user's question.
      If the answer isn't in the context, use your general knowledge but mention it's not in the official policy.

      Policy Context:
      ${contextText}

      User Question: ${question}
    `;

    const answer = await callGemini(prompt, "gemini-2.0-flash");
    return NextResponse.json({ answer });

  } catch (error: any) {
    console.error("CHAT ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}