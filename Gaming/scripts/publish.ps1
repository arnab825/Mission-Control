param(
    [Parameter(Position=0, Mandatory=$true)]
    [string]$Title,

    [Parameter(Position=1, Mandatory=$false, ValueFromRemainingArguments=$true)]
    [string[]]$Changes = @(),

    [Parameter(Mandatory=$false)]
    [ValidateSet("patch", "minor", "major")]
    [string]$Type = "patch",

    [string]$Image = $null,

    [string]$Version = $null
)

Write-Host "[PUBLISH] Starting release process..." -ForegroundColor Cyan

# Auto-load ALL secrets from .env files into this session
foreach ($envPath in @(
    "$PSScriptRoot/../backend/.env",
    "$PSScriptRoot/../.env",
    "$PSScriptRoot/../website/.env.local"
)) {
    if (Test-Path $envPath) {
        Write-Host "[ENV] Loading secrets from $envPath..." -ForegroundColor DarkGray
        Get-Content $envPath | ForEach-Object {
            # Skip blank lines and comments
            if ($_ -match '^\s*#' -or $_ -notmatch '=') { return }
            $parts = $_ -split '=', 2
            $key   = $parts[0].Trim()
            $value = $parts[1].Trim().Trim('"').Trim("'")
            # Only set if key is valid and value is not a placeholder
            if ($key -and $value -and $value -notlike '*your_*' -and $value -notlike '*_here') {
                [System.Environment]::SetEnvironmentVariable($key, $value, 'Process')
            }
        }
        break  # Use first .env file found; stop looking
    }
}


