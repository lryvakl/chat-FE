import { useEffect, useMemo, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { socketService } from "../websockets/services/WebSocketManager";
import type { RootState } from "../store";
import { addMessage, removeMessage, updateMessage } from "../store/chatSlice";
import type { Message, ServerError } from "../types/interfaces";
import { SocketEvent } from "../types/enums";

import { ChatInvoker } from "../websockets/services/ChatInvoker";
import { JoinRoomCommand } from "../websockets/commands/JoinRoomCommand";
import { LeaveRoomCommand } from "../websockets/commands/LeaveRoomCommand";
import { SendMessageCommand } from "../websockets/commands/SendMessageCommand";
import { DeleteMessageCommand } from "../websockets/commands/DeleteMessageCommand";
import { EditMessageCommand } from "../websockets/commands/EditMessageCommand";

export const useChat = () => {
  const dispatch = useDispatch();
  const { user, token } = useSelector((state: RootState) => state.auth);
  const currentUser = user?.username || "";
  const currentRoom = useSelector((state: RootState) => state.chat.currentRoom);
  const messages = useSelector((state: RootState) => state.chat.messages);
  const invoker = useMemo(() => new ChatInvoker(), []);
  const socket = socketService.rawSocket;

  useEffect(() => {
    if (!token || !socket) return;

    socketService.connect(token);

    const handlers = {
      [SocketEvent.ReceiveMessage]: (msg: Message) => dispatch(addMessage(msg)),
      [SocketEvent.MessageDeleted]: (id: number) => dispatch(removeMessage(id)),
      [SocketEvent.MessageUpdated]: (msg: Message) =>
        dispatch(updateMessage(msg)),
      [SocketEvent.ConnectionError]: (err: Error | ServerError) =>
        console.error("Socket Error:", err),
    };

    Object.entries(handlers).forEach(([event, handler]) =>
      socket.on(event, handler)
    );

    return () => {
      Object.entries(handlers).forEach(([event, handler]) =>
        socket.off(event, handler)
      );
    };
  }, [dispatch, token, socket]);

  useEffect(() => {
    if (!currentUser || !currentRoom || !socket) {
      return;
    }

    const joinCommand = new JoinRoomCommand(socket, {
      username: currentUser,
      room: currentRoom,
    });

    joinCommand.execute();

    return () => {
      const leaveCommand = new LeaveRoomCommand(socket, {
        username: currentUser,
        room: currentRoom,
      });

      leaveCommand.execute();
    };
  }, [currentUser, currentRoom, socket]);

  const sendMessage = useCallback(
    (text: string) => {
      if (currentUser && currentRoom) {
        const command = new SendMessageCommand(socket, {
          room: currentRoom,
          username: currentUser,
          text,
        });
        invoker.executeCommand(command);
      }
    },
    [currentUser, currentRoom, socket, invoker]
  );

  const deleteMessage = useCallback(
    (messageId: number) => {
      if (currentUser && currentRoom) {
        const command = new DeleteMessageCommand(socket, {
          messageId,
          room: currentRoom,
          username: currentUser,
        });
        invoker.executeCommand(command);
      }
    },
    [currentUser, currentRoom, socket, invoker]
  );

  const editMessage = useCallback(
    (messageId: number, newText: string) => {
      const messageToEdit = messages.find((m) => m.id === messageId);
      const oldText = messageToEdit?.text || "";
      if (currentUser && currentRoom) {
        const command = new EditMessageCommand(
          socket,
          {
            messageId,
            text: newText,
            room: currentRoom,
            username: currentUser,
          },
          oldText
        );
        invoker.executeCommand(command);
      }
    },
    [currentUser, currentRoom, socket, invoker, messages]
  );

  const undo = useCallback(() => {
    invoker.undoLastCommand();
  }, [invoker]);

  return {
    sendMessage,
    deleteMessage,
    editMessage,
    undo,
    currentUser,
    currentRoom,
    messages,
  };
};
