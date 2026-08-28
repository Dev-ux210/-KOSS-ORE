from fastapi import APIRouter, UploadFile, File
import shutil
import os

from Ai.pdf_ingestion import extract_pages
from Ai.pdf_chunking import chunk_pages
from Ai.vector_store import store_chunk

router = APIRouter()

UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)


@router.post("/upload")
async def upload_pdf(file: UploadFile = File(...)):

    # Allow only PDF files
    if not file.filename.lower().endswith(".pdf"):
        return {
            "success": False,
            "message": "Only PDF files are allowed."
        }

    # Save uploaded PDF
    file_path = os.path.join(UPLOAD_FOLDER, file.filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Extract pages from PDF
    pages = extract_pages(file_path)

    # Create chunks
    chunks = chunk_pages(pages)

    # Store each chunk in ChromaDB
    for chunk in chunks:
        store_chunk(
            chunk_id=chunk["chunk_id"],
            text=chunk["text"],
            page=chunk["page"]
        )

    return {
        "success": True,
        "message": "PDF processed successfully!",
        "filename": file.filename,
        "pages": len(pages),
        "chunks": len(chunks)
    }