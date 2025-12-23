import { Socket } from "socket.io-client";
import type { Command } from "./types";
import type { SendMessagePayload } from "../types";
import { SocketEvent } from "../../types/enums";

export class SendMessageCommand implements Command {
  constructor(
    private socket: Socket,
    private payload: SendMessagePayload
  ) {}
  execute(): void {
    this.socket.emit(SocketEvent.SendMessage, this.payload);
  }
  undo(): void {
    this.socket.emit(SocketEvent.DeleteMessage, {
      room: this.payload.room,
      text: this.payload.text,
    });
  }
}
