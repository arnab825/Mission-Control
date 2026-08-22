#!/usr/bin/env python3
"""
Mission Control — Distributed Game Library Server
run_server.py: Entry point launcher.

Usage:
    python run_server.py
    python run_server.py --port 8800 --reload
"""
import argparse
import logging
import os
import sys

from dotenv import load_dotenv

# Load .env (search common paths)
for _path in [
    os.path.join(os.path.dirname(__file__), ".env"),
    os.path.join(os.path.dirname(__file__), "..", "backend", ".env"),
]:
    if os.path.exists(_path):
        load_dotenv(_path, override=True)
        break

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(name)s] %(levelname)s: %(message)s")

def main():
    parser = argparse.ArgumentParser(description="Mission Control Distributed Library Server")
    parser.add_argument("--host", default=os.getenv("LIBRARY_SERVER_HOST", "0.0.0.0"))
    default_port = int(os.getenv("PORT", os.getenv("LIBRARY_SERVER_PORT", "8800")))
    parser.add_argument("--port", type=int, default=default_port)
    parser.add_argument("--reload", action="store_true", help="Enable hot reload (dev only)")
    args = parser.parse_args()

    try:
        import uvicorn
    except ImportError:
        print("ERROR: uvicorn not installed. Run: pip install uvicorn[standard]")
        sys.exit(1)

    print(f"\n{'='*60}")
    print(f"  Mission Control — Distributed Library Server")
    print(f"  Listening: http://{args.host}:{args.port}")
    print(f"  API Docs:  http://localhost:{args.port}/docs")
    print(f"{'='*60}\n")

    uvicorn.run(
        "server:app",
        host=args.host,
        port=args.port,
        reload=args.reload,
        log_level="info",
    )

if __name__ == "__main__":
    main()