Push-Location "$PSScriptRoot/.."
try {
    # If no specific changes provided, or if Title contains semicolons/newlines/pipes, split into bullet items
    if ($Changes.Count -eq 0) {
        $Changes = $Title -split '[;\n\|]' | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne "" }
    } else {
        $expanded = @()
        foreach ($c in $Changes) {
            $parts = $c -split '[;\n\|]' | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne "" }
            $expanded += $parts
        }
        $Changes = $expanded
    }

    # Extract clean single-line title for Git commit/tag if Title has semicolons
    $cleanTitle = ($Title -split '[;\n\|]')[0].Trim()

    # 1. Bump version and update local logs
    $bumpArgs = @()
    if ($Version) {
        Write-Host "[BUMP] Setting manual version to $Version..." -ForegroundColor Cyan
        $bumpArgs += @("--set", $Version, "--title", $cleanTitle, "--changes") + $Changes
    } else {
        Write-Host "[BUMP] Incrementing version ($Type)..." -ForegroundColor Cyan
        $bumpArgs += @("--bump", $Type, "--title", $cleanTitle, "--changes") + $Changes
    }

    if ($Image) {
        $bumpArgs += "--image"
        $bumpArgs += $Image
    }

    # Run bump_version with uv if available, or standard python
    if (Get-Command uv -ErrorAction SilentlyContinue) {
        uv run python scripts/bump_version.py @bumpArgs
    } else {
        python scripts/bump_version.py @bumpArgs
    }

    if ($LASTEXITCODE -eq 0) {
        # 2. Synchronize all docs and package manifests
        Write-Host "[SYNC] Synchronizing documentation and package manifests..." -ForegroundColor Cyan
        python scripts/sync_version.py

        # 3. Stage version release files
        $isGitRepo = $false
        try {
            $gitCheck = git rev-parse --is-inside-work-tree 2>$null
            if ($LASTEXITCODE -eq 0 -and $gitCheck -eq "true") {
                $isGitRepo = $true
            }
        } catch {}

        # 4. Get new version
        $version = (Get-Content backend/version.json | ConvertFrom-Json).version

        if ($isGitRepo) {
            Write-Host "[SYNC] Staging version release files..." -ForegroundColor Cyan
            git add backend/version.json frontend/package.json website/package.json backend/pyproject.toml backend/uv.lock docs/backend/patches.md docs/changes_summary.md docs/SUMMARY.md readme.md 2>$null
            
            # 5. Commit and Tag
            Write-Host "[COMMIT] Creating release v${version}" -ForegroundColor Cyan
            git commit -m "Release v${version}: $Title"
            git tag -a "v${version}" -m "Release v${version}: $Title"
        } else {
            Write-Host "[NOTE] Not a Git repository; skipping Git staging, commit, and tags." -ForegroundColor Yellow
        }
        
        # 6. Build PyInstaller Backend Binary
        Write-Host "[BUILD] Building PyInstaller backend..." -ForegroundColor Cyan
        powershell -ExecutionPolicy Bypass -File .\scripts\build_app.ps1
        if ($LASTEXITCODE -ne 0) {
            Write-Host "[ERROR] PyInstaller backend build failed." -ForegroundColor Red
            exit 1
        }

        # 6. Build binaries and optionally publish release assets to GitHub
        Write-Host "[BUILD] Compiling Electron packages for v${version}..." -ForegroundColor Cyan
        Push-Location "frontend"
        try {
            Write-Host "[BUILD] Building React/Vite frontend assets..." -ForegroundColor Cyan
            npm run build
            if ($LASTEXITCODE -ne 0) {
                Write-Host "[ERROR] Frontend build failed." -ForegroundColor Red
                exit 1
            }

            # Generate release notes markdown for GitHub Releases
            $releaseTitle = "Release v${version}: $cleanTitle"
            $releaseNotesFile = "$PSScriptRoot/../frontend/release-notes.md"
            $changesFormatted = ($Changes | ForEach-Object { "- $_" }) -join "`n"
            $releaseBody = @"
# $releaseTitle

$changesFormatted

### 📦 Available Downloads & Formats
- **Linux (.deb - Debian / Ubuntu / Mint)**: [MissionControl-Linux-${version}.deb](https://github.com/arnab825/Mission-Control/releases/download/v${version}/MissionControl-Linux-${version}.deb)
- **Linux (.AppImage - Universal Linux)**: [MissionControl-Linux-${version}.AppImage](https://github.com/arnab825/Mission-Control/releases/download/v${version}/MissionControl-Linux-${version}.AppImage)
- **Linux (.rpm - Fedora / RHEL / openSUSE)**: [MissionControl-Linux-${version}.rpm](https://github.com/arnab825/Mission-Control/releases/download/v${version}/MissionControl-Linux-${version}.rpm)
- **Linux (.tar.gz - Standalone Linux Archive)**: [MissionControl-Linux-${version}.tar.gz](https://github.com/arnab825/Mission-Control/releases/download/v${version}/MissionControl-Linux-${version}.tar.gz)
- **Windows (.exe - Setup Installer)**: [MissionControl-Setup.exe](https://github.com/arnab825/Mission-Control/releases/download/v${version}/MissionControl-Setup.exe)
- **Windows (.msi - Enterprise Installer)**: [MissionControl-Setup.msi](https://github.com/arnab825/Mission-Control/releases/download/v${version}/MissionControl-Setup.msi)
- **Windows (.zip - Portable Windows Archive)**: [MissionControl-Windows-${version}.zip](https://github.com/arnab825/Mission-Control/releases/download/v${version}/MissionControl-Windows-${version}.zip)
"@
            Set-Content -Path $releaseNotesFile -Value $releaseBody -Encoding UTF8

            # Kill any lingering 7za / archiver processes that may lock files in out/dist
            Get-Process -Name "7za" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
            Get-ChildItem -Path "$PSScriptRoot/../frontend/out/dist/*.tar*" -ErrorAction SilentlyContinue | Remove-Item -Force -ErrorAction SilentlyContinue
            Remove-Item -Force -Recurse "$PSScriptRoot/../frontend/out/dist/__msi-x64" -ErrorAction SilentlyContinue

            $token = if ($env:GH_TOKEN) { $env:GH_TOKEN } else { $env:GITHUB_TOKEN }

            if ($token) {
                Write-Host "[PUBLISH] GH_TOKEN detected! Publishing $releaseTitle (Windows & Linux tar.gz) to GitHub Releases..." -ForegroundColor Cyan
                npx electron-builder --win nsis msi zip --linux tar.gz --publish always
            } else {
                Write-Host "[BUILD] Compiling local Windows installers (NSIS, MSI, ZIP) and Linux packages in frontend/out/dist..." -ForegroundColor Yellow
                npx electron-builder --win nsis msi zip --linux tar.gz --publish never
            }

            # Build Debian package (.deb) directly
            try {
                Write-Host "[BUILD] Packaging Linux Debian package (.deb)..." -ForegroundColor Cyan
                python ../scripts/pack_deb.py "$version"
            } catch {
                Write-Warning "Debian packaging encountered an error: $_"
            }
        } catch {
            Write-Host "[ERROR] Binary packaging encountered a fatal error: $_" -ForegroundColor Red
            exit 1
        } finally {
            if ($releaseNotesFile -and (Test-Path $releaseNotesFile)) {
                Remove-Item -Force $releaseNotesFile -ErrorAction SilentlyContinue
            }
            Pop-Location
        }

        # 7. Push code and tags to GitHub (if in a git repository)
        if ($isGitRepo) {
            # Include any lockfiles updated by build tools (like uv.lock)
            git add backend/uv.lock backend/pyproject.toml frontend/package.json 2>$null
            $stagedDiff = git diff --staged --name-only 2>$null
            if ($stagedDiff) {
                git commit --amend --no-edit 2>$null
            }

            Write-Host "[PUSH] Pushing to main and syncing tags..." -ForegroundColor Cyan
            $token = if ($env:GH_TOKEN) { $env:GH_TOKEN } else { $env:GITHUB_TOKEN }
            if ($token) {
                git push "https://x-access-token:${token}@github.com/arnab825/Mission-Control.git" main --tags --force
                
                # Upload .deb asset if present and un-draft the release on GitHub
                try {
                    Write-Host "[PUBLISH] Publishing draft release v${version} live on GitHub and uploading extra assets..." -ForegroundColor Cyan
                    $headers = @{ Authorization = "token ${token}"; Accept = "application/vnd.github.v3+json"; "User-Agent" = "MissionControlPublisher" }
                    $releases = Invoke-RestMethod -Uri "https://api.github.com/repos/arnab825/Mission-Control/releases" -Headers $headers
                    $target = $releases | Where-Object { $_.tag_name -eq "v${version}" -or $_.name -like "*${version}*" }
                    if ($target) {
                        # Upload .deb if not already on release
                        $debFile = Resolve-Path "frontend/out/dist/MissionControl-Linux-${version}.deb" -ErrorAction SilentlyContinue
                        if ($debFile -and (Test-Path $debFile)) {
                            $debName = "MissionControl-Linux-${version}.deb"
                            $existingAssets = Invoke-RestMethod -Uri "https://api.github.com/repos/arnab825/Mission-Control/releases/$($target.id)/assets" -Headers $headers
                            $debAsset = $existingAssets | Where-Object { $_.name -eq $debName }
                            if (-not $debAsset) {
                                Write-Host "[UPLOAD] Uploading $debName to GitHub Release..." -ForegroundColor Cyan
                                $uploadUrl = "https://uploads.github.com/repos/arnab825/Mission-Control/releases/$($target.id)/assets?name=$debName"
                                $uploadHeaders = @{ Authorization = "token ${token}"; "Content-Type" = "application/vnd.debian.binary-package"; Accept = "application/vnd.github.v3+json"; "User-Agent" = "MissionControlPublisher" }
                                Invoke-RestMethod -Uri $uploadUrl -Method Post -Headers $uploadHeaders -InFile $debFile.Path | Out-Null
                                Write-Host "[SUCCESS] $debName uploaded to GitHub Release!" -ForegroundColor Green
                            }
                        }

                        if ($target.draft) {
                            $body = @{ draft = $false; name = $releaseTitle } | ConvertTo-Json
                            Invoke-RestMethod -Uri "https://api.github.com/repos/arnab825/Mission-Control/releases/$($target.id)" -Method Patch -Headers $headers -Body $body -ContentType "application/json" | Out-Null
                            Write-Host "[SUCCESS] Release v${version} is now LIVE and marked as Latest on GitHub!" -ForegroundColor Green
                        }
                    }
                } catch {
                    Write-Host "[WARNING] Release post-processing: $_" -ForegroundColor Yellow
                }
            } else {
                git push origin main --tags --force
            }
        } else {
            Write-Host "[NOTE] Not a Git repository; skipping Git remote push." -ForegroundColor Yellow
        }
        
        Write-Host "[SUCCESS] Version v${version} is now built and ready!" -ForegroundColor Green
    } else {
        Write-Host "[ERROR] Release failed during version bump." -ForegroundColor Red
    }
} finally {
    Pop-Location
}
