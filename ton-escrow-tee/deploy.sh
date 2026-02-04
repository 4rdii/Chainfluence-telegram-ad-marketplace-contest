#!/bin/bash
set -e

echo "=== TEE Deployment Script ==="
echo ""

# Set Docker host
export DOCKER_HOST=unix:///home/ardeshir/.docker/desktop/docker.sock

# Build Docker image
echo "Building Docker image..."
docker build -t docker.io/4rdii/ton-escrow-tee:latest .

# Push to Docker Hub
echo ""
echo "Pushing to Docker Hub..."
docker push docker.io/4rdii/ton-escrow-tee:latest

# Upgrade EigenCompute app
echo ""
echo "Upgrading EigenCompute app..."
ecloud compute app upgrade 0x113DF00a8cb0Aa2b3cd12FF13Ac21c7f07a966Ec --image-ref docker.io/4rdii/ton-escrow-tee:latest

echo ""
echo "=== Deployment Complete ==="
echo "TEE URL: http://104.196.106.144:8000"
