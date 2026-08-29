import os
from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

router = APIRouter()

IGNORED_DIRS = {"node_modules", ".git", "__pycache__", ".venv", "dist", ".vite"}

class NodeAction(BaseModel):
    action: str  # 'create_file', 'create_dir', 'rename', 'delete'
    path: str
    target_path: str | None = None

class FileWrite(BaseModel):
    path: str
    content: str

def build_directory_tree(current_path: str, base_path: str) -> List[Dict[str, Any]]:
    tree = []
    try:
        entries = sorted(os.listdir(current_path))
    except Exception:
        return tree

    for entry in entries:
        if entry in IGNORED_DIRS:
            continue
        
        full_path = os.path.join(current_path, entry)
        rel_path = os.path.relpath(full_path, base_path).replace("\\", "/")
        is_dir = os.path.isdir(full_path)
        
        node = {
            "name": entry,
            "path": rel_path,
            "is_dir": is_dir,
            "children": build_directory_tree(full_path, base_path) if is_dir else None
        }
        tree.append(node)
        
    return tree

@router.get("/tree")
async def get_fs_tree(path: str = "."):
    root_path = os.path.abspath(os.path.join(os.getcwd(), path))
    if not os.path.exists(root_path):
        root_path = os.getcwd()
        
    return {
        "root": os.path.basename(root_path) or "renkairo-platform",
        "path": ".",
        "tree": build_directory_tree(root_path, root_path)
    }

@router.get("/file")
async def read_file_content(path: str = Query(...)):
    target = os.path.abspath(os.path.join(os.getcwd(), path))
    if not os.path.exists(target) or os.path.isdir(target):
        raise HTTPException(status_code=404, detail="File not found")
    try:
        with open(target, "r", encoding="utf-8") as f:
            content = f.read()
        return {"path": path, "content": content}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/file")
async def write_file_content(data: FileWrite):
    target = os.path.abspath(os.path.join(os.getcwd(), data.path))
    try:
        os.makedirs(os.path.dirname(target), exist_ok=True)
        with open(target, "w", encoding="utf-8") as f:
            f.write(data.content)
        return {"status": "ok", "path": data.path}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/nodes")
async def manage_node(action: NodeAction):
    target = os.path.abspath(os.path.join(os.getcwd(), action.path))
    try:
        if action.action == "create_file":
            os.makedirs(os.path.dirname(target), exist_ok=True)
            with open(target, "a") as f:
                pass
        elif action.action == "create_dir":
            os.makedirs(target, exist_ok=True)
        elif action.action == "delete":
            if os.path.isdir(target):
                import shutil
                shutil.rmtree(target)
            elif os.path.exists(target):
                os.remove(target)
        elif action.action == "rename" and action.target_path:
            dest = os.path.abspath(os.path.join(os.getcwd(), action.target_path))
            os.rename(target, dest)
        return {"status": "ok", "action": action.action}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
