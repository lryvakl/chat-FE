import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { socket } from "../api/socket";
import type { RootState } from "../store";
import { addMessage, removeMessage, updateMessage } from "../store/chatSlice";
import type { Message, ServerError } from "../types/interfaces";
import { SocketEvent } from "../types/enums";

export const useChat = () => {
  const dispatch = useDispatch();
  const { user, token } = useSelector((state: RootState) => state.auth);
  const currentUser = user?.username || "";
  const currentRoom = useSelector((state: RootState) => state.chat.currentRoom);

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

  const editMessage = (messageId: number, newText: string) => {
    socket.emit(SocketEvent.EditMessage, {
      messageId: messageId,
      text: newText,
      room: currentRoom,
      username: currentUser,
    });
  };

  return { sendMessage, deleteMessage, editMessage, currentUser, currentRoom };
};
