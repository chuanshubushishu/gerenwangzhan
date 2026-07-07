"use client";

import { upload } from "@vercel/blob/client";
import { FormEvent, useMemo, useState } from "react";
import type { ModelLibrary, StoredModel } from "@/lib/model-store";

type UploadResponse = {
  model?: StoredModel;
  library?: ModelLibrary;
  error?: string;
};

type LibraryResponse = {
  library?: ModelLibrary;
  error?: string;
};

type AdminUploaderProps = {
  library: ModelLibrary;
  directBlobUpload: boolean;
  requiresBlobStorage: boolean;
  isVercelDeployment: boolean;
  compact?: boolean;
  title?: string;
  description?: string;
  onLibraryChange?: (library: ModelLibrary) => void;
};

const maxUploadSize = 200 * 1024 * 1024;
const blobSetupMessage =
  "线上 Vercel 上传需要先配置 Vercel Blob。请在 Vercel 项目里创建并连接 Blob Store，然后重新部署；否则大文件会被 Vercel 拦截。";
const blobDirectUploadMessage =
  "Vercel 线上直传失败。请确认 Blob Store 已连接到当前项目，并且 BLOB_STORE_ID、BLOB_WEBHOOK_PUBLIC_KEY 环境变量已在最新 Production 部署中生效。";

function safeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_+$/g, "") || "model.ifc";
}

async function fetchLatestLibrary() {
  const response = await fetch("/api/admin/models");
  const data = await readJsonResponse<LibraryResponse>(response, "无法刷新模型库。");

  if (!response.ok || data.error || !data.library) {
    throw new Error(data.error ?? "无法刷新模型库。");
  }

  return data.library;
}

async function readJsonResponse<T>(response: Response, fallbackMessage: string): Promise<T> {
  const text = await response.text();

  try {
    return JSON.parse(text) as T;
  } catch {
    if (response.status === 413 || text.toLowerCase().includes("request entity too large")) {
      throw new Error(blobSetupMessage);
    }

    throw new Error(text.trim() || fallbackMessage);
  }
}

export function AdminUploader({
  library,
  directBlobUpload,
  requiresBlobStorage,
  isVercelDeployment,
  compact = false,
  title = "上传 IFC 模型",
  description = "选择从 Revit 导出的 .ifc 文件，网站会保存到模型库中。每次上传都会新增一个模型，不会覆盖旧模型。",
  onLibraryChange,
}: AdminUploaderProps) {
  const [password, setPassword] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeModel = useMemo(
    () => library.models.find((model) => model.id === library.activeModelId) ?? library.models[0] ?? null,
    [library],
  );

  const progress = isUploading ? uploadProgress || 20 : activeModel?.status === "ready" || activeModel?.status === "failed" ? 100 : 0;

  async function uploadThroughServer(selectedFile: File) {
    const body = new FormData();
    body.append("password", password);
    body.append("file", selectedFile);

    const response = await fetch("/api/admin/upload", {
      method: "POST",
      body,
    });
    const data = await readJsonResponse<UploadResponse>(response, "上传失败。");

    if (!response.ok || data.error) {
      throw new Error(data.error ?? "上传失败。");
    }

    if (data.library) {
      onLibraryChange?.(data.library);
    }
  }

  async function uploadDirectlyToBlob(selectedFile: File) {
    const id = `${Date.now()}`;
    const pathname = `uploads/model-${id}-${safeFileName(selectedFile.name)}`;

    const blob = await upload(pathname, selectedFile, {
      access: "public",
      handleUploadUrl: "/api/admin/blob-upload",
      clientPayload: JSON.stringify({ id, fileName: selectedFile.name, password }),
      contentType: "application/octet-stream",
      multipart: selectedFile.size > 4 * 1024 * 1024,
      onUploadProgress: (event) => setUploadProgress(event.percentage),
    });

    const response = await fetch("/api/admin/register-upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, fileName: selectedFile.name, url: blob.url, password }),
    });
    const data = await readJsonResponse<UploadResponse>(response, "登记模型失败。");

    if (!response.ok || data.error) {
      throw new Error(data.error ?? "模型文件已上传，但登记到模型库失败。");
    }

    onLibraryChange?.(data.library ?? (await fetchLatestLibrary()));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);
    setUploadProgress(0);

    if (!password) {
      setError("请输入上传密码。");
      return;
    }

    if (!file) {
      setError("请选择一个 .ifc 文件。");
      return;
    }

    if (!file.name.toLowerCase().endsWith(".ifc")) {
      setError("只能上传 IFC 模型文件。");
      return;
    }

    if (file.size > maxUploadSize) {
      setError("文件太大，最大只能上传 200MB。");
      return;
    }

    if (requiresBlobStorage) {
      setError(blobSetupMessage);
      return;
    }

    setIsUploading(true);

    try {
      if (directBlobUpload) {
        try {
          await uploadDirectlyToBlob(file);
        } catch (directUploadError) {
          if (isVercelDeployment || requiresBlobStorage) {
            setMessage(null);
            throw directUploadError;
          }

          setMessage("直传通道失败，正在改用服务器中转上传...");
          setUploadProgress(35);
          await uploadThroughServer(file);
        }
      } else {
        await uploadThroughServer(file);
      }

      setFile(null);
      setUploadProgress(100);
      setMessage("IFC 模型已上传，并已加入模型库。");
    } catch (uploadError) {
      const message = uploadError instanceof Error ? uploadError.message : "上传失败。";
      setError(isVercelDeployment && directBlobUpload ? `${blobDirectUploadMessage} 原始错误：${message}` : message);
    } finally {
      setIsUploading(false);
    }
  }

  const passwordId = compact ? "public-password" : "password";
  const fileId = compact ? "public-model-file" : "model-file";

  return (
    <section className={compact ? "form-panel inline-upload-panel" : "form-panel"}>
      <h1>{title}</h1>
      <p>{description}</p>
      {requiresBlobStorage ? <div className="message error">{blobSetupMessage}</div> : null}

      <form onSubmit={onSubmit}>
        <div className="field">
          <label htmlFor={passwordId}>上传密码</label>
          <input
            id={passwordId}
            className="input"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            placeholder="请输入上传密码"
          />
        </div>

        <div className="field">
          <label htmlFor={fileId}>IFC 文件</label>
          <div className="dropzone">
            <div>
              <strong>{file ? file.name : "选择 .ifc 文件"}</strong>
              <p>{file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : "先在 Revit 中导出 IFC"}</p>
              <label className="button" htmlFor={fileId}>
                选择文件
              </label>
              <input
                id={fileId}
                className="visually-hidden"
                type="file"
                accept=".ifc"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
            </div>
          </div>
        </div>

        <button className="button primary" type="submit" disabled={isUploading}>
          {isUploading ? "上传中..." : "上传到模型库"}
        </button>
      </form>

      <div className="progress" aria-label="Upload progress">
        <span style={{ "--progress": `${progress}%` } as React.CSSProperties} />
      </div>

      {message ? <div className="message success">{message}</div> : null}
      {error ? <div className="message error">{error}</div> : null}
    </section>
  );
}
