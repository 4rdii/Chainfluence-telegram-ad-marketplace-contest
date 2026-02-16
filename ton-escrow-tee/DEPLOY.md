# TEE Deployment Instructions

## Prerequisites
- Docker Desktop running
- Docker Hub account (4rdii)
- ecloud CLI installed and authenticated

## Deployment Commands

```bash
# Navigate to TEE directory
cd ton-escrow-tee

# Set Docker host (if using Docker Desktop on Linux)
export DOCKER_HOST=unix:///home/ardeshir/.docker/desktop/docker.sock

# Build Docker image
docker build -t docker.io/4rdii/ton-escrow-tee:latest .

# Push to Docker Hub
docker push docker.io/4rdii/ton-escrow-tee:latest

# Upgrade EigenCompute app
ecloud compute app upgrade 0x113DF00a8cb0Aa2b3cd12FF13Ac21c7f07a966Ec --image-ref docker.io/4rdii/ton-escrow-tee:latest
```

## App Details
- **App ID**: `0x113DF00a8cb0Aa2b3cd12FF13Ac21c7f07a966Ec`
- **Image**: `docker.io/4rdii/ton-escrow-tee:latest`
- **Deployed URL**: `http://104.196.106.144:3000`

## Quick Deploy Script

```bash
#!/bin/bash
cd ton-escrow-tee
export DOCKER_HOST=unix:///home/ardeshir/.docker/desktop/docker.sock
docker build -t docker.io/4rdii/ton-escrow-tee:latest . && \
docker push docker.io/4rdii/ton-escrow-tee:latest && \
ecloud compute app upgrade 0x113DF00a8cb0Aa2b3cd12FF13Ac21c7f07a966Ec --image-ref docker.io/4rdii/ton-escrow-tee:latest
```

## Environment Variables (set in EigenCompute KMS)
- `MNEMONIC` - TEE mnemonic (automatically available)
- `BOT_TOKEN` - Telegram bot token
- `DEAL_REGISTRY_ADDRESS` - TON smart contract address
- `TESTNET` - Set to "true" for testnet
- `TONCENTER_API_KEY` - TON Center API key (optional)

**Note**: `VERIFICATION_CHAT_ID` is now passed as a request parameter, not an env var.
