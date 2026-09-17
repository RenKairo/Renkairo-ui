from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import time
import uuid

auth_router = APIRouter()

# In-Memory Users & Credentials Store for RenKairo Python Backend Engine
USERS_DB = {}
CREDENTIALS_DB = {}

# Default Developer Admin User
DEFAULT_ADMIN = {
    "user_id": "usr_9981",
    "username": "developer",
    "email": "developer@renkairo.io",
    "role": "Principal Systems Engineer",
    "password": "renkairo2026",
    "created_at": "2026-09-17T00:00:00Z"
}
USERS_DB["developer@renkairo.io"] = DEFAULT_ADMIN
USERS_DB["developer"] = DEFAULT_ADMIN

class LoginRequest(BaseModel):
    usernameOrEmail: Optional[str] = None
    username: Optional[str] = None
    email: Optional[str] = None
    password: str

class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str
    role: Optional[str] = "DEVELOPER"

class CredentialRequest(BaseModel):
    providerName: str
    keyName: str
    secretPayload: str

@auth_router.post("/login")
async def login(req: LoginRequest):
    identifier = req.usernameOrEmail or req.username or req.email
    if not identifier:
        raise HTTPException(status_code=400, detail="Username or Email is required")
    
    user = USERS_DB.get(identifier.lower().strip())
    if not user or user["password"] != req.password:
        raise HTTPException(status_code=401, detail="Invalid username/email or password")

    token = f"renkairo-fastapi-jwt-{user['user_id']}-{int(time.time())}"
    
    user_copy = {k: v for k, v in user.items() if k != "password"}
    return {
        "token": token,
        "tokenType": "Bearer",
        "expiresIn": 86400,
        "user": user_copy
    }

@auth_router.post("/register")
async def register(req: RegisterRequest):
    if not req.username or not req.email or not req.password:
        raise HTTPException(status_code=400, detail="All registration fields are required")
    
    email_clean = req.email.lower().strip()
    username_clean = req.username.lower().strip()

    if email_clean in USERS_DB or username_clean in USERS_DB:
        raise HTTPException(status_code=400, detail="Username or email already registered")

    user_id = f"usr_{uuid.uuid4().hex[:8]}"
    new_user = {
        "user_id": user_id,
        "username": req.username,
        "email": req.email,
        "role": req.role or "DEVELOPER",
        "password": req.password,
        "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ")
    }

    USERS_DB[email_clean] = new_user
    USERS_DB[username_clean] = new_user

    token = f"renkairo-fastapi-jwt-{user_id}-{int(time.time())}"
    user_copy = {k: v for k, v in new_user.items() if k != "password"}

    return {
        "token": token,
        "tokenType": "Bearer",
        "expiresIn": 86400,
        "user": user_copy
    }

@auth_router.get("/me")
async def get_me(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        # Return default active developer profile for backward compatibility
        return DEFAULT_ADMIN

    return {
        "user_id": "usr_9981",
        "username": "developer",
        "email": "developer@renkairo.io",
        "role": "Principal Systems Engineer",
        "avatar": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
    }

@auth_router.post("/credentials")
async def store_credential(req: CredentialRequest, authorization: Optional[str] = Header(None)):
    cred_id = f"cred_{uuid.uuid4().hex[:8]}"
    item = {
        "credentialId": cred_id,
        "providerName": req.providerName,
        "keyName": req.keyName,
        "encryptedPayload": req.secretPayload,
        "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ")
    }
    CREDENTIALS_DB[cred_id] = item
    return item
