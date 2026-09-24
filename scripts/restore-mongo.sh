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

# Script directory helper
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Automatically load .env if available
if [ -f "${ROOT_DIR}/.env" ]; then
    set -a
    # shellcheck disable=SC1091
    source "${ROOT_DIR}/.env"
    set +a
elif [ -f "${PWD}/.env" ]; then
    set -a
    # shellcheck disable=SC1091
    source "${PWD}/.env"
    set +a
fi

CONTAINER_NAME="${MONGO_CONTAINER:-mongo-prod-container}"
DB_NAME="${MONGO_DB:-dockerDB}"

if [ ! -f "${BACKUP_FILE}" ]; then
    echo "🔴 Backup file not found: ${BACKUP_FILE}" >&2
    exit 1
fi

# Prepare authentication parameters if credentials are set
AUTH_ARGS=()
if [ -n "${MONGO_USERNAME:-}" ] && [ -n "${MONGO_PASSWORD:-}" ]; then
    AUTH_ARGS=(
        "--username" "${MONGO_USERNAME}"
        "--password" "${MONGO_PASSWORD}"
        "--authenticationDatabase" "admin"
    )
fi

echo "⚠️  WARNING: Restoring will overwrite existing data in '${DB_NAME}' on container '${CONTAINER_NAME}'."
read -rp "Are you sure you want to proceed? (yes/no): " CONFIRM
if [ "${CONFIRM}" != "yes" ]; then
    echo "Restore cancelled."
    exit 0
fi

echo "==> Restoring database from '${BACKUP_FILE}'..."
if docker exec -i "${CONTAINER_NAME}" mongorestore "${AUTH_ARGS[@]}" --nsInclude="${DB_NAME}.*" --archive --gzip --drop < "${BACKUP_FILE}"; then
    echo "✅ Database restore completed successfully."
else
    echo "🔴 Database restore failed!" >&2
    exit 1
fi
