import { NextResponse } from "next/server";
import { getCurrentModel, getModelLibrary } from "@/lib/model-store";

export const runtime = "nodejs";

export async function GET() {
  const model = await getCurrentModel();
  const library = await getModelLibrary();
  return NextResponse.json({ model, library });
}
