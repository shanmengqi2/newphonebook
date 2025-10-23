# Design Document

## Overview

本设计文档描述了将现有的前后端分离项目重构为统一monorepo结构的技术方案。该方案包括：清理Git历史、配置GitHub Actions CI/CD流水线、设置Vercel部署配置、以及创建统一的项目管理脚本。

核心设计理念是保持前后端代码的独立性，同时通过根目录的配置文件和脚本实现统一管理。前端构建产物将输出到后端的public目录，实现前后端的集成部署。

## Architecture

### Monorepo Structure

```
project-root/
├── .github/
│   └── workflows/
│       └── pipeline.yml          # GitHub Actions CI/CD配置
├── phonebook_frontend/           # 前端应用（React + Vite）
│   ├── src/
│   ├── package.json
│   ├── vite.config.js
│   └── eslint.config.js
├── phonebook_backend/            # 后端应用（Node.js + Express）
│   ├── models/
│   ├── public/                   # 前端构建产物目标目录
│   ├── index.js
│   ├── package.json
│   └── eslint.config.mjs
├── package.json                  # 根目录package.json（管理脚本）
├── vercel.json                   # Vercel部署配置
└── DEPLOYMENT.md                 # 部署说明文档
```

### Deployment Flow

```
开发者推送代码
    ↓
GitHub Actions触发
    ↓
├─ ESLint检查前端代码
├─ ESLint检查后端代码
└─ 前端构建验证
    ↓
检查通过 → 合并到main分支
    ↓
Vercel自动检测变更
    ↓
├─ 安装前端依赖
├─ 构建前端（输出到backend/public）
├─ 安装后端依赖
└─ 启动后端服务器
    ↓
部署完成，前后端通信正常
```

## Components and Interfaces

### 1. Git Repository Cleanup Component

**职责**: 清理后端目录中的Git元数据，确保只有根目录包含.git

**实现方式**:
- 手动删除 `phonebook_backend/.git` 目录
- 保留所有源代码文件
- 在根目录初始化或保持现有的Git仓库

**接口**: 无（一次性手动操作）

### 2. Root Package.json Manager

**职责**: 提供统一的脚本入口管理整个monorepo

**配置内容**:
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

**接口**:
- 输入: npm命令
- 输出: 执行结果和日志

### 3. GitHub Actions CI/CD Pipeline

**职责**: 自动化代码质量检查和构建验证

**工作流程**:
1. 触发条件: push到main分支或PR到main分支
2. 检查是否包含#skip标记
3. 设置Node.js环境
4. 安装依赖
5. 执行lint检查
6. 执行前端构建
7. 报告结果

**配置文件**: `.github/workflows/pipeline.yml`

**关键步骤**:
- `actions/checkout@v4`: 检出代码
- `actions/setup-node@v4`: 设置Node.js 20.x
- `actions/cache@v4`: 缓存node_modules
- 自定义步骤: 安装依赖、lint、构建

**接口**:
- 输入: Git push/PR事件
- 输出: 工作流状态（成功/失败）、日志

### 4. Vercel Deployment Configuration

**职责**: 配置Vercel平台识别monorepo结构并正确部署

**配置文件**: `vercel.json`

**关键配置**:
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

**设计要点**:
- `buildCommand`: 先构建前端（输出到backend/public），再安装后端依赖
- `outputDirectory`: 指向后端目录作为部署根目录
- `rewrites`: 配置路由规则，API请求转发到后端，其他请求由前端处理
- `framework: null`: 明确告诉Vercel这不是标准框架项目

**接口**:
- 输入: Vercel部署触发
- 输出: 部署URL和状态

### 5. Frontend Build Configuration

**职责**: 确保前端构建产物输出到后端public目录

**配置文件**: `phonebook_frontend/vite.config.js`

**现有配置**（已正确）:
```javascript
build: {
  outDir: '../phonebook_backend/public',
  emptyOutDir: true
}
```

**设计要点**:
- 构建产物直接输出到后端的静态文件目录
- 后端通过`express.static('public')`提供前端文件
- 前端API请求通过相对路径`/api`访问后端

**接口**:
- 输入: `npm run build`命令
- 输出: HTML、JS、CSS文件到`../phonebook_backend/public`

### 6. Backend Static File Serving

**职责**: 后端服务器提供前端静态文件和API服务

**实现**（已存在）:
```javascript
app.use(express.static('public'))
```

**路由策略**:
- `/api/*`: 后端API路由
- `/*`: 前端静态文件（index.html作为fallback）

**接口**:
- 输入: HTTP请求
- 输出: API响应或静态文件内容

## Data Models

### Configuration Files Data Model

#### vercel.json
```typescript
interface VercelConfig {
  version: number;
  buildCommand: string;
  outputDirectory: string;
  installCommand: string;
  devCommand: string;
  framework: null | string;
  rewrites: Array<{
    source: string;
    destination: string;
  }>;
}
```

#### Root package.json
```typescript
interface RootPackageJson {
  name: string;
  version: string;
  private: boolean;
  scripts: {
    [key: string]: string;  // 各种管理脚本
  };
}
```

#### GitHub Actions Workflow
```typescript
interface WorkflowConfig {
  name: string;
  on: {
    push: { branches: string[] };
    pull_request: { branches: string[]; types: string[] };
  };
  jobs: {
    [jobName: string]: {
      'runs-on': string;
      needs?: string[];
      if?: string;
      steps: Array<{
        name: string;
        uses?: string;
        run?: string;
        with?: Record<string, any>;
      }>;
    };
  };
}
```

## Error Handling

### 1. Git Cleanup Errors

**场景**: 删除后端.git目录时可能遇到权限问题

**处理策略**:
- 使用`rm -rf`命令（macOS/Linux）
- 如果权限不足，使用`sudo`
- 验证删除成功：检查目录不存在

