import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from Ai.viva import generate_viva
from Ai.pdf_ingestion import extract_pdf_text

router = APIRouter()
UPLOAD_FOLDER = "uploads"

class VivaRequest(BaseModel):
    text: str | None = None
    filename: str | None = None

@router.post("/viva")
def viva(request: VivaRequest):
    content_text = ""
    if request.filename:
        file_path = os.path.join(UPLOAD_FOLDER, request.filename)
        if os.path.exists(file_path):
            content_text = extract_pdf_text(file_path)
        else:
            raise HTTPException(status_code=404, detail=f"File {request.filename} not found in uploads")
    elif request.text:
        content_text = request.text
    else:
        raise HTTPException(status_code=400, detail="Either 'text' or 'filename' must be provided")

    # Limit text to ~15,000 characters if very long to prevent context overflow
    if len(content_text) > 15000:
        content_text = content_text[:15000] + "\n...[truncated for viva generation]"

    try:
        questions = generate_viva(content_text)
        return {
            "success": True,
            "viva": questions
        }
    except Exception as e:
        return {
            "success": False,
            "viva": f"Could not generate viva questions with Ollama: {str(e)}. Make sure 'ollama serve' is running and 'llama3' is pulled."
        }