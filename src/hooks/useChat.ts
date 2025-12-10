import { useDispatch, useSelector } from "react-redux";
import { socket } from "../api/socket";
import { useEffect } from "react";
import { addMessage } from "../store/chatSlice";
import type { Message } from "../utils/interfaces";
import type { RootState } from "../store";
import { SocketEvent } from "../utils/enums";

export const useChat = () => {
  const dispatch = useDispatch();
  const currentUser = useSelector((state: RootState) => state.chat.currentUser);

  useEffect(() => {
    socket.connect();

    const handleReceiveMessage = (message: Message) => {
      dispatch(addMessage(message));
    };

    socket.on(SocketEvent.ReceiveMessage, handleReceiveMessage);

    return () => {
      socket.off(SocketEvent.ReceiveMessage, handleReceiveMessage);
      socket.disconnect();
    };
  }, [dispatch]);

  const sendMessage = (text: string) => {
    if (currentUser) {
      const messagePayloag = {
        user: currentUser,
        text: text,
      };
      socket.emit(SocketEvent.SendMessage, messagePayloag);
    }
  };

  return { sendMessage, currentUser };
};
