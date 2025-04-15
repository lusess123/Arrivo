#!/bin/bash

set -e

# 获取最新 Git 提交的时间（UTC）
GIT_COMMIT_TIME=$(git log -1 --format=%ai)

GIT_COMMIT_MESSAGE=$(git log -1 --pretty=format:%s)

# 将北京时间和提交信息传递给 Docker 容器
export GIT_COMMIT_TIME
export GIT_COMMIT_MESSAGE

# 是否使用国内镜像源（true/false），这里默认true，可以改为参数传入
USE_MIRROR=${1:-true}

# 构建 Docker 镜像
echo "Building Docker images..."

# 构建 Docker 镜像，传入参数
echo "Building Docker images with USE_MIRROR=$USE_MIRROR..."
docker compose build \
  --build-arg USE_MIRROR=$USE_MIRROR \
  --build-arg GIT_COMMIT_TIME="$GIT_COMMIT_TIME" \
  --build-arg GIT_COMMIT_MESSAGE="$GIT_COMMIT_MESSAGE" \
  --progress=plain


# docker compose build --progress=plain 

echo $GIT_COMMIT_TIME
echo $GIT_COMMIT_MESSAGE

# 关闭并重新启动 Docker 容器
docker compose down
docker compose up -d


# 获取所有镜像的名称
images=$(docker ps -a --format '{{.Image}}' | sort | uniq)

for image in $images; do
  echo "正在处理镜像: $image"
  
  # 获取此镜像的所有容器，按创建时间排序 (最新在前)
  containers=$(docker ps -a --filter ancestor="$image" --format '{{.ID}}')

  # 最新容器 (保留)
  latest_container=$(echo "$containers" | head -n1)

  echo "保留最新容器: $latest_container"

  # 旧容器 (要删除)
  old_containers=$(echo "$containers" | tail -n +2)

  for container in $old_containers; do
    echo "删除旧容器: $container"

    # 获取容器使用的卷
    volumes=$(docker inspect -f '{{range .Mounts}}{{println .Name}}{{end}}' $container)

    # 强制删除容器
    docker rm -f $container

    # 删除卷（前提是卷未被其他容器使用）
    for volume in $volumes; do
      if [ "$(docker ps -a --filter volume=$volume -q)" == "" ]; then
        echo "删除未使用的卷: $volume"
        docker volume rm $volume
      else
        echo "卷 $volume 被其他容器使用，跳过删除"
      fi
    done
  done

done


#!/bin/bash

echo "开始清理旧版本的 Docker 镜像..."

# 遍历每个镜像仓库（Repository）
docker images --format "{{.Repository}}" | sort -u | while read repo; do
    # 获取该镜像的最新 ID（按创建时间排序，取第一行）
    latest_image_id=$(docker images --format "{{.ID}}" "$repo" | head -n 1)

    # 获取该仓库的所有镜像 ID
    all_image_ids=$(docker images --format "{{.ID}}" "$repo")

    for image_id in $all_image_ids; do
        # 跳过最新的镜像
        if [ "$image_id" == "$latest_image_id" ]; then
            echo "保留最新镜像: $repo ($image_id)"
            continue
        fi

        # 检查镜像是否正在使用（是否有运行的容器依赖它）
        if docker ps -q --filter "ancestor=$image_id" | grep -q .; then
            echo "跳过正在使用的镜像: $image_id"
            continue
        fi

        # 删除旧镜像
        echo "删除旧版本的镜像: $image_id"
        docker rmi -f "$image_id"
    done
done

# 清理 dangling images（无标签的镜像）
echo "删除悬空镜像（无标签镜像）..."
docker image prune -f
docker volume prune -f

echo "旧版本 Docker 镜像清理完成！"

# 清理未使用的 Docker 卷
# echo "docker volume prune -f..."
# docker system prune -a -f
# docker system prune  -f
docker system df