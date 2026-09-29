<#
.SYNOPSIS
    Mission Control Winget Installer & Manifest Automation Helper (Scripts entry point)
#>

param (
    [ValidateSet('Validate', 'Install', 'UpdateHash', 'Help')]
    [string]$Action = 'Validate',

    [string]$Version = '3.7.3'
)

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$WingetScript = Join-Path $ScriptDir "..\winget\install.ps1"

& $WingetScript -Action $Action -Version $Version
