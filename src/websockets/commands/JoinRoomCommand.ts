import { Socket } from "socket.io-client";

import type { Command } from "./types";
import type { JoinRoomPayload } from "./types";
import { SocketEvent } from "../../types/enums";

export class JoinRoomCommand implements Command {
  constructor(
    private socket: Socket,
    private payload: JoinRoomPayload
  ) {}

  execute() {
    this.socket.emit(SocketEvent.JoinRoom, this.payload);
  }

  undo() {
    this.socket.emit(SocketEvent.LeaveRoom, this.payload);
  }
}
