#!/bin/bash
set -e
cd /root/openseo-build
git pull origin main
CID=$(docker ps -q -f name=openseo_openseo | head -n 1)
echo "Found container: $CID"
docker cp src "${CID}:/app/"
echo "Building inside container..."
docker exec -w /app "$CID" pnpm build
echo "Committing image..."
docker commit "$CID" openseo:custom
echo "Updating service..."
docker service update --force openseo_openseo
echo "Deployment completed successfully!"
