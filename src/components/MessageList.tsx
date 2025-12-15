import { useEffect, useRef } from "react";
import {
  Box,
  Collapse,
  Typography,
  Paper,
  Avatar,
  IconButton,
  Chip,
  Divider,
} from "@mui/material";
import { TransitionGroup } from "react-transition-group";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditIcon from "@mui/icons-material/Edit";
import type { MessageListProps } from "../types/interfaces";
import { formatTime, isSameDay, formatDateSeparator } from "../utils/dateFormatters";

export const MessageList = ({
  messages,
  currentUser,
  onDeleteMessage,
  onEditMessage,
}: MessageListProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
      <TransitionGroup>
        {messages.map((msg, index) => {
          const isMe = msg.user === currentUser;
          const isLast = index === messages.length - 1;

          const previousMessage = messages[index - 1];

          const showDateSeparator =
            !previousMessage ||
            !msg.createdAt ||
            !previousMessage.createdAt ||
            !isSameDay(msg.createdAt, previousMessage.createdAt);

          return (
            <Collapse
              key={msg.id || index}
              onEntered={isLast ? scrollToBottom : undefined}
            >
              {showDateSeparator && msg.createdAt && (
                <Divider sx={{ my: 2, opacity: 0.6 }}>
                  <Chip
                    label={formatDateSeparator(msg.createdAt)}
                    size="small"
                    sx={{
                      backgroundColor: "grey.200",
                      color: "text.secondary",
                      fontSize: "0.75rem",
                      fontWeight: 500,
                      height: 24,
                    }}
                  />
                </Divider>
              )}

              <Box
                sx={{
                  display: "flex",
                  justifyContent: isMe ? "flex-end" : "flex-start",
                  alignItems: "flex-end",
                  mb: 1,
                  "&:hover .delete-btn, &:hover .edit-btn": {
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
                    className="edit-btn"
                    size="small"
                    onClick={() => onEditMessage(msg)}
                    sx={{
                      opacity: 0,
                      visibility: "hidden",
                      mr: 0.5,
                      color: "text.secondary",
                      transition: "all 0.2s",
                      "&:hover": { color: "primary.main" },
                    }}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
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
                      sx={{
                        color: "text.secondary",
                        fontWeight: "bold",
                        mb: 0.5,
                      }}
                    >
                      {msg.user}
                    </Typography>
                  )}

                  <Typography variant="body1" sx={{ whiteSpace: "pre-wrap" }}>
                    {msg.text}
                  </Typography>

                  {msg.createdAt && (
                    <Typography
                      variant="caption"
                      sx={{
                        display: "block",
                        textAlign: "right",
                        mt: 0.5,
                        opacity: 0.7,
                        fontSize: "0.7rem",
                        userSelect: "none",
                      }}
                    >
                      {formatTime(msg.createdAt)}
                    </Typography>
                  )}
                </Paper>
              </Box>
            </Collapse>
          );
        })}
      </TransitionGroup>
      <div ref={messagesEndRef} />
    </Box>
  );
};

export default MessageList;
