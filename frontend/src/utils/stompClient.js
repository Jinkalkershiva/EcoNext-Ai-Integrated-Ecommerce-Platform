/**
 * Lightweight native WebSocket STOMP Client for EcoNext Real-Time Telemetry & Tracking.
 * Handles STOMP framing, topic subscriptions, heartbeat, and auto-reconnection.
 */

export class StompClient {
  constructor(url, options = {}) {
    this.url = url;
    this.options = {
      reconnectInterval: 5000,
      maxReconnectAttempts: 10,
      headers: {},
      debug: false,
      ...options
    };
    this.ws = null;
    this.connected = false;
    this.subscriptions = new Map(); // id -> { destination, callback }
    this.subIdCounter = 0;
    this.reconnectAttempts = 0;
    this.reconnectTimer = null;
    this.onConnectCallbacks = [];
    this.onErrorCallbacks = [];
    this.onDisconnectCallbacks = [];
    this.isExplicitlyClosed = false;
  }

  connect(headers = {}) {
    this.isExplicitlyClosed = false;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      // Connect to native websocket endpoint
      const wsUrl = this.url.startsWith('http')
        ? this.url.replace(/^http/, 'ws').replace(/\/$/, '') + '/websocket'
        : this.url;

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        const connectFrame = [
          'CONNECT',
          'accept-version:1.1,1.2',
          'heart-beat:10000,10000',
          ...Object.entries({ ...this.options.headers, ...headers }).map(([k, v]) => `${k}:${v}`),
          '',
          '\x00'
        ].join('\n');

        this.ws.send(connectFrame);
      };

      this.ws.onmessage = (event) => {
        this.handleIncomingMessage(event.data);
      };

      this.ws.onerror = (err) => {
        if (this.options.debug) console.warn('[STOMP] WebSocket error:', err);
        this.onErrorCallbacks.forEach(cb => cb(err));
      };

      this.ws.onclose = () => {
        this.connected = false;
        this.onDisconnectCallbacks.forEach(cb => cb());
        if (!this.isExplicitlyClosed && this.reconnectAttempts < this.options.maxReconnectAttempts) {
          this.reconnectAttempts++;
          const delay = Math.min(this.options.reconnectInterval * Math.pow(1.5, this.reconnectAttempts - 1), 30000);
          if (this.options.debug) console.log(`[STOMP] Disconnected. Reconnecting in ${Math.round(delay / 1000)}s...`);
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = setTimeout(() => this.connect(headers), delay);
        }
      };
    } catch (e) {
      if (this.options.debug) console.error('[STOMP] Failed to establish connection:', e);
    }
  }

  handleIncomingMessage(raw) {
    if (!raw || raw === '\n' || raw === '\r\n') return; // Heartbeat pong

    const frames = raw.split('\x00');
    for (const frameStr of frames) {
      const trimmed = frameStr.trim();
      if (!trimmed) continue;

      const lines = trimmed.split('\n');
      const command = lines[0].trim();
      const headers = {};
      let bodyStartIndex = 1;

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (line === '' || line === '\r') {
          bodyStartIndex = i + 1;
          break;
        }
        const colIdx = line.indexOf(':');
        if (colIdx !== -1) {
          const k = line.substring(0, colIdx).trim();
          const v = line.substring(colIdx + 1).trim();
          headers[k] = v;
        }
      }

      const body = lines.slice(bodyStartIndex).join('\n');

      if (command === 'CONNECTED') {
        this.connected = true;
        this.reconnectAttempts = 0;
        if (this.options.debug) console.log('[STOMP] Connected successfully.');
        this.onConnectCallbacks.forEach(cb => cb(headers));

        // Resubscribe to existing active subscriptions upon reconnect
        this.subscriptions.forEach((sub, subId) => {
          this.sendSubscribeFrame(subId, sub.destination);
        });
      } else if (command === 'MESSAGE') {
        let parsed = body;
        try {
          parsed = JSON.parse(body);
        } catch (e) {
          // Keep raw string body
        }

        const subId = headers['subscription'];
        if (subId && this.subscriptions.has(subId)) {
          const sub = this.subscriptions.get(subId);
          try {
            sub.callback(parsed, headers);
          } catch (err) {
            console.error('[STOMP] Error in subscription callback:', err);
          }
        }
      } else if (command === 'ERROR') {
        if (this.options.debug) console.error('[STOMP] Server error frame:', headers, body);
      }
    }
  }

  sendSubscribeFrame(subId, destination) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN && this.connected) {
      const frame = [
        'SUBSCRIBE',
        `id:${subId}`,
        `destination:${destination}`,
        `ack:auto`,
        '',
        '\x00'
      ].join('\n');
      this.ws.send(frame);
    }
  }

  subscribe(destination, callback) {
    const subId = `sub-${++this.subIdCounter}`;
    this.subscriptions.set(subId, { destination, callback });

    if (this.connected) {
      this.sendSubscribeFrame(subId, destination);
    }

    return {
      id: subId,
      destination,
      unsubscribe: () => {
        this.subscriptions.delete(subId);
        if (this.ws && this.ws.readyState === WebSocket.OPEN && this.connected) {
          const frame = [
            'UNSUBSCRIBE',
            `id:${subId}`,
            '',
            '\x00'
          ].join('\n');
          this.ws.send(frame);
        }
      }
    };
  }

  onConnect(cb) {
    this.onConnectCallbacks.push(cb);
    if (this.connected) cb();
  }

  onDisconnect(cb) {
    this.onDisconnectCallbacks.push(cb);
  }

  disconnect() {
    this.isExplicitlyClosed = true;
    clearTimeout(this.reconnectTimer);
    if (this.ws) {
      if (this.ws.readyState === WebSocket.OPEN && this.connected) {
        const frame = ['DISCONNECT', '', '\x00'].join('\n');
        try { this.ws.send(frame); } catch (e) {}
      }
      this.ws.close();
    }
    this.connected = false;
    this.subscriptions.clear();
  }
}

export function createTrackingClient() {
  const wsUrl = (typeof window !== 'undefined' && window.location.protocol === 'https:')
    ? 'wss://localhost:8084/ws-tracking'
    : 'ws://localhost:8084/ws-tracking';

  return new StompClient(wsUrl, {
    debug: false,
    reconnectInterval: 4000,
    maxReconnectAttempts: 8
  });
}
