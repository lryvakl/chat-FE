import MenuIcon from "@mui/icons-material/Menu";
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Container,
  Paper,
  Alert,
  IconButton,
  Drawer,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";

import { ChatSidebar } from "../components/ChatSidebar";
import MessageInput from "../components/MessageInput";
import MessageList from "../components/MessageList";
import { Loader } from "../components/utils/Loader";
import { useChat } from "../hooks/useChat";
import type { AppDispatch, RootState } from "../store";
import { logout } from "../store/authSlice";
import { setRoom } from "../store/chatSlice";
import { fetchMessages } from "../store/thunks/fetchMessages";
import { PATHS } from "../types/enums";
import { Room } from "../types/enums";
import type { Message } from "../types/interfaces";

const ChatPage = () => {
  const { sendMessage, deleteMessage, editMessage, currentUser } = useChat();
  const [inputText, setInputText] = useState("");
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  const { room } = useParams();
  const { t } = useTranslation();
  const rooms = Object.values(Room);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const { messages, isLoading, error } = useSelector(
    (state: RootState) => state.chat
  );

  const dispatch: AppDispatch = useDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentUser) {
      navigate(PATHS.LOGIN);
    }
  }, [currentUser, navigate]);

  useEffect(() => {
    if (room) {
      dispatch(setRoom(room));
      dispatch(fetchMessages(room));
    }
  }, [room, dispatch]);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

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
    navigate(PATHS.LOGIN);
  };

  if (!currentUser) return null;

  const sidebarContent = (
    <ChatSidebar
      rooms={rooms}
      currentRoom={room}
      onLogout={handleLeave}
      onRoomSelect={() => isMobile && setMobileOpen(false)}
    />
  );

  return (
    <Box sx={{ display: "flex", height: "100vh", bgcolor: "#f5f5f5" }}>
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: "block", md: "none" },
          "& .MuiDrawer-paper": { boxSizing: "border-box", width: 280 },
        }}
      >
        {sidebarContent}
      </Drawer>

      <Box
        sx={{ display: { xs: "none", md: "block" }, width: 280, flexShrink: 0 }}
      >
        {sidebarContent}
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          display: "flex",
          flexDirection: "column",
          height: "100vh",
          width: { md: `calc(100% - 280px)` },
        }}
      >
        <AppBar position="static" color="default" elevation={1}>
          <Toolbar sx={{ px: { xs: 1, sm: 2 } }}>
            <IconButton
              aria-label="menu"
              color="inherit"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2, display: { md: "none" } }}
            >
              <MenuIcon />
            </IconButton>

            <Typography
              variant="h6"
              sx={{ flexGrow: 1, fontSize: { xs: "1.1rem", sm: "1.25rem" } }}
            >
              {isMobile ? room : `${t("chat.room")}: ${room}`}
            </Typography>

            <Typography
              variant="subtitle2"
              color="text.secondary"
              sx={{ display: { xs: "none", sm: "block" } }}
            >
              {t("chat.currentUser")}: <b>{currentUser}</b>
            </Typography>
          </Toolbar>
        </AppBar>

        <Container
          maxWidth="md"
          disableGutters={isMobile}
          sx={{
            flexGrow: 1,
            display: "flex",
            flexDirection: "column",
            py: { xs: 0, sm: 2 },
            overflow: "hidden",
          }}
        >
          <Paper
            elevation={isMobile ? 0 : 1}
            sx={{
              flexGrow: 1,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              borderRadius: isMobile ? 0 : 2,
              border: isMobile ? "none" : "1px solid #e0e0e0",
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
                  p: { xs: 1, sm: 2 },
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
              sx={{
                p: { xs: 1, sm: 2 },
                bgcolor: "white",
                borderTop: "1px solid #e0e0e0",
                pb: isMobile ? "env(safe-area-inset-bottom)" : 2,
              }}
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
