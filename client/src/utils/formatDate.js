import { format, parseISO } from "date-fns";

export function formatDate(value, pattern = "dd MMM yyyy") {
  if (!value) return "";
  return format(typeof value === "string" ? parseISO(value) : value, pattern);
}

