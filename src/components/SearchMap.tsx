'use client';

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const defaultIcon = L.icon({
  iconUrl: 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = defaultIcon;

interface ListingMapItem {
  id: number;
  title: string;
  location: string;
  latitude: number;
  longitude: number;
  distanceKm?: number;
}

interface SearchMapProps {
  listings: ListingMapItem[];
  userLocation?: { lat: number; lng: number };
  center: [number, number];
}

export default function SearchMap({ listings, userLocation, center }: SearchMapProps) {
  const hasUserLocation = Boolean(userLocation && typeof userLocation.lat === 'number' && typeof userLocation.lng === 'number');

  return (
    <div className="h-96 w-full">
      <MapContainer center={center} zoom={13} scrollWheelZoom={false} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {hasUserLocation && (
          <Marker position={[(userLocation as { lat: number; lng: number }).lat, (userLocation as { lat: number; lng: number }).lng]}>
            <Popup>Lokasi Anda</Popup>
          </Marker>
        )}
        {listings.map((listing) => (
          <Marker key={listing.id} position={[listing.latitude, listing.longitude]}>
            <Popup>
              <div className="max-w-xs">
                <p className="font-semibold">{listing.title}</p>
                <p className="text-sm text-slate-600">{listing.location}</p>
                {listing.distanceKm !== undefined && (
                  <p className="text-xs text-slate-500">{listing.distanceKm} km dari Anda</p>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
