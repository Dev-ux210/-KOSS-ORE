
import ollama

def generate_viva(text: str) -> str:
    prompt = f"""
You are an experienced examiner.

Generate viva questions and answers from the following study material.

Requirements:
- Output only Markdown.
- Use headings.
- Generate 15–20 questions.
- Provide concise but complete answers.
- Include conceptual, application-based, and definition questions.
- Do not ask the user for more information.
- Do not mention the input material.
- Have different types of Questions - MCQ,TRUE/FALSE, Subjective Questions.
- Provide all Answers in the end.

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
