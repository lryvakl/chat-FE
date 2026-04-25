const COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e",
  "#f59e0b", "#10b981", "#06b6d4", "#3b82f6",
  "#a855f7", "#14b8a6",
];

const GRADIENTS = [
  "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
  "linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)",
  "linear-gradient(135deg, #06b6d4 0%, #6366f1 100%)",
  "linear-gradient(135deg, #f59e0b 0%, #ec4899 100%)",
  "linear-gradient(135deg, #10b981 0%, #06b6d4 100%)",
  "linear-gradient(135deg, #f43f5e 0%, #f59e0b 100%)",
  "linear-gradient(135deg, #a855f7 0%, #ec4899 100%)",
  "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
];

const hash = (str: string) => {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = str.charCodeAt(i) + ((h << 5) - h);
  }
  return Math.abs(h);
};

export const stringToColor = (str: string) => COLORS[hash(str) % COLORS.length];
export const stringToGradient = (str: string) => GRADIENTS[hash(str) % GRADIENTS.length];
