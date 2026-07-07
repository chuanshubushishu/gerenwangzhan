"use client";

import { useMemo, useState } from "react";
import { AdminUploader } from "@/components/admin-uploader";
import { ViewerCanvas } from "@/components/viewer-canvas";
import type { ModelLibrary, StoredModel } from "@/lib/model-store";

export function PublicModelExperience({
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
  const [selectedModelId, setSelectedModelId] = useState<string | null>(initialLibrary.activeModelId);

  const selectedModel = useMemo(() => {
    return (
      library.models.find((model) => model.id === selectedModelId) ??
      library.models.find((model) => model.id === library.activeModelId) ??
      library.models[0] ??
      null
    );
  }, [library, selectedModelId]);

  function onLibraryChange(nextLibrary: ModelLibrary) {
    setLibrary(nextLibrary);
    setSelectedModelId(nextLibrary.activeModelId ?? nextLibrary.models[0]?.id ?? null);
  }

  return (
    <section className="viewer-layout">
      <div className="viewer-stage">
        <ViewerCanvas model={selectedModel} />
      </div>

      <aside className="side-panel">
        <h2>模型库</h2>
        <p>访客可以在这里选择任意已上传的 IFC 模型查看。上传新模型不会覆盖旧模型。</p>

        <ModelList
          models={library.models}
          activeModelId={library.activeModelId}
          selectedModel={selectedModel}
          onSelect={(model) => setSelectedModelId(model.id)}
        />

        <AdminUploader
          library={library}
          directBlobUpload={directBlobUpload}
          requiresBlobStorage={requiresBlobStorage}
          isVercelDeployment={isVercelDeployment}
          compact
          title="直接上传 IFC"
          description="把 Revit 模型导出为 .ifc 后，在这里上传即可加入模型库。"
          onLibraryChange={onLibraryChange}
        />
      </aside>
    </section>
  );
}

function ModelList({
  models,
  activeModelId,
  selectedModel,
  onSelect,
}: {
  models: StoredModel[];
  activeModelId: string | null;
  selectedModel: StoredModel | null;
  onSelect: (model: StoredModel) => void;
}) {
  if (models.length === 0) {
    return (
      <div className="empty-list">
        <strong>还没有模型</strong>
        <span>上传第一个 IFC 文件后会出现在这里。</span>
      </div>
    );
  }

  return (
    <div className="model-list" aria-label="模型列表">
      {models.map((model) => {
        const isSelected = selectedModel?.id === model.id;
        const isActive = activeModelId === model.id;

        return (
          <button
            key={model.id}
            className={`model-list-item ${isSelected ? "selected" : ""}`}
            type="button"
            onClick={() => onSelect(model)}
          >
            <span className="model-title">{model.fileName}</span>
            <span className="model-subtitle">{new Date(model.uploadedAt).toLocaleString("zh-CN")}</span>
            <span className="model-badges">
              <span className={`status ${model.status}`}>{model.statusLabel}</span>
              {isActive ? <span className="status active">首页默认</span> : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}
