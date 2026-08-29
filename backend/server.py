from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from core.config import settings
from services.auth import auth_router
from services.projects import project_router
from services.compute import compute_router
from api.fs import router as fs_router
from api.metrics import router as metrics_router
from api.terminal import router as terminal_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="RenKairo Backend API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/auth", tags=["Auth"])
app.include_router(project_router, prefix="/projects", tags=["Projects"])
app.include_router(compute_router, prefix="/compute", tags=["Compute"])
app.include_router(fs_router, prefix="/api/fs", tags=["FileSystem"])
app.include_router(metrics_router, prefix="/api/system", tags=["Metrics"])
app.include_router(terminal_router, prefix="/api/ws", tags=["TerminalWS"])

@app.get("/health")
async def health():
    return {"status": "ok", "version": settings.APP_VERSION}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)
