"use client";

import { useMemo, useState } from "react";
import { AdminUploader } from "@/components/admin-uploader";
import type { ModelLibrary, StoredModel } from "@/lib/model-store";

type ActionResponse = {
  library?: ModelLibrary;
  error?: string;
};

export function AdminModelManager({
  initialLibrary,
  directBlobUpload,
  requiresBlobStorage,
  isVercelDeployment,
}: {
  initialLibrary: ModelLibrary;
  directBlobUpload: boolean;
  requiresBlobStorage: boolean;
  isVercelDeployment: boolean;
}) {
  const [library, setLibrary] = useState<ModelLibrary>(initialLibrary);
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyModelId, setBusyModelId] = useState<string | null>(null);

  const activeModel = useMemo(
    () => library.models.find((model) => model.id === library.activeModelId) ?? library.models[0] ?? null,
    [library],
  );

  async function runModelAction(action: "set-active" | "delete", model: StoredModel) {
    setMessage(null);
    setError(null);

    if (!password) {
      setError("请输入管理密码。");
      return;
    }

    if (action === "delete") {
      const confirmed = window.confirm(`确定删除模型“${model.fileName}”吗？删除后列表里不会再显示它。`);
      if (!confirmed) return;
    }

    setBusyModelId(model.id);

    try {
      const response = await fetch("/api/admin/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, modelId: model.id, password }),
      });
      const data = (await response.json()) as ActionResponse;

      if (!response.ok || data.error) {
        throw new Error(data.error ?? "操作失败。");
      }

      if (data.library) {
        setLibrary(data.library);
      }

      setMessage(action === "set-active" ? "已设为首页默认模型。" : "模型已从列表中删除。");
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "操作失败。");
    } finally {
      setBusyModelId(null);
    }
  }

  return (
    <section className="admin-page">
      <AdminUploader
        library={library}
        directBlobUpload={directBlobUpload}
        requiresBlobStorage={requiresBlobStorage}
        isVercelDeployment={isVercelDeployment}
        onLibraryChange={setLibrary}
      />

      <aside className="form-panel">
        <h2>模型管理</h2>
        <p>这里显示所有已上传模型。删除模型和设置首页默认模型都需要填写管理密码。</p>

        <div className="field">
          <label htmlFor="manager-password">管理密码</label>
          <input
            id="manager-password"
            className="input"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            placeholder="请输入管理密码"
          />
        </div>

        <div className="meta-list compact-meta">
          <div className="meta-row">
            <span>模型数量</span>
            <strong>{library.models.length}</strong>
          </div>
          <div className="meta-row">
            <span>首页默认</span>
            <strong>{activeModel?.fileName ?? "暂无模型"}</strong>
          </div>
        </div>

        <AdminModelList
          models={library.models}
          activeModelId={library.activeModelId}
          busyModelId={busyModelId}
          onSetActive={(model) => runModelAction("set-active", model)}
          onDelete={(model) => runModelAction("delete", model)}
        />

        {message ? <div className="message success">{message}</div> : null}
        {error ? <div className="message error">{error}</div> : null}
      </aside>
    </section>
  );
}

function AdminModelList({
  models,
  activeModelId,
  busyModelId,
  onSetActive,
  onDelete,
}: {
  models: StoredModel[];
  activeModelId: string | null;
  busyModelId: string | null;
  onSetActive: (model: StoredModel) => void;
  onDelete: (model: StoredModel) => void;
}) {
  if (models.length === 0) {
    return (
      <div className="empty-list">
        <strong>还没有模型</strong>
        <span>先上传一个 IFC 文件。</span>
      </div>
    );
  }

  return (
    <div className="admin-model-list" aria-label="后台模型列表">
      {models.map((model) => {
        const isActive = activeModelId === model.id;
        const isBusy = busyModelId === model.id;

        return (
          <article className="admin-model-item" key={model.id}>
            <div>
              <h3>{model.fileName}</h3>
              <p>{new Date(model.uploadedAt).toLocaleString("zh-CN")}</p>
              <strong className="code">{model.url}</strong>
            </div>
            <div className="admin-model-actions">
              <span className={`status ${isActive ? "active" : model.status}`}>
                {isActive ? "首页默认" : model.statusLabel}
              </span>
              <button className="button" type="button" disabled={isActive || isBusy} onClick={() => onSetActive(model)}>
                设为默认
              </button>
              <button className="button danger" type="button" disabled={isBusy} onClick={() => onDelete(model)}>
                删除
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
