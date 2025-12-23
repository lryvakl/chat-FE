import { MAX_HISTORY_LENGTH } from "../../constants";
import type { Command } from "../commands/types";

export class ChatInvoker {
  private history: Command[] = [];

  executeCommand(command: Command) {
    command.execute();
    this.history.push(command);
    if (this.history.length > MAX_HISTORY_LENGTH) {
      this.history.shift();
    }
  }
  undoLastCommand() {
    const command = this.history.pop();
    if (command && command.undo) {
      command.undo();
    }
  }
}
