import { CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { nashikLocations } from "../../utils/nashikLocations";

export default function NashikMapWidget() {
  return (
    <div className="overflow-hidden rounded-[28px] border border-divider shadow-ethnic">
      <MapContainer center={[20.0059, 73.7905]} zoom={12} className="h-[340px] w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {nashikLocations.map((location) => (
          <CircleMarker
            key={location.name}
            center={[location.lat, location.lng]}
            radius={8}
            pathOptions={{ color: "#C8440A", fillColor: "#C8960C", fillOpacity: 0.8 }}
          >
            <Popup>
              <div className="p-1">
                <p className="font-semibold">{location.name}</p>
                <p className="text-sm">{location.distance} km from hotel</p>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}




