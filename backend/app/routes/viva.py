from fastapi import APIRouter
from pydantic import BaseModel

from Ai.viva import generate_viva

router = APIRouter()

class VivaRequest(BaseModel):
    text: str

@router.post("/viva")
def viva(request: VivaRequest):

    questions = generate_viva(request.text)

    return {
        "viva": questions
    }