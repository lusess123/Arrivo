# 脚手架模板使用说明

这是一个基于 Arrivo 项目的可复用脚手架模板，可以快速生成新的全栈项目。

## 项目结构

- `packages/{{projectName}}-server/` - NestJS 后端服务
- `packages/{{projectName}}-fe/` - 前端应用（使用 UmiJS + Antd）
- `packages/{{projectName}}-manage/` - 管理后台（使用 UmiJS + Antd）
- `packages/{{projectName}}-db/` - 数据库模块（使用 Prisma）

## 快速开始

### 1. 克隆模板

```bash
git clone <template-repo-url> <your-project-name>
cd <your-project-name>
```

### 2. 替换占位符

在使用前，请替换以下占位符：

- `{{projectName}}` - 你的项目名称（小写，用于包名和目录名）
- `{{authorName}}` - 作者姓名
- `{{year}}` - 年份（通常是当前年份）

你可以使用以下命令进行批量替换：

```bash
# 替换项目名称
find . -type f -name "*.json" -o -name "*.md" -o -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.yml" -o -name "*.yaml" -o -name "dockerfile" -o -name "*.conf" | xargs sed -i '' 's/{{projectName}}/your-project-name/g'

# 替换作者名称
find . -type f -name "*.json" -o -name "*.md" -o -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.yml" -o -name "*.yaml" | xargs sed -i '' 's/{{authorName}}/Your Name/g'

# 替换年份
find . -type f -name "*.json" -o -name "*.md" -o -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.yml" -o -name "*.yaml" | xargs sed -i '' 's/{{year}}/2024/g'
```

### 3. 重命名目录

如果需要重命名包目录，请手动执行：

```bash
mv packages/{{projectName}}-server packages/your-project-name-server
mv packages/{{projectName}}-fe packages/your-project-name-fe
mv packages/{{projectName}}-manage packages/your-project-name-manage
mv packages/{{projectName}}-db packages/your-project-name-db
```

### 4. 安装依赖

```bash
pnpm install
```

### 5. 配置环境变量

复制各个包中的 `.env` 文件并根据实际情况修改配置。

### 6. 启动开发环境

```bash
# 启动数据库
pnpm db-build

# 启动后端服务
pnpm server-dev

# 启动前端应用
pnpm fe-dev
```

## 构建生产版本

```bash
# 构建所有包
pnpm db-build
pnpm server-build
pnpm fe-build
pnpm manage-build
```

## Docker 部署

项目包含完整的 Docker 配置：

```bash
docker-compose up -d
```

## 注意事项

1. 确保所有占位符都已正确替换
2. 检查各个 package.json 中的依赖关系
3. 根据实际需求修改数据库 schema
4. 更新 README.md 中的项目描述
5. 配置正确的环境变量

## 技术栈

- **后端**: NestJS + Prisma + TypeScript
- **前端**: UmiJS + React + Antd + TypeScript
- **数据库**: PostgreSQL (可配置)
- **容器化**: Docker + Docker Compose
- **包管理**: pnpm workspace

## 联系

如有问题，请联系 {{authorName}}。 