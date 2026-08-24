# Open Knowledge Format (OKF) Architecture & Implementation

## Overview

The **Open Knowledge Format (OKF)** is an open, vendor-neutral specification published by Google Cloud to formalize the "LLM-wiki" knowledge pattern. It standardizes how curated organizational and domain knowledge is authored, structured, and consumed by AI agents and RAG (Retrieval-Augmented Generation) systems.

In **Mission Control**, OKF serves as the structured knowledge and offline failover layer for the in-game AI overlay and decision-making engine.

---

## Why OKF in Mission Control?

1. **Zero Binary & C++ Dependency Overhead**:
   * Eliminates the need for heavy, compilation-prone vector database binaries (e.g., ChromaDB, FAISS C++ wheels) during PyInstaller packaging.
   * Avoids dynamic runtime linking issues on Windows and Linux release distributions.

2. **Human & Agent Co-Authoring**:
   * Knowledge files are clean, readable Markdown documents with YAML frontmatter.
   * Developers, gamers, and AI agents can create, edit, or patch game intelligence directly via text editors or Git.

3. **Dual-Tier Resilient Retrieval**:
   * **Tier 1 (Distributed Cloud Sync)**: Fetches live catalog intelligence, game features, and summaries from the central Distributed Server (`/api/catalog`).
   * **Tier 2 (Local OKF Markdown & SQLite/BM25)**: Loads and indexes structured `.md` files directly from `backend/rag_data/` and `backend/data/` for 100% offline, zero-latency in-game guidance.

---

## File Structure & Specification

All OKF documents live in `Gaming/backend/rag_data/` (or `Gaming/backend/data/knowledge/`) using the `.md` or `.okf` extension.

### Example OKF Document (`rag_data/cyberpunk_2077.md`)

```markdown
---
type: game_intel
title: Cyberpunk 2077 Optimization and Night City Guide
game_id: cp2077
tags: [fps, dlss, ray-tracing, settings, night-city]
version: 1.0.0
last_updated: "2026-08-24"
---

# Cyberpunk 2077 Intel
Night City is divided into six main districts: City Center, Heywood, Santo Domingo, Pacifica, Watson, and Westbrook.

## Performance & Optimization Guidelines
- **Crowd Density**: Reduce to Medium on 6-core CPUs to alleviate draw-call bottlenecks in dense downtown areas.
- **DLSS & Ray Tracing**: Enable DLSS Super Resolution in Quality mode for 1440p / 4K. Combine with Frame Generation for smooth 100+ FPS output.
- **Path Tracing**: Recommended only on NVIDIA RTX 4070 Ti / 5070 and above.
```

### Supported Metadata Schema (YAML Frontmatter)

| Field | Type | Description |
| :--- | :--- | :--- |
| `type` | string | Document categorization (e.g., `game_intel`, `hardware_profile`, `patch_notes`). |
| `title` | string | Human-readable title of the knowledge document. |
| `game_id` | string | Unique identifier for game-scoped RAG filtering (e.g., `cp2077`, `witcher3`, `general`). |
| `tags` | list | List of indexing keywords used to assist lexical search matching. |
| `version` | string | Semantic version of the knowledge asset. |
| `last_updated` | string | Timestamp of last modification. |

---

## Engine Integration (`rag_engine.py`)

The OKF parser and retrieval logic are implemented in [`Gaming/backend/ai_brain/rag_engine.py`](file:///e:/AiAssistant/Gaming/backend/ai_brain/rag_engine.py) using the following workflow:

```mermaid
graph TD
    A["Local OKF Files (rag_data/*.md)"] -->|YAML Frontmatter Parser| B["Document Ingestion & Chunking"]
    C["Distributed Server (/api/catalog)"] -->|Async Background Sync| B
    B -->|Persist Metadata| D["Local SQLite Storage (rag_documents.db)"]
    D -->|Index In-Memory| E["BM25 Lexical Retriever"]
    E -->|Scoped Query (user_query, game_id)| F["AI Overlay & Decision Maker"]
```

### Ingestion Pipeline
1. **Startup Scanning**: On initialization, `GameRAGEngine` scans the `data_dir` / `rag_data/` directory.
2. **YAML Frontmatter Extraction**: `parse_okf_content()` separates the YAML metadata header from the markdown body.
3. **Chunking & Hashing**: `RecursiveCharacterTextSplitter` chunks the body while preserving `game_id`, `source`, and `title`.
4. **SQLite Caching**: Stores chunks into SQLite (`rag_documents.db`) for instant retrieval.
5. **In-Memory BM25 Index**: Builds an in-memory lexical index with $O(1)$ query evaluation time.

---

## Build & Deployment Compatibility

* **PyInstaller (`MissionControl.spec`)**: The `rag_data` folder is bundled as a physical data asset:
  ```python
  datas = [
      ('data', 'data'),
      ('rag_data', 'rag_data'),
      ...
  ]
  ```
* **Packaging**: No third-party C++ libraries or binary wheels are required. PyInstaller bundles the pure Python parser cleanly with zero build warnings.
* **Electron Builder (`package.json`)**: Packed directly into `extraResources` as part of the backend bundle.
