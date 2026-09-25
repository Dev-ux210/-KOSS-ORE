import chromadb
from config import CHROMA_DIR
from Ai.providers import get_embedding, get_embeddings

_client = None
_collection = None


def get_collection():
    global _client, _collection
    if _collection is None:
        _client = chromadb.PersistentClient(path=CHROMA_DIR)
        _collection = _client.get_or_create_collection(name="pdf_chunked")
    return _collection


def store_chunk(chunk_id, text, page, source=""):
    metadata = {"page": page}
    if source:
        metadata["source"] = source
    col = get_collection()
    col.add(
        ids=[str(chunk_id)],
        documents=[text],
        embeddings=[get_embedding(text)],
        metadatas=[metadata]
    )


def store_chunks_batch(chunks, source=""):
    if not chunks:
        return
    col = get_collection()
    ids = [str(f"{source}_{c['chunk_id']}") for c in chunks]
    texts = [c["text"] for c in chunks]
    metas = [{"page": c["page"], "source": source} for c in chunks]
    embeddings = get_embeddings(texts)
    col.add(
        ids=ids,
        documents=texts,
        embeddings=embeddings,
        metadatas=metas
    )


def search(query, n_results=3):
    col = get_collection()
    if col.count() == 0:
        return {"documents": [[]], "metadatas": [[]], "distances": [[]]}
    results = col.query(
        query_embeddings=[get_embedding(query)],
        n_results=min(n_results, col.count())
    )
    return results


def delete_document_chunks(source):
    try:
        col = get_collection()
        col.delete(where={"source": source})
    except Exception:
        pass


def get_total_chunks():
    col = get_collection()
    return col.count()