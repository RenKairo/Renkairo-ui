import net from 'net';
import WebSocket from 'ws';

/**
 * RenKairo Local Port Forwarding Engine
 *
 * Bridges local TCP ports (127.0.0.1:<localPort>) through WebSocket tunnels
 * to remote listening ports on Shiro Backend hosts.
 *
 * Handles automatic port conflict detection and reallocates to next available port.
 */

// Active tunnels keyed by remotePort
const activeTunnels = new Map();

/**
 * Check if a local port is free on 127.0.0.1
 */
export function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', (err) => {
      resolve(false);
    });
    server.once('listening', () => {
      server.close(() => resolve(true));
    });
    server.listen(port, '127.0.0.1');
  });
}

/**
 * Find the next available local port starting from preferredPort
 */
export async function findAvailablePort(preferredPort, maxAttempts = 100) {
  let port = Number(preferredPort);
  for (let i = 0; i < maxAttempts; i++) {
    const candidate = port + i;
    const available = await isPortAvailable(candidate);
    if (available) {
      return {
        port: candidate,
        reallocated: candidate !== preferredPort,
        preferredPort
      };
    }
  }
  throw new Error(`Could not find an available local port near ${preferredPort}`);
}

/**
 * Start forwarding a remote port to a local port
 */
export async function startForwarding({
  remotePort,
  localPort,
  backendUrl = 'http://localhost:8080',
  token = null
}) {
  const targetRemotePort = Number(remotePort);
  if (!targetRemotePort || targetRemotePort <= 0 || targetRemotePort > 65535) {
    throw new Error(`Invalid remote port: ${remotePort}`);
  }

  // If already forwarding this remote port, return current info
  if (activeTunnels.has(targetRemotePort)) {
    return activeTunnels.get(targetRemotePort).getInfo();
  }

  const preferredLocal = Number(localPort) || targetRemotePort;
  const { port: allocatedLocalPort, reallocated } = await findAvailablePort(preferredLocal);

  // Normalize WebSocket URL
  const httpProto = backendUrl.startsWith('https') ? 'https' : 'http';
  const wsProto = httpProto === 'https' ? 'wss:' : 'ws:';
  const cleanHost = backendUrl.replace(/^https?:\/\//i, '').replace(/\/+$/, '');

  let tunnelWsBaseUrl = `${wsProto}//${cleanHost}/ws/tunnel?port=${targetRemotePort}`;
  if (token) {
    tunnelWsBaseUrl += `&token=${encodeURIComponent(token)}`;
  }

  const openSockets = new Set();

  const server = net.createServer((clientSocket) => {
    openSockets.add(clientSocket);

    const ws = new WebSocket(tunnelWsBaseUrl);

    // Buffer client data if sent before WS is connected
    const pendingChunks = [];
    let wsReady = false;

    ws.on('open', () => {
      wsReady = true;
      while (pendingChunks.length > 0) {
        const chunk = pendingChunks.shift();
        try {
          ws.send(chunk);
        } catch (err) {}
      }
    });

    clientSocket.on('data', (chunk) => {
      if (wsReady && ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(chunk);
        } catch (err) {}
      } else {
        pendingChunks.push(chunk);
      }
    });

    ws.on('message', (data) => {
      try {
        const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
        clientSocket.write(buf);
      } catch (err) {}
    });

    const cleanup = () => {
      openSockets.delete(clientSocket);
      try { clientSocket.destroy(); } catch (e) {}
      try { ws.close(); } catch (e) {}
    };

    clientSocket.on('error', cleanup);
    clientSocket.on('close', cleanup);
    ws.on('error', cleanup);
    ws.on('close', cleanup);
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(allocatedLocalPort, '127.0.0.1', () => {
      resolve();
    });
  });

  const tunnelRecord = {
    remotePort: targetRemotePort,
    localPort: allocatedLocalPort,
    reallocated,
    hasCollision: reallocated,
    url: `http://localhost:${allocatedLocalPort}`,
    status: 'forwarded',
    createdAt: new Date().toISOString(),
    backendUrl,
    server,
    openSockets,
    getInfo() {
      return {
        remotePort: this.remotePort,
        localPort: this.localPort,
        reallocated: this.reallocated,
        hasCollision: this.hasCollision,
        url: this.url,
        status: this.status,
        createdAt: this.createdAt
      };
    },
    close() {
      for (const s of openSockets) {
        try { s.destroy(); } catch (e) {}
      }
      openSockets.clear();
      try { server.close(); } catch (e) {}
    }
  };

  activeTunnels.set(targetRemotePort, tunnelRecord);
  console.log(`[RenKairo PortForwarder] Forwarding remote :${targetRemotePort} -> local http://localhost:${allocatedLocalPort} (reallocated: ${reallocated})`);

  return tunnelRecord.getInfo();
}

/**
 * Stop forwarding a remote port
 */
export function stopForwarding(remotePort) {
  const targetPort = Number(remotePort);
  const tunnel = activeTunnels.get(targetPort);
  if (tunnel) {
    tunnel.close();
    activeTunnels.delete(targetPort);
    console.log(`[RenKairo PortForwarder] Stopped forwarding remote port :${targetPort}`);
    return true;
  }
  return false;
}

/**
 * Get all active tunnels
 */
export function getActiveTunnels() {
  const result = [];
  for (const tunnel of activeTunnels.values()) {
    result.push(tunnel.getInfo());
  }
  return result;
}

/**
 * Stop all active tunnels
 */
export function stopAllTunnels() {
  for (const tunnel of activeTunnels.values()) {
    tunnel.close();
  }
  activeTunnels.clear();
}
