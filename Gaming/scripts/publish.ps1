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
    "$PSScriptRoot/../publisher-gui/.env",
    "$PSScriptRoot/../backend/.env",
    "$PSScriptRoot/../frontend/.env",
    "$PSScriptRoot/../website/.env",
    "$PSScriptRoot/../website/.env.local",
    "$PSScriptRoot/../.env",
    "$PSScriptRoot/../../.env"
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
    }
}


Push-Location "$PSScriptRoot/.."
try {
    # If no specific changes provided, or if Title contains semicolons/newlines/pipes, split into bullet items
    if ($Changes.Count -eq 0) {
        $parts = $Title -split '[;\n\|]' | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne "" }
        if ($parts.Count -gt 1) {
            $cleanTitle = $parts[0]
            $Changes = $parts[1..($parts.Count - 1)]
        } else {
            $cleanTitle = $parts[0]
            $Changes = @($cleanTitle)
        }
    } else {
        $cleanTitle = ($Title -split '[;\n\|]')[0].Trim()
        $expanded = @()
        foreach ($c in $Changes) {
            $parts = $c -split '[;\n\|]' | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne "" }
            $expanded += $parts
        }
        $Changes = $expanded
    }

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

        # Synchronize backend/uv.lock immediately so it matches the bumped pyproject.toml version
        if (Get-Command uv -ErrorAction SilentlyContinue) {
            Write-Host "[SYNC] Synchronizing backend/uv.lock..." -ForegroundColor Cyan
            Push-Location "backend"
            try {
                uv lock
            } catch {
                Write-Warning "uv lock update encountered an error: $_"
            } finally {
                Pop-Location
            }
        }

        # Helper script block to stage all release manifests, lockfiles, winget manifests, and documentation
        $stageReleaseFiles = {
            $pathsToStage = @(
                "backend/version.json",
                "website/version.json",
                "backend/pyproject.toml",
                "backend/uv.lock",
                "frontend/package.json",
                "frontend/package-lock.json",
                "website/package.json",
                "docs",
                "website/docs",
                "winget",
                "../Gaming/winget",
                "distributed_node",
                "readme.md",
                "README.md",
                "../readme.md",
                "../README.md"
            )
            foreach ($p in $pathsToStage) {
                if (Test-Path $p) {
                    git add -A $p 2>$null
                }
            }
            # Automatically stage any modified documentation files across the tree
            git add "*.md" "docs/**/*.md" "website/docs/**/*.md" 2>$null
            # Automatically stage all modified tracked files across the repository
            git add -u 2>$null
            # Explicitly stage newly generated winget manifests and distributed configs
            if (Test-Path "winget") { git add -A "winget" 2>$null }
            if (Test-Path "../Gaming/winget") { git add -A "../Gaming/winget" 2>$null }
            if (Test-Path "distributed_node") { git add -A "distributed_node" 2>$null }
        }

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
            Write-Host "[SYNC] Staging version release files, lockfiles, and documentation..." -ForegroundColor Cyan
            & $stageReleaseFiles
            
            # 5. Commit and Tag
            Write-Host "[COMMIT] Creating release v${version}" -ForegroundColor Cyan
            git commit -m "Release v${version}: $Title"
            git tag -fa "v${version}" -m "Release v${version}: $Title"
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
            $boxEmoji = [char]::ConvertFromUtf32(0x1F4E6)
            $releaseBody = @"
# $releaseTitle

$changesFormatted

