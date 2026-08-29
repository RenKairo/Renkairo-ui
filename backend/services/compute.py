from fastapi import APIRouter

compute_router = APIRouter()

@compute_router.get("/workloads")
async def list_workloads():
    return [
        {
            "id": "work_101",
            "name": "Model Training",
            "status": "In Progress",
            "framework": "PyTorch",
            "target": "GPU 2",
            "progress": 68
        },
        {
            "id": "work_102",
            "name": "Data Processing",
            "status": "Queued",
            "framework": "Python",
            "target": "CPU",
            "progress": 0
        }
    ]
