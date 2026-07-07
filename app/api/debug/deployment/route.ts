import { NextResponse } from "next/server";
import { isBlobStorageConfigured, isVercelDeployment } from "@/lib/model-store";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    commit: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
    deploymentId: process.env.VERCEL_DEPLOYMENT_ID ?? null,
    hasAdminPassword: Boolean(process.env.ADMIN_PASSWORD),
    hasBlobStoreId: Boolean(process.env.BLOB_STORE_ID),
    hasBlobWebhookPublicKey: Boolean(process.env.BLOB_WEBHOOK_PUBLIC_KEY),
    hasBlobReadWriteToken: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
    hasVercelOidcToken: Boolean(process.env.VERCEL_OIDC_TOKEN),
    isBlobStorageConfigured: isBlobStorageConfigured(),
    isVercelDeployment: isVercelDeployment(),
    vercelEnv: process.env.VERCEL_ENV ?? null,
  });
}
