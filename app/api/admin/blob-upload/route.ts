import { issueSignedToken } from "@vercel/blob";
import { handleUploadPresigned, type HandleUploadPresignedBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { addModel, withStatusLabel } from "@/lib/model-store";

export const runtime = "nodejs";

const maxUploadSize = 200 * 1024 * 1024;

type UploadPayload = {
  id: string;
  fileName: string;
  password: string;
};

function checkPassword(password: unknown) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    throw new Error("服务器未配置上传密码。");
  }

  if (typeof password !== "string" || password !== expected) {
    throw new Error("上传密码不正确。");
  }
}

function parsePayload(clientPayload: string | null): UploadPayload {
  if (!clientPayload) {
    throw new Error("缺少上传信息。");
  }

  const payload = JSON.parse(clientPayload) as UploadPayload;
  checkPassword(payload.password);

  if (!payload.fileName?.toLowerCase().endsWith(".ifc")) {
    throw new Error("只能上传 IFC 模型文件。");
  }

  if (!payload.id) {
    throw new Error("缺少模型 ID。");
  }

  return payload;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as HandleUploadPresignedBody;

    const jsonResponse = await handleUploadPresigned({
      body,
      request,
      getSignedToken: async (pathname, clientPayload) => {
        const payload = parsePayload(clientPayload);

        if (!pathname.startsWith(`uploads/model-${payload.id}-`) || !pathname.toLowerCase().endsWith(".ifc")) {
          throw new Error("上传路径不合法。");
        }

        return {
          token: await issueSignedToken({
            allowedContentTypes: ["application/octet-stream"],
            maximumSizeInBytes: maxUploadSize,
            operations: ["put"],
            pathname,
          }),
          urlOptions: {
            addRandomSuffix: false,
            allowOverwrite: true,
            contentType: "application/octet-stream",
            tokenPayload: JSON.stringify({ id: payload.id, fileName: payload.fileName }),
          },
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        if (!tokenPayload) return;

        const payload = JSON.parse(tokenPayload) as Pick<UploadPayload, "id" | "fileName">;
        const now = new Date().toISOString();
        const model = withStatusLabel({
          id: payload.id,
          fileName: payload.fileName,
          fileType: "ifc",
          url: blob.url,
          status: "ready",
          uploadedAt: now,
          updatedAt: now,
        });

        await addModel(model);
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "上传失败。" },
      { status: 400 },
    );
  }
}
