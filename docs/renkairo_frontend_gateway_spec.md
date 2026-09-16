# RenKairo Frontend & IDE Gateway Architecture Specification

## 1. System Overview

`Rekairo-ui` provides the **IDE Experience & User Interface** for RenKairo. It serves as the primary user gateway, connecting the developer's browser/desktop environment to RenKairo's Control Plane and managing WebSocket-based workspace interactions.

```text
                               REKAIRO-UI (Frontend & Gateway)
 ┌──────────────────────────────────────────────────────────────────────────────────┐
 │                                                                                  │
 │  User Interface (React / Vite / Tauri / Electron)                                 │
 │  ├── User Auth & Session Management (JWT Store)                                  │
 │  ├── Project Management Dashboard                                                │
 │  └── Workspace Manager & Compute Selector                                        │
 │                                                                                  │
 │  IDE Gateway Layer                                                               │
 │  └── WebSocket Client (`useWorkspaceGateway`)                                    │
 │      ├── Bi-directional Terminal Stream (PTY)                                    │
 │      ├── File Sync Protocol (IDE Edits ↔ Remote Events)                          │
 │      └── Process & Build Log Telemetry                                           │
 └────────────────────────────────────────┬─────────────────────────────────────────┘
                                          │
                                 WebSocket & REST API
                                          │
                                          ▼
                             RenKairo Control Plane Backend
```

---

## 2. Core Responsibilities & Boundaries

### What Rekairo-ui OWNS:
1. **User Auth Experience**: Authenticating with RenKairo Identity Service, storing JWT tokens securely, attaching auth headers to requests.
2. **Project & Workspace UI**: Creating projects, selecting runtimes/frameworks, configuring workspace resource tiers (CPU/GPU specs), launching and stopping workspaces.
3. **IDE Gateway Integration**: Establishing WebSocket connection to RenKairo Workspace Gateway (`/ws/workspace/{workspaceId}`).
4. **File Sync Protocol (IDE side)**:
   - Capturing local code edits in the browser/IDE editor and emitting `file_change` events over WebSocket.
   - Receiving filesystem event notifications (`file_created`, `file_modified`, `file_deleted`) originating from Shiro and updating local editor tree state.
5. **Interactive Terminal**: Rendering terminal PTY (Xterm.js) and streaming input/output over WebSockets.

### What Rekairo-ui MUST NOT DO:
- ❌ **Direct Shiro Access**: Frontend never communicates directly with Shiro compute nodes or containers. All communication routes through RenKairo Control Plane.
- ❌ **Direct Container Management**: Frontend never issues Docker or host-level commands directly.

---

## 3. Communication Protocols

### A. Authentication & REST Flow
```text
Browser / UI ──► POST /api/v1/auth/login ──► RenKairo Identity Service
              ◄── Returns JWT Token ───────┘
```

### B. Project & Workspace Launch Flow
```text
Browser / UI ──► POST /api/v1/projects (Create project)
             ──► POST /api/v1/workspaces (Provision workspace)
             ◄── Returns workspace_id & websocket_url
```

### C. Workspace Gateway WebSocket Protocol (`/ws/workspace/{workspace_id}`)

#### IDE ➔ RenKairo (Outbound Events)
```json
// 1. File Change
{
  "type": "file_change",
  "workspace_id": "ws-123",
  "path": "src/main.py",
  "content": "print('hello renkairo')"
}

// 2. Terminal Input
{
  "type": "terminal_input",
  "workspace_id": "ws-123",
  "data": "python main.py\n"
}

// 3. Process Execution Request
{
  "type": "run_command",
  "workspace_id": "ws-123",
  "command": "python train.py --epochs 10"
}
```

#### RenKairo ➔ IDE (Inbound Events)
```json
// 1. Remote File Event (originated from Shiro watcher)
{
  "type": "file_event",
  "event_type": "file_created",
  "workspace_id": "ws-123",
  "path": "output.json"
}

// 2. Terminal Output Stream
{
  "type": "terminal_output",
  "workspace_id": "ws-123",
  "data": "Epoch 1/10 - Loss: 0.042\r\n"
}

// 3. Workspace Status Event
{
  "type": "workspace_status",
  "workspace_id": "ws-123",
  "status": "RUNNING"
}
```

---

## 4. Frontend Component Structure

- `src/services/authService.ts`: User Auth REST calls.
- `src/services/projectService.ts`: Project management REST calls.
- `src/services/workspaceService.ts`: Workspace lifecycle REST calls.
- `src/hooks/useWorkspaceGateway.ts`: Custom React hook managing WebSocket connections for file sync, terminal, and status updates.
- `src/types/project.ts`: Project data types (`Project`, `CreateProjectPayload`).
- `src/types/workspace.ts`: Workspace data types (`Workspace`, `WorkspaceStatus`, `ComputeResourceSpec`).
