# Implementation Plan

- [x] 1. 清理Git历史并设置Monorepo结构
  - 删除phonebook_backend目录中的.git目录及其所有内容
  - 验证根目录的.git仓库正常工作
  - 确认所有源代码文件保持完整
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 2. 创建根目录package.json和管理脚本
  - 在项目根目录创建package.json文件
  - 定义install:frontend、install:backend、install:all脚本用于依赖安装
  - 定义lint:frontend、lint:backend、lint脚本用于代码检查
  - 定义build:frontend脚本用于前端构建
  - 定义dev:frontend、dev:backend、start:backend脚本用于开发和运行
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 3. 完善GitHub Actions CI/CD流水线
- [x] 3.1 更新pipeline.yml配置文件
  - 在simple_deployment_pipeline job中添加Node.js环境设置（使用actions/setup-node@v4，版本20.x）
  - 添加代码检出步骤（actions/checkout@v4）
  - 配置node_modules缓存以提升构建速度（actions/cache@v4）
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 3.2 实现前端ESLint检查步骤
  - 添加前端依赖安装步骤（cd phonebook_frontend && npm ci）
  - 添加前端ESLint执行步骤（cd phonebook_frontend && npm run lint）
  - 配置步骤在检测到错误时失败
  - _Requirements: 2.1, 2.4_

- [x] 3.3 实现后端ESLint检查步骤
  - 添加后端依赖安装步骤（cd phonebook_backend && npm ci）
  - 添加后端ESLint执行步骤（cd phonebook_backend && npx eslint .）
  - 配置步骤在检测到错误时失败
  - _Requirements: 2.2, 2.4_

- [x] 3.4 实现前端构建验证步骤
  - 添加前端构建步骤（cd phonebook_frontend && npm run build）
  - 验证构建产物生成成功
  - 配置步骤在构建失败时失败
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 4. 创建Vercel部署配置
- [x] 4.1 创建vercel.json配置文件
  - 在项目根目录创建vercel.json文件
  - 配置version为2
  - 设置buildCommand先构建前端再安装后端依赖
  - 设置outputDirectory指向phonebook_backend
  - 设置installCommand为空（在buildCommand中处理）
  - 设置devCommand为后端开发命令
  - 设置framework为null
  - _Requirements: 4.1, 4.4, 4.5_

- [x] 4.2 配置Vercel路由规则
  - 在vercel.json中添加rewrites配置
  - 配置/api/*路由转发到后端API
  - 配置其他路由返回前端应用（SPA fallback）
  - _Requirements: 4.2, 4.3_

- [x] 5. 验证和测试配置
- [x] 5.1 本地测试根目录脚本
  - 执行npm run install:all验证依赖安装
  - 执行npm run lint验证代码检查功能
  - 执行npm run build:frontend验证前端构建
  - 执行npm run dev:backend和dev:frontend验证开发环境
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 5.2 测试生产构建和部署
  - 执行前端构建并验证产物输出到phonebook_backend/public
  - 启动后端服务器并访问http://localhost:3001
  - 验证前端页面正常显示
  - 验证前后端API通信正常
  - _Requirements: 4.3_

- [ ]* 5.3 测试GitHub Actions工作流
  - 创建测试分支并推送代码
  - 创建PR到main分支
  - 观察GitHub Actions执行情况
  - 验证所有检查步骤通过
  - 测试包含#skip的提交是否跳过部署
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4_

- [x] 6. 创建部署说明文档
  - 在项目根目录创建DEPLOYMENT.md文件（中文）
  - 编写项目结构说明章节
  - 编写本地开发环境设置章节（包括依赖安装、环境变量配置）
  - 编写GitHub Actions CI/CD流程说明章节
  - 编写Vercel部署步骤章节（包括仓库连接、环境变量配置、部署触发）
  - 编写配置文件说明章节（vercel.json、pipeline.yml、根package.json）
  - 编写常见问题排查章节（构建失败、部署失败、通信失败等）
  - 编写验证部署成功的测试步骤章节
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
