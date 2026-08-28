
import ollama

def generate_notes(text: str) -> str:
    prompt = f"""
    You are an expert study assistant.

    Convert the following study material into detailed, well-structured notes.

    Requirements:
    - Use headings and subheadings.
    - Explain important concepts.
    - Keep technical terms.
    - Use bullet points where appropriate.
    - Do not omit important information.

    Study Material:
    {text}
    """

    response = ollama.chat(
        model="llama3",
        messages=[
            {
                "role": "user",
                "content": prompt,
            }
        ],
    )

    return response["message"]["content"]
