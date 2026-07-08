"""
rag_engine.py — ChromaDB-backed Retrieval-Augmented Generation engine.

Upgraded from FAISS:
  - Persistent storage via ChromaDB PersistentClient (no manual save/load needed).
  - Incremental upserts: documents with the same ID are deduplicated automatically.
  - Per-game metadata filtering: query(game_id=...) scopes retrieval to one game.
  - Dynamic updates at runtime without rebuilding the entire index.
"""
import hashlib
import logging
import os
from typing import List, Optional
import warnings

# Suppress sunset deprecation warnings from langchain_community
warnings.filterwarnings("ignore", category=DeprecationWarning, message=".*langchain-community.*")

from langchain_text_splitters import RecursiveCharacterTextSplitter, MarkdownHeaderTextSplitter
from langchain_core.documents import Document
from langchain_community.retrievers import BM25Retriever

logger = logging.getLogger(__name__)

_CHROMA_AVAILABLE = None

def _check_chroma():
    global _CHROMA_AVAILABLE
    if _CHROMA_AVAILABLE is None:
        try:
            import chromadb  # noqa: F401
            _CHROMA_AVAILABLE = True
        except ImportError:
            _CHROMA_AVAILABLE = False
    return _CHROMA_AVAILABLE
class GameRAGEngine:
    """
    ChromaDB-backed RAG engine for game knowledge retrieval.

    Collection schema per document chunk:
      document  — the text chunk
      metadata  — {"source": str, "game_id": str, "chunk_index": int}
      id        — sha256(content)[:16]  (deduplication key)
    """

    COLLECTION_NAME = "game_knowledge"

    def __init__(self, data_dir: str, persist_dir: str, nvidia_api_key: Optional[str] = None):
        """
        Args:
            data_dir:       Path to directory containing raw text files for the knowledge base.
            persist_dir:    Path where ChromaDB persists its database files.
            nvidia_api_key: NVIDIA NIM API key for generating embeddings.
        """
        self.data_dir = data_dir
        self.persist_dir = persist_dir
        self.nvidia_api_key = nvidia_api_key or os.environ.get("NVIDIA_API_KEY")

        if not self.nvidia_api_key:
            logger.warning("NVIDIA_API_KEY not found. RAG functionality will be disabled.")

        # Embedding model
        self.embeddings = None
        if self.nvidia_api_key:
            try:
                from langchain_nvidia_ai_endpoints import NVIDIAEmbeddings
                self.embeddings = NVIDIAEmbeddings(
                    model="nvidia/nv-embedqa-e5-v5",
                    api_key=self.nvidia_api_key
                )
                logger.info("Initialized NVIDIA Cloud Embeddings.")
            except Exception as e:
                logger.warning(f"Failed to initialize NVIDIA Embeddings: {e}")

        self._chroma_client = None
        self._collection = None
        self._initialize_vector_store()

    # ── Initialization ────────────────────────────────────────────────────────

    def _initialize_vector_store(self):
        """Connect to (or create) the ChromaDB persistent store and load seed documents."""
        if not self.embeddings:
            logger.warning("Embeddings not initialized. Skipping ChromaDB setup.")
            return

        if not _check_chroma():
            logger.error("chromadb package not installed. Run: uv pip install 'chromadb>=0.5.0'")
            return

        try:
            import chromadb
            from chromadb.config import Settings

            os.makedirs(self.persist_dir, exist_ok=True)
            self._chroma_client = chromadb.PersistentClient(
                path=self.persist_dir,
                settings=Settings(anonymized_telemetry=False),
            )
            # get_or_create is idempotent — safe on every startup
            self._collection = self._chroma_client.get_or_create_collection(
                name=self.COLLECTION_NAME,
                metadata={"hnsw:space": "cosine"},
            )
            logger.info(
                f"ChromaDB ready at '{self.persist_dir}' "
                f"({self._collection.count()} chunks indexed)"
            )
        except Exception as e:
            logger.error(f"Failed to initialize ChromaDB: {e}")
            self._collection = None
            return

        self._build_bm25_index()

        # Seed from data_dir if the collection is empty
        if self._collection.count() == 0:
            self._seed_from_data_dir()

    def _build_bm25_index(self):
        """Builds an in-memory BM25 index from ChromaDB chunks for Hybrid Search."""
        if not self._collection:
            return
        try:
            results = self._collection.get(include=["documents", "metadatas"])
            docs = results.get("documents", [])
            metas = results.get("metadatas", [])
            bm25_docs = [Document(page_content=d, metadata=m) for d, m in zip(docs, metas)]
            if bm25_docs:
                self.bm25_retriever = BM25Retriever.from_documents(bm25_docs)
                self.bm25_retriever.k = 15
                logger.info(f"BM25 Index built with {len(bm25_docs)} documents.")
            else:
                self.bm25_retriever = None
        except Exception as e:
            logger.error(f"Failed to build BM25 index: {e}")
            self.bm25_retriever = None

    def _seed_from_data_dir(self):
        """Load text files from data_dir and index them into ChromaDB."""
        if not os.path.exists(self.data_dir):
            os.makedirs(self.data_dir, exist_ok=True)
            logger.info(f"Created data directory '{self.data_dir}'. Add .txt files here.")
            return

        from langchain_community.document_loaders import DirectoryLoader, TextLoader
        try:
            loader = DirectoryLoader(
                self.data_dir, glob="**/*.*",
                loader_cls=TextLoader, use_multithreading=True
            )
            try:
                raw_docs = loader.load()
            except Exception as e:
                logger.warning(f"Error loading documents: {e}")
                raw_docs = []

            if not raw_docs:
                logger.info(f"No documents found in '{self.data_dir}'. Collection seeded empty.")
                return

            self.add_documents(raw_docs, game_id="system")
            logger.info(f"Seeded ChromaDB with {len(raw_docs)} documents from '{self.data_dir}'.")
        except Exception as e:
            logger.warning(f"Could not seed ChromaDB from data dir: {e}")

    # ── Public API ────────────────────────────────────────────────────────────

    def query(self, user_query: str, k: int = 3, game_id: Optional[str] = None) -> str:
        """
        Retrieve the top-k most relevant chunks for user_query.

        Args:
            user_query: The question to answer.
            k:          Number of chunks to retrieve.
            game_id:    Optional. When provided, restricts retrieval to chunks
                        belonging to this game (e.g. "cyberpunk_2077").
        Returns:
            A concatenated string of retrieved context, or "" if none found.
        """
        if not self._collection:
            return ""

        vector_docs = []
        try:
            import time
            query_embedding = None
            for attempt in range(3):
                try:
                    query_embedding = self.embeddings.embed_query(user_query)
                    break
                except Exception as api_err:
                    if attempt == 2:
                        raise api_err
                    logger.warning(f"[RAG] Transient embedding error (attempt {attempt+1}/3): {api_err}. Retrying...")
                    time.sleep(1.0)

            where_filter = {"game_id": game_id} if game_id else None
            results = self._collection.query(
                query_embeddings=[query_embedding],
                n_results=15,
                where=where_filter,
                include=["documents", "metadatas"],
            )
            docs = results.get("documents", [[]])[0]
            metas = results.get("metadatas", [[]])[0]
            for d, m in zip(docs, metas):
                vector_docs.append(Document(page_content=d, metadata=m))
        except Exception as e:
            logger.error(f"Vector search failed: {e}")

        bm25_docs = []
        if getattr(self, 'bm25_retriever', None):
            try:
                # Get more docs since we'll post-filter by game_id
                all_bm25 = self.bm25_retriever.invoke(user_query)
                if game_id:
                    all_bm25 = [d for d in all_bm25 if d.metadata.get("game_id") == game_id]
                bm25_docs = all_bm25[:15]
            except Exception as e:
                logger.error(f"BM25 search failed: {e}")

        # Deduplicate combined docs
        combined_dict = {}
        for doc in vector_docs + bm25_docs:
            combined_dict[doc.page_content] = doc
        unique_docs = list(combined_dict.values())

        if not unique_docs:
            return ""

        final_docs = unique_docs[:k]

        parts = []
        for doc in final_docs:
            source = doc.metadata.get("source", "Unknown")
            parts.append(f"Source ({source}):\n{doc.page_content}")
        return "\n\n".join(parts)

    def add_documents(self, documents: List[Document], game_id: str = "general"):
        """
        Incrementally upsert documents into the ChromaDB collection.

        Chunks with identical content are deduplicated by their sha256 ID so
        re-ingesting the same source file is safe and idempotent.

        Args:
            documents: LangChain Document objects (page_content + metadata).
            game_id:   Identifier for the game this knowledge belongs to.
                       Used as a metadata filter key in query().
        """
        if not self._collection:
            logger.warning("Vector store not initialized. Cannot add documents.")
            return

        splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
        chunks = splitter.split_documents(documents)

        if not chunks:
            return

        try:
            import time
            query_texts = [c.page_content for c in chunks]
            embeddings_batch = None
            for attempt in range(3):
                try:
                    embeddings_batch = self.embeddings.embed_documents(query_texts)
                    break
                except Exception as api_err:
                    if attempt == 2:
                        raise api_err
                    logger.warning(f"[RAG] Failed to embed documents (attempt {attempt+1}/3): {api_err}. Retrying...")
                    time.sleep(1.0)
        except Exception as e:
            logger.error(f"Failed to embed documents: {e}")
            return

        ids, texts, embeds, metas = [], [], [], []
        for i, (chunk, emb) in enumerate(zip(chunks, embeddings_batch)):
            # Deterministic ID = first 16 hex chars of sha256(content)
            chunk_id = hashlib.sha256(chunk.page_content.encode()).hexdigest()[:16]
            ids.append(chunk_id)
            texts.append(chunk.page_content)
            embeds.append(emb)
            metas.append({
                "source": chunk.metadata.get("source", "unknown"),
                "game_id": game_id,
                "chunk_index": i,
            })

        try:
            # upsert is idempotent: existing IDs are updated, new ones inserted
            self._collection.upsert(
                ids=ids,
                documents=texts,
                embeddings=embeds,
                metadatas=metas,
            )
            logger.info(
                f"Upserted {len(ids)} chunks into ChromaDB "
                f"(game_id='{game_id}', total={self._collection.count()})"
            )
            self._build_bm25_index()
        except Exception as e:
            logger.error(f"ChromaDB upsert failed: {e}")

    def add_text(self, text: str, source: str = "dynamic", game_id: str = "general"):
        """Convenience: ingest a raw string directly (no file loading needed)."""
        doc = Document(page_content=text, metadata={"source": source})
        self.add_documents([doc], game_id=game_id)

    @property
    def is_ready(self) -> bool:
        """True if the vector store is initialized and ready to accept queries."""
        return self._collection is not None and self.embeddings is not None

    @property
    def document_count(self) -> int:
        """Total number of indexed chunks."""
        if self._collection is None:
            return 0
        try:
            return self._collection.count()
        except Exception:
            return 0
