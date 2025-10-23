# 部署说明文档

## 目录

1. [项目结构说明](#项目结构说明)
2. [本地开发环境设置](#本地开发环境设置)
3. [GitHub Actions CI/CD流程说明](#github-actions-cicd流程说明)
4. [Vercel部署步骤](#vercel部署步骤)
5. [配置文件说明](#配置文件说明)
6. [常见问题排查](#常见问题排查)
7. [验证部署成功](#验证部署成功)

---

## 项目结构说明

本项目采用Monorepo架构，将前端和后端代码统一管理在同一个Git仓库中。

### 目录结构

```
project-root/
├── .github/
│   └── workflow/
│       └── pipeline.yml          # GitHub Actions CI/CD配置
├── phonebook_frontend/           # 前端应用（React + Vite）
│   ├── src/                      # 前端源代码
│   ├── package.json              # 前端依赖配置
│   ├── vite.config.js            # Vite构建配置
│   └── eslint.config.js          # 前端ESLint配置
├── phonebook_backend/            # 后端应用（Node.js + Express）
│   ├── models/                   # 数据模型
│   ├── public/                   # 前端构建产物目标目录
│   ├── index.js                  # 后端入口文件
│   ├── package.json              # 后端依赖配置
│   └── eslint.config.mjs         # 后端ESLint配置
├── package.json                  # 根目录package.json（管理脚本）
├── vercel.json                   # Vercel部署配置
└── DEPLOYMENT.md                 # 本文档
```

### 架构特点

- **前后端分离但统一部署**：前端构建产物输出到后端的`public`目录
- **统一的版本控制**：所有代码在同一个Git仓库中管理
- **自动化CI/CD**：通过GitHub Actions自动执行代码检查和构建验证
- **一键部署**：通过Vercel实现前后端的集成部署


---

## 本地开发环境设置

### 前置要求

- Node.js 20.x 或更高版本
- npm 9.x 或更高版本
- Git
- MongoDB数据库（本地或云端）

### 步骤1：克隆仓库

```bash
git clone <your-repository-url>
cd <repository-name>
```

### 步骤2：安装依赖

使用根目录的管理脚本安装所有依赖：

```bash
# 安装前后端所有依赖
npm run install:all

# 或者分别安装
npm run install:frontend  # 仅安装前端依赖
npm run install:backend   # 仅安装后端依赖
```

### 步骤3：配置环境变量

在`phonebook_backend`目录下创建`.env`文件：

```bash
cd phonebook_backend
touch .env
```

在`.env`文件中添加以下配置：

```env
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>?retryWrites=true&w=majority
PORT=3001
```

**注意**：
- 将`<username>`、`<password>`、`<cluster>`和`<database>`替换为你的MongoDB连接信息
- 不要将`.env`文件提交到Git仓库（已在`.gitignore`中配置）


### 步骤4：启动开发服务器

#### 方式1：同时启动前后端（推荐用于开发）

在两个不同的终端窗口中分别运行：

```bash
# 终端1：启动后端开发服务器
npm run dev:backend
# 后端将运行在 http://localhost:3001

# 终端2：启动前端开发服务器
npm run dev:frontend
# 前端将运行在 http://localhost:5173
```

在开发模式下，前端会通过Vite的代理功能与后端通信。

#### 方式2：测试生产构建

```bash
# 1. 构建前端
npm run build:frontend

# 2. 启动后端（会同时提供前端静态文件）
npm run start:backend

# 3. 访问 http://localhost:3001
```

### 步骤5：代码质量检查

运行ESLint检查代码质量：

```bash
# 检查前后端所有代码
npm run lint

# 或者分别检查
npm run lint:frontend  # 仅检查前端
npm run lint:backend   # 仅检查后端
```


---

## GitHub Actions CI/CD流程说明

### 工作流概述

本项目使用GitHub Actions实现自动化的持续集成和持续部署（CI/CD）。工作流配置文件位于`.github/workflow/pipeline.yml`。

### 触发条件

工作流在以下情况下自动触发：

1. **代码推送到main分支**
   ```bash
   git push origin main
   ```

2. **创建或更新Pull Request到main分支**
   ```bash
   git push origin feature-branch
   # 然后在GitHub上创建PR
   ```

### 工作流程

#### Job 1: check_skip

检查提交信息中是否包含`#skip`标记。

- 如果提交信息包含`#skip`，则跳过后续的部署流程
- 用于快速提交文档更新等不需要完整CI/CD的变更

**使用示例**：
```bash
git commit -m "Update README #skip"
git push origin main
```

#### Job 2: simple_deployment_pipeline

执行完整的代码检查和构建验证流程。

**步骤详解**：

1. **检出代码** (`actions/checkout@v4`)
   - 从GitHub仓库拉取最新代码

2. **设置Node.js环境** (`actions/setup-node@v4`)
   - 安装Node.js 20.x版本
   - 确保构建环境一致

3. **缓存依赖** (`actions/cache@v4`)
   - 缓存`node_modules`目录
   - 加速后续构建（避免重复下载依赖）

4. **安装前端依赖**
   ```bash
   cd phonebook_frontend && npm ci
   ```

5. **检查前端代码质量**
   ```bash
   cd phonebook_frontend && npm run lint
   ```
   - 如果发现ESLint错误，工作流将失败

6. **安装后端依赖**
   ```bash
   cd phonebook_backend && npm ci
   ```

7. **检查后端代码质量**
   ```bash
   cd phonebook_backend && npx eslint .
   ```
   - 如果发现ESLint错误，工作流将失败

8. **构建前端**
   ```bash
   cd phonebook_frontend && npm run build
   ```
   - 将前端代码构建为生产版本
   - 输出到`phonebook_backend/public`目录

9. **验证构建产物**
   - 检查`phonebook_backend/public`目录是否存在
   - 检查`index.html`文件是否生成
   - 确保构建成功完成


#### Job 3: tag_release

在成功部署到main分支后自动创建版本标签。

- 仅在push到main分支且CI检查通过时执行
- 自动递增版本号（默认为patch版本）
- 使用`anothrNick/github-tag-action`创建Git标签

### 执行时间

- 正常情况下，完整的CI/CD流程应在**5分钟内**完成
- 首次运行可能需要更长时间（无缓存）

### 查看工作流状态

1. 访问GitHub仓库页面
2. 点击顶部的"Actions"标签
3. 查看最近的工作流运行记录
4. 点击具体的运行记录查看详细日志


---

## Vercel部署步骤

### 前置准备

1. 注册Vercel账号：https://vercel.com
2. 准备MongoDB数据库连接字符串
3. 确保GitHub仓库已推送到远程

### 步骤1：连接GitHub仓库

1. 登录Vercel控制台
2. 点击"Add New Project"
3. 选择"Import Git Repository"
4. 授权Vercel访问你的GitHub账号
5. 选择要部署的仓库
6. 点击"Import"

### 步骤2：配置项目设置

Vercel会自动检测`vercel.json`配置文件，但你需要确认以下设置：

#### 基本设置

- **Framework Preset**: None（因为我们使用自定义配置）
- **Root Directory**: `./`（项目根目录）
- **Build Command**: 自动从`vercel.json`读取
- **Output Directory**: `phonebook_backend`（自动从`vercel.json`读取）

#### 环境变量配置

点击"Environment Variables"，添加以下变量：

| 变量名 | 值 | 环境 |
|--------|-----|------|
| `MONGODB_URI` | `mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>?retryWrites=true&w=majority` | Production, Preview, Development |
| `PORT` | 留空（Vercel自动提供） | - |

**重要提示**：
- 确保MongoDB URI正确且数据库可访问
- 不要在代码中硬编码敏感信息
- 环境变量在所有环境（Production、Preview、Development）中都需要配置


### 步骤3：触发部署

#### 自动部署

Vercel会在以下情况自动触发部署：

1. **推送到main分支**
   ```bash
   git push origin main
   ```
   - 触发Production部署
   - 部署到生产环境URL

2. **推送到其他分支或创建PR**
   ```bash
   git push origin feature-branch
   ```
   - 触发Preview部署
   - 生成预览URL供测试

#### 手动部署

在Vercel控制台中：

1. 进入项目页面
2. 点击"Deployments"标签
3. 点击右上角的"Redeploy"按钮
4. 选择要重新部署的版本

### 步骤4：查看部署状态

1. 在Vercel控制台的"Deployments"页面查看部署进度
2. 点击具体的部署记录查看详细日志
3. 部署成功后，会显示部署URL

### 部署流程

Vercel执行的构建流程（基于`vercel.json`配置）：

```bash
# 1. 安装前端依赖并构建
cd phonebook_frontend && npm install && npm run build

# 2. 安装后端依赖
cd ../phonebook_backend && npm install

# 3. 启动后端服务器（自动）
# Vercel会自动运行 index.js
```

### 获取部署URL

部署成功后，你会获得以下URL：

- **Production URL**: `https://your-project.vercel.app`
- **Preview URL**: `https://your-project-<hash>.vercel.app`


---

## 配置文件说明

### 1. vercel.json

位置：项目根目录

这是Vercel部署的核心配置文件，定义了构建和部署行为。

```json
{
  "version": 2,
  "buildCommand": "cd phonebook_frontend && npm install && npm run build && cd ../phonebook_backend && npm install",
  "outputDirectory": "phonebook_backend",
  "installCommand": "echo 'Dependencies installed in buildCommand'",
  "devCommand": "cd phonebook_backend && npm run dev",
  "framework": null,
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "/api/$1"
    },
    {
      "source": "/(.*)",
      "destination": "/"
    }
  ]
}
```

**配置项说明**：

- **version**: Vercel配置版本（固定为2）
- **buildCommand**: 自定义构建命令
  - 先构建前端（输出到`phonebook_backend/public`）
  - 再安装后端依赖
- **outputDirectory**: 部署的根目录（指向后端目录）
- **installCommand**: 禁用默认安装命令（在buildCommand中处理）
- **devCommand**: 本地开发命令
- **framework**: 设为null，表示不使用预设框架
- **rewrites**: 路由重写规则
  - `/api/*`请求转发到后端API
  - 其他请求返回前端应用（SPA fallback）


### 2. .github/workflow/pipeline.yml

位置：`.github/workflow/pipeline.yml`

GitHub Actions工作流配置文件，定义CI/CD流程。

**主要配置**：

```yaml
name: Deployment pipeline

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
    types: [opened, synchronize]
```

**触发条件**：
- push到main分支
- 创建或更新PR到main分支

**关键Jobs**：

1. **check_skip**: 检查是否跳过部署
2. **simple_deployment_pipeline**: 执行lint和构建
3. **tag_release**: 自动创建版本标签

**环境要求**：
- Ubuntu最新版
- Node.js 20.x
- 使用`npm ci`安装依赖（确保一致性）


### 3. 根目录 package.json

位置：项目根目录

提供统一的管理脚本，简化monorepo操作。

```json
{
  "name": "phonebook-monorepo",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "install:frontend": "cd phonebook_frontend && npm install",
    "install:backend": "cd phonebook_backend && npm install",
    "install:all": "npm run install:frontend && npm run install:backend",
    "lint:frontend": "cd phonebook_frontend && npm run lint",
    "lint:backend": "cd phonebook_backend && npx eslint .",
    "lint": "npm run lint:frontend && npm run lint:backend",
    "build:frontend": "cd phonebook_frontend && npm run build",
    "dev:frontend": "cd phonebook_frontend && npm run dev",
    "dev:backend": "cd phonebook_backend && npm run dev",
    "start:backend": "cd phonebook_backend && npm start"
  }
}
```

**脚本说明**：

| 脚本 | 功能 | 使用场景 |
|------|------|----------|
| `install:all` | 安装所有依赖 | 初始化项目 |
| `lint` | 检查所有代码 | 提交前检查 |
| `build:frontend` | 构建前端 | 准备部署 |
| `dev:frontend` | 启动前端开发服务器 | 前端开发 |
| `dev:backend` | 启动后端开发服务器 | 后端开发 |
| `start:backend` | 启动生产后端 | 测试生产构建 |


### 4. phonebook_frontend/vite.config.js

前端构建配置，关键设置：

```javascript
build: {
  outDir: '../phonebook_backend/public',
  emptyOutDir: true
}
```

- **outDir**: 构建产物输出到后端的public目录
- **emptyOutDir**: 构建前清空目标目录

### 5. phonebook_backend/index.js

后端服务器配置，关键代码：

```javascript
app.use(express.static('public'))
```

- 提供前端静态文件服务
- 所有非API请求返回前端应用


---

## 常见问题排查

### 1. 构建失败

#### 问题：前端构建失败

**症状**：
```
Error: Build failed with errors
```

**可能原因和解决方案**：

| 原因 | 解决方案 |
|------|----------|
| 依赖未安装或版本不匹配 | 删除`node_modules`和`package-lock.json`，重新运行`npm install` |
| ESLint错误 | 运行`npm run lint`查看具体错误，修复代码问题 |
| 内存不足 | 增加Node.js内存限制：`NODE_OPTIONS=--max-old-space-size=4096 npm run build` |
| Vite配置错误 | 检查`vite.config.js`中的`outDir`路径是否正确 |

**调试步骤**：

```bash
# 1. 清理并重新安装依赖
cd phonebook_frontend
rm -rf node_modules package-lock.json
npm install

# 2. 检查代码质量
npm run lint

# 3. 尝试构建
npm run build

# 4. 检查输出目录
ls -la ../phonebook_backend/public
```

#### 问题：后端依赖安装失败

**症状**：
```
npm ERR! code ENOENT
```

**解决方案**：

```bash
cd phonebook_backend
rm -rf node_modules package-lock.json
npm install
```


### 2. 部署失败

#### 问题：Vercel部署超时

**症状**：
```
Error: Build exceeded maximum duration
```

**可能原因和解决方案**：

| 原因 | 解决方案 |
|------|----------|
| 构建时间过长 | 优化依赖，移除不必要的包 |
| 网络问题 | 重新触发部署 |
| Vercel配额限制 | 检查Vercel账户配额 |

#### 问题：Vercel找不到构建产物

**症状**：
```
Error: No output directory found
```

**解决方案**：

1. 检查`vercel.json`中的`outputDirectory`设置
2. 确保前端构建成功生成文件到`phonebook_backend/public`
3. 本地测试构建流程：
   ```bash
   npm run build:frontend
   ls -la phonebook_backend/public
   ```

#### 问题：环境变量未配置

**症状**：
```
Error: MONGODB_URI is not defined
```

**解决方案**：

1. 登录Vercel控制台
2. 进入项目设置 → Environment Variables
3. 添加`MONGODB_URI`变量
4. 重新部署项目


### 3. 前后端通信失败

#### 问题：前端无法访问后端API

**症状**：
- 浏览器控制台显示404错误
- 网络请求失败

**可能原因和解决方案**：

| 原因 | 解决方案 |
|------|----------|
| API路径错误 | 确保前端请求使用`/api/`前缀 |
| CORS问题 | 检查后端是否正确配置CORS（生产环境不需要） |
| 路由配置错误 | 检查`vercel.json`中的`rewrites`配置 |
| 后端未启动 | 检查Vercel部署日志，确认后端正常运行 |

**调试步骤**：

```bash
# 1. 测试API端点
curl https://your-app.vercel.app/api/persons

# 2. 检查浏览器开发者工具
# - Network标签：查看请求URL和响应
# - Console标签：查看错误信息

# 3. 检查前端API调用代码
# 确保使用相对路径：/api/persons
```

#### 问题：CORS错误

**症状**：
```
Access to fetch at 'http://...' has been blocked by CORS policy
```

**解决方案**：

在生产环境中，前后端在同一域名下，不应该出现CORS问题。如果出现：

1. 检查前端是否使用了绝对URL（应使用相对路径）
2. 确保`vercel.json`的rewrites配置正确
3. 检查后端是否有额外的CORS中间件配置


### 4. GitHub Actions失败

#### 问题：ESLint检查失败

**症状**：
```
Error: Command failed: npm run lint
```

**解决方案**：

```bash
# 1. 本地运行lint检查
npm run lint

# 2. 修复所有ESLint错误
# 查看具体错误信息并修复

# 3. 自动修复部分问题（可选）
cd phonebook_frontend
npm run lint -- --fix

cd ../phonebook_backend
npx eslint . --fix

# 4. 提交修复后的代码
git add .
git commit -m "Fix ESLint errors"
git push
```

#### 问题：缓存问题导致构建失败

**症状**：
- 本地构建成功，但GitHub Actions失败
- 依赖版本不一致

**解决方案**：

1. 清除GitHub Actions缓存：
   - 进入GitHub仓库 → Actions → Caches
   - 删除所有缓存
   - 重新触发工作流

2. 确保使用`npm ci`而非`npm install`（已在配置中）

#### 问题：工作流被意外跳过

**症状**：
- 推送代码后没有触发CI/CD

**检查项**：

1. 提交信息是否包含`#skip`
2. 分支名称是否正确（应为`main`）
3. GitHub Actions是否启用


### 5. 数据库连接问题

#### 问题：无法连接MongoDB

**症状**：
```
MongooseError: Could not connect to any servers
```

**可能原因和解决方案**：

| 原因 | 解决方案 |
|------|----------|
| 连接字符串错误 | 检查`MONGODB_URI`格式和凭据 |
| IP白名单限制 | 在MongoDB Atlas中添加`0.0.0.0/0`（允许所有IP） |
| 网络超时 | 检查MongoDB集群状态 |
| 环境变量未设置 | 确认Vercel中已配置`MONGODB_URI` |

**调试步骤**：

```bash
# 1. 测试连接字符串（本地）
cd phonebook_backend
node mongo.js

# 2. 检查MongoDB Atlas设置
# - Network Access：确保允许Vercel的IP
# - Database Access：确保用户权限正确

# 3. 检查Vercel环境变量
# 在Vercel控制台确认MONGODB_URI已设置
```


---

## 验证部署成功

### 本地验证

在部署到生产环境之前，先在本地验证：

#### 1. 验证构建产物

```bash
# 构建前端
npm run build:frontend

# 检查输出目录
ls -la phonebook_backend/public

# 应该看到以下文件：
# - index.html
# - assets/ (包含JS和CSS文件)
# - vite.svg
```

#### 2. 验证生产模式运行

```bash
# 启动后端（会同时提供前端）
npm run start:backend

# 在浏览器中访问 http://localhost:3001
```

#### 3. 功能测试清单

- [ ] 页面正常加载，无白屏
- [ ] 可以查看联系人列表
- [ ] 可以添加新联系人
- [ ] 可以删除联系人
- [ ] 可以搜索/过滤联系人
- [ ] 浏览器控制台无错误
- [ ] 网络请求正常（检查Network标签）


### GitHub Actions验证

#### 1. 检查工作流状态

1. 访问GitHub仓库
2. 点击"Actions"标签
3. 查看最新的工作流运行

**成功标志**：
- ✅ check_skip job完成
- ✅ simple_deployment_pipeline job完成
- ✅ 所有步骤显示绿色对勾
- ✅ tag_release job完成（如果是push到main）

#### 2. 检查构建日志

点击具体的job查看详细日志：

```
✓ Checkout code
✓ Setup Node.js
✓ Cache node modules
✓ Install frontend dependencies
✓ Lint frontend
✓ Install backend dependencies
✓ Lint backend
✓ Build frontend
✓ Verify build artifacts
```

#### 3. 验证版本标签

```bash
# 查看Git标签
git fetch --tags
git tag

# 应该看到自动创建的版本标签，如：
# v0.0.1
# v0.0.2
```


### Vercel生产环境验证

#### 1. 检查部署状态

在Vercel控制台：

1. 进入项目页面
2. 查看"Deployments"标签
3. 确认最新部署状态为"Ready"

**成功标志**：
- 🟢 状态显示"Ready"
- ⏱️ 构建时间合理（通常5-10分钟）
- 🔗 显示部署URL

#### 2. 访问生产URL

```bash
# 使用curl测试
curl https://your-app.vercel.app

# 应该返回HTML内容（前端应用）

# 测试API端点
curl https://your-app.vercel.app/api/persons

# 应该返回JSON数据
```

#### 3. 浏览器功能测试

访问 `https://your-app.vercel.app` 并执行以下测试：

**基础功能测试**：
- [ ] 页面加载正常，显示应用界面
- [ ] 联系人列表正常显示
- [ ] 可以添加新联系人
- [ ] 可以删除联系人
- [ ] 搜索/过滤功能正常
- [ ] 表单验证正常工作

**技术验证**：
- [ ] 打开浏览器开发者工具 → Console标签
  - 无错误信息
  - 无警告信息
- [ ] 打开Network标签
  - API请求路径正确（`/api/persons`）
  - 响应状态码为200
  - 响应内容正确
- [ ] 检查页面加载性能
  - 首次加载时间 < 3秒
  - 后续操作响应快速


#### 4. 端到端测试场景

执行完整的用户流程测试：

**场景1：添加联系人**
1. 在表单中输入姓名和电话号码
2. 点击"Add"按钮
3. 验证联系人出现在列表中
4. 刷新页面，确认数据持久化

**场景2：删除联系人**
1. 点击某个联系人的"Delete"按钮
2. 确认联系人从列表中移除
3. 刷新页面，确认删除持久化

**场景3：搜索联系人**
1. 在搜索框中输入关键词
2. 验证列表只显示匹配的联系人
3. 清空搜索框，验证显示所有联系人

**场景4：更新联系人**（如果实现了此功能）
1. 尝试添加已存在的联系人
2. 验证系统提示并更新电话号码
3. 确认更新成功

#### 5. 性能和可用性验证

```bash
# 使用curl测试响应时间
time curl https://your-app.vercel.app/api/persons

# 应该在1-2秒内返回结果

# 测试多次请求
for i in {1..5}; do
  curl -w "\nTime: %{time_total}s\n" https://your-app.vercel.app/api/persons
done
```

**验证清单**：
- [ ] API响应时间 < 2秒
- [ ] 页面加载时间 < 3秒
- [ ] 无间歇性错误
- [ ] 数据库连接稳定
- [ ] 所有功能在不同浏览器中正常工作（Chrome、Firefox、Safari）


### 持续监控

部署成功后，建议进行持续监控：

#### 1. Vercel Analytics

在Vercel控制台查看：
- 访问量统计
- 响应时间
- 错误率
- 地理分布

#### 2. 日志监控

```bash
# 在Vercel控制台查看实时日志
# Project → Deployments → [选择部署] → Runtime Logs
```

关注以下日志：
- 数据库连接错误
- API请求错误
- 未捕获的异常

#### 3. 定期健康检查

设置定期检查（可使用cron job或监控服务）：

```bash
#!/bin/bash
# health-check.sh

URL="https://your-app.vercel.app"

# 检查主页
if curl -f -s "$URL" > /dev/null; then
  echo "✓ Frontend is up"
else
  echo "✗ Frontend is down"
fi

# 检查API
if curl -f -s "$URL/api/persons" > /dev/null; then
  echo "✓ API is up"
else
  echo "✗ API is down"
fi
```

---

## 总结

本文档涵盖了从本地开发到生产部署的完整流程。关键要点：

1. **Monorepo结构**：前后端统一管理，简化版本控制
2. **自动化CI/CD**：GitHub Actions自动检查代码质量和构建
3. **一键部署**：Vercel自动检测变更并部署
4. **配置文件**：`vercel.json`、`pipeline.yml`和根`package.json`协同工作
5. **验证测试**：多层次验证确保部署成功

如有问题，请参考"常见问题排查"章节，或查看相关日志进行调试。

---

**文档版本**: 1.0  
**最后更新**: 2024年  
**维护者**: SHAN MENGQI
