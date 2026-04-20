export default function RoomCompareDrawer({ rooms = [] }) {
  if (!rooms.length) return null;

  return (
    <div className="rounded-[28px] border border-divider bg-white p-5 shadow-ethnic">
      <h3 className="font-heading text-2xl">Compare Shortlisted Rooms</h3>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {rooms.map((room) => (
          <div key={room.id} className="rounded-2xl bg-saffronLight p-4">
            <p className="font-semibold">{room.name}</p>
            <p className="text-sm text-mutedText">{room.category} • {room.view_type}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

