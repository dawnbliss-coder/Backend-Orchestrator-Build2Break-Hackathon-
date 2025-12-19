import { NextResponse } from "next/server";
import { dbPromise } from "@/lib/mongodb";
import { callGemini } from "@/lib/gemini";
import { ObjectId } from "mongodb";

export async function POST(req: Request) {
  try {
    const { candidateId } = await req.json();
    const db = await dbPromise;

    // 1. Fetch the candidate data from your "candidates" collection
    const candidate = await db.collection("candidates").findOne({ 
        _id: new ObjectId(candidateId) 
    });

    if (!candidate) return NextResponse.json({ error: "Candidate not found" }, { status: 404 });

    // 2. Ask Gemini to create a learning path based on their missing skills
    const prompt = `
      Create a 30-day onboarding training plan for a new hire named ${candidate.candidateName}.
      
      Position: ${candidate.appliedFor}
      Skills they already have: ${candidate.matchedSkills?.join(", ")}
      SKILL GAPS TO ADDRESS: ${candidate.missingSkills?.join(", ")}

      Return the response in JSON format:
      {
        "planTitle": "string",
        "weeks": [
          { "week": 1, "focus": "string", "tasks": ["task1", "task2"] },
          { "week": 2, "focus": "string", "tasks": ["task1", "task2"] },
          { "week": 3, "focus": "string", "tasks": ["task1", "task2"] },
          { "week": 4, "focus": "string", "tasks": ["task1", "task2"] }
        ]
      }
    `;

    const aiResponse = (await callGemini(prompt, "gemini-2.0-flash")) as string;
    const cleanJson = aiResponse.replace(/```json|```/g, "").trim();
    const roadmap = JSON.parse(cleanJson);

    return NextResponse.json(roadmap);

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}