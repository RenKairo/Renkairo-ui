import os
import shutil
import subprocess
import sys
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

router = APIRouter()

CURRENT_WORKSPACE = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))

IGNORED_DIRS = {
    "node_modules",
    ".git",
    "__pycache__",
    ".venv",
    "dist",
    "dist_electron",
    ".vite",
    ".DS_Store",
    "$RECYCLE.BIN",
    "System Volume Information",
}

class WorkspaceRequest(BaseModel):
    path: str

class NodeAction(BaseModel):
    action: str  # 'create_file', 'create_dir', 'rename', 'delete', 'duplicate'
    path: str
    target_path: Optional[str] = None
    content: Optional[str] = None
    root: Optional[str] = None

class FileWrite(BaseModel):
    path: str
    content: str
    root: Optional[str] = None

class RevealRequest(BaseModel):
    path: str

def resolve_path(req_path: str, base_dir: Optional[str] = None) -> str:
    global CURRENT_WORKSPACE
    base = base_dir if base_dir else CURRENT_WORKSPACE
    if not req_path or req_path == "." or req_path == "":
        return base
    expanded = os.path.expanduser(req_path)
    if os.path.isabs(expanded):
        return os.path.abspath(expanded)
    return os.path.abspath(os.path.join(base, expanded))

def get_system_drives() -> List[Dict[str, str]]:
    if sys.platform == "win32":
        import string
        drives = []
        for letter in string.ascii_uppercase:
            drive_path = f"{letter}:\\"
            if os.path.exists(drive_path):
                drives.append({"name": f"{letter}:", "path": drive_path})
        return drives if drives else [{"name": "C:", "path": "C:\\"}]
    else:
        return [{"name": "Root (/)", "path": "/"}]

def get_quick_places() -> List[Dict[str, str]]:
    home = os.path.expanduser("~")
    places = [
        {"name": "Home", "path": home, "icon": "home"},
        {"name": "Documents", "path": os.path.join(home, "Documents"), "icon": "folder"},
        {"name": "Desktop", "path": os.path.join(home, "Desktop"), "icon": "monitor"},
        {"name": "Downloads", "path": os.path.join(home, "Downloads"), "icon": "download"},
    ]
    proj = os.path.join(home, "Documents", "Projects")
    if os.path.exists(proj):
        places.append({"name": "Projects", "path": proj, "icon": "folder-git"})
    if os.path.exists(CURRENT_WORKSPACE):
        places.append({"name": "Current Workspace", "path": CURRENT_WORKSPACE, "icon": "code"})
    return [p for p in places if os.path.exists(p["path"])]

def build_directory_tree(current_path: str, base_path: str, max_depth: int = 6, current_depth: int = 0) -> List[Dict[str, Any]]:
    tree = []
    if current_depth > max_depth:
        return tree
    try:
        entries = sorted(os.listdir(current_path))
    except Exception:
        return tree

    dirs = []
    files = []

    for entry in entries:
        if entry in IGNORED_DIRS or entry.startswith("$"):
            continue
        full_path = os.path.join(current_path, entry)
        if os.path.isdir(full_path):
            dirs.append(entry)
        else:
            files.append(entry)

    for entry in dirs:
        full_path = os.path.join(current_path, entry)
        rel_path = os.path.relpath(full_path, base_path).replace("\\", "/")
        node = {
            "name": entry,
            "path": rel_path,
            "is_dir": True,
            "children": build_directory_tree(full_path, base_path, max_depth, current_depth + 1),
        }
        tree.append(node)

    for entry in files:
        full_path = os.path.join(current_path, entry)
        rel_path = os.path.relpath(full_path, base_path).replace("\\", "/")
        node = {
            "name": entry,
            "path": rel_path,
            "is_dir": False,
            "children": None,
        }
        tree.append(node)

    return tree

@router.get("/workspace")
async def get_workspace():
    global CURRENT_WORKSPACE
    root_name = os.path.basename(CURRENT_WORKSPACE) or CURRENT_WORKSPACE
    return {
        "path": CURRENT_WORKSPACE,
        "root": root_name,
        "exists": os.path.exists(CURRENT_WORKSPACE),
    }

@router.post("/workspace")
async def set_workspace(data: WorkspaceRequest):
    global CURRENT_WORKSPACE
    target = resolve_path(data.path)
    if not os.path.exists(target):
        raise HTTPException(status_code=404, detail=f"Directory '{target}' does not exist")
    if not os.path.isdir(target):
        raise HTTPException(status_code=400, detail=f"Path '{target}' is not a directory")

    CURRENT_WORKSPACE = target
    root_name = os.path.basename(CURRENT_WORKSPACE) or CURRENT_WORKSPACE
    return {
        "status": "ok",
        "path": CURRENT_WORKSPACE,
        "root": root_name,
        "tree": build_directory_tree(CURRENT_WORKSPACE, CURRENT_WORKSPACE),
    }

