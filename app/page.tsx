import Link from "next/link";
import { PublicModelExperience } from "@/components/public-model-experience";
import { getModelLibrary, isBlobStorageConfigured, isVercelDeployment } from "@/lib/model-store";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const library = await getModelLibrary();
  const directBlobUpload = isBlobStorageConfigured();
  const requiresBlobStorage = isVercelDeployment() && !directBlobUpload;

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            IFC
          </div>
          <span>IFC Model Viewer</span>
        </div>
        <nav className="nav-actions" aria-label="Main navigation">
          <Link className="button" href="/admin">
            管理后台
          </Link>
        </nav>
      </header>

      <PublicModelExperience
        initialLibrary={library}
        directBlobUpload={directBlobUpload}
        requiresBlobStorage={requiresBlobStorage}
      />
    </main>
  );
}
