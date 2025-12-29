import type { DriveStep } from "driver.js";
import type { TFunction } from "i18next";

export const getChatSteps = (t: TFunction): DriveStep[] => [
  {
    element: "#language-switcher",
    popover: {
      title: t("tour.language"),
      description: t("tour.switchLanguage"),
      side: "right",
    },
  },
  {
    element: "#room-list",
    popover: {
      title: t("tour.rooms"),
      description: t("tour.selectRoom"),
      side: "right",
    },
  },
  {
    element: "#message-input",
    popover: {
      title: t("header.title"),
      description: t("tour.writeMessages"),
      side: "top",
    },
  },
  {
    element: "#message-send",
    popover: {
      title: t("tour.send"),
      side: "top",
    },
  },
];

export const getLoginSteps = (t: TFunction): DriveStep[] => [
  {
    element: "#username",
    popover: {
      title: t("auth.username"),
      description: t("tour.enterUsername"),
    },
  },
  {
    element: "#password",
    popover: {
      title: t("auth.password"),
      description: t("tour.enterPassword"),
    },
  },
];

export const getRegisterSteps = (t: TFunction): DriveStep[] => [
  {
    element: "#username",
    popover: {
      title: t("auth.username"),
      description: t("tour.createUsername"),
    },
  },
  {
    element: "#password",
    popover: {
      title: t("auth.password"),
      description: t("tour.createPassword"),
    },
  },
];
