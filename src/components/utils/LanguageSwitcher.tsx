import CheckIcon from "@mui/icons-material/Check";
import LanguageIcon from "@mui/icons-material/Language";
import {
  IconButton,
  Menu,
  MenuItem,
  Tooltip,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export const LanguageSwitcher = () => {
  const { i18n } = useTranslation();

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    handleClose();
  };

  return (
    <>
      <Tooltip title="Change Language">
        <IconButton
          id="language-switcher"
          onClick={handleClick}
          size="small"
          aria-controls={open ? "language-menu" : undefined}
          aria-haspopup="true"
          aria-expanded={open ? "true" : undefined}
          sx={{ color: "primary.main" }}
        >
          <LanguageIcon />
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        id="language-menu"
        open={open}
        onClose={handleClose}
        onClick={handleClose}
        slotProps={{
          paper: {
            elevation: 0,
            sx: {
              overflow: "visible",
              filter: "drop-shadow(0px 2px 8px rgba(0,0,0,0.32))",
              mt: 1.5,
              "& .MuiAvatar-root": {
                width: 32,
                height: 32,
                ml: -0.5,
                mr: 1,
              },
            },
          },
        }}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
      >
        <MenuItem onClick={() => changeLanguage("uk")}>
          <ListItemIcon>
            {i18n.language === "uk" && <CheckIcon fontSize="small" />}
          </ListItemIcon>
          <ListItemText> 🇺🇦 UA</ListItemText>
        </MenuItem>

        <MenuItem onClick={() => changeLanguage("pl")}>
          <ListItemIcon>
            {i18n.language === "pl" && <CheckIcon fontSize="small" />}
          </ListItemIcon>
          <ListItemText>🇵🇱 PL</ListItemText>
        </MenuItem>

        <MenuItem onClick={() => changeLanguage("ja")}>
          <ListItemIcon>
            {i18n.language === "ja" && <CheckIcon fontSize="small" />}
          </ListItemIcon>
          <ListItemText>🇯🇵 JP</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
};
