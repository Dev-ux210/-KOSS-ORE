import json
import os
from pathlib import Path
import httpx
from config import SETTINGS_FILE

DEFAULT_SETTINGS = {
    "provider": "ollama",
    "ollama_base_url": "http://127.0.0.1:11434",
    "ollama_chat_model": "llama3",
    "ollama_embed_model": "nomic-embed-text",
    "gemini_api_key": os.environ.get("GEMINI_API_KEY", ""),
    "gemini_chat_model": "gemini-1.5-flash",
    "gemini_embed_model": "text-embedding-004",
    "openai_api_key": os.environ.get("OPENAI_API_KEY", ""),
    "openai_base_url": "https://api.openai.com/v1",
    "openai_chat_model": "gpt-4o-mini",
    "openai_embed_model": "text-embedding-3-small",
}


def load_settings() -> dict:
    if os.path.exists(SETTINGS_FILE):
        try:
            with open(SETTINGS_FILE, "r", encoding="utf-8") as f:
                saved = json.load(f)
                merged = dict(DEFAULT_SETTINGS)
                merged.update(saved)
                return merged
        except Exception:
            pass
    return dict(DEFAULT_SETTINGS)


def save_settings(new_settings: dict) -> dict:
    current = load_settings()
    current.update({k: v for k, v in new_settings.items() if v is not None})
    try:
        Path(SETTINGS_FILE).parent.mkdir(parents=True, exist_ok=True)
        with open(SETTINGS_FILE, "w", encoding="utf-8") as f:
            json.dump(current, f, indent=2)
    except Exception as e:
        print(f"Error saving settings: {e}")
    return current


def check_ollama_status(base_url: str = "http://127.0.0.1:11434") -> dict:
    try:
        r = httpx.get(f"{base_url.rstrip('/')}/api/tags", timeout=2.0)
        if r.status_code == 200:
            models = [m.get("name") for m in r.json().get("models", [])]
            return {"available": True, "models": models}
    except Exception:
        pass
    return {"available": False, "models": []}


def check_status() -> dict:
    settings = load_settings()
    provider = settings.get("provider", "ollama")
    ollama_info = check_ollama_status(settings.get("ollama_base_url", "http://127.0.0.1:11434"))

    status = {
        "active_provider": provider,
        "ollama": ollama_info,
        "gemini": {
            "has_key": bool(settings.get("gemini_api_key", "").strip()),
            "model": settings.get("gemini_chat_model")
        },
        "openai": {
            "has_key": bool(settings.get("openai_api_key", "").strip()),
            "model": settings.get("openai_chat_model")
        },
        "ready": False,
        "message": ""
    }

    if provider == "ollama":
        if ollama_info["available"]:
            status["ready"] = True
            status["message"] = "Ollama is running locally."
        else:
            status["message"] = "Ollama is not running. Please start Ollama or configure a cloud API key in Settings."
    elif provider == "gemini":
        if status["gemini"]["has_key"]:
            status["ready"] = True
            status["message"] = "Google Gemini configured."
        else:
            status["message"] = "Gemini API key is required."
    elif provider == "openai":
        if status["openai"]["has_key"]:
            status["ready"] = True
            status["message"] = "OpenAI-compatible provider configured."
        else:
            status["message"] = "API key is required."

    return status


def get_embedding(text: str) -> list[float]:
    if not text or not text.strip():
        raise ValueError("Cannot embed empty text.")
    res = get_embeddings([text])
    if not res:
        raise RuntimeError("No embedding generated.")
    return res[0]


