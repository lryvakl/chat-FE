export const formatTime = (dateString?: string) => {
  if (!dateString) {
    return "";
  }
  const date = new Date(dateString);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

export const isSameDay = (d_1: string | Date, d_2: string | Date) => {
  const date_1 = new Date(d_1);
  const date_2 = new Date(d_2);
  return (
    date_1.getFullYear() === date_2.getFullYear() &&
    date_1.getMonth() === date_2.getMonth() &&
    date_1.getDate() === date_2.getDate()
  );
};

export const formatDateSeparator = (dateString: string | Date) => {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (isSameDay(date, today)) {
    return "Today";
  }
  if (isSameDay(date, yesterday)) {
    return "Yesterday";
  }
  return date.toLocaleDateString([], {
    day: "numeric",
    month: "long",
    year: date.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
  });
};
