import os
import sys
import argparse
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.upload import router as upload_router
from routes.notes import router as notes_router
from routes.viva import router as viva_router
from routes.ask import router as ask_router
from routes.settings import router as settings_router

from Ai.vector_store import get_total_chunks
from Ai.providers import check_status
from routes.upload import _load_meta

app = FastAPI(
    title="ORE Backend",
    description="Local Academic Knowledge Repository & AI RAG Engine",
    version="1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload_router)
app.include_router(notes_router)
app.include_router(viva_router)
app.include_router(ask_router)
app.include_router(settings_router)


@app.get("/")
def home():
    return {
        "message": "Welcome to ORE Backend!",
        "version": "1.0",
        "endpoints": ["/health", "/upload", "/documents", "/ask", "/notes", "/viva", "/settings"]
    }


@app.get("/health")
def health():
    meta = _load_meta()
    total_chunks = get_total_chunks()
    provider_status = check_status()
    return {
        "status": "Running",
        "documents_count": len(meta),
        "total_chunks": total_chunks,
        "provider": provider_status
    }


if __name__ == "__main__":
    import uvicorn

    parser = argparse.ArgumentParser(description="ORE Backend Server")
    parser.add_argument("--port", type=int, default=8000, help="Port to listen on")
    parser.add_argument("--host", type=str, default="127.0.0.1", help="Host to bind to")
    parser.add_argument("--data-dir", type=str, default=None, help="Directory to store persistent data")
    args = parser.parse_args()

    if args.data_dir:
        os.environ["ORE_DATA_DIR"] = args.data_dir

    uvicorn.run("main:app", host=args.host, port=args.port, reload=False)