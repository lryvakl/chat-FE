import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Container,
  Paper,
  Button,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useChat } from "../hooks/useChat";
import MessageList from "../components/MessageList";
import MessageInput from "../components/MessageInput";

const ChatPage = () => {
  const { sendMessage, currentUser } = useChat();
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentUser) {
      navigate("/");
    }
  }, [currentUser, navigate]);

  const handleLeave = () => {
    navigate("/");
  };

  return (
    <Box
      sx={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <AppBar position="static" elevation={1} color="default" sx={{}}>
        <Toolbar>
          <Typography
            variant="h6"
            component="div"
            sx={{ flexGrow: 1, color: "text.primary" }}
          >
            Chat Room
          </Typography>

          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography
                variant="subtitle1"
                sx={{ color: "text.primary", fontWeight: "bold" }}
              >
                {currentUser}
              </Typography>
            </Box>

            <Button
              variant="outlined"
              color="error"
              size="small"
              onClick={handleLeave}
            >
              Leave
            </Button>
          </Box>
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
          }}
        >
          <Box
            sx={{ flexGrow: 1, overflowY: "auto", p: 2, bgcolor: "#fafafa" }}
          >
            <MessageList />
          </Box>

          <Box sx={{ p: 2, bgcolor: "white", borderTop: "1px solid #e0e0e0" }}>
            <MessageInput onSendMessage={sendMessage} />
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default ChatPage;
