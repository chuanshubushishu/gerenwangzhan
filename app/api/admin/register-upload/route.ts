import { NextResponse } from "next/server";
import { addModel, withStatusLabel } from "@/lib/model-store";

export const runtime = "nodejs";

function checkPassword(password: unknown) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    throw new Error("服务器未配置管理密码。");
  }

  if (typeof password !== "string" || password !== expected) {
    throw new Error("管理密码不正确。");
  }
}

function isAllowedBlobUrl(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && parsed.hostname.endsWith(".blob.vercel-storage.com");
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      id?: string;
      fileName?: string;
      password?: string;
      url?: string;
    };

    checkPassword(body.password);

    if (!body.id || !body.fileName || !body.url) {
      return NextResponse.json({ error: "缺少模型信息。" }, { status: 400 });
    }

    if (!body.fileName.toLowerCase().endsWith(".ifc")) {
      return NextResponse.json({ error: "只能登记 IFC 模型。" }, { status: 400 });
    }

    if (!isAllowedBlobUrl(body.url)) {
      return NextResponse.json({ error: "模型文件地址不合法。" }, { status: 400 });
    }

    const now = new Date().toISOString();
    const model = withStatusLabel({
      id: body.id,
      fileName: body.fileName,
      fileType: "ifc",
      url: body.url,
      status: "ready",
      uploadedAt: now,
      updatedAt: now,
    });

    const library = await addModel(model);

    return NextResponse.json({ model, library });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "登记模型失败。" },
      { status: 500 },
    );
  }
}
