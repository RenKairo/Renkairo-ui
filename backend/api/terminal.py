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
    query_params = dict(websocket.query_params)
    shell_type = query_params.get("shell", "powershell")

    if is_win:
        if shell_type == "cmd":
            cmd = ["cmd.exe", "/k"]
        elif shell_type == "python":
            cmd = ["python.exe", "-i"]
        elif shell_type == "node":
            cmd = ["node.exe"]
        elif shell_type == "bash":
            cmd = ["bash.exe", "-i"]
        else:
            cmd = ["powershell.exe", "-NoExit", "-NoLogo", "-ExecutionPolicy", "Bypass"]
    else:
        shell = os.environ.get("SHELL", "bash")
        cmd = [shell, "-i"]

    cwd = os.getcwd()
    cols = 80
    rows = 24

    pty_proc = None
    use_pty = False

    if is_win:
        try:
            from winpty import PtyProcess
            pty_proc = PtyProcess.spawn(cmd, dimensions=(rows, cols), cwd=cwd)
            use_pty = True
        except Exception as e:
            print(f"[Terminal] pywinpty spawn error: {e}")
    else:
        try:
            import ptyprocess
            pty_proc = ptyprocess.PtyProcessUnicode.spawn(cmd, dimensions=(rows, cols), cwd=cwd)
            use_pty = True
        except Exception as e:
            print(f"[Terminal] ptyprocess spawn error: {e}")

    if use_pty and pty_proc:
        loop = asyncio.get_running_loop()

        async def pty_read_loop():
            try:
                while pty_proc.isalive():
                    data = await loop.run_in_executor(None, lambda: pty_proc.read(4096))
                    if data:
                        await websocket.send_text(data)
                    else:
                        await asyncio.sleep(0.01)
            except Exception:
                pass

        read_task = asyncio.create_task(pty_read_loop())

        try:
            while True:
                data = await websocket.receive_text()
                try:
                    msg = json.loads(data)
                    if isinstance(msg, dict) and msg.get("type") == "resize":
                        new_cols = int(msg.get("cols", cols))
                        new_rows = int(msg.get("rows", rows))
                        try:
                            pty_proc.set_winsize(new_rows, new_cols)
                        except Exception:
                            pass
                        continue
                except Exception:
                    pass

                pty_proc.write(data)

        except WebSocketDisconnect:
            pass
        finally:
            read_task.cancel()
            try:
                pty_proc.terminate(force=True)
            except Exception:
                pass

    else:
        # Subprocess Fallback
        try:
            proc = await asyncio.create_subprocess_exec(
                cmd[0],
                *cmd[1:],
                stdin=asyncio.subprocess.PIPE,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=cwd
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

            t1 = asyncio.create_task(read_stream(proc.stdout))
            t2 = asyncio.create_task(read_stream(proc.stderr))

            try:
                while True:
                    data = await websocket.receive_text()
                    try:
                        msg = json.loads(data)
                        if isinstance(msg, dict) and msg.get("type") == "resize":
                            continue
                    except Exception:
                        pass

                    if proc.stdin and not proc.stdin.is_closing():
                        proc.stdin.write(data.encode("utf-8"))
                        await proc.stdin.drain()
            except WebSocketDisconnect:
                pass
            finally:
                t1.cancel()
                t2.cancel()
                if proc:
                    try:
                        proc.kill()
                    except Exception:
                        pass
        except Exception as e:
            await websocket.send_text(f"\r\n\x1b[31mTerminal error: {str(e)}\x1b[0m\r\n")

