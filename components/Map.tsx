
import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Location } from '../types';
import { useMapLayers } from '../hooks/useMapLayers';

interface MapProps {
  onLocationSelect?: (loc: Location) => void;
  onViewChange?: (view: { center: Location, zoom: number }) => void;
  markers?: { position: Location; label?: string; icon?: 'default' | 'target' | 'user'; color?: string }[];
  center?: Location;
  zoom?: number;
  lines?: { from: Location; to: Location; color?: string }[];
  roundIndex?: number;
}

const isValid = (loc?: Location): boolean => {
  return !!loc && typeof loc.lat === 'number' && typeof loc.lng === 'number' && !isNaN(loc.lat) && !isNaN(loc.lng);
};

const Map: React.FC<MapProps> = ({ 
  onLocationSelect, 
  onViewChange,
  markers = [], 
  center, 
  zoom = 13, 
  lines = [],
  roundIndex = 0
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<L.Map | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current || map) return;

    const startPos: [number, number] = isValid(center) ? [center!.lat, center!.lng] : [59.3293, 18.0686];

    const instance = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: true,
      fadeAnimation: false,
      markerZoomAnimation: true,
      tap: false,
      trackResize: true
    }).setView(startPos, zoom);

    L.control.zoom({ position: 'bottomright' }).addTo(instance);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(instance);

    instance.on('click', (e) => {
      // Force refresh on every click as a safety measure for mobile browsers
      instance.invalidateSize();
      if (onLocationSelect) {
        onLocationSelect({ lat: e.latlng.lat, lng: e.latlng.lng });
      }
    });

    instance.on('moveend', () => {
      if (onViewChange) {
        const c = instance.getCenter();
        onViewChange({ center: { lat: c.lat, lng: c.lng }, zoom: instance.getZoom() });
      }
    });

    // Use ResizeObserver to ensure map is valid whenever container changes size
    // This is the most reliable way to fix "first marker offset" in flexible layouts
    const resizeObserver = new ResizeObserver(() => {
      instance.invalidateSize();
    });
    resizeObserver.observe(mapContainerRef.current);

    setMap(instance);

    // Explicitly pulse invalidateSize to handle any entering transitions
    const pulses = [50, 250, 500, 1000];
    pulses.forEach(delay => {
      setTimeout(() => instance.invalidateSize(), delay);
    });

    return () => {
      resizeObserver.disconnect();
      instance.off();
      instance.remove();
      setMap(null);
    };
  }, []);

  useEffect(() => {
    if (map && isValid(center)) {
      map.setView([center!.lat, center!.lng], zoom);
      setTimeout(() => map.invalidateSize(), 50);
    }
  }, [map, center, zoom, roundIndex]);

  useMapLayers(map, markers, lines, onLocationSelect);

  return (
    <div className="w-full h-full relative group bg-white">
      <div ref={mapContainerRef} className="w-full h-full" />
      <style>{`
        .nordic-tooltip {
          background: #ffffff;
          border: 1px solid rgba(45, 66, 57, 0.1);
          border-radius: 12px;
          padding: 6px 12px;
          font-family: 'Space Grotesk', sans-serif;
          font-weight: 700;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          box-shadow: 0 10px 20px -5px rgba(15, 26, 22, 0.1);
          color: #0f1a16;
        }
        .nordic-tooltip:before {
          border-top-color: #ffffff;
        }
        .leaflet-bottom.leaflet-right {
          bottom: 24px !important;
          right: 24px !important;
          z-index: 1000 !important;
        }
        .leaflet-bar {
          border: none !important;
          box-shadow: 0 10px 20px -5px rgba(15, 26, 22, 0.2) !important;
        }
        .leaflet-bar a {
          background-color: #ffffff !important;
          color: #0f1a16 !important;
          border: 1px solid rgba(15, 26, 22, 0.05) !important;
          border-radius: 12px !important;
          margin-bottom: 8px !important;
          width: 44px !important;
          height: 44px !important;
          line-height: 44px !important;
          font-weight: bold !important;
          font-size: 18px !important;
        }
        .leaflet-bar a:hover {
          background-color: #f9fbfa !important;
        }
      `}</style>
    </div>
  );
};

export default Map;
