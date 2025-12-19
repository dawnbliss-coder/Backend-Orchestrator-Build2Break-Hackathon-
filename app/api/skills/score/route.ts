import { NextResponse } from "next/server";
import { dbPromise } from "@/lib/mongodb"; // Ensure this points to your hr_portal db
import { callGemini } from "@/lib/gemini";
import PDFParser from "pdf2json";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const jd = formData.get("jd") as string;
    const resumeFile = formData.get("resume") as File;

    // 1. Extract Text from Resume PDF
    const buffer = Buffer.from(await resumeFile.arrayBuffer());
    const pdfParser = new (PDFParser as any)(null, 1);
    
    const resumeText: string = await new Promise((resolve, reject) => {
      pdfParser.on("pdfParser_dataError", (err: any) => reject(err));
      pdfParser.on("pdfParser_dataReady", () => resolve(pdfParser.getRawTextContent()));
      pdfParser.parseBuffer(buffer);
    });

    let cleanResume = "";
    try {
    cleanResume = decodeURIComponent(resumeText);
    } catch (e) {
    console.warn("URI Decoding failed for Resume, using fallback cleaning.");
    // Manual fallback for common PDF-to-JSON encodings
    cleanResume = resumeText
        .replace(/%20/g, " ")
        .replace(/%0A/g, "\n")
        .replace(/%2C/g, ",")
        .replace(/%([0-9A-F]{2})/g, " "); 
    }
    cleanResume = cleanResume.trim();

    // 2. Ask Gemini to Extract Name & Compare Skills
    const prompt = `
        Analyze this Resume against this Job Description (JD).
        
        JD: ${jd}
        Resume: ${cleanResume}

        Return ONLY a JSON object. Ensure all arrays exist even if empty:
        {
            "candidateName": "Full Name",
            "matchPercentage": number,
            "matchedSkills": [], 
            "missingSkills": [],
            "importantPoints": [],
            "summary": "string"
        }
    `;

    const aiResponse = (await callGemini(prompt, "gemini-2.0-flash")) as string;
    const jsonString = aiResponse.replace(/```json|```/g, "").trim();
    const analysis = JSON.parse(jsonString);

    // 3. Store in MongoDB
    const db = await dbPromise;
    const result = await db.collection("candidates").insertOne({
      ...analysis,
      rawResumeText: cleanResume,
      appliedFor: jd.substring(0, 100), // Store start of JD as reference
      createdAt: new Date(),
      fileName: resumeFile.name
    });

    return NextResponse.json({ 
      ...analysis, 
      databaseId: result.insertedId,
      success: true 
    });

  } catch (error: any) {
    console.error("SCORING ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}