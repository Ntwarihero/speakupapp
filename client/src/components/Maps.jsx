import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const pin = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const KIGALI = [-1.9715, 30.1395];

const heatColor = {
  low: '#0f766e',
  medium: '#b45309',
  high: '#c2410c',
  critical: '#b42318',
};

export function ReportMap({ lat, lng, label }) {
  if (!lat || !lng) return null;
  return (
    <MapContainer center={[lat, lng]} zoom={17} scrollWheelZoom={false}>
      <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Marker position={[lat, lng]} icon={pin}>
        {label && <Popup>{label}</Popup>}
      </Marker>
    </MapContainer>
  );
}

export function HeatMap({ points = [] }) {
  const center = points[0] ? [points[0].lat, points[0].lng] : KIGALI;
  return (
    <div className="heatmap-box">
      <MapContainer center={center} zoom={16} scrollWheelZoom>
        <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {points.map((p, i) => (
          <CircleMarker
            key={`${p.reportNo}-${i}`}
            center={[p.lat, p.lng]}
            radius={p.severity === 'critical' ? 18 : p.severity === 'high' ? 14 : 10}
            pathOptions={{
              color: heatColor[p.severity] || '#5C2D91',
              fillColor: heatColor[p.severity] || '#5C2D91',
              fillOpacity: 0.45,
            }}
          >
            <Popup>
              <strong>{p.reportNo}</strong>
              <br />
              {p.locationName} — {p.severity}
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
