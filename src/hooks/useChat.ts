import { useDispatch, useSelector } from "react-redux";
import { socket } from "../api/socket";
import { useEffect } from "react";
import { addMessage } from "../store/chatSlice";
import type { Message, ServerError } from "../types/interfaces";
import type { RootState } from "../store";
import { SocketEvent } from "../types/enums";

export const useChat = () => {
  const dispatch = useDispatch();
  const currentUser = useSelector((state: RootState) => state.chat.currentUser);
  const currentRoom = useSelector((state: RootState) => state.chat.currentRoom);

  useEffect(() => {
    socket.connect();
    if (currentUser && currentRoom) {
      socket.emit(SocketEvent.JoinRoom, {
        user: currentUser,
        room: currentRoom,
      });
    }

    const handleReceiveMessage = (message: Message) => {
      dispatch(addMessage(message));
    };

    const handleError = (error: Error | ServerError) => {
      console.error(error.message);
    };

    socket.on(SocketEvent.ReceiveMessage, handleReceiveMessage);

    socket.on(SocketEvent.ConnectionError, handleError);
    socket.on(SocketEvent.Exeption, handleError);

    return () => {
      socket.off(SocketEvent.ReceiveMessage, handleReceiveMessage);
      socket.off(SocketEvent.ConnectionError, handleError);
      socket.off(SocketEvent.Exeption, handleError);
      socket.disconnect();
    };
  }, [dispatch, currentUser, currentRoom]);

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

  return { sendMessage, currentUser, currentRoom };
};
