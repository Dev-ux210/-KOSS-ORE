from Ai.providers import chat_completion
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
        return chat_completion(prompt)
    except Exception as e:
        return f"AI Generation error: {str(e)}"


def answer_questions_with_citations(question):
    try:
        context, citations = retrieve_context_with_citations(question)
    except Exception as e:
        return {
            "answer": f"Embedding retrieval error: {str(e)}",
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
        answer_text = chat_completion(prompt)
        return {
            "answer": answer_text,
            "citations": citations
        }
    except Exception as e:
        return {
            "answer": f"AI Generation error: {str(e)}",
            "citations": citations
        }
