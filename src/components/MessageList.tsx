import { useSelector } from "react-redux";
import type { RootState } from "../store";
import { List } from "@mui/material";
export const MessageList = () => {
  const messages = useSelector((state: RootState) => state.chat.messages);
  const currentUser = useSelector((state: RootState) => state.chat.currentUser);
  return (
    <List>
      {messages.map((msg, index) => {
        const isMe = msg.user === currentUser;
        return (
          <div key={index}>
            <span style={{ color: isMe ? "blue" : "black" }}>{msg.user}</span>
            <span> {msg.text}</span>
          </div>
        );
      })}
    </List>
  );
};

export default MessageList;
