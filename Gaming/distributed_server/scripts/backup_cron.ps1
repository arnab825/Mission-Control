# ══════════════════════════════════════════════════════════════════════════════
# Mission Control - Automated Production Database Backup Script (PowerShell)
# ══════════════════════════════════════════════════════════════════════════════
$ErrorActionPreference = "Stop"

$backupDir = Join-Path $PSScriptRoot "..\backups"
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$dbUser = if ($env:POSTGRES_USER) { $env:POSTGRES_USER } else { "mission_control" }
$dbName = if ($env:POSTGRES_DB) { $env:POSTGRES_DB } else { "mission_control" }
$containerName = if ($env:CONTAINER_NAME) { $env:CONTAINER_NAME } else { "mc-postgres" }

if (-not (Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
}

$dumpFile = Join-Path $backupDir "mc_backup_$timestamp.sql"
Write-Host "[$([DateTime]::Now)] Starting automated database backup for: $dbName..." -ForegroundColor Cyan

# 1. Execute pg_dump inside docker container
docker exec $containerName pg_dump -U $dbUser $dbName | Out-File -FilePath $dumpFile -Encoding utf8

# 2. Compress to .zip
$zipFile = "$dumpFile.zip"
Compress-Archive -Path $dumpFile -DestinationPath $zipFile -Force
Remove-Item $dumpFile -Force

$fileSize = (Get-Item $zipFile).Length / 1MB
Write-Host "[$([DateTime]::Now)] Backup created successfully: $zipFile ($([Math]::Round($fileSize, 2)) MB)" -ForegroundColor Green

# 3. Clean up backups older than 30 days
Get-ChildItem -Path $backupDir -Filter "mc_backup_*.zip" | Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-30) } | Remove-Item -Force
Write-Host "[$([DateTime]::Now)] Pruned backups older than 30 days." -ForegroundColor Gray
