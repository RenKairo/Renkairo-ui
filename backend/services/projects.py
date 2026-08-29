from fastapi import APIRouter

project_router = APIRouter()

@project_router.get("/")
async def list_projects():
    return [
        {
            "id": "proj_1",
            "name": "renkairo-platform",
            "path": "~/projects/renkairo-platform",
            "updated": "2m ago",
            "git_branch": "main"
        },
        {
            "id": "proj_2",
            "name": "ai-models",
            "path": "~/projects/ai-models",
            "updated": "1h ago",
            "git_branch": "feature/llm-quant"
        },
        {
            "id": "proj_3",
            "name": "data-pipeline",
            "path": "~/projects/data-pipeline",
            "updated": "3h ago",
            "git_branch": "main"
        }
    ]
