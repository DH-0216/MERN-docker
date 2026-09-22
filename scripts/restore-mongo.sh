#!/usr/bin/env bash
# ==============================================================================
# MongoDB Restore Script for Docker Production
# ==============================================================================
# Usage: ./scripts/restore-mongo.sh <path_to_backup_archive.gz>
# Example: ./scripts/restore-mongo.sh ./backups/mongo/dockerDB_20260922_120000.archive.gz
# ==============================================================================

set -euo pipefail

if [ -z "${1:-}" ]; then
    echo "Usage: $0 <path_to_backup_archive.gz>"
    exit 1
fi

BACKUP_FILE="$1"
CONTAINER_NAME="${MONGO_CONTAINER:-mongo-prod-container}"
DB_NAME="${MONGO_DB:-dockerDB}"

if [ ! -f "${BACKUP_FILE}" ]; then
    echo "🔴 Backup file not found: ${BACKUP_FILE}" >&2
    exit 1
fi

echo "⚠️  WARNING: Restoring will overwrite existing data in '${DB_NAME}' on container '${CONTAINER_NAME}'."
read -rp "Are you sure you want to proceed? (yes/no): " CONFIRM
if [ "${CONFIRM}" != "yes" ]; then
    echo "Restore cancelled."
    exit 0
fi

echo "==> Restoring database from '${BACKUP_FILE}'..."
docker exec -i "${CONTAINER_NAME}" mongorestore --nsInclude="${DB_NAME}.*" --archive --gzip --drop < "${BACKUP_FILE}"

echo "✅ Database restore completed successfully."
