import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useChat } from "../hooks/useChat";
import MessageList from "../components/MessageList";
import MessageInput from "../components/MessageInput";

const ChatPage = () => {
  const { sendMessage, currentUser } = useChat();
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentUser) {
      navigate("/");
    }
  }, [currentUser, navigate]);
  if (!currentUser) return null;
  return (
    <div>
      <h1>Chat Room: {currentUser}</h1>
      <MessageList />
      <MessageInput onSendMessage={sendMessage} />
    </div>
  );
};

export default ChatPage;
