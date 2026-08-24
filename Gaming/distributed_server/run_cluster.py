#!/usr/bin/env python3
"""
Mission Control — Distributed Cluster Orchestrator
run_cluster.py: Launches the full multi-instance microservices cluster with the Load Balancer.

Topology:
  ┌────────────────────────────────────────────────────────┐
  │         Load Balancer & API Gateway (:8800)            │
  └───────────────────────────┬────────────────────────────┘
               ┌──────────────┴──────────────┐
               ▼                             ▼
   [Catalog Discovery Pool]      [User Library & Node Pool]
   • catalog_service (:8811)     • node_service (:8821)
   • catalog_service (:8812)     • node_service (:8822)

Usage:
    python run_cluster.py
    python run_cluster.py --catalog-instances 2 --node-instances 2
"""

import argparse
import os
import signal
import subprocess
import sys
import threading
import time
from pathlib import Path
from dotenv import load_dotenv

# Load .env (override=False to preserve cloud env vars)
for _env_path in [
    os.path.join(os.path.dirname(__file__), ".env"),
    os.path.join(os.path.dirname(__file__), "..", "backend", ".env"),
    os.path.join(os.path.dirname(__file__), "..", ".env"),
]:
    if os.path.exists(_env_path):
        load_dotenv(_env_path, override=False)
        break


# ANSI Color Codes for readable console streaming
COLORS = [
    "\033[96m",  # Cyan
    "\033[92m",  # Green
    "\033[93m",  # Yellow
    "\033[95m",  # Magenta
    "\033[94m",  # Blue
]
RESET = "\033[0m"


def stream_logs(proc: subprocess.Popen, prefix: str, color: str):
    """Stream stdout/stderr from a child process with a colored prefix."""
    try:
        for line in iter(proc.stdout.readline, ""):
            if not line:
                break
            line_str = line.rstrip()
            if line_str:
                print(f"{color}[{prefix}]{RESET} {line_str}", flush=True)
    except Exception:
        pass


