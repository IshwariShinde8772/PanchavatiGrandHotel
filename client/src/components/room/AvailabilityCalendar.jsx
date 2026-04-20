import { addDays, format, isWithinInterval, parseISO } from "date-fns";

export default function AvailabilityCalendar({ startDate = new Date(), basePrice = 1800, bookedDates = [] }) {
  const dates = [...Array(14)].map((_, index) => addDays(startDate, index));

  return (
    <div className="grid gap-3 rounded-[28px] border border-divider bg-white p-5 md:grid-cols-2">
      {dates.map((day, index) => {
        const isBooked = bookedDates.some(range => 
          isWithinInterval(day, {
            start: parseISO(range.check_in),
            end: addDays(parseISO(range.check_out), -1) // Check-out day is usually available for next guest
          })
        );

        const weekend = [0, 6].includes(day.getDay());

        return (
          <div 
            key={index} 
            className={`rounded-2xl border p-4 transition-all ${
              isBooked 
                ? "bg-gray-50 border-divider opacity-50 grayscale" 
                : "bg-white border-divider/70 hover:border-saffron"
            }`}
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-bold text-vineyard">{format(day, "EEE, dd MMM")}</p>
                <p className="text-[10px] uppercase font-bold tracking-widest text-mutedText mt-1">
                  {isBooked ? "Unvailable" : weekend ? "Weekend Rate" : "Standard Rate"}
                </p>
              </div>
              {!isBooked && (
                 <p className="text-sm font-black text-saffron">₹{basePrice + (weekend ? 400 : 0)}</p>
              )}
            </div>
            {isBooked && (
               <p className="mt-2 text-[10px] font-bold text-maroon uppercase tracking-tighter bg-maroon/10 py-1 px-2 rounded-full inline-block">Booked / Occupied</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
