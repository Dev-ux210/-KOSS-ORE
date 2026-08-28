from fastapi import APIRouter, UploadFile, File, Form, HTTPException
import shutil
import os
import json
import time
from datetime import datetime

from Ai.pdf_ingestion import extract_pages
from Ai.pdf_chunking import chunk_pages
from Ai.vector_store import store_chunk, delete_document_chunks, get_total_chunks

router = APIRouter()

UPLOAD_FOLDER = "uploads"
META_FILE = os.path.join(UPLOAD_FOLDER, "documents_meta.json")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)


def _load_meta():
    if os.path.exists(META_FILE):
        try:
            with open(META_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {}
    return {}


def _save_meta(meta):
    try:
        with open(META_FILE, "w", encoding="utf-8") as f:
            json.dump(meta, f, indent=2)
    except Exception:
        pass


@router.post("/upload")
async def upload_pdf(
    file: UploadFile = File(...),
    chunk_size: int = Form(500),
    chunk_overlap: int = Form(50)
):
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

    file_size = os.path.getsize(file_path)
    file_size_str = f"{file_size / 1024:.1f} KB" if file_size < 1024 * 1024 else f"{file_size / (1024 * 1024):.2f} MB"

    # Extract pages from PDF
    start_time = time.strftime("%H:%M:%S")
    pages = extract_pages(file_path)
    char_count = sum(len(p.get("text", "")) for p in pages)

    # Create chunks
    chunks = chunk_pages(pages, chunk_size=chunk_size, overlap=chunk_overlap)

    # Clean existing chunks for this file before storing new ones
    delete_document_chunks(file.filename)

    # Store each chunk in ChromaDB
    try:
        for chunk in chunks:
            chunk_id = f"{file.filename}_{chunk['chunk_id']}"
            store_chunk(
                chunk_id=chunk_id,
                text=chunk["text"],
                page=chunk["page"],
                source=file.filename
            )
    except Exception as e:
        return {
            "success": False,
            "message": f"Embedding failed: {str(e)}. Please ensure Ollama is running (`ollama serve`) and 'nomic-embed-text' is pulled."
        }


    time_now = time.strftime("%H:%M:%S")
    logs = [
        {"timestamp": start_time, "level": "INFO", "message": f"Starting ingestion process for {file.filename}"},
        {"timestamp": start_time, "level": "INFO", "message": "Extracting pages via PyMuPDF (fitz)"},
        {"timestamp": start_time, "level": "INFO", "message": f"Successfully extracted {char_count} characters across {len(pages)} pages"},
        {"timestamp": time_now, "level": "INFO", "message": f"Segmented text into {len(chunks)} semantic chunks (chunk_size={chunk_size}, overlap={chunk_overlap})"},
        {"timestamp": time_now, "level": "INFO", "message": "Connecting to local Ollama embed client (nomic-embed-text)"},
        {"timestamp": time_now, "level": "INFO", "message": f"Generated vector embeddings for {len(chunks)} chunks"},
        {"timestamp": time_now, "level": "INFO", "message": f"Successfully indexed {len(chunks)} chunks into Chroma vector DB"}
    ]

    doc_id = f"doc_{int(time.time())}_{file.filename}"
    meta = _load_meta()
    meta[file.filename] = {
        "id": doc_id,
        "name": file.filename,
        "size": file_size_str,
        "status": "ready",
        "created": datetime.now().strftime("%b %d, %Y, %I:%M %p"),
        "environment": "production",
        "chunksCount": len(chunks),
        "charCount": char_count,
        "pages": len(pages),
        "logs": logs
    }
    _save_meta(meta)

    return {
        "success": True,
        "message": "PDF processed successfully!",
        "id": doc_id,
        "filename": file.filename,
        "name": file.filename,
        "size": file_size_str,
        "pages": len(pages),
        "chunks": len(chunks),
        "chunksCount": len(chunks),
        "charCount": char_count,
        "logs": logs
    }


@router.get("/documents")
def get_documents():
    meta = _load_meta()
    docs = []
    # Verify files still exist in uploads folder
    for fname, d in list(meta.items()):
        fpath = os.path.join(UPLOAD_FOLDER, fname)
        if os.path.exists(fpath):
            docs.append(d)
        else:
            del meta[fname]
    _save_meta(meta)

    # Sort most recent first
    docs.reverse()
    return {"documents": docs, "total_chunks": get_total_chunks()}


@router.delete("/documents/{filename}")
def delete_document(filename: str):
    delete_document_chunks(filename)
    file_path = os.path.join(UPLOAD_FOLDER, filename)
    if os.path.exists(file_path):
        try:
            os.remove(file_path)
        except Exception:
            pass

    meta = _load_meta()
    if filename in meta:
        del meta[filename]
        _save_meta(meta)

    return {"success": True, "message": f"Document {filename} deleted successfully"}