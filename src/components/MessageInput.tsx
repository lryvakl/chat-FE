import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import SendIcon from "@mui/icons-material/Send";
import {
  TextField,
  Box,
  IconButton,
  useTheme,
  alpha,
  FormHelperText,
} from "@mui/material";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import type { MessageInputProps } from "../types/interfaces";

export const MessageInput = ({
  onSendMessage,
  editingMessage,
  onEditMessage,
  onCancelEdit,
  text,
  setText,
}: MessageInputProps) => {
  const theme = useTheme();
  const { t } = useTranslation();

  const MAX_LENGTH = 800;

  const isLimitReached = useMemo(() => text.length >= MAX_LENGTH, [text]);

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!text.trim()) return;

    if (editingMessage) {
      onEditMessage();
    } else {
      onSendMessage(text);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getHelperText = useMemo(() => {
    if (isLimitReached) {
      return `Character limit reached (${text.length}/${MAX_LENGTH})`;
    } else {
      return `${text.length}/${MAX_LENGTH}`;
    }
  }, [text, isLimitReached]);

  return (
    <Box component="form" onSubmit={handleSend}>
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-end",
          gap: 1,
        }}
      >
        <TextField
          id="message-input"
          fullWidth
          variant="outlined"
          placeholder={
            editingMessage ? t("chat.editMessage") : t("chat.typeMessage")
          }
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          multiline
          maxRows={4}
          size="small"
          autoComplete="off"
          error={isLimitReached}
          inputProps={{ maxLength: MAX_LENGTH }}
          sx={{
            "& .MuiOutlinedInput-root": {
              borderRadius: "20px",
              backgroundColor: isLimitReached
                ? alpha(theme.palette.error.main, 0.1)
                : theme.palette.action.hover,
            },
          }}
        />

        {editingMessage && (
          <IconButton
            onClick={onCancelEdit}
            color="error"
            size="small"
            sx={{ mb: 0.5 }}
          >
            <CloseIcon />
          </IconButton>
        )}

        <IconButton
          id="message-send"
          type="submit"
          disabled={!text.trim()}
          sx={{
            bgcolor: text.trim() ? "primary.main" : "action.disabledBackground",
            color: "white",
            "&:hover": {
              bgcolor: "primary.dark",
            },
            width: 40,
            height: 40,
            mb: 0.1,
            transition: "background-color 0.2s",
          }}
        >
          {editingMessage ? <CheckIcon /> : <SendIcon />}
        </IconButton>
      </Box>

      <Box sx={{ display: "flex", justifyContent: "flex-end", px: 1 }}>
        <FormHelperText
          error={isLimitReached}
          sx={{
            textAlign: "right",
            mt: 0.5,
            visibility: text.length > 0 ? "visible" : "hidden",
          }}
        >
          {getHelperText}
        </FormHelperText>
      </Box>
    </Box>
  );
};

export default MessageInput;
