import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Container,
  Paper,
  Alert,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import type { AppDispatch, RootState } from "../store";
import { setRoom } from "../store/chatSlice";
import { fetchMessages } from "../store/thunks/fetchMessages";
import type { Message } from "../types/interfaces";
import { useChat } from "../hooks/useChat";
import MessageList from "../components/MessageList";
import MessageInput from "../components/MessageInput";
import { ChatSidebar } from "../components/ChatSidebar";
import { Room } from "../types/enums";
import { logout } from "../store/authSlice";
import { Loader } from "../components/utils/Loader";

const ChatPage = () => {
  const { sendMessage, deleteMessage, editMessage, currentUser } = useChat();
  const [inputText, setInputText] = useState("");
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const { room } = useParams();
  const { t } = useTranslation();
  const rooms = Object.values(Room);

  const { messages, isLoading, error } = useSelector(
    (state: RootState) => state.chat
  );

  const dispatch: AppDispatch = useDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentUser) {
      navigate("/login");
    }
  }, [currentUser, navigate]);

  useEffect(() => {
    if (room) {
      dispatch(setRoom(room));
      dispatch(fetchMessages(room));
    }
  }, [room, dispatch]);

  const handleStartEdit = (message: Message) => {
    setEditingMessage(message);
    setInputText(message.text);
  };

  const handleFinishEdit = () => {
    if (inputText.trim() && editingMessage?.id) {
      editMessage(editingMessage.id, inputText);
    }
    setEditingMessage(null);
    setInputText("");
  };

  const handleSendMessageWrapper = (text: string) => {
    sendMessage(text);
    setInputText("");
  };

  const handleCancelEdit = () => {
    setEditingMessage(null);
    setInputText("");
  };

  const handleLeave = () => {
    dispatch(logout());
    navigate("/login");
  };

  if (!currentUser) return null;

  return (
    <Box sx={{ display: "flex", height: "100vh" }}>
      <ChatSidebar rooms={rooms} currentRoom={room} onLogout={handleLeave} />

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          display: "flex",
          flexDirection: "column",
          height: "100vh",
        }}
      >
        <AppBar position="static" color="default" elevation={1}>
          <Toolbar>
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              {room ? `${t("chat.room")}: ${room}` : "Select a room"}
            </Typography>
            <Typography variant="subtitle2" color="text.secondary">
              {t("chat.currentUser")}: <b>{currentUser}</b>
            </Typography>
          </Toolbar>
        </AppBar>

        <Container
          maxWidth="md"
          sx={{
            flexGrow: 1,
            display: "flex",
            flexDirection: "column",
            py: 2,
            overflow: "hidden",
          }}
        >
          <Paper
            elevation={0}
            sx={{
              flexGrow: 1,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              borderRadius: 2,
              border: "1px solid #e0e0e0",
              position: "relative",
            }}
          >
            {isLoading ? (
              <Box sx={{ flexGrow: 1 }}>
                <Loader fullScreen={false} message={t("chat.loading")} />
              </Box>
            ) : error ? (
              <Box p={3}>
                <Alert severity="error">{error}</Alert>
              </Box>
            ) : (
              <Box
                sx={{
                  flexGrow: 1,
                  overflowY: "auto",
                  p: 2,
                  bgcolor: "#fafafa",
                }}
              >
                <MessageList
                  messages={messages}
                  currentUser={currentUser}
                  onDeleteMessage={deleteMessage}
                  onEditMessage={handleStartEdit}
                />
              </Box>
            )}

            <Box
              sx={{ p: 2, bgcolor: "white", borderTop: "1px solid #e0e0e0" }}
            >
              <MessageInput
                text={inputText}
                setText={setInputText}
                onSendMessage={handleSendMessageWrapper}
                editingMessage={editingMessage}
                onEditMessage={handleFinishEdit}
                onCancelEdit={handleCancelEdit}
              />
            </Box>
          </Paper>
        </Container>
      </Box>
    </Box>
  );
};

export default ChatPage;