### $boxEmoji Available Downloads & Formats
- **Linux (.deb - Debian / Ubuntu / Mint)**: [MissionControl-Linux-${version}.deb](https://github.com/arnab825/Mission-Control/releases/download/v${version}/MissionControl-Linux-${version}.deb)
- **Linux (.AppImage - Universal Linux)**: [MissionControl-Linux-${version}.AppImage](https://github.com/arnab825/Mission-Control/releases/download/v${version}/MissionControl-Linux-${version}.AppImage)
- **Linux (.tar.gz - Standalone Linux Archive)**: [MissionControl-Linux-${version}.tar.gz](https://github.com/arnab825/Mission-Control/releases/download/v${version}/MissionControl-Linux-${version}.tar.gz)
- **Windows (.exe - Setup Installer)**: [MissionControl-Setup.exe](https://github.com/arnab825/Mission-Control/releases/download/v${version}/MissionControl-Setup.exe)
- **Windows (.msi - Enterprise Installer)**: [MissionControl-Setup.msi](https://github.com/arnab825/Mission-Control/releases/download/v${version}/MissionControl-Setup.msi)
- **Windows (.zip - Portable Windows Archive)**: [MissionControl-Setup.zip](https://github.com/arnab825/Mission-Control/releases/download/v${version}/MissionControl-Setup.zip)
"@
            [System.IO.File]::WriteAllText($releaseNotesFile, $releaseBody, [System.Text.UTF8Encoding]::new($false))

            # Kill any lingering 7za / archiver processes that may lock files in out/dist
            Get-Process -Name "7za" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
            Get-ChildItem -Path "$PSScriptRoot/../frontend/out/dist/*.tar*" -ErrorAction SilentlyContinue | Remove-Item -Force -ErrorAction SilentlyContinue
            Remove-Item -Force -Recurse "$PSScriptRoot/../frontend/out/dist/__msi-x64" -ErrorAction SilentlyContinue

            $token = if ($env:GH_TOKEN) { $env:GH_TOKEN } else { $env:GITHUB_TOKEN }

            if ($token) {
                Write-Host "[PUBLISH] GH_TOKEN detected! Publishing $releaseTitle to GitHub Releases..." -ForegroundColor Cyan
                npx electron-builder --win nsis msi zip --linux dir --publish always
                python ../scripts/pack_tar_gz.py "$version"
            } else {
                Write-Host "[BUILD] Compiling local Windows installers (NSIS, MSI, ZIP) and Linux packages in frontend/out/dist..." -ForegroundColor Yellow
                npx electron-builder --win nsis msi zip --linux dir --publish never
                python ../scripts/pack_tar_gz.py "$version"
            }

            # Build Debian package (.deb) and Universal Linux (.AppImage) directly
            try {
                Write-Host "[BUILD] Packaging Linux Debian package (.deb)..." -ForegroundColor Cyan
                python ../scripts/pack_deb.py "$version"
            } catch {
                Write-Warning "Debian packaging encountered an error: $_"
            }

            try {
                Write-Host "[BUILD] Packaging Universal Linux package (.AppImage)..." -ForegroundColor Cyan
                python ../scripts/pack_appimage.py "$version"
            } catch {
                Write-Warning "AppImage packaging encountered an error: $_"
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
            # Re-stage all release files, documentation, and lockfiles (including any updated during packaging)
            & $stageReleaseFiles
            $stagedDiff = git diff --staged --name-only 2>$null
            if ($stagedDiff) {
                Write-Host "[SYNC] Amending release commit with build artifacts ($($stagedDiff -join ', '))..." -ForegroundColor Cyan
                git commit --amend --no-edit 2>$null
                # Re-tag so git tag points to the final amended commit with all assets & docs included
                git tag -fa "v${version}" -m "Release v${version}: $Title"
            }

            Write-Host "[PUSH] Pushing to main and syncing tags..." -ForegroundColor Cyan
            $token = if ($env:GH_TOKEN) { $env:GH_TOKEN } else { $env:GITHUB_TOKEN }
            if ($token) {
                git push "https://x-access-token:${token}@github.com/arnab825/Mission-Control.git" main --tags --force
                
                # Upload extra assets (Linux .deb, .AppImage, .tar.gz, .blockmap) and update release title
                try {
                    Write-Host "[PUBLISH] Publishing release v${version} live on GitHub and uploading extra assets..." -ForegroundColor Cyan
                    
                    if (Get-Command gh -ErrorAction SilentlyContinue) {
                        $extraAssets = @(
                            "frontend/out/dist/MissionControl-Linux-${version}.deb",
                            "frontend/out/dist/MissionControl-Linux-${version}.AppImage",
                            "frontend/out/dist/MissionControl-Linux-${version}.tar.gz",
                            "frontend/out/dist/MissionControl-Setup.exe.blockmap"
                        ) | Where-Object { Test-Path $_ }
                        
                        if ($extraAssets.Count -gt 0) {
                            Write-Host "[UPLOAD] Uploading Linux & blockmap assets to GitHub Release via gh CLI..." -ForegroundColor Cyan
                            gh release upload "v${version}" $extraAssets --clobber
                        }
                        gh release edit "v${version}" --title $releaseTitle --draft=false
                        Write-Host "[SUCCESS] Release v${version} title updated to '$releaseTitle' and published live on GitHub!" -ForegroundColor Green
                    } else {
                        $headers = @{ Authorization = "token ${token}"; Accept = "application/vnd.github.v3+json"; "User-Agent" = "MissionControlPublisher" }
                        $target = Invoke-RestMethod -Uri "https://api.github.com/repos/arnab825/Mission-Control/releases/tags/v${version}" -Headers $headers -ErrorAction SilentlyContinue
                        if ($target) {
                            # Always ensure the full release title is set on GitHub
                            $body = @{ draft = $false; name = $releaseTitle } | ConvertTo-Json
                            Invoke-RestMethod -Uri "https://api.github.com/repos/arnab825/Mission-Control/releases/$($target.id)" -Method Patch -Headers $headers -Body $body -ContentType "application/json" | Out-Null
                            Write-Host "[SUCCESS] Release v${version} title updated to '$releaseTitle' and marked as Latest on GitHub!" -ForegroundColor Green
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
