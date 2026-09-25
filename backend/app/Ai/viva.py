from Ai.providers import chat_completion


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
- Have different types of Questions - MCQ, TRUE/FALSE, Subjective Questions.
- Provide all Answers in the end.

Study Material:

{text}
"""

    return chat_completion(prompt)
