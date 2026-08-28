from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.upload import router as upload_router
from routes.notes import router as notes_router
from routes.viva import router as viva_router
from routes.ask import router as ask_router


app = FastAPI(
    title="Kaju Backend",
    description="AI Revision Notes Generator",
    version="1.0"
)



app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
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
        "message": "Welcome to Kaju Backend!"
    }


@app.get("/health")
def health():
    return {
        "status": "Running"
    }