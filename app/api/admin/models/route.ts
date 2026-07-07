import { NextResponse } from "next/server";
import { deleteModel, getModelLibrary, setActiveModel } from "@/lib/model-store";

export const runtime = "nodejs";

function checkAdminPassword(password: unknown) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    throw new Error("服务器未配置管理密码。");
  }

  if (typeof password !== "string" || password !== expected) {
    throw new Error("管理密码不正确。");
  }
}

export async function GET() {
  const library = await getModelLibrary();
  return NextResponse.json({ library });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      action?: "set-active" | "delete";
      modelId?: string;
      password?: string;
    };

    checkAdminPassword(body.password);

    if (!body.modelId) {
      return NextResponse.json({ error: "缺少模型 ID。" }, { status: 400 });
    }

    if (body.action === "set-active") {
      const library = await setActiveModel(body.modelId);
      return NextResponse.json({ library });
    }

    if (body.action === "delete") {
      const library = await deleteModel(body.modelId);
      return NextResponse.json({ library });
    }

    return NextResponse.json({ error: "未知操作。" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "操作失败。" },
      { status: 500 },
    );
  }
}