def main():
    parser = argparse.ArgumentParser(description="Mission Control Distributed Microservices Cluster Launcher")
    parser.add_argument("--catalog-instances", type=int, default=2, help="Number of Catalog Discovery instances")
    parser.add_argument("--node-instances", type=int, default=2, help="Number of User Library/Node Sync instances")
    default_lb_port = int(os.getenv("PORT", os.getenv("LIBRARY_SERVER_PORT", "8800")))
    parser.add_argument("--lb-port", type=int, default=default_lb_port, help="Port for the Load Balancer / API Gateway")
    parser.add_argument("--base-catalog-port", type=int, default=8811, help="Starting port for Catalog instances")
    parser.add_argument("--base-node-port", type=int, default=8821, help="Starting port for Node instances")
    args = parser.parse_args()

    python_exe = sys.executable
    server_dir = Path(__file__).parent.resolve()

    catalog_ports = [args.base_catalog_port + i for i in range(args.catalog_instances)]
    node_ports = [args.base_node_port + i for i in range(args.node_instances)]

    catalog_urls = [f"http://127.0.0.1:{p}" for p in catalog_ports]
    node_urls = [f"http://127.0.0.1:{p}" for p in node_ports]

    print(f"\n{'='*70}")
    print("  🚀 MISSION CONTROL — DISTRIBUTED MICROSERVICES CLUSTER")
    print(f"{'='*70}")
    print(f"  Load Balancer:     http://0.0.0.0:{args.lb_port}")
    print(f"  Catalog Discovery: {', '.join(catalog_urls)} ({args.catalog_instances} instances)")
    print(f"  User Library/Sync: {', '.join(node_urls)} ({args.node_instances} instances)")
    print(f"  Health Endpoint:   http://localhost:{args.lb_port}/health")
    print(f"  Cluster Status:    http://localhost:{args.lb_port}/cluster/status")
    print(f"{'='*70}\n")

    processes: list[tuple[str, subprocess.Popen]] = []

    # 1. Start Catalog Service instances
    for idx, port in enumerate(catalog_ports):
        # Enable background AI/enrichment workers on instance 0 only to avoid redundant thread collisions
        cmd = [python_exe, str(server_dir / "catalog_service.py"), "--port", str(port)]
        if idx == 0:
            cmd.append("--worker")
        
        proc = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
            cwd=str(server_dir)
        )
        tag = f"CATALOG:{port}"
        processes.append((tag, proc))
        t = threading.Thread(target=stream_logs, args=(proc, tag, COLORS[idx % len(COLORS)]), daemon=True)
        t.start()

    # 2. Start Node Service instances
    for idx, port in enumerate(node_ports):
        cmd = [python_exe, str(server_dir / "node_service.py"), "--port", str(port)]
        if idx == 0:
            cmd.append("--watchdog")
        
        proc = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
            cwd=str(server_dir)
        )
        tag = f"NODE:{port}"
        processes.append((tag, proc))
        t = threading.Thread(target=stream_logs, args=(proc, tag, COLORS[(idx + 2) % len(COLORS)]), daemon=True)
        t.start()

    # 3. Start Dedicated AI Metadata Enricher & Healer Microservice (:8831)
    enricher_cmd = [python_exe, str(server_dir / "ai_enricher_service.py"), "--port", "8831"]
    enricher_proc = subprocess.Popen(
        enricher_cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
        cwd=str(server_dir)
    )
    enricher_tag = "AI_HEALER:8831"
    processes.append((enricher_tag, enricher_proc))
    t = threading.Thread(target=stream_logs, args=(enricher_proc, enricher_tag, "\033[95m"), daemon=True)
    t.start()

    # 4. Start Dedicated Multi-Launcher Enricher Microservice (:8841)
    launcher_cmd = [python_exe, str(server_dir / "launcher_enricher_service.py"), "--port", "8841"]
    launcher_proc = subprocess.Popen(
        launcher_cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
        cwd=str(server_dir)
    )
    launcher_tag = "LAUNCHER_HEALER:8841"
    processes.append((launcher_tag, launcher_proc))
    t_l = threading.Thread(target=stream_logs, args=(launcher_proc, launcher_tag, "\033[96m"), daemon=True)
    t_l.start()

    # 5. Start Dedicated Infinite Harvester & AI Crawler Microservice (:8851)
    crawler_cmd = [python_exe, str(server_dir / "crawler_service.py"), "--port", "8851"]
    crawler_proc = subprocess.Popen(
        crawler_cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
        cwd=str(server_dir)
    )
    crawler_tag = "CRAWLER_SERVICE:8851"
    processes.append((crawler_tag, crawler_proc))
    t_c = threading.Thread(target=stream_logs, args=(crawler_proc, crawler_tag, "\033[92m"), daemon=True)
    t_c.start()

    # Allow upstream microservices to bind ports and verify readiness
    print("⏳ Waiting for microservices to initialize and connect to DB...")
    all_upstreams = catalog_urls + node_urls + ["http://127.0.0.1:8831", "http://127.0.0.1:8841", "http://127.0.0.1:8851"]
    for target_url in all_upstreams:
        for _ in range(15):
            try:
                import urllib.request
                req = urllib.request.Request(f"{target_url}/health")
                with urllib.request.urlopen(req, timeout=1.5) as r:
                    if r.status == 200:
                        break
            except Exception:
                time.sleep(0.4)

    # 3. Start Load Balancer
    lb_cmd = [
        python_exe, str(server_dir / "load_balancer.py"),
        "--port", str(args.lb_port),
        "--catalog-servers", ",".join(catalog_urls),
        "--node-servers", ",".join(node_urls),
    ]
    lb_proc = subprocess.Popen(
        lb_cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
        cwd=str(server_dir)
    )
    lb_tag = f"LOAD_BALANCER:{args.lb_port}"
    processes.append((lb_tag, lb_proc))
    t = threading.Thread(target=stream_logs, args=(lb_proc, lb_tag, "\033[97m"), daemon=True)
    t.start()

    def shutdown(signum=None, frame=None):
        print("\n\nShutting down Mission Control microservices cluster...")
        for tag, p in reversed(processes):
            try:
                p.terminate()
                p.wait(timeout=2.0)
            except Exception:
                p.kill()
        print("All cluster services stopped cleanly.")
        sys.exit(0)

    signal.signal(signal.SIGINT, shutdown)
    signal.signal(signal.SIGTERM, shutdown)

    # Keep orchestrator alive and monitor child processes
    try:
        while True:
            for tag, p in processes:
                if p.poll() is not None:
                    print(f"⚠️ Warning: Process {tag} exited unexpectedly with code {p.returncode}.")
            time.sleep(2)
    except KeyboardInterrupt:
        shutdown()


if __name__ == "__main__":
    main()
