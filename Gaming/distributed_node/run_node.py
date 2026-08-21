#!/usr/bin/env python3
"""
Mission Control — Library Node Runner
run_node.py: Start a library node daemon on this machine.

Usage:
    python run_node.py
    python run_node.py --server http://192.168.1.100:8800 --name "Gaming-PC"
    python run_node.py --scan D:\\Games D:\\SteamLibrary E:\\EpicGames
"""
import argparse
import os
import sys

from dotenv import load_dotenv

for _path in [
    os.path.join(os.path.dirname(__file__), ".env"),
    os.path.join(os.path.dirname(__file__), "..", "backend", ".env"),
]:
    if os.path.exists(_path):
        load_dotenv(_path, override=True)
        break

from node_service import LibraryNodeService, NodeConfig


def main():
    parser = argparse.ArgumentParser(description="Mission Control Library Node")
    parser.add_argument("--server", default=None, help="Central server URL (e.g. http://192.168.1.10:8800)")
    parser.add_argument("--name", default=None, help="Friendly node name (e.g. Gaming-PC)")
    parser.add_argument("--scan", nargs="+", default=None, metavar="PATH", help="Directories to scan for games")
    parser.add_argument("--node-id", default=None, help="Explicit node ID (optional; server will assign if blank)")
    parser.add_argument("--token", default=None, help="Auth token (from first registration)")
    parser.add_argument("--clerk-id", default=None, help="Clerk User ID for Library Binding")
    parser.add_argument("--provider", default=None, help="OAuth Provider (e.g. google, discord)")
    args = parser.parse_args()

    cfg = NodeConfig()

    if args.server:
        cfg.server_url = args.server
    if args.name:
        cfg.node_name = args.name
    if args.scan:
        cfg.scan_paths = args.scan
    if args.node_id:
        cfg.node_id = args.node_id
    if args.token:
        cfg.token = args.token
    if args.clerk_id:
        cfg.clerk_id = args.clerk_id
    if args.provider:
        cfg.auth_provider = args.provider

    print(f"\n{'='*55}")
    print(f"  Mission Control — Library Node")
    print(f"  Name:    {cfg.node_name}")
    print(f"  Server:  {cfg.server_url}")
    print(f"  Paths:   {cfg.scan_paths or ['(will use configured paths)']}")
    print(f"{'='*55}\n")

    service = LibraryNodeService(cfg)
    service.run()


if __name__ == "__main__":
    main()
