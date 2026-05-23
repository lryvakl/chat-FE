import { useTranslation } from 'react-i18next';

interface TypingIndicatorProps {
  usernames: string[];
}

export const TypingIndicator = ({ usernames }: TypingIndicatorProps) => {
  const { t } = useTranslation();
  if (usernames.length === 0) return null;
  const label =
    usernames.length === 1
      ? t('chat.isTypingLabel', { name: usernames[0] })
      : usernames.length === 2
        ? t('chat.twoTypingLabel', { a: usernames[0], b: usernames[1] })
        : t('chat.peopleTypingLabel', { count: usernames.length });
  return (
    <div className="typing-indicator">
      <span className="typing-dot" />
      <span className="typing-dot" />
      <span className="typing-dot" />
      <span className="typing-label">{label}</span>
    </div>
  );
};
