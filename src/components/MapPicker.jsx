import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const defaultCenter = [47.918, 106.917];

function ClickHandler({ onPick }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function MapPicker({
  lat,
  lng,
  onChange = () => {},
  heightClass = 'h-56',
  readOnly = false,
}) {
  const position = [
    typeof lat === 'number' && !Number.isNaN(lat) ? lat : defaultCenter[0],
    typeof lng === 'number' && !Number.isNaN(lng) ? lng : defaultCenter[1],
  ];

  useEffect(() => {
    // force map size refresh inside dialogs
    window.dispatchEvent(new Event('resize'));
  }, []);

  return (
    <div className={`w-full overflow-hidden rounded-xl border border-green-200 ${heightClass}`}>
      <MapContainer
        center={position}
        zoom={lat != null && lng != null ? 12 : 6}
        className="h-full w-full min-h-[220px]"
        scrollWheelZoom={!readOnly}
        dragging={!readOnly}
        doubleClickZoom={!readOnly}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {!readOnly && <ClickHandler onPick={onChange} />}
        {lat != null && lng != null && <Marker position={[lat, lng]} />}
      </MapContainer>
    </div>
  );
}
