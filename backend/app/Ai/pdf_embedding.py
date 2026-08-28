import os

import ollama

DEFAULT_EMBED_MODEL = os.environ.get("ORERAG_EMBED_MODEL", "nomic-embed-text")


def get_embedding(text, model=None):
    if not text or not text.strip():
        raise ValueError("get_embedding() requires non-empty text.")
    model = model or DEFAULT_EMBED_MODEL
    response = ollama.embed(model=model, input=text)
    return response["embeddings"][0]


def get_embeddings(texts, model=None):
    texts = [t for t in texts if t and t.strip()]
    if not texts:
        return []
    model = model or DEFAULT_EMBED_MODEL
    response = ollama.embed(model=model, input=texts)
    return response["embeddings"]
