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

    uv run python scripts/bump_version.py @bumpArgs

    if ($LASTEXITCODE -eq 0) {
        # 2. Sync files
        Write-Host "[SYNC] Staging changes..." -ForegroundColor Cyan
        git add backend/version.json readme.md docs/backend/patches.md
        git add .
        
        # 3. Get new version
        $version = (Get-Content backend/version.json | ConvertFrom-Json).version
        
        # 4. Commit and Tag
        Write-Host "[COMMIT] Creating release v${version}" -ForegroundColor Cyan
        git commit -m "Release v${version}: $Title"
        git tag -a "v${version}" -m "Release v${version}: $Title"
        
        # 5. Push to GitHub
        Write-Host "[PUSH] Pushing to main and syncing tags..." -ForegroundColor Cyan
        git push origin main --tags
        
        Write-Host "[SUCCESS] Version v${version} is now live on GitHub!" -ForegroundColor Green
    } else {
        Write-Host "[ERROR] Release failed during version bump." -ForegroundColor Red
    }
} finally {
    Pop-Location
}
