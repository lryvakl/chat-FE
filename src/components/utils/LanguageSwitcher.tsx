import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Check, Globe } from "lucide-react";
import { useTranslation } from "react-i18next";

const LANGUAGES = [
  { code: "uk", flag: "🇺🇦", label: "UA" },
  { code: "en", flag: "🇬🇧", label: "EN" },
  { code: "pl", flag: "🇵🇱", label: "PL" },
  { code: "ja", flag: "🇯🇵", label: "JP" },
] as const;

export const LanguageSwitcher = () => {
  const { i18n, t } = useTranslation();

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          id="language-switcher"
          className="icon-btn"
          aria-label={t("language.changeLanguage")}
        >
          <Globe size={18} />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="dropdown-content"
          align="end"
          sideOffset={6}
        >
          {LANGUAGES.map(({ code, flag, label }) => (
            <DropdownMenu.Item
              key={code}
              className="dropdown-item"
              onSelect={() => i18n.changeLanguage(code)}
            >
              <span>{flag}</span>
              <span style={{ flex: 1 }}>{label}</span>
              {i18n.language === code && (
                <Check size={14} style={{ color: "#6366f1" }} />
              )}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
};
