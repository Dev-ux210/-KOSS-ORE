import chromadb
from Ai.pdf_embedding import get_embedding

client = chromadb.PersistentClient("./chroma_db")
collection = client.get_or_create_collection(
    name = "pdf_chunked"
)

def retrieve_context(question, num_results=3):
    try:
        if collection.count() == 0:
            return ""
        emb = get_embedding(question)
        results = collection.query(
            query_embeddings=[emb],
            n_results=min(num_results, collection.count())
        )
        if not results or not results.get("documents") or not results["documents"][0]:
            return ""
        return "\n\n".join(results["documents"][0])
    except Exception:
        return ""


def retrieve_context_with_citations(question, num_results=4):
    try:
        if collection.count() == 0:
            return "", []

        emb = get_embedding(question)
        results = collection.query(
            query_embeddings=[emb],
            n_results=min(num_results, collection.count())
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




        
    

