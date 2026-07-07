import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { del, get, put } from "@vercel/blob";

export type ModelStatus = "ready" | "failed";

export type StoredModel = {
  id: string;
  fileName: string;
  fileType: "ifc";
  url: string;
  status: ModelStatus;
  statusLabel: string;
  uploadedAt: string;
  updatedAt: string;
  error?: string;
};

export type ModelLibrary = {
  activeModelId: string | null;
  models: StoredModel[];
};

const dataDir = path.join(process.cwd(), "data");
const uploadsDir = path.join(process.cwd(), "public", "uploads");
const legacyModelFile = path.join(dataDir, "current-model.json");
const localLibraryFile = path.join(dataDir, "models.json");
const blobLibraryPath = "data/models.json";

const statusLabels: Record<ModelStatus, string> = {
  ready: "可公开查看",
  failed: "加载失败",
};

export function isBlobStorageConfigured() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);
}

export function withStatusLabel(model: Omit<StoredModel, "statusLabel"> | StoredModel): StoredModel {
  return {
    ...model,
    statusLabel: statusLabels[model.status] ?? ("statusLabel" in model ? model.statusLabel : model.status),
  };
}

function normalizeModel(model: StoredModel): StoredModel | null {
  if (model.fileType !== "ifc" || !model.url) return null;
  return withStatusLabel(model);
}

function normalizeLibrary(library: ModelLibrary): ModelLibrary {
  const models = library.models
    .map((model) => normalizeModel(model))
    .filter((model): model is StoredModel => Boolean(model))
    .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());

  const activeModelId =
    library.activeModelId && models.some((model) => model.id === library.activeModelId)
      ? library.activeModelId
      : (models[0]?.id ?? null);

  return { activeModelId, models };
}

async function streamToText(stream: ReadableStream<Uint8Array>) {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }

  return Buffer.concat(chunks).toString("utf8");
}

async function readLegacyCurrentModel(): Promise<ModelLibrary> {
  try {
    const raw = await readFile(legacyModelFile, "utf8");
    const model = normalizeModel(JSON.parse(raw) as StoredModel);
    return model ? { activeModelId: model.id, models: [model] } : { activeModelId: null, models: [] };
  } catch {
    return { activeModelId: null, models: [] };
  }
}

async function readLocalLibrary(): Promise<ModelLibrary> {
  try {
    const raw = await readFile(localLibraryFile, "utf8");
    return normalizeLibrary(JSON.parse(raw) as ModelLibrary);
  } catch {
    return readLegacyCurrentModel();
  }
}

async function readBlobLibrary(): Promise<ModelLibrary> {
  try {
    const result = await get(blobLibraryPath, { access: "private" });
    if (!result || result.statusCode !== 200 || !result.stream) {
      return { activeModelId: null, models: [] };
    }

    const raw = await streamToText(result.stream);
    return normalizeLibrary(JSON.parse(raw) as ModelLibrary);
  } catch {
    return { activeModelId: null, models: [] };
  }
}

export async function getModelLibrary(): Promise<ModelLibrary> {
  return isBlobStorageConfigured() ? readBlobLibrary() : readLocalLibrary();
}

export async function saveModelLibrary(library: ModelLibrary) {
  const nextLibrary = normalizeLibrary(library);

  if (isBlobStorageConfigured()) {
    await put(blobLibraryPath, JSON.stringify(nextLibrary, null, 2), {
      access: "private",
      allowOverwrite: true,
      addRandomSuffix: false,
      contentType: "application/json",
    });
    return;
  }

  await mkdir(dataDir, { recursive: true });
  await writeFile(localLibraryFile, JSON.stringify(nextLibrary, null, 2), "utf8");
}

export async function saveUploadedModelFile(fileName: string, bytes: Buffer) {
  const id = `${Date.now()}`;
  const safeBaseName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_+$/g, "");
  const publicFileName = `model-${id}-${safeBaseName || "model.ifc"}`;
  const pathname = `uploads/${publicFileName}`;

  if (isBlobStorageConfigured()) {
    const blob = await put(pathname, bytes, {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/octet-stream",
      multipart: bytes.length > 4 * 1024 * 1024,
    });
    return { id, url: blob.url };
  }

  await mkdir(uploadsDir, { recursive: true });
  await writeFile(path.join(uploadsDir, publicFileName), bytes);
  return { id, url: `/uploads/${publicFileName}` };
}

async function deleteModelFile(model: StoredModel) {
  if (isBlobStorageConfigured()) {
    try {
      await del(model.url);
    } catch {
      // Continue even if the blob was already removed.
    }
    return;
  }

  if (!model.url.startsWith("/uploads/")) return;

  try {
    await rm(path.join(process.cwd(), "public", model.url), { force: true });
  } catch {
    // Continue even if the local file was already removed.
  }
}

export async function getCurrentModel(): Promise<StoredModel | null> {
  const library = await getModelLibrary();
  return library.models.find((model) => model.id === library.activeModelId) ?? library.models[0] ?? null;
}

export async function addModel(model: StoredModel) {
  const library = await getModelLibrary();
  const nextLibrary = normalizeLibrary({
    activeModelId: model.id,
    models: [model, ...library.models.filter((item) => item.id !== model.id)],
  });
  await saveModelLibrary(nextLibrary);
  return nextLibrary;
}

export async function setActiveModel(modelId: string) {
  const library = await getModelLibrary();
  if (!library.models.some((model) => model.id === modelId)) {
    throw new Error("模型不存在。");
  }

  const nextLibrary = normalizeLibrary({ ...library, activeModelId: modelId });
  await saveModelLibrary(nextLibrary);
  return nextLibrary;
}

export async function deleteModel(modelId: string) {
  const library = await getModelLibrary();
  const deletedModel = library.models.find((model) => model.id === modelId);
  const nextModels = library.models.filter((model) => model.id !== modelId);
  const nextActiveModelId = library.activeModelId === modelId ? (nextModels[0]?.id ?? null) : library.activeModelId;
  const nextLibrary = normalizeLibrary({ activeModelId: nextActiveModelId, models: nextModels });

  await saveModelLibrary(nextLibrary);
  if (deletedModel) {
    await deleteModelFile(deletedModel);
  }

  return nextLibrary;
}
