import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function patchNsis() {
  try {
    const installSection = path.join(__dirname, 'node_modules/app-builder-lib/templates/nsis/installSection.nsh');
    if (fs.existsSync(installSection)) {
      let content = fs.readFileSync(installSection, 'utf8');
      content = content.replace('SetDetailsPrint none', 'SetDetailsPrint both');
      fs.writeFileSync(installSection, content);
      console.log('Patched installSection.nsh');
    }

    const extractPackage = path.join(__dirname, 'node_modules/app-builder-lib/templates/nsis/include/extractAppPackage.nsh');
    if (fs.existsSync(extractPackage)) {
      let content = fs.readFileSync(extractPackage, 'utf8');
      // Replace occurrences of Nsis7z::Extract (if it's not already ExtractWithDetails)
      content = content.replace(/Nsis7z::Extract(?!WithDetails)/g, 'Nsis7z::ExtractWithDetails');

      // FIX: Extract directly to $INSTDIR instead of extracting to temp and running CopyFiles (which fails with long paths/locks)
      content = content.replace(
        /CreateDirectory\s+"\$PLUGINSDIR\\7z-out"\s*\r?\n\s*ClearErrors\s*\r?\n\s*SetOutPath\s+"\$PLUGINSDIR\\7z-out"\s*\r?\n\s*Nsis7z::ExtractWithDetails\s+"(.*?)"\s*\r?\n\s*Pop\s+\$R0\s*\r?\n\s*SetOutPath\s+\$R0/g,
        'ClearErrors\n  SetOutPath $INSTDIR\n  Nsis7z::ExtractWithDetails "$1"\n  Pop $R0\n  SetOutPath $R0\n  Goto DoneExtract7za'
      );
      
      fs.writeFileSync(extractPackage, content);
      console.log('Patched extractAppPackage.nsh');
    }

    // FIX: SHELL_CONTEXT\Uninstall error — WriteUninstaller runs in .onInit under the
    // BUILD_UNINSTALLER ifdef, BEFORE initMultiUser is called. Since SetShellVarContext
    // is only called inside initMultiUser, the shell context is uninitialized at the time
    // WriteUninstaller executes, causing NSIS to prepend the literal string "SHELL_CONTEXT\"
    // to the output path instead of resolving it. Fix: explicitly set the shell context to
    // "all" (machine-wide install) immediately before WriteUninstaller in that block.
    const installerNsi = path.join(__dirname, 'node_modules/app-builder-lib/templates/nsis/installer.nsi');
    if (fs.existsSync(installerNsi)) {
      let content = fs.readFileSync(installerNsi, 'utf8');
      // Only patch if not already patched (idempotent)
      if (!content.includes('SetShellVarContext all ; patch: fix SHELL_CONTEXT')) {
        content = content.replace(
          /(!ifdef BUILD_UNINSTALLER\s*\r?\n)([ \t]*WriteUninstaller)/,
          '$1  SetShellVarContext all ; patch: fix SHELL_CONTEXT unresolved path bug\n$2'
        );
        fs.writeFileSync(installerNsi, content);
        console.log('Patched installer.nsi (SHELL_CONTEXT WriteUninstaller fix)');
      } else {
        console.log('installer.nsi already patched, skipping');
      }
    }

    // FIX: Explicitly set the output path to $INSTDIR before extracting the uninstaller file.
    // This ensures that even if any previous macro/stack operations leave $OUTDIR set to 
    // the literal "SHELL_CONTEXT", it is resolved to the correct installation directory
    // before extracting the uninstaller binary.
    const installerNsh = path.join(__dirname, 'node_modules/app-builder-lib/templates/nsis/include/installer.nsh');
    if (fs.existsSync(installerNsh)) {
      let content = fs.readFileSync(installerNsh, 'utf8');
      if (!content.includes('SetOutPath $INSTDIR ; patch: fix SHELL_CONTEXT')) {
        content = content.replace(
          /(File\s+"\/oname=\${UNINSTALL_FILENAME}"\s+"\${UNINSTALLER_OUT_FILE}")/,
          'SetOutPath $INSTDIR ; patch: fix SHELL_CONTEXT uninstaller write path\n  $1'
        );
        fs.writeFileSync(installerNsh, content);
        console.log('Patched installer.nsh (SHELL_CONTEXT uninstaller write path fix)');
      } else {
        console.log('installer.nsh already patched, skipping');
      }
    }

    // FIX: "Error opening file for writing: Uninstall Mission Control.exe"
    // The inner instance (elevated) skips CHECK_APP_RUNNING, and the outer instance fails
    // to kill elevated processes like HardwareMonitor.exe. So we inject the kill script
    // directly into installSection.nsh right before uninstallOldVersion, ensuring it runs elevated.
    const installSectionNsh = path.join(__dirname, 'node_modules/app-builder-lib/templates/nsis/installSection.nsh');
    if (fs.existsSync(installSectionNsh)) {
      let content = fs.readFileSync(installSectionNsh, 'utf8');
      const patchMarker2 = '; patch: force kill child procs elevated';
      if (!content.includes(patchMarker2)) {
        const killMacro = `
  ${patchMarker2}
  nsExec::ExecToStack \`"$SYSDIR\\WindowsPowerShell\\v1.0\\powershell.exe" -NonInteractive -NoProfile -Command { Get-CimInstance Win32_Process | Where-Object { $$$$_.Name -in @('dotnet.exe','HardwareMonitor.exe') -and $$$$_.ExecutablePath -and $$$$_.ExecutablePath.ToLower().StartsWith('$INSTDIR'.ToLower()) } | ForEach-Object { Stop-Process -Id $$$$_.ProcessId -Force -ErrorAction SilentlyContinue } }\`
  Pop $$0
  Pop $$1
  nsExec::ExecToStack \`"$SYSDIR\\WindowsPowerShell\\v1.0\\powershell.exe" -NonInteractive -NoProfile -Command { Get-Process -Name 'Uninstall*' -ErrorAction SilentlyContinue | Where-Object { $$$$_.Path -and $$$$_.Path.StartsWith('$INSTDIR') } | Stop-Process -Force -ErrorAction SilentlyContinue }\`
  Pop $$0
  Pop $$1
  Sleep 1000
`;
        content = content.replace(
          /(!insertmacro uninstallOldVersion SHELL_CONTEXT)/,
          killMacro + '\n  $1'
        );
        fs.writeFileSync(installSectionNsh, content);
        console.log('Patched installSection.nsh (force kill child procs elevated)');
      } else {
        console.log('installSection.nsh already patched for child procs, skipping');
      }
    }
  } catch (e) {
    console.error('Failed to patch NSIS:', e);
  }
}

patchNsis();
