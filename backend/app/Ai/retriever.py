import chromadb
from Ai.pdf_embedding import get_embedding

client = chromadb.PersistentClient("./chroma_db")
collection = client.get_or_create_collection(
    name = "pdf_chunked"
)

def retrieve_context(question, num_results=3):
    results = collection.query(
        query_embeddings=[get_embedding(question)],
        n_results=num_results
    )

    return "\n\n".join(results["documents"][0])


        
    