### 2. CI/CD Pipeline Failures

**场景**: ESLint检查失败或构建失败

**处理策略**:
- 在workflow中使用`set -e`确保错误时立即失败
- 每个步骤独立执行，失败时显示清晰的错误信息
- 使用`continue-on-error: false`确保关键步骤失败时停止流程

**错误类型**:
- ESLint错误: 显示具体的代码位置和规则
- 构建错误: 显示Vite构建日志
- 依赖安装错误: 显示npm错误信息

### 3. Vercel Deployment Errors

**场景**: Vercel部署失败

**常见原因和解决方案**:

| 错误类型 | 原因 | 解决方案 |
|---------|------|---------|
| Build timeout | 构建时间超过限制 | 优化构建配置，使用缓存 |
| Module not found | 依赖未正确安装 | 检查buildCommand中的npm install |
| Environment variables missing | 缺少.env变量 | 在Vercel项目设置中配置环境变量 |
| Port binding error | 端口配置错误 | 使用`process.env.PORT`而非硬编码端口 |

**处理策略**:
- 在Vercel控制台查看详细构建日志
- 使用Vercel CLI本地测试：`vercel dev`
- 确保环境变量在Vercel项目设置中正确配置

### 4. Frontend-Backend Communication Errors

**场景**: 部署后前后端无法通信

**处理策略**:
- 确保前端API请求使用相对路径（`/api/...`）
- 验证vercel.json中的rewrites配置正确
- 检查后端路由是否正确处理`/api`前缀
- 使用浏览器开发者工具检查网络请求

**验证方法**:
```bash
# 测试API端点
curl https://your-app.vercel.app/api/persons

# 测试前端
curl https://your-app.vercel.app/
```

## Testing Strategy

### 1. Local Testing

**目标**: 在本地环境验证所有配置正确

**测试步骤**:
1. 清理Git历史后验证仓库状态
   ```bash
   git status
   git log
   ```

2. 测试根目录脚本
   ```bash
   npm run install:all
   npm run lint
   npm run build:frontend
   ```

3. 测试本地开发环境
   ```bash
   # 终端1: 启动后端
   npm run dev:backend
   
   # 终端2: 启动前端开发服务器
   npm run dev:frontend
   
   # 访问 http://localhost:5173 测试功能
   ```

4. 测试生产构建
   ```bash
   npm run build:frontend
   npm run start:backend
   # 访问 http://localhost:3001 测试功能
   ```

### 2. CI/CD Pipeline Testing

**目标**: 验证GitHub Actions工作流正确执行

**测试步骤**:
1. 创建测试分支并推送
2. 创建PR到main分支
3. 观察GitHub Actions执行情况
4. 验证所有检查通过
5. 测试#skip功能

**验证点**:
- [ ] ESLint检查前端代码
- [ ] ESLint检查后端代码
- [ ] 前端构建成功
- [ ] 工作流在5分钟内完成
- [ ] 包含#skip的提交跳过部署

### 3. Vercel Deployment Testing

**目标**: 验证Vercel部署成功且功能正常

**测试步骤**:
1. 连接GitHub仓库到Vercel
2. 配置环境变量（MONGODB_URI等）
3. 触发部署
4. 验证部署成功

**功能测试**:
- [ ] 访问根URL显示前端应用
- [ ] 前端可以获取联系人列表（GET /api/persons）
- [ ] 前端可以添加新联系人（POST /api/persons）
- [ ] 前端可以删除联系人（DELETE /api/persons/:id）
- [ ] 前端可以更新联系人（PUT /api/persons/:id）
- [ ] 浏览器控制台无错误
- [ ] 网络请求正常（无CORS错误）

### 4. Integration Testing

**目标**: 验证整个工作流从开发到部署的完整性

**测试场景**:
1. 开发者修改前端代码
2. 提交并推送到GitHub
3. CI/CD检查通过
4. 合并到main分支
5. Vercel自动部署
6. 验证新功能在生产环境工作

**验证点**:
- [ ] 代码变更触发CI/CD
- [ ] CI/CD检查通过
- [ ] Vercel自动部署
- [ ] 部署后功能正常
- [ ] 前后端通信正常

## Implementation Notes

### 关键依赖关系

1. **前端构建依赖后端目录结构**
   - 前端vite.config.js中的outDir指向`../phonebook_backend/public`
   - 必须确保后端public目录存在

2. **Vercel部署依赖构建顺序**
   - 必须先构建前端（生成静态文件）
   - 再安装后端依赖
   - 最后启动后端服务器

3. **CI/CD依赖Node.js版本**
   - 使用Node.js 20.x（LTS版本）
   - 确保前后端都兼容此版本

### 环境变量管理

**开发环境**:
- 后端: `phonebook_backend/.env`文件
- 前端: Vite自动代理到后端

**生产环境（Vercel）**:
- 在Vercel项目设置中配置环境变量
- 必需变量: `MONGODB_URI`, `PORT`（Vercel自动提供）

### 性能优化

1. **CI/CD缓存**
   - 缓存node_modules减少安装时间
   - 使用`actions/cache@v4`

2. **Vercel构建优化**
   - 利用Vercel的构建缓存
   - 优化依赖安装（只安装生产依赖）

3. **前端构建优化**
   - Vite默认进行代码分割和压缩
   - 确保生产构建使用`npm run build`

### 安全考虑

1. **环境变量保护**
   - 不提交.env文件到Git
   - 在Vercel中安全存储敏感信息

2. **依赖安全**
   - 定期运行`npm audit`
   - 及时更新有安全漏洞的依赖

3. **API安全**
   - 后端实现适当的错误处理
   - 验证用户输入（已在后端实现）
