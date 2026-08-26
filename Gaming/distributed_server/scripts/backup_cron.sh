#!/bin/bash
# ══════════════════════════════════════════════════════════════════════════════
# Mission Control - Automated Production Database Backup Script
# ══════════════════════════════════════════════════════════════════════════════
set -e

BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DB_USER="${POSTGRES_USER:-mission_control}"
DB_NAME="${POSTGRES_DB:-mission_control}"
CONTAINER_NAME="${CONTAINER_NAME:-mc-postgres}"

mkdir -p "$BACKUP_DIR"

echo "[$(date)] Starting automated PostgreSQL backup for database: $DB_NAME..."

# 1. Take compressed PostgreSQL dump from running Docker container
docker exec "$CONTAINER_NAME" pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$BACKUP_DIR/mc_backup_${TIMESTAMP}.sql.gz"

FILE_SIZE=$(du -h "$BACKUP_DIR/mc_backup_${TIMESTAMP}.sql.gz" | cut -f1)
echo "[$(date)] Backup completed successfully: $BACKUP_DIR/mc_backup_${TIMESTAMP}.sql.gz ($FILE_SIZE)"

# 2. Prune old backups older than 30 days
find "$BACKUP_DIR" -name "mc_backup_*.sql.gz" -type f -mtime +30 -delete
echo "[$(date)] Cleaned up backups older than 30 days."

# 3. Optional: Sync to Cloudflare R2 / AWS S3 via rclone (uncomment if configured)
# if command -v rclone &> /dev/null; then
#     echo "[$(date)] Syncing backup to remote Cloudflare R2 bucket..."
#     rclone copy "$BACKUP_DIR" r2:mission-control-backups/ --fast-list
# fi
