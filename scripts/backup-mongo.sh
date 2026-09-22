#!/usr/bin/env bash
# ==============================================================================
# MongoDB Automated Backup Script for Docker Production
# ==============================================================================
# Usage: ./scripts/backup-mongo.sh
# Can be scheduled via cron (e.g. Daily at 02:00 AM):
#   0 2 * * * /path/to/MERN-docker/scripts/backup-mongo.sh >> /var/log/mongo-backup.log 2>&1
# ==============================================================================

set -euo pipefail

# Configuration
CONTAINER_NAME="${MONGO_CONTAINER:-mongo-prod-container}"
BACKUP_DIR="${BACKUP_PATH:-./backups/mongo}"
DB_NAME="${MONGO_DB:-dockerDB}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_${TIMESTAMP}.archive.gz"
RETENTION_DAYS=7

echo "==> [$(date)] Starting MongoDB backup for database '${DB_NAME}'..."

# Ensure backup destination directory exists
mkdir -p "${BACKUP_DIR}"

# Execute mongodump inside the container and compress directly to host file
if docker exec "${CONTAINER_NAME}" mongodump --db="${DB_NAME}" --archive --gzip > "${BACKUP_FILE}"; then
    BACKUP_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
    echo "✅ [$(date)] Backup completed successfully: ${BACKUP_FILE} (${BACKUP_SIZE})"
else
    echo "🔴 [$(date)] Backup failed!" >&2
    exit 1
fi

# Rotate old backups (delete files older than RETENTION_DAYS)
echo "==> Cleaning up backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -name "${DB_NAME}_*.archive.gz" -type f -mtime +${RETENTION_DAYS} -delete
echo "✅ Retention rotation complete."
