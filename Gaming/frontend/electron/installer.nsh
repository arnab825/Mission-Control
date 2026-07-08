!macro customHeader
  ShowInstDetails show
  ShowUninstDetails show
!macroend

!macro customInstall
  DetailPrint "Writing registry keys..."
  WriteRegStr HKLM "Software\MissionControl" "InstallPath" "$INSTDIR"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\App Paths\MissionControl.exe" "" "$INSTDIR\${APP_EXECUTABLE_FILENAME}"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\App Paths\MissionControl.exe" "Path" "$INSTDIR"
  
  DetailPrint "Adding to system PATH..."
  nsExec::ExecToStack `"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NonInteractive -NoProfile -Command "$$p = [Environment]::GetEnvironmentVariable('Path', 'Machine'); if (($$p -split ';') -notcontains '$INSTDIR') { [Environment]::SetEnvironmentVariable('Path', ($$p + ';$INSTDIR').Replace(';;', ';'), 'Machine') }"`
  Pop $0
  Pop $1
!macroend

!macro customUnInstall
  DetailPrint "Removing registry keys..."
  DeleteRegKey HKLM "Software\MissionControl"
  DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\App Paths\MissionControl.exe"
  
  DetailPrint "Removing from system PATH..."
  nsExec::ExecToStack `"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NonInteractive -NoProfile -Command "$$p = [Environment]::GetEnvironmentVariable('Path', 'Machine'); $$newP = ($$p -split ';' | Where-Object { $$_ -ne '$INSTDIR' }) -join ';'; [Environment]::SetEnvironmentVariable('Path', $$newP, 'Machine')"`
  Pop $0
  Pop $1
!macroend
