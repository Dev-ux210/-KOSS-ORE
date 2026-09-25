from Ai.providers import get_embedding
from Ai.vector_store import get_collection


def retrieve_context(question, num_results=3):
    try:
        col = get_collection()
        if col.count() == 0:
            return ""
        emb = get_embedding(question)
        results = col.query(
            query_embeddings=[emb],
            n_results=min(num_results, col.count())
        )
        if not results or not results.get("documents") or not results["documents"][0]:
            return ""
        return "\n\n".join(results["documents"][0])
    except Exception:
        return ""


def retrieve_context_with_citations(question, num_results=4):
    try:
        col = get_collection()
        if col.count() == 0:
            return "", []

        emb = get_embedding(question)
        results = col.query(
            query_embeddings=[emb],
            n_results=min(num_results, col.count())
        )

        docs = results.get("documents", [[]])[0]
        metas = results.get("metadatas", [[]])[0]
        distances = results.get("distances", [[]])[0] if "distances" in results and results["distances"] else []

        citations = []
        for i, doc_text in enumerate(docs):
            meta = metas[i] if i < len(metas) and metas[i] else {}
            dist = distances[i] if i < len(distances) else 0.5
            # Convert cosine distance to similarity score percentage
            score = round(max(0.1, 1.0 - float(dist)), 2)

            citations.append({
                "sourceName": meta.get("source", "Document"),
                "pageNumber": meta.get("page", 1),
                "snippet": doc_text,
                "score": score
            })

        context_str = "\n\n".join(docs)
        return context_str, citations
    except Exception as e:
        raise RuntimeError(f"Embedding or vector retrieval failed: {str(e)}")
