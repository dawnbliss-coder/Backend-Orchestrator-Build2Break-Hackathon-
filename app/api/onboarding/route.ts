import { NextResponse } from "next/server";
import { callGemini } from "@/lib/gemini";
import { dbPromise } from "@/lib/mongodb";
import pdf from "pdf-parse";

export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get("file") as File;
  const name = formData.get("employeeName") as string;
  
  const buffer = Buffer.from(await file.arrayBuffer());
  const data = await pdf(buffer);

  const prompt = `Create a 2-week onboarding plan for ${name} based on this resume: ${data.text.substring(0, 2000)}. Return ONLY a JSON array: [{"day": 1, "task": "...", "description": "..."}]`;

  const rawJson = await callGemini(prompt);
  const plan = JSON.parse(rawJson!.replace(/```json|```/g, ""));

  const db = await dbPromise;
  await db.collection("onboarding").insertOne({ employeeName: name, plan });

  return NextResponse.json({ success: true, plan });
}