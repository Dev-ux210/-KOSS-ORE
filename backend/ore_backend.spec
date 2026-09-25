# -*- mode: python ; coding: utf-8 -*-
import sys
from PyInstaller.utils.hooks import collect_data_files, collect_submodules

datas = []
datas += collect_data_files('chromadb')

hiddenimports = [
    'uvicorn',
    'uvicorn.logging',
    'uvicorn.loops',
    'uvicorn.loops.auto',
    'uvicorn.protocols',
    'uvicorn.protocols.http',
    'uvicorn.protocols.http.auto',
    'uvicorn.lifespan',
    'uvicorn.lifespan.on',
    'fastapi',
    'pydantic',
    'chromadb',
    'chromadb.telemetry.posthog',
    'fitz',
    'pymupdf',
    'httpx',
    'config',
    'Ai.providers',
    'Ai.vector_store',
    'Ai.retriever',
    'Ai.pdf_ingestion',
    'Ai.pdf_chunking',
    'Ai.pdf_embedding',
    'Ai.answer_questions',
    'Ai.notes',
    'Ai.viva',
    'routes.upload',
    'routes.notes',
    'routes.viva',
    'routes.ask',
    'routes.settings',
]

block_cipher = None

a = Analysis(
    ['app/main.py'],
    pathex=['app'],
    binaries=[],
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='ore-backend',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
