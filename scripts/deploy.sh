#!/usr/bin/env bash
# ==============================================================================
# Production Deployment Script with Automated Health Check and Rollback
# Usage:
#   ./scripts/deploy.sh [IMAGE_TAG]
# Examples:
#   ./scripts/deploy.sh latest
#   ./scripts/deploy.sh sha-1a2b3c4
# ==============================================================================

set -euo pipefail

TARGET_TAG="${1:-latest}"
COMPOSE_FILE="compose.prod.yaml"
ENV_FILE=".env.prod"

echo "=========================================="
echo "  Starting Production Deployment          "
echo "  Target Image Tag: ${TARGET_TAG}         "
echo "=========================================="

# Ensure compose file and env file exist
if [ ! -f "$COMPOSE_FILE" ]; then
  echo "ERROR: $COMPOSE_FILE not found in current directory!"
  exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: $ENV_FILE not found in current directory!"
  exit 1
fi

# Step 1: Backup current running images for reliable rollback
echo "--> Backing up currently active images as :rollback-backup..."
for svc in server client admin; do
  IMG_NAME=$(docker inspect --format='{{.Config.Image}}' "mern-docker-learning-${svc}-prod" 2>/dev/null || true)
  if [ -n "$IMG_NAME" ]; then
    REPO=$(echo "$IMG_NAME" | cut -d':' -f1)
    docker tag "$IMG_NAME" "${REPO}:rollback-backup" || true
    echo "    Backed up: ${REPO}:rollback-backup"
  fi
done

# Step 2: Pull and launch the target images
echo "--> Pulling and starting target images (${TARGET_TAG})..."
export IMAGE_TAG="${TARGET_TAG}"
DEPLOY_STATUS="success"

if ! docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" pull; then
  echo "ERROR: Failed to pull images for tag ${TARGET_TAG}"
  DEPLOY_STATUS="failed"
elif ! docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --wait --remove-orphans; then
  echo "ERROR: docker compose up failed or container healthcheck failed"
  DEPLOY_STATUS="failed"
fi

# Step 3: Perform live HTTP Health Probes
if [ "$DEPLOY_STATUS" = "success" ]; then
  echo "--> Verifying application HTTP health checks..."
  HEALTH_PASSED=false

  for attempt in $(seq 1 12); do
    API_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1/api/v1/health || true)
    CLIENT_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1/ || true)

    if [ "$API_CODE" = "200" ] && [ "$CLIENT_CODE" = "200" ]; then
      echo "    Health checks PASSED on attempt ${attempt}! (API: 200, Client: 200)"
      HEALTH_PASSED=true
      break
    fi

    echo "    Attempt ${attempt}/12: API=${API_CODE}, Client=${CLIENT_CODE}. Retrying in 5s..."
    sleep 5
  done

  if [ "$HEALTH_PASSED" != "true" ]; then
    echo "ERROR: HTTP Health checks failed after 12 attempts!"
    DEPLOY_STATUS="failed"
  fi
fi

# Step 4: Handle Failure & Automated Rollback
if [ "$DEPLOY_STATUS" = "failed" ]; then
  echo "=========================================="
  echo "  CRITICAL: HEALTH CHECK FAILED!          "
  echo "  Initiating automatic rollback...        "
  echo "=========================================="

  echo "--> Recent server logs before rollback:"
  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" logs --tail=60 server || true

  echo "--> Restoring previous working version (:rollback-backup)..."
  export IMAGE_TAG="rollback-backup"
  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --remove-orphans

  echo "--> Verifying rollback health..."
  sleep 5
  ROLLBACK_API=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1/api/v1/health || true)
  echo "    Rollback completed. Current API status: ${ROLLBACK_API}"

  echo "Deployment failed and safely rolled back to previous version."
  exit 1
fi

# Step 5: Finalize Successful Deployment
echo "--> Reloading Nginx configuration..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T main-nginx nginx -s reload || true

echo "--> Cleaning up dangling images..."
docker image prune -f

echo "=========================================="
echo "  Deployment completed successfully!      "
echo "=========================================="
