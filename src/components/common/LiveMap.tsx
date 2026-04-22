import React, { useEffect, useRef } from "react";

// We import Leaflet dynamically to avoid SSR issues
// and because it needs the DOM to be ready

export interface MapMarker {
  lat: number;
  lng: number;
  label: string;
  icon: "rider" | "customer" | "shop";
  popup?: string;
}

interface LiveMapProps {
  markers: MapMarker[];
  center?: { lat: number; lng: number };
  zoom?: number;
  height?: string;
  className?: string;
}

const ICON_HTML: Record<MapMarker["icon"], string> = {
  rider: `<div style="background:#0F52BA;color:white;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-size:18px;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3)">🛵</div>`,
  customer: `<div style="background:#2DC653;color:white;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-size:18px;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3)">📍</div>`,
  shop: `<div style="background:#F4A261;color:white;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-size:18px;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3)">🏪</div>`,
};

export default function LiveMap({
  markers,
  center,
  zoom = 14,
  height = "300px",
  className = "",
}: LiveMapProps) {
  const mapRef = useRef<any>(null);
  const mapDivRef = useRef<HTMLDivElement>(null);
  const leafletRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  // Initialize map once
  useEffect(() => {
    if (!mapDivRef.current || mapRef.current) return;

    import("leaflet").then((L) => {
      leafletRef.current = L.default ?? L;
      const Lf = leafletRef.current;

      const defaultCenter = center ?? { lat: 14.5086, lng: 121.0194 };

      const map = Lf.map(mapDivRef.current!, {
        center: [defaultCenter.lat, defaultCenter.lng],
        zoom,
        zoomControl: true,
        scrollWheelZoom: false,
        attributionControl: false,
      });

      // OpenStreetMap tiles — completely free, no API key
      Lf.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map);

      // Small attribution in corner
      Lf.control
        .attribution({ position: "bottomright", prefix: "© OSM" })
        .addTo(map);

      mapRef.current = map;

      // Add initial markers
      addMarkers(markers, Lf, map);
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update markers when positions change (rider moves)
  useEffect(() => {
    if (!mapRef.current || !leafletRef.current) return;
    const Lf = leafletRef.current;
    const map = mapRef.current;

    // Clear old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    addMarkers(markers, Lf, map);

    // Re-center on the rider marker if present
    const riderMarker = markers.find((m) => m.icon === "rider");
    if (riderMarker) {
      map.setView([riderMarker.lat, riderMarker.lng], map.getZoom(), {
        animate: true,
      });
    } else if (markers.length > 0) {
      // Fit all markers
      const bounds = Lf.latLngBounds(markers.map((m) => [m.lat, m.lng]));
      map.fitBounds(bounds, { padding: [30, 30] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markers]);

  function addMarkers(ms: MapMarker[], Lf: any, map: any) {
    ms.forEach((m) => {
      const icon = Lf.divIcon({
        html: ICON_HTML[m.icon],
        className: "",
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        popupAnchor: [0, -20],
      });
      const marker = Lf.marker([m.lat, m.lng], { icon }).addTo(map);
      if (m.popup) marker.bindPopup(m.popup);
      markersRef.current.push(marker);
    });
  }

  return (
    <div
      ref={mapDivRef}
      style={{ height }}
      className={`rounded-xl overflow-hidden border border-gray-200 ${className}`}
    />
  );
}
