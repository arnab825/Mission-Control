!macro customHeader
  ShowInstDetails show
  ShowUninstDetails show
!macroend

!macro customInit
  !include "WinVer.nsh"
  ${If} ${AtMostWin8.1}
    MessageBox MB_OK|MB_ICONSTOP "Mission Control requires Windows 10 or later to install."
    Abort
  ${EndIf}
!macroend

; ── Pre-install: Kill all running Mission Control processes before extracting files ──
; This prevents file-lock errors (app.exe / MissionControlBackend.exe can't be
; overwritten while running), which cause "app not responding" and OpenCV corruption.
!macro customInstallMode
  ; Silently kill the Electron shell and Python backend before the installer writes files.
  ; /F = force kill, /IM = by image name, /T = kill child tree (covers spawned subprocesses)
  DetailPrint "Stopping any running Mission Control processes..."
  nsExec::ExecToStack `"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NonInteractive -NoProfile -Command "& { Stop-Process -Name 'MissionControlBackend' -Force -ErrorAction SilentlyContinue; Stop-Process -Name 'Mission Control' -Force -ErrorAction SilentlyContinue; Start-Sleep -Milliseconds 800 }"`
  Pop $0
  Pop $1
!macroend

; Define welcome page macro for assisted installer wizard
!macro customWelcomePage
  !insertmacro MUI_PAGE_WELCOME
!macroend

; Define welcome page macro for assisted uninstaller wizard
!macro customUnWelcomePage
  !insertmacro MUI_UNPAGE_WELCOME
!macroend

!macro customInstall
  ; Safety: Kill any remaining Mission Control processes before writing files.
  ; (customInstallMode already fires early, but this catches edge cases.)
  nsExec::ExecToStack `"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NonInteractive -NoProfile -Command "& { Stop-Process -Name 'MissionControlBackend' -Force -ErrorAction SilentlyContinue; Stop-Process -Name 'Mission Control' -Force -ErrorAction SilentlyContinue; Start-Sleep -Milliseconds 500 }"`
  Pop $0
  Pop $1

  ; Clean up duplicate user-specific shortcuts from previous installations (per-user layout)
  ; Since the installer runs elevated as Admin, SetShellVarContext current resolves to the Admin profile.
  ; We use PowerShell to clean up the shortcuts across all user directories under C:\Users.
  nsExec::ExecToStack `"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NonInteractive -NoProfile -Command "Get-ChildItem -Path 'C:\Users' -Directory | Where-Object { $$_.Name -notin @('Public', 'Default', 'Default User', 'All Users') } | ForEach-Object { $$lnk1 = Join-Path $$_.FullName 'AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Mission Control.lnk'; if (Test-Path $$lnk1) { Remove-Item $$lnk1 -Force }; $$lnk2 = Join-Path $$_.FullName 'Desktop\Mission Control.lnk'; if (Test-Path $$lnk2) { Remove-Item $$lnk2 -Force }; $$uninst = Join-Path $$_.FullName 'AppData\Local\Programs\mission-control\Uninstall Mission Control.exe'; if (Test-Path $$uninst) { Start-Process -FilePath $$uninst -ArgumentList '/S' -Wait -NoNewWindow } }"`
  Pop $0
  Pop $1

  DetailPrint "Writing registry keys..."
  ; App paths registry (Task 2 & 10) — AppUserModelID must match app.setAppUserModelId() in main.ts
  WriteRegStr HKLM "Software\MissionControl" "InstallPath" "$INSTDIR"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\App Paths\MissionControl.exe" "" "$INSTDIR\${APP_EXECUTABLE_FILENAME}"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\App Paths\MissionControl.exe" "Path" "$INSTDIR"

  ; AppUserModelID registry entry (Task 2) — ensures pinned taskbar shortcuts
  ; resolve to the same identity as app.setAppUserModelId('com.missioncontrol.app')
  WriteRegStr HKLM "Software\Classes\AppUserModelId\com.missioncontrol.app" "DisplayName" "Mission Control"
  WriteRegStr HKLM "Software\Classes\AppUserModelId\com.missioncontrol.app" "IconUri" "$INSTDIR\${APP_EXECUTABLE_FILENAME}"

  ; Create persistent user config & data directories
  ; OUTSIDE $INSTDIR so they survive application upgrades.
  CreateDirectory "$APPDATA\MissionControl"
  CreateDirectory "$APPDATA\MissionControl\config"
  CreateDirectory "$LOCALAPPDATA\MissionControl"
  CreateDirectory "$LOCALAPPDATA\MissionControl\Electron"

  DetailPrint "Adding to system PATH..."
  nsExec::ExecToStack `"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NonInteractive -NoProfile -Command "$$p = [Environment]::GetEnvironmentVariable('Path', 'Machine'); if (($$p -split ';') -notcontains '$INSTDIR') { [Environment]::SetEnvironmentVariable('Path', ($$p + ';$INSTDIR').Replace(';;', ';'), 'Machine') }"`
  Pop $0
  Pop $1

  ; Write installation directory contents documentation (Task 10)
  FileOpen $0 "$INSTDIR\CONTENTS.txt" w
  FileWrite $0 "Mission Control — Installation Directory$\r$\n"
  FileWrite $0 "=======================================$\r$\n$\r$\n"
  FileWrite $0 "This directory contains the Mission Control application files.$\r$\n$\r$\n"
  FileWrite $0 "Directory Layout:$\r$\n"
  FileWrite $0 "  Mission Control.exe    Main application executable (Electron shell)$\r$\n"
  FileWrite $0 "  resources\             Bundled application resources$\r$\n"
  FileWrite $0 "    backend\             Python AI backend (MissionControl.exe)$\r$\n"
  FileWrite $0 "    app.asar            React frontend bundle$\r$\n"
  FileWrite $0 "  locales\              Electron locale files$\r$\n"
  FileWrite $0 "$\r$\n"
  FileWrite $0 "User Data (persists across updates):$\r$\n"
  FileWrite $0 "  %APPDATA%\MissionControl\config\settings.yaml   User settings$\r$\n"
  FileWrite $0 "  %APPDATA%\MissionControl\config\settings.json   Settings mirror (tooling)$\r$\n"
  FileWrite $0 "  %LOCALAPPDATA%\MissionControl\                  Electron user data (cache)$\r$\n"
  FileWrite $0 "$\r$\n"
  FileWrite $0 "To uninstall: Settings > Apps > Mission Control > Uninstall$\r$\n"
  FileClose $0