def get_embeddings(texts: list[str]) -> list[list[float]]:
    cleaned = [t.strip() for t in texts if t and t.strip()]
    if not cleaned:
        return []

    settings = load_settings()
    provider = settings.get("provider", "ollama")

    if provider == "gemini":
        api_key = settings.get("gemini_api_key", "").strip()
        if not api_key:
            raise RuntimeError("Gemini API key is not configured. Please add it in Settings.")
        model = settings.get("gemini_embed_model", "text-embedding-004")
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:batchEmbedContents?key={api_key}"
        requests_body = [
            {"model": f"models/{model}", "content": {"parts": [{"text": t}]}}
            for t in cleaned
        ]
        with httpx.Client(timeout=30.0) as client:
            resp = client.post(url, json={"requests": requests_body})
            if resp.status_code != 200:
                raise RuntimeError(f"Gemini embedding error: {resp.text}")
            data = resp.json()
            return [e["values"] for e in data.get("embeddings", [])]

    elif provider == "openai":
        api_key = settings.get("openai_api_key", "").strip()
        if not api_key:
            raise RuntimeError("OpenAI API key is not configured. Please add it in Settings.")
        base_url = settings.get("openai_base_url", "https://api.openai.com/v1").rstrip("/")
        model = settings.get("openai_embed_model", "text-embedding-3-small")
        headers = {"Authorization": f"Bearer {api_key}"}
        with httpx.Client(timeout=30.0) as client:
            resp = client.post(
                f"{base_url}/embeddings",
                headers=headers,
                json={"input": cleaned, "model": model}
            )
            if resp.status_code != 200:
                raise RuntimeError(f"OpenAI embedding error: {resp.text}")
            data = resp.json()
            return [item["embedding"] for item in data.get("data", [])]

    else:
        # Default: Ollama
        base_url = settings.get("ollama_base_url", "http://127.0.0.1:11434").rstrip("/")
        model = settings.get("ollama_embed_model", "nomic-embed-text")
        with httpx.Client(timeout=60.0) as client:
            try:
                resp = client.post(
                    f"{base_url}/api/embed",
                    json={"model": model, "input": cleaned}
                )
                if resp.status_code == 200:
                    return resp.json().get("embeddings", [])
                # Fallback to older /api/embeddings endpoint per text
                results = []
                for t in cleaned:
                    r = client.post(f"{base_url}/api/embeddings", json={"model": model, "prompt": t})
                    if r.status_code != 200:
                        raise RuntimeError(r.text)
                    results.append(r.json().get("embedding", []))
                return results
            except httpx.ConnectError:
                raise RuntimeError(
                    f"Could not connect to Ollama at {base_url}. Please ensure 'ollama serve' is running, or switch to a cloud API in Settings."
                )


def chat_completion(prompt: str, system: str = "") -> str:
    settings = load_settings()
    provider = settings.get("provider", "ollama")

    if provider == "gemini":
        api_key = settings.get("gemini_api_key", "").strip()
        if not api_key:
            raise RuntimeError("Gemini API key is not configured. Please add it in Settings.")
        model = settings.get("gemini_chat_model", "gemini-1.5-flash")
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
        payload = {
            "contents": [{"parts": [{"text": prompt}]}]
        }
        if system:
            payload["systemInstruction"] = {"parts": [{"text": system}]}
        with httpx.Client(timeout=60.0) as client:
            resp = client.post(url, json=payload)
            if resp.status_code != 200:
                raise RuntimeError(f"Gemini chat error: {resp.text}")
            data = resp.json()
            try:
                return data["candidates"][0]["content"]["parts"][0]["text"]
            except (KeyError, IndexError):
                return "No response generated by Gemini."

    elif provider == "openai":
        api_key = settings.get("openai_api_key", "").strip()
        if not api_key:
            raise RuntimeError("API key is not configured. Please add it in Settings.")
        base_url = settings.get("openai_base_url", "https://api.openai.com/v1").rstrip("/")
        model = settings.get("openai_chat_model", "gpt-4o-mini")
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})

        headers = {"Authorization": f"Bearer {api_key}"}
        with httpx.Client(timeout=60.0) as client:
            resp = client.post(
                f"{base_url}/chat/completions",
                headers=headers,
                json={"model": model, "messages": messages}
            )
            if resp.status_code != 200:
                raise RuntimeError(f"OpenAI error: {resp.text}")
            data = resp.json()
            return data["choices"][0]["message"]["content"]

    else:
        # Default: Ollama
        base_url = settings.get("ollama_base_url", "http://127.0.0.1:11434").rstrip("/")
        model = settings.get("ollama_chat_model", "llama3")
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})

        with httpx.Client(timeout=120.0) as client:
            try:
                resp = client.post(
                    f"{base_url}/api/chat",
                    json={"model": model, "messages": messages, "stream": False}
                )
                if resp.status_code != 200:
                    raise RuntimeError(f"Ollama error: {resp.text}")
                return resp.json().get("message", {}).get("content", "")
            except httpx.ConnectError:
                raise RuntimeError(
                    f"Could not connect to Ollama at {base_url}. Please ensure 'ollama serve' is running and '{model}' is pulled, or switch to a cloud API in Settings."
                )
