import { NextResponse } from "next/server";
import { dbPromise } from "@/lib/mongodb";
import { callGemini } from "@/lib/gemini";
import PDFParser from "pdf2json";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const buffer = Buffer.from(await file.arrayBuffer());

    // 1. Parse PDF
    const pdfParser = new (PDFParser as any)(null, 1);
    const extractedText: string = await new Promise((resolve, reject) => {
      pdfParser.on("pdfParser_dataError", (err: any) => reject(err));
      pdfParser.on("pdfParser_dataReady", () => resolve(pdfParser.getRawTextContent()));
      pdfParser.parseBuffer(buffer);
    });

    // 2. Safe URI Decoding (Fixes the URI malformed error)
    let cleanText = "";
    try {
      cleanText = decodeURIComponent(extractedText);
    } catch (e) {
      cleanText = extractedText.replace(/%([0-9A-F]{2})/g, " ");
    }
    cleanText = cleanText.replace(/\s+/g, " ").trim();

    // 3. Generate a quick Summary using Gemini
    const summaryPrompt = `Summarize this HR policy document in exactly two professional sentences for a dashboard preview: ${cleanText.substring(0, 4000)}`;
    const summary = await callGemini(summaryPrompt, "gemini-2.0-flash");

    // 4. Generate Embedding for Vector Search
    const embedding = await callGemini(cleanText.substring(0, 3000), "text-embedding-004");

    // 5. Save to MongoDB
    const db = await dbPromise;
    await db.collection("policies").insertOne({
      fileName: file.name,
      text: cleanText,
      summary: summary,
      embedding: embedding,
      createdAt: new Date(),
    });

    return NextResponse.json({ success: true, summary: summary });

  } catch (error: any) {
    console.error("Upload Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}