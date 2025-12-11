import { TextField, Box, IconButton } from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import { useState } from "react";
import type { MessageInputProps } from "../utils/interfaces";

export const MessageInput = ({ onSendMessage }: MessageInputProps) => {
  const [text, setText] = useState("");
  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (text.trim()) {
      onSendMessage(text);
      setText("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Box
      component="form"
      onSubmit={handleSend}
      sx={{
        display: "flex",
        alignItems: "flex-end",
        gap: 1,
      }}
    >
      <TextField
        fullWidth
        variant="outlined"
        placeholder="Type a message..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        multiline
        maxRows={4}
        size="small"
        autoComplete="off"
        sx={{
          "& .MuiOutlinedInput-root": {
            borderRadius: "20px",
            backgroundColor: "#f9f9f9",
          },
        }}
      />

      <IconButton
        type="submit"
        color="primary"
        disabled={!text.trim()}
        sx={{
          bgcolor: text.trim() ? "primary.main" : "grey.300",
          color: "white",
          "&:hover": {
            bgcolor: "primary.dark",
          },
          width: 40,
          height: 40,
          mb: 0.5,
        }}
      >
        <SendIcon fontSize="small" />
      </IconButton>
    </Box>
  );
};

export default MessageInput;
