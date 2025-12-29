import { driver } from "driver.js";
import type { DriveStep } from "driver.js";
import "driver.js/dist/driver.css";
import { useTranslation } from "react-i18next";

export const useTour = (steps: DriveStep[]) => {
  const { t } = useTranslation();
  const startTour = () => {
    const driverObj = driver({
      showProgress: true,
      steps: steps,

      nextBtnText: t("tour.next"),
      prevBtnText: t("tour.previous"),
      doneBtnText: t("tour.close"),
    });

    driverObj.drive();
  };

  return { startTour };
};
