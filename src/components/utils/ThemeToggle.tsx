import * as Tooltip from "@radix-ui/react-tooltip";
import { Moon, Sun } from "lucide-react";

import { useColorMode } from "../../theme/ThemeContext";

export const ThemeToggle = () => {
  const { mode, toggle } = useColorMode();

  return (
    <Tooltip.Provider delayDuration={300}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <button
            className="icon-btn"
            onClick={toggle}
            aria-label={mode === "light" ? "Switch to dark mode" : "Switch to light mode"}
          >
            {mode === "light" ? <Moon size={18} /> : <Sun size={18} />}
          </button>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content className="tooltip-content" sideOffset={6}>
            {mode === "light" ? "Dark mode" : "Light mode"}
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
};
