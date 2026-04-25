import * as Tooltip from "@radix-ui/react-tooltip";
import type { DriveStep } from "driver.js";
import { HelpCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useTour } from "../../hooks/useTour";

interface TourButtonProps {
  steps: DriveStep[];
}

export const TourButton = ({ steps }: TourButtonProps) => {
  const { startTour } = useTour(steps);
  const { t } = useTranslation();

  return (
    <Tooltip.Provider delayDuration={300}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <button
            className="icon-btn"
            onClick={startTour}
            aria-label={t("chat.help")}
          >
            <HelpCircle size={18} />
          </button>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content className="tooltip-content" sideOffset={6}>
            {t("chat.help")}
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
};
