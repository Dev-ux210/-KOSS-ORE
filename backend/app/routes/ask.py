from fastapi import APIRouter
from pydantic import BaseModel

from Ai.answer_questions import answer_questions_with_citations

router = APIRouter()

class Question(BaseModel):
    question: str

@router.post("/ask")
def ask(request: Question):
    result = answer_questions_with_citations(request.question)
    return result