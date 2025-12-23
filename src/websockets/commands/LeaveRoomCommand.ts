import { Socket } from "socket.io-client";

import type { Command } from "./types";
import type { LeaveRoomPayload } from "./types";
import { SocketEvent } from "../../types/enums";

export class LeaveRoomCommand implements Command {
  constructor(
    private socket: Socket,
    private payload: LeaveRoomPayload
  ) {}

  execute(): void {
    this.socket.emit(SocketEvent.LeaveRoom, this.payload);
  }
}
