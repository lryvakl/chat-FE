import {
  Drawer,
  Toolbar,
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Divider,
  Button,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import type { ChatSidebarProps } from "../types/interfaces";

export const ChatSidebar = ({
  rooms,
  currentRoom,
  onLogout,
}: ChatSidebarProps) => {
  const navigate = useNavigate();

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: 240,
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: { width: 240, boxSizing: "border-box" },
      }}
    >
      <Toolbar />{" "}
      <Box
        sx={{
          overflow: "auto",
          display: "flex",
          flexDirection: "column",
          height: "100%",
        }}
      >
        <List>
          {rooms.map((text) => (
            <ListItem key={text} disablePadding>
              <ListItemButton
                selected={currentRoom === text}
                onClick={() => navigate(`/chat/${text}`)}
              >
                <ListItemText primary={text} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>

        <Box sx={{ mt: "auto" }}>
          {" "}
          <Divider />
          <Button fullWidth onClick={onLogout} color="error" sx={{ p: 2 }}>
            Logout
          </Button>
        </Box>
      </Box>
    </Drawer>
  );
};
