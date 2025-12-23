import { useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { socket } from "../api/socket";
import type { RootState } from "../store";
import { addMessage, removeMessage, updateMessage } from "../store/chatSlice";
import type { Message, ServerError } from "../types/interfaces";
import { SocketEvent } from "../types/enums";

import { ChatInvoker } from "../websockets/services/ChatInvoker";
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

  useEffect(() => {
    if (token) {
      socket.auth = { token };
      socket.connect();
    } else {
      return;
    }

    const handleReceiveMessage = (message: Message) => {
      dispatch(addMessage(message));
    };

    const handleDeleteMessage = (messageId: number) => {
      dispatch(removeMessage(messageId));
    };

    const handleEditMessage = (message: Message) => {
      dispatch(updateMessage(message));
    };

    const handleError = (error: Error | ServerError) => {
      console.error(error.message);
    };

    socket.on(SocketEvent.ReceiveMessage, handleReceiveMessage);
    socket.on(SocketEvent.MessageDeleted, handleDeleteMessage);
    socket.on(SocketEvent.MessageUpdated, handleEditMessage);
    socket.on(SocketEvent.ConnectionError, handleError);
    socket.on(SocketEvent.Exception, handleError);

    return () => {
      socket.off(SocketEvent.ReceiveMessage, handleReceiveMessage);
      socket.off(SocketEvent.MessageDeleted, handleDeleteMessage);
      socket.off(SocketEvent.MessageUpdated, handleEditMessage);
      socket.off(SocketEvent.ConnectionError, handleError);
      socket.off(SocketEvent.Exception, handleError);
      socket.disconnect();
    };
  }, [dispatch, token]);

  useEffect(() => {
    if (currentUser && currentRoom) {
      socket.emit(SocketEvent.JoinRoom, {
        username: currentUser,
        room: currentRoom,
      });
    }
  }, [currentUser, currentRoom]);

  const sendMessage = (text: string) => {
    if (currentUser && currentRoom) {
      const command = new SendMessageCommand(socket, {
        room: currentRoom,
        username: currentUser,
        text,
      });
      invoker.executeCommand(command);
    }
  };

  const deleteMessage = (messageId: number) => {
    if (currentUser && currentRoom) {
      const command = new DeleteMessageCommand(socket, {
        messageId,
        room: currentRoom,
        username: currentUser,
      });
      invoker.executeCommand(command);
    }
  };

  const editMessage = (messageId: number, newText: string) => {
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
  };

  return { sendMessage, deleteMessage, editMessage, currentUser, currentRoom };
};
