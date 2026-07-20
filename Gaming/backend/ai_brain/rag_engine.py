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
from typing import List, Optional
import warnings

warnings.filterwarnings("ignore", category=DeprecationWarning, message=".*langchain-community.*")

from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document
from langchain_community.retrievers import BM25Retriever

logger = logging.getLogger(__name__)

class GameRAGEngine:
    """
    SQLite/BM25-backed RAG engine for game knowledge retrieval.
    """

    def __init__(self, data_dir: str, persist_dir: str, nvidia_api_key: Optional[str] = None):
        self.data_dir = data_dir
        self.persist_dir = persist_dir
        self._db_lock = threading.RLock()
        self.bm25_retriever = None
        self._initialize_vector_store()

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

    def _seed_from_data_dir(self):
        if not os.path.exists(self.data_dir):
            os.makedirs(self.data_dir, exist_ok=True)
            return

        from langchain_community.document_loaders import DirectoryLoader, TextLoader
        try:
            loader = DirectoryLoader(self.data_dir, glob="**/*.*", loader_cls=TextLoader, use_multithreading=True)
            raw_docs = loader.load()
            if raw_docs:
                self.add_documents(raw_docs, game_id="system")
        except Exception as e:
            logger.warning(f"Could not seed SQLite from data dir: {e}")

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
                c.execute('''
                    INSERT OR REPLACE INTO documents (id, content, source, game_id, chunk_index)
                    VALUES (?, ?, ?, ?, ?)
                ''', (chunk_id, chunk.page_content, source, game_id, i))
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
