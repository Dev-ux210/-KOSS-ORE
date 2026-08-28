import chromadb
from Ai.pdf_embedding import get_embedding

#Open ChromaDB
client = chromadb.PersistentClient(path = "./chroma_db")
collection = client.get_or_create_collection(
    name = "pdf_chunked"
)

#Chunk store
def store_chunk(chunk_id, text, page):
    collection.add(
        ids=[str(chunk_id)],
        documents=[text],
        embeddings=[get_embedding(text)],
        metadatas=[{"page": page}]
    )


#Chunk search
def search(query, n_results=3):
    results = collection.query(
        query_embeddings=[get_embedding(query)],
        n_results=n_results
    )
    return results

"""
# Example: Store data
store_chunk(
    chunk_id=1,
    text="Retrieval Augmented Generation combines search with LLMs.",
    page=5
)

store_chunk(
    chunk_id=2,
    text="Neural networks are a subset of machine learning.",
    page=8
)

# Example: Search
results = search("What is RAG?")

for i, doc in enumerate(results["documents"][0]):
    print(f"Result {i + 1}:")
    print(doc)
    print("Page:", results["metadatas"][0][i]["page"])
    print("-" * 40)
"""