import { get } from "@vercel/blob";
import { NextResponse } from "next/server";
import { getModelLibrary } from "@/lib/model-store";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const library = await getModelLibrary();
  const model = library.models.find((item) => item.id === id);

  if (!model) {
    return NextResponse.json({ error: "模型不存在。" }, { status: 404 });
  }

  if (!model.url.includes(".blob.vercel-storage.com")) {
    return NextResponse.redirect(new URL(model.url, _request.url));
  }

  const result = await get(model.url, { access: "private" });

  if (!result?.stream) {
    return NextResponse.json({ error: "模型文件不存在。" }, { status: 404 });
  }

  return new Response(result.stream, {
    headers: {
      "Cache-Control": "public, max-age=3600",
      "Content-Disposition": `inline; filename="${encodeURIComponent(model.fileName)}"`,
      "Content-Type": result.blob.contentType ?? "application/octet-stream",
    },
  });
}
