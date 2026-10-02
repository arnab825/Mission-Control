import { execSync } from 'node:child_process';

// Gracefully terminates dangling development electron processes before starting dev server
try {
  if (process.platform === 'win32') {
    const cmd = `powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-CimInstance Win32_Process | Where-Object { $_.Name -like '*electron*' -and ($_.CommandLine -like '*Gaming*frontend*' -or $_.Path -like '*Gaming*frontend*') } | Stop-Process -Force -ErrorAction SilentlyContinue"`;
    execSync(cmd, { stdio: 'ignore', timeout: 5000 });
  } else {
    try {
      execSync(`pkill -f "electron.*Gaming.*frontend"`, { stdio: 'ignore' });
    } catch (_) {}
  }
} catch (_) {
  // Ignored if no processes to terminate
}
