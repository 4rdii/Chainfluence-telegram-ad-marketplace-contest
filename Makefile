# Rebuild backend image (no cache) and start all services.
# Use this after changing backend code so the new routes (e.g. DELETE /v1/channels/:id) are in the running container.
up:
	docker compose up -d

# Rebuild backend image without cache, then start. Required when backend source (e.g. controllers) changed.
build-backend-and-up:
	docker compose build backend --no-cache
	docker compose up -d

.PHONY: up build-backend-and-up
