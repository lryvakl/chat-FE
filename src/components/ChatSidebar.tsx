import LogoutIcon from "@mui/icons-material/Logout";
import {
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
import { PATHS } from "../constants/paths";
import { getChatSteps } from "../constants/steps";

export const ChatSidebar = ({
  rooms,
  currentRoom,
  onLogout,
  onRoomSelect,
}: ChatSidebarProps) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const chatSteps = useMemo(() => getChatSteps(t), [t]);

  const handleRoomClick = (roomName: string) => {
    navigate(`${PATHS.CHAT}/${roomName}`);
    if (onRoomSelect) {
      onRoomSelect();
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: 280,
        borderRight: "1px solid #e0e0e0",
        bgcolor: "background.paper",
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
          flexGrow: 1,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <List id="room-list">
          {rooms.map((text) => (
            <ListItem key={text} disablePadding>
              <ListItemButton
                selected={currentRoom === text}
                onClick={() => handleRoomClick(text)}
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
    </Box>
  );
};
