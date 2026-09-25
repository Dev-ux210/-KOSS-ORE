from Ai.providers import get_embedding as _provider_get_embedding, get_embeddings as _provider_get_embeddings


def get_embedding(text, model=None):
    return _provider_get_embedding(text)


def get_embeddings(texts, model=None):
    return _provider_get_embeddings(texts)
