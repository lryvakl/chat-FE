import { useDispatch, useSelector } from "react-redux";
import { socket } from "../api/socket";
import { useEffect } from "react";
import { addMessage, removeMessage } from "../store/chatSlice";
import type { Message, ServerError } from "../types/interfaces";
import type { RootState } from "../store";
import { SocketEvent } from "../types/enums";

export const useChat = () => {
  const dispatch = useDispatch();
  const currentUser = useSelector((state: RootState) => state.chat.currentUser);
  const currentRoom = useSelector((state: RootState) => state.chat.currentRoom);

  useEffect(() => {
    if (!socket.connected) {
      socket.connect();
    }

    const handleReceiveMessage = (message: Message) => {
      dispatch(addMessage(message));
    };

    const handleDeleteMessage = (messageId: number) => {
      dispatch(removeMessage(messageId));
    };

    const handleError = (error: Error | ServerError) => {
      console.error(error.message);
    };

    socket.on(SocketEvent.ReceiveMessage, handleReceiveMessage);
    socket.on(SocketEvent.MessageDeleted, handleDeleteMessage);
    socket.on(SocketEvent.ConnectionError, handleError);
    socket.on(SocketEvent.Exeption, handleError);

    return () => {
      socket.off(SocketEvent.ReceiveMessage, handleReceiveMessage);
      socket.off(SocketEvent.MessageDeleted, handleDeleteMessage);
      socket.off(SocketEvent.ConnectionError, handleError);
      socket.off(SocketEvent.Exeption, handleError);
      socket.disconnect();
    };
  }, [dispatch]);

  useEffect(() => {
    if (currentUser && currentRoom) {
      socket.emit(SocketEvent.JoinRoom, {
        username: currentUser,
        room: currentRoom,
      });
    }
  }, [currentUser, currentRoom]);

  const sendMessage = (text: string) => {
    if (currentUser) {
      const messagePayload = {
        username: currentUser,
        text: text,
        room: currentRoom,
      };
      socket.emit(SocketEvent.SendMessage, messagePayload);
    }
  };

  const deleteMessage = (messageId: number) => {
    const payload = {
      messageId,
      room: currentRoom,
      username: currentUser,
    };
    socket.emit(SocketEvent.DeleteMessage, payload);
  };

  return { sendMessage, deleteMessage, currentUser, currentRoom };
};
