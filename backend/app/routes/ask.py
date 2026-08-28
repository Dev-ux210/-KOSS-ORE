from fastapi import APIRouter
from pydantic import BaseModel

from Ai.answer_questions import answer_questions

router = APIRouter()

class Question(BaseModel):
    question: str

@router.post("/ask")
def ask(request: Question):

    answer = answer_questions(request.question)

    return {
        "answer": answer
    }