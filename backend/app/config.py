import os
import sys
from pathlib import Path


def get_default_data_dir() -> Path:
    env_dir = os.environ.get("ORE_DATA_DIR")
    if env_dir:
        return Path(env_dir).resolve()

    # If running as packaged desktop binary (PyInstaller or Electron)
    if getattr(sys, "frozen", False) or os.environ.get("ORE_DESKTOP_MODE") == "1":
        if sys.platform == "win32":
            base = Path(os.environ.get("APPDATA", Path.home() / "AppData" / "Roaming"))
        elif sys.platform == "darwin":
            base = Path.home() / "Library" / "Application Support"
        else:
            base = Path(os.environ.get("XDG_DATA_HOME", Path.home() / ".local" / "share"))
        return base / "ORE"

    # Local development mode: data folder in backend root
    backend_root = Path(__file__).resolve().parent.parent
    return (backend_root / "data").resolve()


DATA_DIR = get_default_data_dir()
DATA_DIR.mkdir(parents=True, exist_ok=True)

CHROMA_DIR = str(DATA_DIR / "chroma_db")
Path(CHROMA_DIR).mkdir(parents=True, exist_ok=True)

UPLOADS_DIR = str(DATA_DIR / "uploads")
Path(UPLOADS_DIR).mkdir(parents=True, exist_ok=True)

SETTINGS_FILE = str(DATA_DIR / "settings.json")
META_FILE = str(Path(UPLOADS_DIR) / "documents_meta.json")
