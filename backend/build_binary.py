#!/usr/bin/env python3
import sys
import subprocess
from pathlib import Path


def main():
    root = Path(__file__).resolve().parent
    spec_file = root / "ore_backend.spec"
    dist_dir = root / "dist"

    print("=== Building ORE Backend Binary with PyInstaller ===")
    cmd = [
        sys.executable,
        "-m",
        "PyInstaller",
        str(spec_file),
        "--clean",
        "-y",
        "--distpath",
        str(dist_dir)
    ]
    print(f"Running command: {' '.join(cmd)}")
    result = subprocess.run(cmd, cwd=root)
    if result.returncode != 0:
        print("Build failed!")
        sys.exit(result.returncode)

    binary_name = "ore-backend.exe" if sys.platform == "win32" else "ore-backend"
    binary_path = dist_dir / binary_name
    if binary_path.exists():
        print(f"SUCCESS: Built {binary_path} ({binary_path.stat().st_size / (1024 * 1024):.1f} MB)")
    else:
        print(f"WARNING: Output file {binary_path} was not found.")


if __name__ == "__main__":
    main()
