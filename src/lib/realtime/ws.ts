// src/lib/realtime/ws.ts
import { timeAuthority } from '@/lib/time';

type WSHandlers = {
  onOpen?: () => void;
  onClose?: (ev: CloseEvent) => void;
  onError?: (ev: Event) => void;
  onMessage?: (data: any) => void;
};

export class ResilientWS {
  private url: string;
  private socket: WebSocket | null = null;
  private handlers: WSHandlers;
  private queue: string[] = [];
  private attempts = 0;
  private hbTimer: any = null;

  constructor(url: string, handlers: WSHandlers = {}) {
    this.url = url;
    this.handlers = handlers;
  }

  connect() {
    // Put auth token in query if needed (headers aren't available for WS)
    this.socket = new WebSocket(this.url);
    this.socket.onopen = () => {
      this.attempts = 0;
      this.flush();
      this.startHeartbeat();
      this.handlers.onOpen?.();
    };
    this.socket.onclose = (ev) => {
      this.stopHeartbeat();
      this.handlers.onClose?.(ev);
      this.reconnect();
    };
    this.socket.onerror = (ev) => this.handlers.onError?.(ev);
    this.socket.onmessage = (ev) => {
      try { this.handlers.onMessage?.(JSON.parse(ev.data)); }
      catch { this.handlers.onMessage?.(ev.data); }
    };
  }

  private reconnect() {
    const wait = Math.min(30_000, 500 * Math.pow(2, this.attempts)) + Math.random() * 300;
    this.attempts++;
    setTimeout(() => this.connect(), wait);
  }

  private startHeartbeat() {
    this.hbTimer = setInterval(() => {
      this.send({ type: 'ping', t: timeAuthority.now() });
    }, 15_000);
  }
  private stopHeartbeat() { if (this.hbTimer) clearInterval(this.hbTimer); this.hbTimer = null; }

  send(obj: unknown) {
    const payload = JSON.stringify({ ...((obj as any) || {}), clientSentAt: timeAuthority.now() });
    if (this.socket?.readyState === WebSocket.OPEN) this.socket.send(payload);
    else this.queue.push(payload);
  }
  private flush() {
    while (this.queue.length && this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(this.queue.shift()!);
    }
  }
  close() { this.stopHeartbeat(); this.socket?.close(); }
}