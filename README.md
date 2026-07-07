# IFC 模型展示网站

这是一个本地优先的 Revit/IFC 模型展示网站。浏览器不能直接打开 `.rvt` 文件，所以当前版本使用更简单的流程：

1. 在 Revit 里把模型导出为 `.ifc`。
2. 在网站页面上传 `.ifc` 文件。
3. 访客在首页选择模型并在线查看。

## 功能

- 支持上传多个 IFC 模型。
- 首页可以切换查看不同模型。
- 支持旋转、缩放、平移查看模型。
- 管理页面可以上传、设置默认模型、删除模型。
- 上传和删除都需要管理密码。
- 本地运行时，模型文件保存在项目目录内。

## 本地运行

进入项目目录：

```powershell
cd D:\xiangmu\gerenwangzhan
```

安装依赖：

```powershell
npm install
```

启动本地网站：

```powershell
npm run dev
```

打开：

- 首页：http://127.0.0.1:3000
- 管理后台：http://127.0.0.1:3000/admin

管理密码从本地 `.env.local` 读取。请在项目根目录创建 `.env.local`：

```env
ADMIN_PASSWORD=你的管理密码
```

如果 3000 端口被占用，可以换端口：

```powershell
npm run dev -- --hostname 127.0.0.1 --port 3001
```

## 上传模型

请上传 `.ifc` 文件，不是 `.rvt` 文件。

Revit 导出方式通常是：

```text
文件 -> 导出 -> IFC
```

上传后的文件默认保存到：

```text
public/uploads/
```

模型列表默认保存到：

```text
data/models.json
```

这些本地生成文件已经被 `.gitignore` 忽略，不会上传到 GitHub。

## GitHub 注意事项

可以把整个 `D:\xiangmu\gerenwangzhan` 文件夹作为 GitHub 项目上传。

建议提交这些文件：

- `app/`
- `components/`
- `lib/`
- `public/wasm/`
- `data/.gitkeep`
- `public/uploads/.gitkeep`
- `package.json`
- `pnpm-lock.yaml`
- `README.md`
- `.env.example`
- `.gitignore`
- `.editorconfig`

不要提交：

- `.env.local`
- `.next/`
- `node_modules/`
- `data/models.json`
- `public/uploads/*.ifc`

## 说明

这个版本适合本地展示、GitHub 备份和后续部署。正式上线后，如果需要长期保存访客上传的模型，建议使用有持久磁盘的服务器，或接入对象存储。
