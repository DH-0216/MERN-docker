#!/usr/bin/env bash
# ==============================================================================
# MongoDB Automated Backup Script for Docker Production
# ==============================================================================
# Usage: ./scripts/backup-mongo.sh
# Can be scheduled via cron (e.g. Daily at 02:00 AM):
#   0 2 * * * /path/to/MERN-docker/scripts/backup-mongo.sh >> /var/log/mongo-backup.log 2>&1
# ==============================================================================

set -euo pipefail

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

# Configuration
CONTAINER_NAME="${MONGO_CONTAINER:-mongo-prod-container}"
BACKUP_DIR="${BACKUP_PATH:-${ROOT_DIR}/backups/mongo}"
DB_NAME="${MONGO_DB:-dockerDB}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_${TIMESTAMP}.archive.gz"
RETENTION_DAYS=7

# Prepare authentication parameters if credentials are set
AUTH_ARGS=()
if [ -n "${MONGO_USERNAME:-}" ] && [ -n "${MONGO_PASSWORD:-}" ]; then
    AUTH_ARGS=(
        "--username" "${MONGO_USERNAME}"
        "--password" "${MONGO_PASSWORD}"
        "--authenticationDatabase" "admin"
    )
fi

echo "==> [$(date)] Starting MongoDB backup for database '${DB_NAME}'..."

# Ensure backup destination directory exists
mkdir -p "${BACKUP_DIR}"

# Execute mongodump inside the container and compress directly to host file
if docker exec "${CONTAINER_NAME}" mongodump "${AUTH_ARGS[@]}" --db="${DB_NAME}" --archive --gzip > "${BACKUP_FILE}"; then
    BACKUP_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
    echo "✅ [$(date)] Backup completed successfully: ${BACKUP_FILE} (${BACKUP_SIZE})"
else
    echo "🔴 [$(date)] Backup failed!" >&2
    rm -f "${BACKUP_FILE}"
    exit 1
fi

# Rotate old backups (delete files older than RETENTION_DAYS)
echo "==> Cleaning up backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -name "${DB_NAME}_*.archive.gz" -type f -mtime +${RETENTION_DAYS} -delete
echo "✅ Retention rotation complete."
