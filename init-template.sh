#!/bin/bash

# 脚手架模板初始化脚本
# 使用方法: ./init-template.sh <项目名称> <作者名称> [年份]

set -e

# 检查参数
if [ $# -lt 2 ]; then
    echo "使用方法: $0 <项目名称> <作者名称> [年份]"
    echo "示例: $0 my-awesome-project \"John Doe\" 2024"
    exit 1
fi

PROJECT_NAME="$1"
AUTHOR_NAME="$2"
YEAR="${3:-$(date +%Y)}"

echo "正在初始化项目模板..."
echo "项目名称: $PROJECT_NAME"
echo "作者: $AUTHOR_NAME"
echo "年份: $YEAR"
echo ""

# 检查项目名称是否符合规范（小写字母、数字、连字符）
if ! [[ "$PROJECT_NAME" =~ ^[a-z0-9-]+$ ]]; then
    echo "错误: 项目名称只能包含小写字母、数字和连字符"
    exit 1
fi

# 替换文件内容中的占位符
echo "正在替换文件内容..."

# 替换项目名称
find . -type f \( -name "*.json" -o -name "*.md" -o -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.yml" -o -name "*.yaml" -o -name "dockerfile" -o -name "*.conf" -o -name "*.env" \) -not -path "./node_modules/*" -not -path "./.git/*" -exec sed -i '' "s/{{projectName}}/$PROJECT_NAME/g" {} \;

# 替换作者名称
find . -type f \( -name "*.json" -o -name "*.md" -o -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.yml" -o -name "*.yaml" \) -not -path "./node_modules/*" -not -path "./.git/*" -exec sed -i '' "s/{{authorName}}/$AUTHOR_NAME/g" {} \;

# 替换年份
find . -type f \( -name "*.json" -o -name "*.md" -o -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.yml" -o -name "*.yaml" \) -not -path "./node_modules/*" -not -path "./.git/*" -exec sed -i '' "s/{{year}}/$YEAR/g" {} \;

# 重命名目录
echo "正在重命名项目目录..."
if [ -d "packages/{{projectName}}-server" ]; then
    mv "packages/{{projectName}}-server" "packages/$PROJECT_NAME-server"
fi

if [ -d "packages/{{projectName}}-fe" ]; then
    mv "packages/{{projectName}}-fe" "packages/$PROJECT_NAME-fe"
fi

if [ -d "packages/{{projectName}}-manage" ]; then
    mv "packages/{{projectName}}-manage" "packages/$PROJECT_NAME-manage"
fi

if [ -d "packages/{{projectName}}-db" ]; then
    mv "packages/{{projectName}}-db" "packages/$PROJECT_NAME-db"
fi

# 删除模板相关文件
echo "正在清理模板文件..."
rm -f USAGE.md
rm -f init-template.sh

echo ""
echo "✅ 模板初始化完成！"
echo ""
echo "接下来的步骤:"
echo "1. 安装依赖: pnpm install"
echo "2. 配置环境变量文件 (.env)"
echo "3. 启动开发环境:"
echo "   - 数据库: pnpm db-build"
echo "   - 后端: pnpm server-dev"
echo "   - 前端: pnpm fe-dev"
echo ""
echo "🎉 祝您开发愉快！" 