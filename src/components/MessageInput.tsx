import { useState } from "react";
import { TextField, Box, IconButton, useTheme, alpha } from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import type { MessageInputProps } from "../utils/interfaces";

export const MessageInput = ({ onSendMessage }: MessageInputProps) => {
  const [text, setText] = useState("");
  const theme = useTheme();

  const MAX_LENGTH = 800;
  const currentLength = text.length;
  const isLimitReached = currentLength >= MAX_LENGTH;

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

  const getHelperText = () => {
    if (isLimitReached)
      return `Character limit reached (${text.length}/${MAX_LENGTH})`;
    return `${text.length}/${MAX_LENGTH}`;
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
        error={isLimitReached}
        helperText={getHelperText()}
        inputProps={{
          maxLength: MAX_LENGTH,
        }}
        FormHelperTextProps={{
          sx: {
            textAlign: isLimitReached ? "left" : "right",
            marginLeft: 0,
            color: isLimitReached ? "error.main" : "text.secondary",
          },
        }}
        sx={{
          "& .MuiOutlinedInput-root": {
            borderRadius: "20px",
            backgroundColor: isLimitReached
              ? alpha(theme.palette.error.main, 0.1)
              : theme.palette.action.hover,
          },
        }}
      />

      <IconButton
        type="submit"
        color="primary"
        disabled={!text.trim()}
        sx={{
          bgcolor: text.trim() ? "primary.main" : "action.disabledBackground",
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
