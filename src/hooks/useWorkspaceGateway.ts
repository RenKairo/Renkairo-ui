import { useEffect, useRef, useState, useCallback } from 'react';
import { WorkspaceGatewayEvent } from '../types/workspace';

interface UseWorkspaceGatewayOptions {
  workspaceId: string;
  onFileEvent?: (event: WorkspaceGatewayEvent) => void;
  onTerminalOutput?: (data: string) => void;
  onStatusChange?: (status: string) => void;
}

export function useWorkspaceGateway({
  workspaceId,
  onFileEvent,
  onTerminalOutput,
  onStatusChange,
}: UseWorkspaceGatewayOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!workspaceId) return;

    const wsUrl = `ws://localhost:8080/ws/workspace/${workspaceId}`;
    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const parsed: WorkspaceGatewayEvent = JSON.parse(event.data);
        if (parsed.type === 'file_event' && onFileEvent) {
          onFileEvent(parsed);
        } else if (parsed.type === 'terminal_output' && onTerminalOutput) {
          onTerminalOutput(parsed.data);
        } else if (parsed.type === 'workspace_status' && onStatusChange) {
          onStatusChange(parsed.status || 'UNKNOWN');
        }
      } catch (err) {
        // Plain text terminal output or heartbeat
        if (onTerminalOutput) onTerminalOutput(event.data);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
    };

    return () => {
      ws.close();
    };
  }, [workspaceId, onFileEvent, onTerminalOutput, onStatusChange]);

  const sendFileChange = useCallback((path: string, content: string) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type: 'file_change',
          workspaceId,
          path,
          content,
        })
      );
    }
  }, [workspaceId]);

  const sendTerminalInput = useCallback((data: string) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type: 'terminal_input',
          workspaceId,
          data,
        })
      );
    }
  }, [workspaceId]);

  const sendRunCommand = useCallback((command: string) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type: 'run_command',
          workspaceId,
          data: command,
        })
      );
    }
  }, [workspaceId]);

  return {
    isConnected,
    sendFileChange,
    sendTerminalInput,
    sendRunCommand,
  };
}
