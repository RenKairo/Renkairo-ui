from fastapi import APIRouter

auth_router = APIRouter()

@auth_router.get("/me")
async def get_me():
    return {
        "user_id": "usr_9981",
        "username": "developer",
        "email": "developer@renkairo.io",
        "role": "Principal Systems Engineer",
        "avatar": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
    }
