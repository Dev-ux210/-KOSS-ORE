import ollama
from Ai.retriever import retrieve_context

def answer_questions(question):
    context = retrieve_context(question)

    prompt = ("You are an assistant answering questions using only the provided context."+context
              +"User Question : "+question
              +"Instructions : "
              "- Answer using the provided context. "
              "- If the answer is not present, say that the information was not found."
              "- Do not invent information."
            )
    
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

