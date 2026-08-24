"""
Mission Control — Multi-Pool Load Balancer & API Gateway
load_balancer.py: High-throughput asynchronous reverse proxy and load balancer.

Routes and balances incoming traffic across multiple worker instance pools:
  • Catalog Discovery Pool  (Default ports: 8811, 8812, ...) -> Web search, seeding, AI classification
  • User Library/Node Pool  (Default ports: 8821, 8822, ...) -> Nodes, sync, storage, user library

Usage:
    python load_balancer.py --port 8800
    python load_balancer.py --port 8800 --catalog-servers http://127.0.0.1:8811,http://127.0.0.1:8812 --node-servers http://127.0.0.1:8821,http://127.0.0.1:8822
"""

import argparse
import asyncio
import itertools
import logging
import os
import sys
import time
from contextlib import asynccontextmanager
from typing import Dict, List, Optional

import httpx
from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("load-balancer")


# ── Cluster Configuration ────────────────────────────────────────────────────

def _parse_server_list(env_val: str, default: List[str]) -> List[str]:
    if not env_val:
        return default
    return [s.strip() for s in env_val.split(",") if s.strip()]


DEFAULT_CATALOG_SERVERS = _parse_server_list(
    os.getenv("CATALOG_SERVERS", ""),
    ["http://127.0.0.1:8811", "http://127.0.0.1:8812"]
)

DEFAULT_NODE_SERVERS = _parse_server_list(
    os.getenv("NODE_SERVERS", ""),
    ["http://127.0.0.1:8821", "http://127.0.0.1:8822"]
)

DEFAULT_ENRICHER_SERVERS = _parse_server_list(
    os.getenv("ENRICHER_SERVERS", ""),
    ["http://127.0.0.1:8831"]
)

DEFAULT_LAUNCHER_SERVERS = _parse_server_list(
    os.getenv("LAUNCHER_SERVERS", ""),
    ["http://127.0.0.1:8841"]
)

DEFAULT_CRAWLER_SERVERS = _parse_server_list(
    os.getenv("CRAWLER_SERVERS", ""),
    ["http://127.0.0.1:8851"]
)


class UpstreamPool:
    """Manages a pool of upstream servers with round-robin balancing and health checking."""

    def __init__(self, name: str, servers: List[str]):
        self.name = name
        self.set_servers(servers)
        self._index = 0
        self._lock = asyncio.Lock()

    def set_servers(self, servers: List[str]):
        self.servers = list(servers)
        self.healthy: List[str] = []
        self.stats: Dict[str, Dict] = {
            s: {"requests": 0, "errors": 0, "latency_ms": 0, "status": "unknown"}
            for s in servers
        }

    async def get_next(self) -> Optional[str]:
        async with self._lock:
            candidates = self.healthy if self.healthy else self.servers
            if not candidates:
                return None
            server = candidates[self._index % len(candidates)]
            self._index += 1
            if server in self.stats:
                self.stats[server]["requests"] += 1
            return server

    def mark_result(self, server: str, success: bool, latency_ms: float):
        if server in self.stats:
            self.stats[server]["latency_ms"] = round(latency_ms, 2)
            if not success:
                self.stats[server]["errors"] += 1


catalog_pool = UpstreamPool("catalog", DEFAULT_CATALOG_SERVERS)
node_pool = UpstreamPool("node", DEFAULT_NODE_SERVERS)
enricher_pool = UpstreamPool("enricher", DEFAULT_ENRICHER_SERVERS)
launcher_pool = UpstreamPool("launcher", DEFAULT_LAUNCHER_SERVERS)
crawler_pool = UpstreamPool("crawler", DEFAULT_CRAWLER_SERVERS)

_ALL_POOLS = [catalog_pool, node_pool, enricher_pool, launcher_pool, crawler_pool]

_HTTP_CLIENT: Optional[httpx.AsyncClient] = None


# ── Health Probing ────────────────────────────────────────────────────────────

async def _probe_pool(pool: UpstreamPool, client: httpx.AsyncClient):
    """Probe all instances in a pool and update healthy list."""
    new_healthy = []
    for s in pool.servers:
        pool.stats.setdefault(s, {"requests": 0, "errors": 0, "latency_ms": 0, "status": "unknown"})
        t0 = time.time()
        try:
            r = await client.get(f"{s}/health", timeout=3.0)
            latency = (time.time() - t0) * 1000
            if r.status_code == 200:
                new_healthy.append(s)
                pool.stats[s]["status"] = "healthy"
                pool.stats[s]["latency_ms"] = round(latency, 2)
            else:
                pool.stats[s]["status"] = f"http_{r.status_code}"
        except Exception:
            pool.stats[s]["status"] = "unreachable"

    pool.healthy = new_healthy


