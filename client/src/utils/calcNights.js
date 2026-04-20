import { differenceInCalendarDays, parseISO } from "date-fns";

export function calcNights(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 0;
  return Math.max(differenceInCalendarDays(parseISO(checkOut), parseISO(checkIn)), 0);
}

