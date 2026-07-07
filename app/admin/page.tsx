import Link from "next/link";
import { AdminModelManager } from "@/components/admin-model-manager";
import { getModelLibrary, isBlobStorageConfigured } from "@/lib/model-store";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const library = await getModelLibrary();
  const directBlobUpload = isBlobStorageConfigured();

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            IFC
          </div>
          <span>模型上传后台</span>
        </div>
        <nav className="nav-actions" aria-label="Admin navigation">
          <Link className="button" href="/">
            查看网站
          </Link>
        </nav>
      </header>

      <AdminModelManager initialLibrary={library} directBlobUpload={directBlobUpload} />
    </main>
  );
}
