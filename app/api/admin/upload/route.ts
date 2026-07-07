import { NextResponse } from "next/server";
import { addModel, saveUploadedModelFile, withStatusLabel } from "@/lib/model-store";

export const runtime = "nodejs";

const maxUploadSize = 200 * 1024 * 1024;

function checkUploadPassword(password: FormDataEntryValue | null) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    throw new Error("服务器未配置上传密码。");
  }

  if (typeof password !== "string" || password !== expected) {
    throw new Error("上传密码不正确。");
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    checkUploadPassword(formData.get("password"));

    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "请选择一个 .ifc 文件。" }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith(".ifc")) {
      return NextResponse.json({ error: "只能上传 IFC 模型文件。" }, { status: 400 });
    }

    if (file.size > maxUploadSize) {
      return NextResponse.json({ error: "文件太大，最大只能上传 200MB。" }, { status: 400 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const savedFile = await saveUploadedModelFile(file.name, bytes);

    const now = new Date().toISOString();
    const model = withStatusLabel({
      id: savedFile.id,
      fileName: file.name,
      fileType: "ifc",
      url: savedFile.url,
      status: "ready",
      uploadedAt: now,
      updatedAt: now,
    });

    const library = await addModel(model);

    return NextResponse.json({ model, library });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "上传失败。" },
      { status: 500 },
    );
  }
}
