import React, { useEffect, useRef } from "react";

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

// Default center: BGC/Taguig area — central Metro Manila
const METRO_MANILA = { lat: 14.5547, lng: 121.0244 };

const ICON_HTML: Record<
  MapMarker["icon"],
  { html: string; size: [number, number] }
> = {
  customer: {
    html: `<div style="
      background:#2DC653;color:white;
      border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);
      width:32px;height:32px;
      display:flex;align-items:center;justify-content:center;
      border:3px solid white;
      box-shadow:0 3px 10px rgba(0,0,0,0.35);
    "><span style="transform:rotate(45deg);font-size:14px">📍</span></div>`,
    size: [32, 42],
  },
  shop: {
    html: `<div style="
      background:#F4A261;color:white;
      border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);
      width:32px;height:32px;
      display:flex;align-items:center;justify-content:center;
      border:3px solid white;
      box-shadow:0 3px 10px rgba(0,0,0,0.35);
    "><span style="transform:rotate(45deg);font-size:14px">🏪</span></div>`,
    size: [32, 42],
  },
  rider: {
    html: `<div style="
      background:#0F52BA;color:white;
      border-radius:50%;
      width:38px;height:38px;
      display:flex;align-items:center;justify-content:center;
      border:3px solid white;
      box-shadow:0 0 0 4px rgba(15,82,186,0.25);
      font-size:18px;
      animation:riderPulse 1.5s infinite;
    ">🛵</div>`,
    size: [38, 38],
  },
};

export default function LiveMap({
  markers,
  center,
  zoom = 15,
  height = "300px",
  className = "",
}: LiveMapProps) {
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const leafletRef = useRef<any>(null);
  const markerRefs = useRef<any[]>([]);

  // Init map once
  useEffect(() => {
    if (!mapDivRef.current || mapRef.current) return;

    import("leaflet").then((mod) => {
      const L = mod.default ?? mod;
      leafletRef.current = L;

      // Fix default icon path (webpack/vite breaks it)
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const c = center ?? METRO_MANILA;
      const map = L.map(mapDivRef.current!, {
        center: [c.lat, c.lng],
        zoom,
        zoomControl: true,
        scrollWheelZoom: false,
        attributionControl: false,
        tap: false,
      });

      // Free OSM tiles
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "© OpenStreetMap",
      }).addTo(map);

      L.control
        .attribution({ prefix: false, position: "bottomright" })
        .addTo(map);

      // Rider pulse CSS
      if (!document.getElementById("rider-pulse-style")) {
        const style = document.createElement("style");
        style.id = "rider-pulse-style";
        style.textContent = `
          @keyframes riderPulse {
            0%,100% { box-shadow: 0 0 0 4px rgba(15,82,186,0.25); }
            50%      { box-shadow: 0 0 0 8px rgba(15,82,186,0.1);  }
          }
        `;
        document.head.appendChild(style);
      }

      mapRef.current = map;
      renderMarkers(L, map, markers, center);
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update markers when positions change
  useEffect(() => {
    if (!mapRef.current || !leafletRef.current) return;
    const L = leafletRef.current;
    const map = mapRef.current;
    markerRefs.current.forEach((m) => m.remove());
    markerRefs.current = [];
    renderMarkers(L, map, markers, center);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markers, center]);

  function renderMarkers(
    L: any,
    map: any,
    ms: MapMarker[],
    c?: { lat: number; lng: number },
  ) {
    const valid = ms.filter(
      (m) => m.lat !== 0 && m.lng !== 0 && !isNaN(m.lat) && !isNaN(m.lng),
    );
    if (valid.length === 0) return;

    valid.forEach((m) => {
      const cfg = ICON_HTML[m.icon];
      const icon = L.divIcon({
        html: cfg.html,
        className: "",
        iconSize: cfg.size,
        iconAnchor: [cfg.size[0] / 2, cfg.size[1]],
        popupAnchor: [0, -cfg.size[1]],
      });
      const marker = L.marker([m.lat, m.lng], { icon, title: m.label }).addTo(
        map,
      );
      if (m.popup) {
        marker.bindPopup(
          `
          <div style="font-family:Inter,sans-serif;font-size:13px;font-weight:600;padding:2px 4px;white-space:nowrap">
            ${m.popup}
          </div>
        `,
          { closeButton: false },
        );
      }
      markerRefs.current.push(marker);
    });

    // Pan/zoom to fit all markers
    if (valid.length === 1) {
      map.setView([valid[0].lat, valid[0].lng], zoom, { animate: true });
    } else {
      const bounds = L.latLngBounds(valid.map((m) => [m.lat, m.lng]));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16, animate: true });
    }

    // Override with explicit center if provided
    if (c && c.lat !== 0) {
      map.setView([c.lat, c.lng], zoom, { animate: true });
    }
  }

  return (
    <div
      ref={mapDivRef}
      style={{ height, minHeight: "200px" }}
      className={`rounded-xl overflow-hidden border border-gray-200 w-full ${className}`}
    />
  );
}
