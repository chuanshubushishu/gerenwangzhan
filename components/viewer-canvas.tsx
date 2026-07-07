"use client";

import { useEffect, useRef, useState } from "react";
import type { Object3D } from "three";
import type { StoredModel } from "@/lib/model-store";

export function ViewerCanvas({ model }: { model: StoredModel | null }) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [message, setMessage] = useState("等待上传 IFC 模型");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!model || model.status !== "ready" || !hostRef.current) {
      return;
    }

    let disposed = false;
    let cleanup: (() => void) | undefined;
    const host = hostRef.current;
    const modelUrl = model.url;
    host.innerHTML = "";
    setError(null);
    setMessage("正在加载 IFC 模型...");

    async function loadIfc() {
      try {
        const THREE = await import("three");
        const { OrbitControls } = await import("three/examples/jsm/controls/OrbitControls.js");
        const { IFCLoader } = await import("web-ifc-three/IFCLoader.js");

        if (disposed || !hostRef.current) return;

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xeef2f0);

        const camera = new THREE.PerspectiveCamera(45, host.clientWidth / host.clientHeight, 0.1, 100000);
        camera.position.set(18, 14, 18);

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(host.clientWidth, host.clientHeight);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        host.appendChild(renderer.domElement);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;

        scene.add(new THREE.HemisphereLight(0xffffff, 0x8a928e, 1.8));
        const sun = new THREE.DirectionalLight(0xffffff, 1.8);
        sun.position.set(20, 30, 16);
        scene.add(sun);

        const grid = new THREE.GridHelper(80, 40, 0xb6c5c0, 0xdce2df);
        scene.add(grid);

        const loader = new IFCLoader();
        loader.ifcManager.setWasmPath("../../../wasm/");

        let frame = 0;
        let loadedModel: Object3D | null = null;

        loader.load(
          modelUrl,
          (ifcModel) => {
            if (disposed) return;

            loadedModel = ifcModel;
            scene.add(ifcModel);

            const box = new THREE.Box3().setFromObject(ifcModel);
            const size = box.getSize(new THREE.Vector3());
            const center = box.getCenter(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z) || 10;
            const distance = maxDim * 1.7;

            controls.target.copy(center);
            camera.position.set(center.x + distance, center.y + distance * 0.7, center.z + distance);
            camera.near = Math.max(maxDim / 1000, 0.1);
            camera.far = maxDim * 100;
            camera.updateProjectionMatrix();
            controls.update();
            setMessage("IFC 模型已加载：拖动旋转，滚轮缩放，右键平移。");
          },
          (event) => {
            if (!event.total) return;
            const progress = Math.round((event.loaded / event.total) * 100);
            setMessage(`正在加载 IFC 模型... ${progress}%`);
          },
          (loadError) => {
            console.error(loadError);
            setError("IFC 加载失败。请确认文件是有效的 IFC，并重新上传。");
          },
        );

        function animate() {
          controls.update();
          renderer.render(scene, camera);
          frame = window.requestAnimationFrame(animate);
        }

        function resize() {
          if (!hostRef.current) return;
          camera.aspect = hostRef.current.clientWidth / hostRef.current.clientHeight;
          camera.updateProjectionMatrix();
          renderer.setSize(hostRef.current.clientWidth, hostRef.current.clientHeight);
        }

        window.addEventListener("resize", resize);
        animate();

        cleanup = () => {
          window.removeEventListener("resize", resize);
          window.cancelAnimationFrame(frame);
          controls.dispose();
          if (loadedModel) {
            scene.remove(loadedModel);
          }
          loader.ifcManager.dispose();
          renderer.dispose();
          host.innerHTML = "";
        };
      } catch (loadError) {
        console.error(loadError);
        setError("查看器组件加载失败。请确认 three 和 web-ifc 已安装。");
      }
    }

    void loadIfc();

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, [model]);

  return (
    <>
      <div className="viewer-toolbar" aria-label="Viewer capabilities">
        <button className="tool-button" type="button" title="旋转">
          <OrbitIcon />
        </button>
        <button className="tool-button" type="button" title="平移">
          <PanIcon />
        </button>
        <button className="tool-button" type="button" title="缩放">
          <ZoomIcon />
        </button>
        <button className="tool-button" type="button" title="IFC">
          <SectionIcon />
        </button>
      </div>

      {model?.status === "ready" ? <div ref={hostRef} className="viewer-host" /> : null}

      {!model ? (
        <div className="viewer-overlay">
          <div className="empty-panel">
            <h1>还没有公开模型</h1>
            <p>把 Revit 模型导出为 .ifc，然后在右侧上传。上传完成后，这里会显示 3D 模型。</p>
          </div>
        </div>
      ) : null}

      {model?.status === "ready" || error ? (
        <div className="viewer-message" role="status">
          {error ?? message}
        </div>
      ) : null}
    </>
  );
}

function OrbitIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M4.5 12c0-3.4 3.7-6.2 8.2-6.2 2.1 0 4 .6 5.5 1.6"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
      <path
        d="M19.5 12c0 3.4-3.7 6.2-8.2 6.2-2.1 0-4-.6-5.5-1.6"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
      <path d="M18 4.8l.6 3.1-3 .3" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
      <path d="M6 19.2l-.6-3.1 3-.3" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  );
}

function PanIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3v18M3 12h18" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
      <path d="M12 3l-3 3M12 3l3 3M12 21l-3-3M12 21l3-3M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  );
}

function ZoomIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="10.5" cy="10.5" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M15 15l5 5M10.5 8v5M8 10.5h5" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  );
}

function SectionIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 6.5l7-3.2 7 3.2-7 3.2-7-3.2Z" fill="none" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.8" />
      <path d="M5 11.8l7 3.2 7-3.2M5 17.1l7 3.2 7-3.2" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}
