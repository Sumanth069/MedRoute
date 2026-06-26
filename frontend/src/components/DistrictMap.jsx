import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';

// Colors for the map styles
const colors = {
  critical: '#ef4444',
  warning: '#f59e0b',
  stable: '#10b981',
  activeRoute: '#3b82f6'
};

const createCustomIcon = (status) => {
  const color = colors[status] || colors.stable;
  return L.divIcon({
    className: `marker-pulse ${status}`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -10],
    html: `<div style="
      background-color: ${color}; 
      width: 14px; 
      height: 14px; 
      border-radius: 50%; 
      border: 2px solid #ffffff; 
      box-shadow: 0 0 10px ${color};
    "></div>`
  });
};

export default function DistrictMap({ clinics, activeManifests, onSelectClinic, selectedClinicId }) {
  console.log("DistrictMap clinics loaded:", clinics);
  // Center coordinates for Ramanagara/Tumkur region
  const center = [12.93, 77.25];
  const zoom = 9.5;

  return (
    <div className="map-wrapper">
      <MapContainer 
        center={center} 
        zoom={zoom} 
        scrollWheelZoom={true}
        style={{ width: '100%', height: '100%' }}
      >
        {/* Premium Light style tile layer from CartoDB */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />

        {/* Render Clinic Markers */}
        {clinics.map((clinic) => {
          const lat = parseFloat(clinic.latitude);
          const lng = parseFloat(clinic.longitude);
          if (isNaN(lat) || isNaN(lng)) return null;

          return (
            <Marker
              key={clinic.id}
              position={[lat, lng]}
              icon={createCustomIcon(clinic.status)}
              eventHandlers={{
                click: () => onSelectClinic(clinic),
              }}
            >
              <Popup>
                <div style={{ color: '#000', fontFamily: 'sans-serif' }}>
                  <h4 style={{ margin: '0 0 4px 0' }}>{clinic.name}</h4>
                  <p style={{ margin: '0 0 6px 0', fontSize: '12px', color: '#666' }}>{clinic.type}</p>
                  <div style={{ fontSize: '11px' }}>
                    <span style={{ color: colors.critical, fontWeight: 'bold' }}>{clinic.critical_count} Critical</span> |{' '}
                    <span style={{ color: colors.warning, fontWeight: 'bold' }}>{clinic.warning_count} Warning</span>
                  </div>
                  <button 
                    onClick={() => onSelectClinic(clinic)}
                    style={{
                      marginTop: '8px',
                      padding: '4px 8px',
                      background: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '11px',
                      width: '100%'
                    }}
                  >
                    Open DHCC Console
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Draw Active Transfer Route Lines */}
        {activeManifests
          .filter(m => m.status === 'in_transit' || m.status === 'pending')
          .map((manifest) => {
            // Find clinic lat/lng
            const srcClinic = clinics.find(c => c.name === manifest.source_clinic_name);
            const destClinic = clinics.find(c => c.name === manifest.dest_clinic_name);

            if (srcClinic && destClinic) {
              const srcLat = parseFloat(srcClinic.latitude);
              const srcLng = parseFloat(srcClinic.longitude);
              const destLat = parseFloat(destClinic.latitude);
              const destLng = parseFloat(destClinic.longitude);

              if (isNaN(srcLat) || isNaN(srcLng) || isNaN(destLat) || isNaN(destLng)) return null;

              const positions = [
                [srcLat, srcLng],
                [destLat, destLng]
              ];

              return (
                <React.Fragment key={manifest.id}>
                  {/* Outer glowing path line */}
                  <Polyline
                    positions={positions}
                    pathOptions={{
                      color: colors.activeRoute,
                      weight: 4,
                      opacity: 0.6,
                      dashArray: '8, 8',
                      lineCap: 'round'
                    }}
                  />
                  {/* Inner animation flow line */}
                  <Polyline
                    positions={positions}
                    pathOptions={{
                      color: '#60a5fa',
                      weight: 2,
                      opacity: 0.9,
                      lineCap: 'round'
                    }}
                  />
                </React.Fragment>
              );
            }
            return null;
          })
        }
      </MapContainer>
    </div>
  );
}
