import { Socket } from "socket.io-client";
import type { Command } from "./types";
import type { DeleteMessagePayload } from "./types";
import { SocketEvent } from "../../types/enums";

export class DeleteMessageCommand implements Command {
  constructor(
    private socket: Socket,
    private payload: DeleteMessagePayload
  ) {}
  execute() {
    this.socket.emit(SocketEvent.DeleteMessage, this.payload);
  }
}
