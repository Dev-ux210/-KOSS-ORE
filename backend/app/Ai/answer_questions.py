import ollama
from Ai.retriever import retrieve_context, retrieve_context_with_citations


def answer_questions(question):
    context = retrieve_context(question)
    if not context:
        return "No indexed context found. Please upload a PDF document first to index its contents."

    prompt = (
        "You are an assistant answering questions using only the provided context.\n\n"
        f"Context:\n{context}\n\n"
        f"User Question: {question}\n\n"
        "Instructions:\n"
        "- Answer using the provided context.\n"
        "- If the answer is not present in the context, clearly state that the information was not found.\n"
        "- Do not invent information."
    )

    try:
        response = ollama.chat(
            model="llama3",
            messages=[
                {
                    "role": "user",
                    "content": prompt
                }
            ]
        )
        return response["message"]["content"]
    except Exception as e:
        return f"Could not connect to Ollama (llama3): {str(e)}. Please make sure 'ollama serve' is running and the model is pulled."


def answer_questions_with_citations(question):
    try:
        context, citations = retrieve_context_with_citations(question)
    except Exception as e:
        return {
            "answer": f"Ollama embedding error: {str(e)}. Please ensure 'ollama serve' is running and 'nomic-embed-text' is pulled.",
            "citations": []
        }

    if not context:
        return {
            "answer": "No indexed context found in the repository. Please upload a PDF document first to index its contents.",
            "citations": []
        }


    prompt = (
        "You are an expert scientific and academic assistant answering questions based solely on the provided context.\n\n"
        f"Context:\n{context}\n\n"
        f"User Question: {question}\n\n"
        "Instructions:\n"
        "- Provide a thorough, direct, and structured answer using the provided context.\n"
        "- If the answer is not present in the context, state that the information was not found in the documents.\n"
        "- Do not invent information."
    )

    try:
        response = ollama.chat(
            model="llama3",
            messages=[
                {
                    "role": "user",
                    "content": prompt
                }
            ]
        )
        return {
            "answer": response["message"]["content"],
            "citations": citations
        }
    except Exception as e:
        return {
            "answer": f"Ollama connection error: {str(e)}. Please ensure 'ollama serve' is running and 'llama3' is pulled (`ollama pull llama3`).",
            "citations": citations
        }


