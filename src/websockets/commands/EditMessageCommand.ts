import { Socket } from "socket.io-client";

import type { Command } from "./types";
import type { EditMessagePayload } from "./types";
import { SocketEvent } from "../../types/enums";

export class EditMessageCommand implements Command {
  private oldText: string;

  constructor(
    private socket: Socket,
    private payload: EditMessagePayload,
    oldText: string
  ) {
    this.oldText = oldText;
  }

  execute() {
    this.socket.emit(SocketEvent.EditMessage, this.payload);
  }

  undo() {
    const revertPayload = {
      ...this.payload,
      text: this.oldText,
    };
    this.socket.emit(SocketEvent.EditMessage, revertPayload);
  }
}