async def _health_check_loop():
    """Background task: Periodically probes all upstream instances."""
    while True:
        try:
            if _HTTP_CLIENT:
                for p in _ALL_POOLS:
                    await _probe_pool(p, _HTTP_CLIENT)
        except Exception as exc:
            logger.warning("Health check loop error: %s", exc)
        await asyncio.sleep(5.0)


# ── FastAPI Lifecycle ─────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    global _HTTP_CLIENT
    _HTTP_CLIENT = httpx.AsyncClient(
        timeout=httpx.Timeout(connect=1.5, read=30.0, write=10.0, pool=5.0),
        limits=httpx.Limits(max_keepalive_connections=50, max_connections=200),
        follow_redirects=True,
    )
    for p in _ALL_POOLS:
        await _probe_pool(p, _HTTP_CLIENT)
    
    asyncio.create_task(_health_check_loop())
    logger.info("Load Balancer initialized with %d upstream pools.", len(_ALL_POOLS))
    yield
    await _HTTP_CLIENT.aclose()


app = FastAPI(
    title="Mission Control — Multi-Pool Load Balancer & API Gateway",
    description="High-performance asynchronous reverse proxy and load balancer.",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Routing Decision Engine ──────────────────────────────────────────────────

def _determine_pool(path: str, query_params: Dict[str, str]) -> UpstreamPool:
    """
    Decide whether to route request to Node Sync, Catalog Discovery, Crawler, Launcher, or Enricher.
    """
    # 1. Crawler microservice endpoints
    if path.startswith("/api/crawler"):
        return crawler_pool

    # 2. Launcher enricher endpoints
    if path.startswith("/api/launchers"):
        return launcher_pool

    # 3. AI metadata enricher endpoints
    if path.startswith("/api/enrich"):
        return enricher_pool

    # 4. Node management & installation endpoints
    if path.startswith("/api/nodes"):
        return node_pool

    if path == "/api/library/stats":
        return node_pool

    if "/installations" in path:
        return node_pool

    # 5. User library queries (installed only)
    if path == "/api/games":
        installed_only = query_params.get("installed_only", "").lower() in ("true", "1")
        availability = query_params.get("availability")
        node_id = query_params.get("node_id")
        if installed_only or availability or node_id:
            return node_pool

    # 6. Everything else defaults to Catalog Discovery pool
    # (/api/games/discover, /api/games/seed, /api/games/classify, /api/search, global /api/games)
    return catalog_pool


# ── Root & Cluster Health Status ─────────────────────────────────────────────

@app.get("/")
@app.head("/")
async def root():
    return {
        "service": "Mission Control Distributed Cluster API Gateway",
        "version": "2.0.0",
        "status": "online",
        "health": "/health",
        "docs": "/docs",
        "cluster_status": "/cluster/status",
    }


@app.get("/health")
@app.head("/health")
async def cluster_health():
    return {
        "gateway": "ok",
        "pools": {
            "catalog": {
                "total": len(catalog_pool.servers),
                "healthy": len(catalog_pool.healthy),
                "instances": catalog_pool.stats,
            },
            "node": {
                "total": len(node_pool.servers),
                "healthy": len(node_pool.healthy),
                "instances": node_pool.stats,
            },
            "enricher": {
                "total": len(enricher_pool.servers),
                "healthy": len(enricher_pool.healthy),
                "instances": enricher_pool.stats,
            },
            "launcher": {
                "total": len(launcher_pool.servers),
                "healthy": len(launcher_pool.healthy),
                "instances": launcher_pool.stats,
            },
            "crawler": {
                "total": len(crawler_pool.servers),
                "healthy": len(crawler_pool.healthy),
                "instances": crawler_pool.stats,
            },
        },
    }


@app.get("/cluster/status")
async def cluster_status():
    return {
        "gateway_version": "2.0.0",
        "routing_rules": {
            "node_pool_routes": [
                "/api/nodes/*",
                "/api/nodes/{id}/sync",
                "/api/nodes/{id}/heartbeat",
                "/api/library/stats",
                "/api/games/{id}/installations",
                "/api/games?installed_only=true",
            ],
            "catalog_pool_routes": [
                "/api/games/discover",
                "/api/games/seed",
                "/api/games/classify",
                "/api/search",
                "/api/games (global catalog)",
                "/api/games/{id}",
            ],
        },
        "pools": {
            "catalog_discovery": {
                "configured": catalog_pool.servers,
                "healthy": catalog_pool.healthy,
                "stats": catalog_pool.stats,
            },
            "user_node_library": {
                "configured": node_pool.servers,
                "healthy": node_pool.healthy,
                "stats": node_pool.stats,
            },
        },
    }


# ── Reverse Proxy Catch-All ──────────────────────────────────────────────────

@app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"])
async def proxy_request(request: Request, path: str):
    if not _HTTP_CLIENT:
        raise HTTPException(status_code=503, detail="Gateway client initializing.")

    query_params = dict(request.query_params)
    pool = _determine_pool(f"/{path}", query_params)

    # Try upstream with failover to other healthy instances in the same pool
    attempts = max(1, len(pool.healthy) or len(pool.servers))
    last_exc = None

    for _ in range(attempts):
        upstream_base = await pool.get_next()
        if not upstream_base:
            break

        url = f"{upstream_base}/{path}"
        if request.url.query:
            url += f"?{request.url.query}"

        # Filter hop-by-hop headers
        headers = dict(request.headers)
        headers.pop("host", None)
        headers.pop("content-length", None)
        headers["x-forwarded-for"] = request.client.host if request.client else "127.0.0.1"

        try:
            body = await request.body()
            t0 = time.time()
            res = await _HTTP_CLIENT.request(
                method=request.method,
                url=url,
                headers=headers,
                content=body if body else None,
            )
            latency = (time.time() - t0) * 1000
            pool.mark_result(upstream_base, success=(res.status_code < 500), latency_ms=latency)

            # Stream response back
            response_headers = dict(res.headers)
            response_headers.pop("content-encoding", None)
            response_headers.pop("content-length", None)
            response_headers["x-routed-pool"] = pool.name
            response_headers["x-routed-instance"] = upstream_base

            return Response(
                content=res.content,
                status_code=res.status_code,
                headers=response_headers,
                media_type=res.headers.get("content-type"),
            )

        except (httpx.ConnectError, httpx.TimeoutException) as exc:
            pool.mark_result(upstream_base, success=False, latency_ms=0)
            logger.warning("Upstream %s failed for %s: %s. Retrying next instance in %s pool...", upstream_base, path, exc, pool.name)
            last_exc = exc

    logger.error("All upstream instances in '%s' pool failed for /%s", pool.name, path)
    return JSONResponse(
        status_code=503,
        content={
            "error": "Service Unavailable",
            "message": f"All upstream servers in the '{pool.name}' pool are currently unreachable.",
            "pool": pool.name,
            "instances": pool.servers,
            "detail": str(last_exc) if last_exc else None,
        },
    )


def main():
    parser = argparse.ArgumentParser(description="Mission Control Multi-Pool Load Balancer")
    parser.add_argument("--host", default="0.0.0.0")
    default_port = int(os.getenv("PORT", os.getenv("LIBRARY_SERVER_PORT", "8800")))
    parser.add_argument("--port", type=int, default=default_port)
    parser.add_argument("--catalog-servers", default=None, help="Comma-separated URLs for Catalog Discovery pool")
    parser.add_argument("--node-servers", default=None, help="Comma-separated URLs for Node Sync pool")
    args = parser.parse_args()

    if getattr(args, "catalog_servers", None):
        catalog_pool.set_servers(_parse_server_list(args.catalog_servers, catalog_pool.servers))

    if getattr(args, "node_servers", None):
        node_pool.set_servers(_parse_server_list(args.node_servers, node_pool.servers))



    try:
        import uvicorn
    except ImportError:
        print("ERROR: uvicorn not installed.")
        sys.exit(1)

    print(f"\n{'='*65}")
    print(f"  Mission Control — Multi-Pool Load Balancer & API Gateway")
    print(f"  Listening:        http://{args.host}:{args.port}")
    print(f"  Catalog Pool:     {catalog_pool.servers}")
    print(f"  Node Sync Pool:   {node_pool.servers}")
    print(f"  Cluster Status:   http://localhost:{args.port}/cluster/status")
    print(f"{'='*65}\n")

    uvicorn.run(app, host=args.host, port=args.port, log_level="info")


if __name__ == "__main__":
    main()
