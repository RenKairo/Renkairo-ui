import asyncio
import json
import os
import sys
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter()

@router.websocket("/terminal")
async def websocket_terminal(websocket: WebSocket):
    await websocket.accept()

    is_win = sys.platform == "win32"
    shell = "powershell.exe" if is_win else os.environ.get("SHELL", "bash")
    args = ["-NoExit", "-NoLogo", "-ExecutionPolicy", "Bypass"] if is_win else ["-i"]

    try:
        proc = await asyncio.create_subprocess_exec(
            shell,
            *args,
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd=os.getcwd()
        )

        async def read_stream(stream):
            try:
                while True:
                    data = await stream.read(1024)
                    if not data:
                        break
                    await websocket.send_text(data.decode("utf-8", errors="ignore"))
            except Exception:
                pass

        asyncio.create_task(read_stream(proc.stdout))
        asyncio.create_task(read_stream(proc.stderr))

        while True:
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                if msg.get("type") == "resize":
                    continue
            except Exception:
                pass

            if proc.stdin and not proc.stdin.is_closing():
                proc.stdin.write(data.encode("utf-8"))
                await proc.stdin.drain()

    except WebSocketDisconnect:
        if proc:
            try:
                proc.kill()
            except Exception:
                pass
    except Exception as e:
        await websocket.send_text(f"\r\n\x1b[31mTerminal error: {str(e)}\x1b[0m\r\n")
