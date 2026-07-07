import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    { error: "This app now uses direct IFC upload and no longer needs Autodesk APS." },
    { status: 410 },
  );
}
