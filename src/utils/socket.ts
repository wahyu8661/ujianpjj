import { ExamConfig, StudentSession, ViolationEvent } from '../types/exam';

export type SocketListener = (data: any) => void;

class ExamSocketClient {
  private ws: WebSocket | null = null;
  private listeners: Set<SocketListener> = new Set();
  private reconnectTimeout: any = null;
  private role: 'student' | 'proctor' | null = null;
  private registeredData: any = null;
  private isConnected: boolean = false;
  private broadcastChannel: BroadcastChannel | null = null;

  constructor() {
    try {
      this.broadcastChannel = new BroadcastChannel('siap_ujian_sync');
      this.broadcastChannel.onmessage = (event) => {
        this.notifyListeners(event.data);
      };
    } catch {
      // BroadcastChannel might not be supported in older envs
    }
  }

  public connect(role: 'student' | 'proctor', data?: any) {
    this.role = role;
    if (data) this.registeredData = data;

    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      if (this.ws.readyState === WebSocket.OPEN) {
        this.sendRegistration();
      }
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.sendRegistration();
      };

      this.ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          this.notifyListeners(parsed);
          // Also sync to other tabs via BroadcastChannel
          try {
            this.broadcastChannel?.postMessage(parsed);
          } catch {}
        } catch (e) {
          console.error('Failed to parse WS message', e);
        }
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        this.isConnected = false;
      };
    } catch (e) {
      console.warn('WebSocket connection error, relying on local sync fallback', e);
      this.scheduleReconnect();
    }
  }

  private sendRegistration() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    if (this.role === 'proctor') {
      this.send({ type: 'proctor:register' });
    } else if (this.role === 'student' && this.registeredData) {
      this.send({
        type: 'student:register',
        student: this.registeredData,
      });
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    this.reconnectTimeout = setTimeout(() => {
      if (this.role) {
        this.connect(this.role, this.registeredData);
      }
    }, 3000);
  }

  public send(data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
    // Also broadcast to local tabs
    try {
      this.broadcastChannel?.postMessage(data);
    } catch {}
  }

  public subscribe(listener: SocketListener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(data: any) {
    this.listeners.forEach((listener) => {
      try {
        listener(data);
      } catch (err) {
        console.error('Error in socket listener:', err);
      }
    });
  }

  public isSocketOpen(): boolean {
    return this.isConnected && this.ws?.readyState === WebSocket.OPEN;
  }
}

export const socketClient = new ExamSocketClient();
