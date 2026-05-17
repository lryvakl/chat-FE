interface TypingIndicatorProps {
  usernames: string[];
}

export const TypingIndicator = ({ usernames }: TypingIndicatorProps) => {
  if (usernames.length === 0) return null;
  const label =
    usernames.length === 1
      ? `${usernames[0]} is typing`
      : usernames.length === 2
        ? `${usernames[0]} and ${usernames[1]} are typing`
        : `${usernames.length} people are typing`;
  return (
    <div className="typing-indicator">
      <span className="typing-dot" />
      <span className="typing-dot" />
      <span className="typing-dot" />
      <span className="typing-label">{label}</span>
    </div>
  );
};
