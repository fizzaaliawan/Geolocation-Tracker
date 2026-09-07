"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";

interface MapProps {
  lat: number;
  lon: number;
  city: string;
  country: string;
  isp: string;
  ip: string;
}

export default function Map({ lat, lon, city, country, isp, ip }: MapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Initialize map if it doesn't exist
    if (!mapRef.current) {
      mapRef.current = L.map(mapContainerRef.current, {
        zoomControl: false,
      }).setView([lat, lon], 12);

      // Add zoom control to top-right or bottom-right
      L.control.zoom({ position: "topright" }).addTo(mapRef.current);

      // Add Tile Layer (OpenStreetMap / Carto)
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(mapRef.current);
    }

    const map = mapRef.current;

    // Update map view with animation
    map.setView([lat, lon], 12, { animate: true });

    // Remove existing marker and circle
    if (markerRef.current) map.removeLayer(markerRef.current);
    if (circleRef.current) map.removeLayer(circleRef.current);

    // Custom Pulse Pin
    const customIcon = L.divIcon({
      html: `
        <div class="relative w-8 h-8 flex items-center justify-center">
          <div class="absolute w-8 h-8 bg-blue-500/25 rounded-full animate-ping"></div>
          <div class="relative w-4 h-4 bg-blue-600 rounded-full border-2 border-white shadow-lg ring-2 ring-blue-500/50"></div>
        </div>
      `,
      className: "custom-map-marker",
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    // Custom Popup Card matching mockup
    const popupContent = `
      <div class="bg-white p-3.5 rounded-xl min-w-[240px] font-sans text-neutral-800 shadow-xl border border-neutral-100">
        <div class="flex items-center gap-2 pb-2 mb-2.5 border-b border-neutral-100">
          <div class="w-5 h-5 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-xs font-bold">🎯</div>
          <h4 class="font-bold text-xs text-neutral-900 tracking-tight">Geocoded Target</h4>
        </div>
        <div class="space-y-1.5 text-xs">
          <div class="flex items-center justify-between gap-3">
            <span class="text-neutral-400 font-medium">IP Address</span>
            <span class="font-semibold text-neutral-800 font-mono text-[11px]">${ip}</span>
          </div>
          <div class="flex items-center justify-between gap-3">
            <span class="text-neutral-400 font-medium">Location</span>
            <span class="font-semibold text-neutral-800">${city || "Unknown"}, ${country || "Unknown"}</span>
          </div>
          <div class="flex items-center justify-between gap-3">
            <span class="text-neutral-400 font-medium">ISP</span>
            <span class="font-semibold text-neutral-800 text-right truncate max-w-[130px]">${isp || "Unknown"}</span>
          </div>
        </div>
      </div>
    `;

    // Create marker
    markerRef.current = L.marker([lat, lon], { icon: customIcon })
      .addTo(map)
      .bindPopup(popupContent, {
        closeButton: true,
        className: "custom-leaflet-popup",
        offset: [0, -10],
      })
      .openPopup();

    // Create uncertainty radius circle (approx 4km for IP geolocations)
    circleRef.current = L.circle([lat, lon], {
      color: "#2563eb",
      fillColor: "#3b82f6",
      fillOpacity: 0.12,
      radius: 4000,
      weight: 1.5,
    }).addTo(map);
  }, [lat, lon, city, country, isp, ip]);

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  return (
    <div className="w-full h-full min-h-[480px] relative rounded-2xl overflow-hidden border border-neutral-200/80 dark:border-neutral-800 shadow-sm bg-neutral-100 dark:bg-neutral-900">
      <div ref={mapContainerRef} className="w-full h-full min-h-[480px]" id="leaflet-map" />
    </div>
  );
}
