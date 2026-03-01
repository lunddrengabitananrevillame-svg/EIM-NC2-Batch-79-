import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(amount);
};

export const formatDate = (dateString: string) => {
  if (!dateString) return "";
  
  // If the date string comes from SQLite CURRENT_TIMESTAMP (YYYY-MM-DD HH:MM:SS),
  // it is in UTC. We append 'Z' to ensure it's parsed as UTC.
  let parsedDate = dateString;
  if (!dateString.includes('T') && !dateString.includes('Z')) {
    parsedDate = dateString.replace(' ', 'T') + 'Z';
  }

  return new Date(parsedDate).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Manila"
  });
};
