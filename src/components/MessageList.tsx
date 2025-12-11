import { useSelector } from "react-redux";
import { Box, Typography, Paper, Avatar } from "@mui/material";
import { useEffect, useRef } from "react";
import type { RootState } from "../store";

export const MessageList = () => {
  const messages = useSelector((state: RootState) => state.chat.messages);
  const currentUser = useSelector((state: RootState) => state.chat.currentUser);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const formatTime = (dateString?: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {messages.map((msg, index) => {
        const isMe = msg.user === currentUser;

        return (
          <Box
            key={index}
            sx={{
              display: "flex",
              justifyContent: isMe ? "flex-end" : "flex-start",
              alignItems: "flex-end",
              gap: 1,
            }}
          >
            {!isMe && (
              <Avatar
                sx={{
                  width: 32,
                  height: 32,
                  bgcolor: "secondary.main",
                  fontSize: 14,
                }}
              >
                {msg.user.charAt(0).toUpperCase()}
              </Avatar>
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
