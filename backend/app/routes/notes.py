from fastapi import APIRouter
from pydantic import BaseModel

from Ai.notes import generate_notes

router = APIRouter()

class NotesRequest(BaseModel):
    text: str

@router.post("/notes")
def create_notes(request: NotesRequest):

    notes = generate_notes(request.text)

    return {
        "notes": notes
    }