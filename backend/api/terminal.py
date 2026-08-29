import asyncio
import json
import os
import sys
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter()

@router.websocket("/terminal")
async def websocket_terminal(websocket: WebSocket):
    await websocket.accept()
    
    # Send initial welcome banner
    welcome = f"\r\n\x1b[1;36mRenKairo Cloud Shell v1.0.0\x1b[0m [\x1b[32mActive Session\x1b[0m]\r\n"
    welcome += f"Type commands below. Connected to backend OS: {sys.platform}\r\n\r\n"
    await websocket.send_text(welcome)
    
    prompt = "\r\n\x1b[1;31m(renkairo)\x1b[0m \x1b[1;34mdeveloper@Renkairo\x1b[0m \x1b[33mplatform %\x1b[0m "
    await websocket.send_text(prompt)
    
    buffer = ""
    try:
        while True:
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                if msg.get("type") == "resize":
                    continue
            except Exception:
                pass
            
            # Echo input back or execute
            for char in data:
                if char == "\r" or char == "\n":
                    await websocket.send_text("\r\n")
                    cmd = buffer.strip()
                    buffer = ""
                    if cmd:
                        if cmd in ("clear", "cls"):
                            await websocket.send_text("\x1b[2J\x1b[3J\x1b[H")
                        elif cmd == "help":
                            await websocket.send_text("RenKairo Shell Commands:\r\n  python -m uvicorn server:app --reload\r\n  ls -la\r\n  git status\r\n  clear\r\n")
                        else:
                            # Run shell command via asyncio subprocess
                            try:
                                proc = await asyncio.create_subprocess_shell(
                                    cmd,
                                    stdout=asyncio.subprocess.PIPE,
                                    stderr=asyncio.subprocess.PIPE
                                )
                                stdout, stderr = await proc.communicate()
                                if stdout:
                                    out_str = stdout.decode("utf-8", errors="ignore").replace("\n", "\r\n")
                                    await websocket.send_text(out_str)
                                if stderr:
                                    err_str = stderr.decode("utf-8", errors="ignore").replace("\n", "\r\n")
                                    await websocket.send_text(f"\x1b[31m{err_str}\x1b[0m")
                            except Exception as e:
                                await websocket.send_text(f"\x1b[31mExecution error: {str(e)}\x1b[0m\r\n")
                    await websocket.send_text(prompt)
                elif char == "\x7f" or char == "\x08":
                    if len(buffer) > 0:
                        buffer = buffer[:-1]
                        await websocket.send_text("\b \b")
                else:
                    buffer += char
                    await websocket.send_text(char)
                    
    except WebSocketDisconnect:
        pass
