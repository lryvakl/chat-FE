import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import { IconButton, Tooltip } from "@mui/material";
import type { DriveStep } from "driver.js";
import { useTranslation } from "react-i18next";

import { useTour } from "../../hooks/useTour";

interface TourButtonProps {
  steps: DriveStep[];
}

export const TourButton = ({ steps }: TourButtonProps) => {
  const { startTour } = useTour(steps);
  const { t } = useTranslation();

  return (
    <Tooltip title={t("chat.help")}>
      <IconButton
        onClick={startTour}
        sx={{
          color: "#1976d2",
          "&:hover": { bgcolor: "#f5f5f5" },
        }}
      >
        <HelpOutlineIcon />
      </IconButton>
    </Tooltip>
  );
};
