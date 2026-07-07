import { NextResponse } from "next/server";
import { getCurrentModel, getModelLibrary } from "@/lib/model-store";

export async function GET() {
  const model = await getCurrentModel();
  const library = await getModelLibrary();
  return NextResponse.json({
    available: Boolean(model),
    model,
    library,
  });
}
