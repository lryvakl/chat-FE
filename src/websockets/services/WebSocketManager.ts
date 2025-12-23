import { io, Socket } from "socket.io-client";

import { SERVER_URL } from "../../constants";

class SocketService {
  private static instance: SocketService;
  private socket: Socket;

  private constructor() {
    this.socket = io(SERVER_URL, {
      autoConnect: false,
    });
  }
  public static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  connect(token: string) {
    if (this.socket.connected) {
      this.socket.disconnect();
    }

    this.socket.auth = { token };
    this.socket.connect();
  }

  disconnect() {
    this.socket.disconnect();
  }

  get rawSocket(): Socket {
    return this.socket;
  }
}
export const socketService = SocketService.getInstance();
