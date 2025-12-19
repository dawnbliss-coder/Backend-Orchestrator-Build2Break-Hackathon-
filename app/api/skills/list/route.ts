import { NextResponse } from "next/server";
import { dbPromise } from "@/lib/mongodb";

export async function GET() {
  try {
    const db = await dbPromise;
    // Fetch latest candidates first
    const candidates = await db.collection("candidates")
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json(candidates);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}