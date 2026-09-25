from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from Ai.providers import load_settings, save_settings, check_status

router = APIRouter(prefix="/settings", tags=["settings"])


class SettingsUpdate(BaseModel):
    provider: Optional[str] = None
    ollama_base_url: Optional[str] = None
    ollama_chat_model: Optional[str] = None
    ollama_embed_model: Optional[str] = None
    gemini_api_key: Optional[str] = None
    gemini_chat_model: Optional[str] = None
    openai_api_key: Optional[str] = None
    openai_base_url: Optional[str] = None
    openai_chat_model: Optional[str] = None


@router.get("")
def get_settings():
    settings = load_settings()
    # Mask API keys for safe display in UI
    masked = dict(settings)
    if masked.get("gemini_api_key"):
        key = masked["gemini_api_key"]
        masked["gemini_api_key_masked"] = f"{key[:4]}...{key[-4:]}" if len(key) > 8 else "***"
    if masked.get("openai_api_key"):
        key = masked["openai_api_key"]
        masked["openai_api_key_masked"] = f"{key[:4]}...{key[-4:]}" if len(key) > 8 else "***"
    return masked


@router.post("")
def update_settings(update: SettingsUpdate):
    saved = save_settings(update.dict(exclude_unset=True))
    status = check_status()
    return {"success": True, "settings": saved, "status": status}


@router.get("/status")
def get_provider_status():
    return check_status()