!macroend

!macro customUnInstall
  DetailPrint "Removing registry keys..."
  DeleteRegKey HKLM "Software\MissionControl"
  DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\App Paths\MissionControl.exe"
  DeleteRegKey HKLM "Software\Classes\AppUserModelId\com.missioncontrol.app"

  DetailPrint "Removing from system PATH..."
  nsExec::ExecToStack `"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NonInteractive -NoProfile -Command "$$p = [Environment]::GetEnvironmentVariable('Path', 'Machine'); $$newP = ($$p -split ';' | Where-Object { $$_ -ne '$INSTDIR' }) -join ';'; [Environment]::SetEnvironmentVariable('Path', $$newP, 'Machine')"`
  Pop $0
  Pop $1

  ; Clean up dynamic files and subdirectories created during app execution
  Delete "$INSTDIR\CONTENTS.txt"
  RMDir /r "$INSTDIR\resources\MissionControlBackend\rag_data"
  RMDir /r "$INSTDIR\resources\MissionControlBackend\__pycache__"
  RMDir /r "$INSTDIR\resources\MissionControlBackend"
  RMDir /r "$INSTDIR\resources\MissionControl"
  RMDir /r "$INSTDIR\resources"
  RMDir /r "$INSTDIR\locales"
  RMDir /r "$INSTDIR"

  ; NOTE (Task 4): %APPDATA%\MissionControl\ is intentionally NOT deleted here.
  ; User settings, profiles, and AI memory are stored there and should be preserved
  ; across reinstalls. A user who wants a clean uninstall can manually delete
  ; %APPDATA%\MissionControl after running the uninstaller.
!macroend
