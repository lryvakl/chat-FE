import LogoutIcon from "@mui/icons-material/Logout";
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
  Typography,
} from "@mui/material";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import type { ChatSidebarProps } from "../types/interfaces";
import { LanguageSwitcher } from "./utils/LanguageSwitcher";
import { TourButton } from "./utils/TourButton";
import { getChatSteps } from "../constants/steps";

export const ChatSidebar = ({
  rooms,
  currentRoom,
  onLogout,
}: ChatSidebarProps) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const chatSteps = useMemo(() => getChatSteps(t), [t]);

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: 240,
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: { width: 240, boxSizing: "border-box" },
      }}
    >
      <Toolbar sx={{ display: "flex", justifyContent: "space-between", px: 2 }}>
        <Typography
          variant="h6"
          noWrap
          component="div"
          sx={{ color: "primary.main", fontWeight: "bold" }}
        >
          {t("header.title")}
        </Typography>
        <TourButton steps={chatSteps} />
        <LanguageSwitcher />
      </Toolbar>

      <Divider />

      <Box
        sx={{
          overflow: "auto",
          display: "flex",
          flexDirection: "column",
          height: "100%",
        }}
      >
        <List id="room-list">
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
          <Divider />
          <Button
            fullWidth
            onClick={onLogout}
            color="error"
            startIcon={<LogoutIcon />}
            sx={{ p: 2, borderRadius: 0 }}
          >
            {t("header.logout")}
          </Button>
        </Box>
      </Box>
    </Drawer>
  );
};
