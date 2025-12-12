import { useEffect, useRef } from "react";
import { Box, Typography, Paper, Avatar, IconButton } from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import type { MessageListProps } from "../types/interfaces";
import { formatTime } from "../utils/dateUtils";

export const MessageList = ({
  messages,
  currentUser,
  onDeleteMessage,
}: MessageListProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {messages.map((msg, index) => {
        const isMe = msg.user === currentUser;

        return (
          <Box
            key={msg.id || index}
            sx={{
              display: "flex",
              justifyContent: isMe ? "flex-end" : "flex-start",
              alignItems: "flex-end",
              mb: 1,
              "&:hover .delete-btn": {
                opacity: 1,
                visibility: "visible",
              },
            }}
          >
            {!isMe && (
              <Avatar
                sx={{
                  width: 32,
                  height: 32,
                  bgcolor: "secondary.main",
                  fontSize: 14,
                  mr: 1,
                }}
              >
                {msg.user.charAt(0).toUpperCase()}
              </Avatar>
            )}

            {isMe && msg.id && (
              <IconButton
                className="delete-btn"
                size="small"
                onClick={() => onDeleteMessage(msg.id!)}
                sx={{
                  opacity: 0,
                  visibility: "hidden",
                  mr: 1,
                  color: "text.secondary",
                  transition: "all 0.2s",
                  "&:hover": { color: "error.main" },
                }}
              >
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            )}

            <Paper
              elevation={1}
              sx={{
                p: 1.5,
                maxWidth: "70%",
                borderRadius: 2,
                borderBottomRightRadius: isMe ? 0 : 2,
                borderBottomLeftRadius: !isMe ? 0 : 2,
                bgcolor: isMe ? "primary.main" : "grey.200",
                color: isMe ? "white" : "text.primary",
                wordBreak: "break-word",
              }}
            >
              {!isMe && (
                <Typography
                  variant="caption"
                  display="block"
                  sx={{ color: "text.secondary", fontWeight: "bold", mb: 0.5 }}
                >
                  {msg.user}
                </Typography>
              )}

              <Typography variant="body1">{msg.text}</Typography>

              {msg.createdAt && (
                <Typography
                  variant="caption"
                  sx={{
                    display: "block",
                    textAlign: "right",
                    mt: 0.5,
                    opacity: 0.7,
                    fontSize: "0.7rem",
                  }}
                >
                  {formatTime(msg.createdAt)}
                </Typography>
              )}
            </Paper>
          </Box>
        );
      })}

      <div ref={messagesEndRef} />
    </Box>
  );
};

export default MessageList;
