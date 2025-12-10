import { Button, TextField } from "@mui/material";
import { useState } from "react";
import type { MessageInputProps } from "../utils/interfaces";

export const MessageInput = ({ onSendMessage }: MessageInputProps) => {
  const [text, setText] = useState("");
  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      onSendMessage(text);
      setText("");
    }
  };
  return (
    <form onSubmit={handleSend}>
      <TextField
        label="Message"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <Button type="submit">Send</Button>
    </form>
  );
};

export default MessageInput;
