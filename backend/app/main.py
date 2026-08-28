from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.upload import router as upload_router
from routes.notes import router as notes_router
from routes.viva import router as viva_router
from routes.ask import router as ask_router


from Ai.vector_store import get_total_chunks
from routes.upload import _load_meta

app = FastAPI(
    title="Kaju Backend",
    description="AI Revision Notes & Academic RAG Repository",
    version="1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload_router)
app.include_router(notes_router)
app.include_router(viva_router)
app.include_router(ask_router)


@app.get("/")
def home():
    return {
        "message": "Welcome to Kaju Backend!",
        "version": "1.0",
        "endpoints": ["/health", "/upload", "/documents", "/ask", "/notes", "/viva"]
    }


@app.get("/health")
def health():
    meta = _load_meta()
    total_chunks = get_total_chunks()
    return {
        "status": "Running",
        "documents_count": len(meta),
        "total_chunks": total_chunks
    }