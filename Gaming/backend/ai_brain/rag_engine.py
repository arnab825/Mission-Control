"""
rag_engine.py — SQLite + BM25 Retrieval-Augmented Generation engine.

Replaces ChromaDB to fix PyInstaller C++ dependency issues.
Uses SQLite for persistent document storage and in-memory BM25 for search.
"""
import hashlib
import logging
import os
import sqlite3
import threading
from typing import List, Optional, Tuple, Dict, Any
import warnings
import yaml

warnings.filterwarnings("ignore", category=DeprecationWarning, message=".*langchain-community.*")

from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document
from langchain_community.retrievers import BM25Retriever

logger = logging.getLogger(__name__)

class GameRAGEngine:
    """
    SQLite/BM25-backed RAG engine for game knowledge retrieval.
    Supports local Open Knowledge Format (OKF) docs and optional sync from Distributed Server.
    """

    def __init__(self, data_dir: str, persist_dir: str, server_url: Optional[str] = None, nvidia_api_key: Optional[str] = None):
        self.data_dir = data_dir
        self.persist_dir = persist_dir
        self.server_url = server_url or os.getenv("LIBRARY_SERVER_URL") or os.getenv("DISTRIBUTED_SERVER_URL")
        self._db_lock = threading.RLock()
        self.bm25_retriever = None
        self._initialize_vector_store()
        
        # Async background sync from distributed server if configured
        if self.server_url:
            threading.Thread(target=self.sync_from_distributed_server, daemon=True).start()

    def _initialize_vector_store(self):
        os.makedirs(self.persist_dir, exist_ok=True)
        self.db_path = os.path.join(self.persist_dir, "rag_documents.db")
        
        with self._db_lock:
            conn = sqlite3.connect(self.db_path)
            c = conn.cursor()
            c.execute('''
                CREATE TABLE IF NOT EXISTS documents (
                    id TEXT PRIMARY KEY,
                    content TEXT,
                    source TEXT,
                    game_id TEXT,
                    chunk_index INTEGER
                )
            ''')
            conn.commit()
            
            c.execute('SELECT COUNT(*) FROM documents')
            count = c.fetchone()[0]
            conn.close()

        if count == 0:
            self._seed_from_data_dir()
            
        self._build_bm25_index()

    def _build_bm25_index(self):
        try:
            with self._db_lock:
                conn = sqlite3.connect(self.db_path)
                c = conn.cursor()
                c.execute('SELECT content, source, game_id FROM documents')
                rows = c.fetchall()
                conn.close()

            if not rows:
                self.bm25_retriever = None
                return

            bm25_docs = []
            for content, source, game_id in rows:
                bm25_docs.append(Document(
                    page_content=content,
                    metadata={"source": source, "game_id": game_id}
                ))
            
            self.bm25_retriever = BM25Retriever.from_documents(bm25_docs)
            self.bm25_retriever.k = 15
            logger.info(f"BM25 Index built with {len(bm25_docs)} documents.")
        except Exception as e:
            logger.error(f"Failed to build BM25 index: {e}")
            self.bm25_retriever = None

    @staticmethod
    def parse_okf_content(raw_text: str) -> Tuple[str, Dict[str, Any]]:
        """
        Parses Open Knowledge Format (OKF) markdown with YAML frontmatter.
        Returns (body_text, metadata_dict).
        """
        metadata: Dict[str, Any] = {}
        body = raw_text.strip()

        if raw_text.startswith("---"):
            parts = raw_text.split("---", 2)
            if len(parts) >= 3:
                try:
                    parsed_yaml = yaml.safe_load(parts[1])
                    if isinstance(parsed_yaml, dict):
                        metadata = parsed_yaml
                    body = parts[2].strip()
                except Exception as e:
                    logger.warning(f"Error parsing OKF YAML frontmatter: {e}")

        return body, metadata

    def _seed_from_data_dir(self):
        if not os.path.exists(self.data_dir):
            os.makedirs(self.data_dir, exist_ok=True)
            return

        seeded_docs: List[Document] = []
        
        # Walk data_dir and ingest all .md, .okf, and .txt files
        for root, _, files in os.walk(self.data_dir):
            for file in files:
                if file.endswith(('.md', '.okf', '.txt')):
                    file_path = os.path.join(root, file)
                    try:
                        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                            raw_content = f.read()

                        if not raw_content.strip():
                            continue

                        body, metadata = self.parse_okf_content(raw_content)
                        game_id = metadata.get("game_id", metadata.get("game", "general"))
                        metadata["source"] = metadata.get("source", file)
                        metadata["game_id"] = str(game_id)
                        
                        seeded_docs.append(Document(
                            page_content=body,
                            metadata=metadata
                        ))
                    except Exception as e:
                        logger.warning(f"Failed to read knowledge file {file_path}: {e}")

        if seeded_docs:
            for doc in seeded_docs:
                self.add_documents([doc], game_id=doc.metadata.get("game_id", "general"))
            logger.info(f"Successfully seeded {len(seeded_docs)} OKF knowledge files from {self.data_dir}")

    def sync_from_distributed_server(self, limit: int = 200):
        """
        Fetches canonical game metadata, summaries, and feature intelligence from the Distributed Server
        and indexes them into the local RAG engine.
        """
        if not self.server_url:
            return

        import urllib.request
        import json
        
        base_url = self.server_url.rstrip("/")
        api_url = f"{base_url}/api/catalog?limit={limit}"
        logger.info(f"Syncing game intelligence from distributed server: {api_url}")
        
        try:
            req = urllib.request.Request(api_url, headers={"User-Agent": "MissionControl-RAG/1.0"})
            with urllib.request.urlopen(req, timeout=5) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                games = data.get("games", []) if isinstance(data, dict) else (data if isinstance(data, list) else [])
                
                remote_docs: List[Document] = []
                for g in games:
                    title = g.get("title", "Unknown Game")
                    summary = g.get("summary", "")
                    features = g.get("features", [])
                    game_id = g.get("id", title.lower().replace(" ", "_"))
                    
                    if not summary and not features:
                        continue

                    feat_str = "\n- ".join(features) if isinstance(features, list) else str(features)
                    content = f"# {title}\n\n## Overview\n{summary}\n\n## Key Features\n- {feat_str}" if feat_str else f"# {title}\n\n## Overview\n{summary}"
                    
                    remote_docs.append(Document(
                        page_content=content,
                        metadata={
                            "source": f"distributed_server:{base_url}",
                            "title": title,
                            "game_id": str(game_id),
                            "type": "distributed_catalog_intel"
                        }
                    ))

                if remote_docs:
                    for doc in remote_docs:
                        self.add_documents([doc], game_id=doc.metadata.get("game_id", "general"))
                    logger.info(f"Successfully ingested {len(remote_docs)} games from Distributed Server into local RAG.")
        except Exception as e:
            logger.warning(f"Could not sync from distributed server ({base_url}): {e}")

    def query(self, user_query: str, k: int = 3, game_id: Optional[str] = None) -> str:
        if not self.bm25_retriever:
            return ""

        try:
            all_bm25 = self.bm25_retriever.invoke(user_query)
            if game_id:
                all_bm25 = [d for d in all_bm25 if d.metadata.get("game_id") == game_id]
            
            final_docs = all_bm25[:k]
            if not final_docs:
                return ""

            parts = []
            for doc in final_docs:
                source = doc.metadata.get("source", "Unknown")
                parts.append(f"Source ({source}):\n{doc.page_content}")
            return "\n\n".join(parts)
        except Exception as e:
            logger.error(f"BM25 search failed: {e}")
            return ""

    def add_documents(self, documents: List[Document], game_id: str = "general"):
        splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
        chunks = splitter.split_documents(documents)

        if not chunks:
            return

        with self._db_lock:
            conn = sqlite3.connect(self.db_path)
            c = conn.cursor()
            
            inserted = 0
            for i, chunk in enumerate(chunks):
                chunk_id = hashlib.sha256(chunk.page_content.encode()).hexdigest()[:16]
                source = chunk.metadata.get("source", "unknown")
                effective_game_id = str(chunk.metadata.get("game_id", game_id))
                c.execute('''
                    INSERT OR REPLACE INTO documents (id, content, source, game_id, chunk_index)
                    VALUES (?, ?, ?, ?, ?)
                ''', (chunk_id, chunk.page_content, source, effective_game_id, i))
                inserted += 1
                
            conn.commit()
            conn.close()
            
        logger.info(f"Upserted {inserted} chunks into SQLite RAG (game_id='{game_id}')")
        self._build_bm25_index()

    def add_text(self, text: str, source: str = "dynamic", game_id: str = "general"):
        doc = Document(page_content=text, metadata={"source": source})
        self.add_documents([doc], game_id=game_id)

    @property
    def is_ready(self) -> bool:
        return self.bm25_retriever is not None

    @property
    def document_count(self) -> int:
        try:
            with self._db_lock:
                conn = sqlite3.connect(self.db_path)
                c = conn.cursor()
                c.execute('SELECT COUNT(*) FROM documents')
                count = c.fetchone()[0]
                conn.close()
            return count
        except Exception:
            return 0