@router.get("/tree")
async def get_fs_tree(path: str = ".", root: Optional[str] = None):
    base = resolve_path(root) if root else CURRENT_WORKSPACE
    target = resolve_path(path, base)
    root_name = os.path.basename(base) or base or "renkairo-platform"

    return {
        "root": root_name,
        "path": base,
        "tree": build_directory_tree(target, base),
    }

@router.get("/file")
async def read_file_content(path: str = Query(...), root: Optional[str] = None):
    base = resolve_path(root) if root else CURRENT_WORKSPACE
    target = resolve_path(path, base)
    if not os.path.exists(target) or os.path.isdir(target):
        raise HTTPException(status_code=404, detail="File not found")
    try:
        with open(target, "r", encoding="utf-8", errors="replace") as f:
            content = f.read()
        rel_path = os.path.relpath(target, base).replace("\\", "/")
        return {"path": rel_path, "fullPath": target, "content": content}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/file")
async def write_file_content(data: FileWrite):
    base = resolve_path(data.root) if data.root else CURRENT_WORKSPACE
    target = resolve_path(data.path, base)
    try:
        os.makedirs(os.path.dirname(target), exist_ok=True)
        with open(target, "w", encoding="utf-8") as f:
            f.write(data.content)
        rel_path = os.path.relpath(target, base).replace("\\", "/")
        return {"status": "ok", "path": rel_path, "fullPath": target}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/nodes")
async def manage_node(action: NodeAction):
    base = resolve_path(action.root) if action.root else CURRENT_WORKSPACE
    target = resolve_path(action.path, base)
    try:
        if action.action == "create_file":
            os.makedirs(os.path.dirname(target), exist_ok=True)
            if not os.path.exists(target):
                with open(target, "w", encoding="utf-8") as f:
                    f.write(action.content or "")
        elif action.action == "create_dir":
            os.makedirs(target, exist_ok=True)
        elif action.action == "delete":
            if os.path.isdir(target):
                shutil.rmtree(target)
            elif os.path.exists(target):
                os.remove(target)
        elif action.action == "rename" and action.target_path:
            dest = resolve_path(action.target_path, base)
            os.makedirs(os.path.dirname(dest), exist_ok=True)
            os.rename(target, dest)
        elif action.action == "duplicate":
            if action.target_path:
                dest = resolve_path(action.target_path, base)
            else:
                dir_name, base_name = os.path.split(target)
                name, ext = os.path.splitext(base_name)
                candidate = os.path.join(dir_name, f"{name} (copy){ext}")
                counter = 2
                while os.path.exists(candidate):
                    candidate = os.path.join(dir_name, f"{name} (copy {counter}){ext}")
                    counter += 1
                dest = candidate
            if os.path.isdir(target):
                shutil.copytree(target, dest)
            else:
                shutil.copy2(target, dest)
        return {"status": "ok", "action": action.action}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/browse-folders")
async def browse_folders(path: Optional[str] = None):
    target = resolve_path(path) if path else CURRENT_WORKSPACE
    try:
        valid_target = target if os.path.exists(target) else os.path.expanduser("~")
        dir_path = valid_target if os.path.isdir(valid_target) else os.path.dirname(valid_target)

        entries = sorted(os.listdir(dir_path))
        folders = []
        for entry in entries:
            if entry in IGNORED_DIRS or entry.startswith("$"):
                continue
            full_path = os.path.join(dir_path, entry)
            if os.path.isdir(full_path):
                folders.append({
                    "name": entry,
                    "path": full_path,
                    "is_dir": True
                })

        parent_path = os.path.dirname(dir_path) if os.path.dirname(dir_path) != dir_path else None

        return {
            "currentPath": dir_path,
            "parentPath": parent_path,
            "folders": folders,
            "drives": get_system_drives(),
            "quickPlaces": get_quick_places(),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/reveal")
async def reveal_in_explorer(data: RevealRequest):
    target = resolve_path(data.path)
    if not os.path.exists(target):
        raise HTTPException(status_code=404, detail="Path not found")
    try:
        if sys.platform == "win32":
            if os.path.isdir(target):
                subprocess.Popen(["explorer.exe", target])
            else:
                subprocess.Popen(["explorer.exe", f"/select,{target}"])
        elif sys.platform == "darwin":
            subprocess.Popen(["open", "-R", target])
        else:
            subprocess.Popen(["xdg-open", target if os.path.isdir(target) else os.path.dirname(target)])
        return {"status": "ok", "path": target}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

