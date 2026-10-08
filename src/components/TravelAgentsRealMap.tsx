'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Plus, Minus } from 'lucide-react';

export interface MapPinData {
  city: string;
  count: number;
  lat: number;
  lng: number;
}

interface TravelAgentsRealMapProps {
  pins: MapPinData[];
  selectedCity: string | null;
  onSelectCity: (city: string | null) => void;
}

export default function TravelAgentsRealMap({
  pins,
  selectedCity,
  onSelectCity,
}: TravelAgentsRealMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Initialize Leaflet Map
  useEffect(() => {
    let isMounted = true;

    // Load Leaflet CSS if not already injected
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    async function initMap() {
      try {
        if (!mapContainerRef.current) return;

        // Dynamically import leaflet to avoid SSR issues
        const L = (await import('leaflet')).default;

        if (!isMounted || !mapContainerRef.current) return;

        // Clean up previous map instance if any
        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
        }

        // Initialize Real Geographic Map centered on India
        const map = L.map(mapContainerRef.current, {
          center: [22.8, 79.2],
          zoom: 4.3,
          minZoom: 3.5,
          maxZoom: 12,
          zoomControl: false,
          attributionControl: false,
          scrollWheelZoom: true,
        });

        // Standard OpenStreetMap Tile Layer: Completely free, reliable, no API key required, crisp labels
        const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap contributors',
        });

        tileLayer.addTo(map);

        mapInstanceRef.current = map;
        if (isMounted) setIsLoaded(true);
      } catch (err) {
        console.warn('Failed to initialize Leaflet real map:', err);
      }
    }

    initMap();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Markers when pins or selectedCity changes
  useEffect(() => {
    async function updateMarkers() {
      if (!mapInstanceRef.current || !isLoaded) return;

      const L = (await import('leaflet')).default;
      const map = mapInstanceRef.current;

      // Clear existing markers
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      pins.forEach((pin) => {
        if (!pin.lat || !pin.lng) return;

        const isSelected = selectedCity?.toLowerCase() === pin.city.toLowerCase();

        // Sleek, compact pin badge with count (does NOT hide state names)
        const customIcon = L.divIcon({
          className: 'custom-tripdm-map-pin',
          html: `
            <div style="
              cursor: pointer;
              display: flex;
              flex-direction: column;
              align-items: center;
              transform: translate(-50%, -100%);
              z-index: ${isSelected ? 200 : 50};
              transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
            ">
              <div style="
                background: ${isSelected ? '#0f172a' : 'linear-gradient(135deg, #FF5500 0%, #EA580C 100%)'};
                color: #ffffff;
                min-width: 22px;
                height: 22px;
                padding: 0 5px;
                border-radius: 9999px;
                border: 2px solid #ffffff;
                box-shadow: 0 3px 8px rgba(0, 0, 0, ${isSelected ? '0.45' : '0.28'});
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: 800;
                font-size: 10px;
                line-height: 1;
                letter-spacing: -0.02em;
                ${isSelected ? 'outline: 2px solid #FF5500; outline-offset: 1px;' : ''}
              ">
                ${pin.count}
              </div>
              <div style="
                width: 0;
                height: 0;
                border-left: 3.5px solid transparent;
                border-right: 3.5px solid transparent;
                border-top: 4px solid ${isSelected ? '#0f172a' : '#EA580C'};
                margin-top: -0.5px;
              "></div>
            </div>
          `,
          iconSize: [0, 0],
        });

        const marker = L.marker([pin.lat, pin.lng], { icon: customIcon }).addTo(map);

        // Native Leaflet Tooltip on hover with city and agent count
        marker.bindTooltip(
          `<div style="font-family: inherit; font-size: 11px; font-weight: 700; color: #0f172a; display: flex; align-items: center; gap: 4px;">
             <span style="color: #FF5500;">●</span>
             <span>${pin.city}</span>
             <span style="color: #64748b; font-weight: 600; font-size: 10px;">(${pin.count} Agent${pin.count > 1 ? 's' : ''})</span>
           </div>`,
          {
            direction: 'top',
            offset: [0, -24],
            opacity: 0.98,
            className: 'tripdm-clean-tooltip',
          }
        );

        marker.on('click', () => {
          onSelectCity(isSelected ? null : pin.city);
        });

        markersRef.current.push(marker);
      });
    }

    updateMarkers();
  }, [pins, selectedCity, isLoaded, onSelectCity]);

  // Controls Handlers
  const handleZoomIn = () => {
    if (mapInstanceRef.current) mapInstanceRef.current.zoomIn();
  };

  const handleZoomOut = () => {
    if (mapInstanceRef.current) mapInstanceRef.current.zoomOut();
  };

  return (
    <div
      className="relative w-full h-44 sm:h-48 bg-slate-100 overflow-hidden border border-slate-200 shadow-2xs"
      style={{ borderRadius: '6px' }}
    >
      {/* Real Map DOM Mount Node */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Floating Zoom Controls (+ / -) on Top Right */}
      <div
        className="absolute top-2.5 right-2.5 flex flex-col gap-1 bg-white/95 backdrop-blur-xs shadow-md border border-slate-200/90 p-1 z-[1000]"
        style={{ borderRadius: '6px' }}
      >
        <button
          type="button"
          onClick={handleZoomIn}
          className="w-7 h-7 flex items-center justify-center text-slate-700 hover:text-slate-900 hover:bg-slate-100 cursor-pointer transition-colors"
          style={{ borderRadius: '4px' }}
          title="Zoom in"
          aria-label="Zoom in"
        >
          <Plus className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={handleZoomOut}
          className="w-7 h-7 flex items-center justify-center text-slate-700 hover:text-slate-900 hover:bg-slate-100 cursor-pointer transition-colors"
          style={{ borderRadius: '4px' }}
          title="Zoom out"
          aria-label="Zoom out"
        >
          <Minus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
