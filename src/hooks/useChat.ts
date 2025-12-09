import { useDispatch, useSelector } from "react-redux";
import { socket } from "../api/socket";
import { useEffect } from "react";
import { addMessage } from "../store/chatSlice";
import type { Message } from "../store/chatSlice";
import type { RootState } from "../store";

export const useChat = () => {
  const dispatch = useDispatch();
  const currentUser = useSelector((state: RootState) => state.chat.currentUser);

  useEffect(() => {
    socket.connect();

    const handleReceiveMessage = (message: Message) => {
      dispatch(addMessage(message));
    };

    socket.on("receiveMessage", handleReceiveMessage);

    return () => {
      socket.off("receiveMessage", handleReceiveMessage);
      socket.disconnect();
    };
  }, [dispatch]);

  const sendMessage = (text: string) => {
    if (currentUser) {
      const messagePayloag = {
        user: currentUser,
        text: text,
      };
      socket.emit("sendMessage", messagePayloag);
    }
  };
  return { sendMessage, currentUser };
};
