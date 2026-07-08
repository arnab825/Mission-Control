import os
import sys
import psutil

def kill_zombies():
    current_pid = os.getpid()
    killed_count = 0
    print(f"Starting zombie process sweep (Current script PID: {current_pid})...")
    
    # Repositories directories or tags we want to target
    repo_marker = "AiAssistant"
    gaming_marker = "Gaming"
    
    # MCP server/IDE markers we want to protect
    mcp_markers = ["mcp", "chrome-devtools-mcp", "mcp-remote", "stitch.googleapis.com", "antigravity"]

    for proc in psutil.process_iter(['pid', 'name', 'cmdline', 'exe']):
        try:
            pid = proc.info['pid']
            if pid == current_pid:
                continue

            name = (proc.info['name'] or "").lower()
            cmdline = proc.info['cmdline'] or []
            cmdline_str = " ".join(cmdline).lower()
            exe = (proc.info['exe'] or "").lower()

            # Check if this is a target process type
            is_node = "node" in name
            is_python = "python" in name
            is_electron = "electron" in name or "MissionControl" in name

            if not (is_node or is_python or is_electron):
                continue

            # Protect MCP servers / agent processes and this script
            if "kill_zombies.py" in cmdline_str or any(marker in cmdline_str for marker in mcp_markers):
                continue

            should_kill = False
            reason = ""

            if is_python:
                # Target python processes running main.py in the Gaming app
                if "main.py" in cmdline_str and (gaming_marker.lower() in cmdline_str or repo_marker.lower() in cmdline_str):
                    should_kill = True
                    reason = f"Lingering Python backend running main.py (PID: {pid})"
                elif ".venv" in exe and (gaming_marker.lower() in exe or repo_marker.lower() in exe):
                    should_kill = True
                    reason = f"Python process running in repo virtual environment (PID: {pid})"

            elif is_node:
                # Target node processes running Vite or Electron scripts in the repo
                if ("vite" in cmdline_str or "electron" in cmdline_str) and (gaming_marker.lower() in cmdline_str or repo_marker.lower() in cmdline_str):
                    should_kill = True
                    reason = f"Lingering Node dev server / build tool (PID: {pid})"

            elif is_electron:
                # Target Electron/MissionControl app windows
                if gaming_marker.lower() in cmdline_str or repo_marker.lower() in cmdline_str or gaming_marker.lower() in exe or repo_marker.lower() in exe:
                    should_kill = True
                    reason = f"Lingering Electron application window (PID: {pid})"

            if should_kill:
                print(f"Killing: {reason} -> Cmd: {cmdline}")
                proc.terminate()
                killed_count += 1

        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
            pass

    # Wait for processes to exit, then force kill if still alive
    if killed_count > 0:
        print(f"Cleaned up {killed_count} zombie process(es). All ports are now clear!")
    else:
        print("No zombie processes found. System is clean!")

if __name__ == "__main__":
    kill_zombies()
