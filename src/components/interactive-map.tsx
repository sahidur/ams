"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, CircleMarker } from "react-leaflet";
import L from "leaflet";
import { Building2, MapPin, Users } from "lucide-react";
import { Badge } from "@/components/ui";
import "leaflet/dist/leaflet.css";

// Fix for Leaflet marker icons in Next.js
const DefaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

interface BranchLocation {
  id: string;
  branchName: string;
  branchCode: string | null;
  division: string;
  district: string;
  upazila: string;
  union: string | null;
  isActive: boolean;
  cohort: {
    id: string;
    name: string;
    cohortId: string;
    project: {
      id: string;
      name: string;
      modelType: { id: string; name: string } | null;
      trainingType: { id: string; name: string } | null;
    };
  } | null;
  _count: {
    batches: number;
  };
}

interface DistrictData {
  district: string;
  division: string;
  branches: BranchLocation[];
  count: number;
}

interface InteractiveMapProps {
  branchByDistrict: DistrictData[];
  onDistrictClick?: (district: DistrictData) => void;
}

// Bangladesh district coordinates with lat/lng
const DISTRICT_COORDS: Record<string, { lat: number; lng: number }> = {
  // Dhaka Division
  "Dhaka": { lat: 23.8103, lng: 90.4125 },
  "Gazipur": { lat: 24.0022, lng: 90.4264 },
  "Narayanganj": { lat: 23.6238, lng: 90.5000 },
  "Tangail": { lat: 24.2513, lng: 89.9163 },
  "Manikganj": { lat: 23.8617, lng: 90.0003 },
  "Munshiganj": { lat: 23.5422, lng: 90.5305 },
  "Narsingdi": { lat: 23.9322, lng: 90.7151 },
  "Kishoreganj": { lat: 24.4449, lng: 90.7766 },
  "Madaripur": { lat: 23.1641, lng: 90.1896 },
  "Gopalganj": { lat: 23.0488, lng: 89.8266 },
  "Faridpur": { lat: 23.6070, lng: 89.8429 },
  "Rajbari": { lat: 23.7574, lng: 89.6445 },
  "Shariatpur": { lat: 23.2424, lng: 90.4348 },
  
  // Chattogram Division
  "Chattogram": { lat: 22.3569, lng: 91.7832 },
  "Chittagong": { lat: 22.3569, lng: 91.7832 },
  "Cox's Bazar": { lat: 21.4272, lng: 92.0058 },
  "Comilla": { lat: 23.4682, lng: 91.1788 },
  "Cumilla": { lat: 23.4682, lng: 91.1788 },
  "Chandpur": { lat: 23.2513, lng: 90.8518 },
  "Brahmanbaria": { lat: 23.9570, lng: 91.1119 },
  "Noakhali": { lat: 22.8724, lng: 91.0973 },
  "Feni": { lat: 23.0159, lng: 91.3976 },
  "Lakshmipur": { lat: 22.9447, lng: 90.8282 },
  "Khagrachhari": { lat: 23.1193, lng: 91.9847 },
  "Rangamati": { lat: 22.6372, lng: 92.1988 },
  "Bandarban": { lat: 22.1953, lng: 92.2184 },
  
  // Rajshahi Division
  "Rajshahi": { lat: 24.3745, lng: 88.6042 },
  "Chapainawabganj": { lat: 24.5965, lng: 88.2775 },
  "Naogaon": { lat: 24.7936, lng: 88.9318 },
  "Natore": { lat: 24.4206, lng: 89.0076 },
  "Nawabganj": { lat: 24.5965, lng: 88.2775 },
  "Bogra": { lat: 24.8465, lng: 89.3773 },
  "Bogura": { lat: 24.8465, lng: 89.3773 },
  "Joypurhat": { lat: 25.0968, lng: 89.0227 },
  "Pabna": { lat: 24.0064, lng: 89.2372 },
  "Sirajganj": { lat: 24.4533, lng: 89.7000 },
  
  // Khulna Division
  "Khulna": { lat: 22.8456, lng: 89.5403 },
  "Satkhira": { lat: 22.3155, lng: 89.1115 },
  "Jessore": { lat: 23.1663, lng: 89.2081 },
  "Jashore": { lat: 23.1663, lng: 89.2081 },
  "Jhenaidah": { lat: 23.5448, lng: 89.1539 },
  "Magura": { lat: 23.4870, lng: 89.4197 },
  "Narail": { lat: 23.1725, lng: 89.4950 },
  "Kushtia": { lat: 23.9013, lng: 89.1205 },
  "Chuadanga": { lat: 23.6401, lng: 88.8420 },
  "Meherpur": { lat: 23.7622, lng: 88.6318 },
  "Bagerhat": { lat: 22.6602, lng: 89.7895 },
  
  // Barishal Division
  "Barisal": { lat: 22.7010, lng: 90.3535 },
  "Barishal": { lat: 22.7010, lng: 90.3535 },
  "Patuakhali": { lat: 22.3596, lng: 90.3290 },
  "Bhola": { lat: 22.6859, lng: 90.6482 },
  "Pirojpur": { lat: 22.5841, lng: 89.9720 },
  "Jhalokati": { lat: 22.6406, lng: 90.1987 },
  "Jhalokathi": { lat: 22.6406, lng: 90.1987 },
  "Barguna": { lat: 22.1530, lng: 90.1266 },
  
  // Sylhet Division
  "Sylhet": { lat: 24.8949, lng: 91.8687 },
  "Moulvibazar": { lat: 24.4829, lng: 91.7774 },
  "Habiganj": { lat: 24.3750, lng: 91.4155 },
  "Sunamganj": { lat: 25.0658, lng: 91.3950 },
  
  // Rangpur Division
  "Rangpur": { lat: 25.7468, lng: 89.2508 },
  "Dinajpur": { lat: 25.6279, lng: 88.6332 },
  "Thakurgaon": { lat: 26.0336, lng: 88.4616 },
  "Panchagarh": { lat: 26.3411, lng: 88.5541 },
  "Nilphamari": { lat: 25.9318, lng: 88.8560 },
  "Lalmonirhat": { lat: 25.9924, lng: 89.2847 },
  "Kurigram": { lat: 25.8054, lng: 89.6362 },
  "Gaibandha": { lat: 25.3288, lng: 89.5286 },
  
  // Mymensingh Division
  "Mymensingh": { lat: 24.7471, lng: 90.4203 },
  "Jamalpur": { lat: 24.9375, lng: 89.9378 },
  "Sherpur": { lat: 25.0204, lng: 90.0152 },
  "Netrokona": { lat: 24.8803, lng: 90.7278 },
};

// Division colors
const DIVISION_COLORS: Record<string, string> = {
  "Dhaka": "#3B82F6",
  "Chattogram": "#10B981",
  "Rajshahi": "#F59E0B",
  "Khulna": "#8B5CF6",
  "Barishal": "#EC4899",
  "Sylhet": "#14B8A6",
  "Rangpur": "#F97316",
  "Mymensingh": "#6366F1",
};

// Component to fit bounds to all markers
function FitBoundsToMarkers({ districts }: { districts: DistrictData[] }) {
  const map = useMap();
  
  useEffect(() => {
    if (districts.length > 0) {
      const bounds: [number, number][] = [];
      districts.forEach((d) => {
        const coords = DISTRICT_COORDS[d.district];
        if (coords) {
          bounds.push([coords.lat, coords.lng]);
        }
      });
      
      if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, [districts, map]);
  
  return null;
}

export default function InteractiveMap({ branchByDistrict, onDistrictClick }: InteractiveMapProps) {
  const [selectedDistrict, setSelectedDistrict] = useState<DistrictData | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  
  // Handle SSR - only render map on client
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Calculate max count for marker sizing
  const maxCount = Math.max(...branchByDistrict.map(d => d.count), 1);

  // Get marker radius based on branch count
  const getMarkerRadius = (count: number) => {
    const minRadius = 8;
    const maxRadius = 25;
    return minRadius + ((count / maxCount) * (maxRadius - minRadius));
  };

  const handleDistrictClick = (district: DistrictData) => {
    setSelectedDistrict(district);
    onDistrictClick?.(district);
  };

  if (!isMounted) {
    return (
      <div className="relative w-full h-[500px] bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl overflow-hidden border border-gray-200 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="relative w-full h-[500px] rounded-xl overflow-hidden border border-gray-200">
      {/* Stats Badge */}
      <div className="absolute top-4 left-4 z-[1000] bg-white/95 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg">
        <div className="flex items-center gap-4">
          <div>
            <p className="text-xs text-gray-500">Districts</p>
            <p className="text-lg font-bold text-gray-900">{branchByDistrict.length}</p>
          </div>
          <div className="w-px h-8 bg-gray-200" />
          <div>
            <p className="text-xs text-gray-500">Branches</p>
            <p className="text-lg font-bold text-gray-900">{branchByDistrict.reduce((sum, d) => sum + d.count, 0)}</p>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-[1000] bg-white/95 backdrop-blur-sm rounded-lg p-3 shadow-lg">
        <p className="text-xs font-semibold mb-2 text-gray-700">Divisions</p>
        <div className="grid grid-cols-2 gap-1">
          {Object.entries(DIVISION_COLORS).map(([div, color]) => (
            <div key={div} className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-xs text-gray-600">{div}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Selected District Info */}
      {selectedDistrict && (
        <div className="absolute top-4 right-4 z-[1000] bg-white/95 backdrop-blur-sm rounded-lg p-4 shadow-lg max-w-xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">{selectedDistrict.district}</h3>
            <button 
              onClick={() => setSelectedDistrict(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>
          <Badge 
            style={{ backgroundColor: DIVISION_COLORS[selectedDistrict.division] }}
            className="text-white mb-2"
          >
            {selectedDistrict.division}
          </Badge>
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
            <Building2 className="w-4 h-4" />
            <span>{selectedDistrict.count} Branches</span>
          </div>
          <div className="max-h-32 overflow-y-auto">
            {selectedDistrict.branches.slice(0, 5).map((branch) => (
              <div key={branch.id} className="text-xs text-gray-500 py-1 border-t">
                <span className="font-medium">{branch.branchName}</span>
                <span className="text-gray-400 ml-1">({branch.upazila})</span>
              </div>
            ))}
            {selectedDistrict.branches.length > 5 && (
              <div className="text-xs text-blue-500 pt-1">
                +{selectedDistrict.branches.length - 5} more...
              </div>
            )}
          </div>
        </div>
      )}

      <MapContainer
        center={[23.6850, 90.3563]} // Bangladesh center
        zoom={7}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <FitBoundsToMarkers districts={branchByDistrict} />
        
        {branchByDistrict.map((district) => {
          const coords = DISTRICT_COORDS[district.district];
          if (!coords) return null;
          
          const color = DIVISION_COLORS[district.division] || "#6B7280";
          const radius = getMarkerRadius(district.count);
          
          return (
            <CircleMarker
              key={district.district}
              center={[coords.lat, coords.lng]}
              radius={radius}
              pathOptions={{
                color: color,
                fillColor: color,
                fillOpacity: 0.7,
                weight: 2,
              }}
              eventHandlers={{
                click: () => handleDistrictClick(district),
              }}
            >
              <Popup>
                <div className="min-w-[150px]">
                  <h3 className="font-semibold text-gray-900">{district.district}</h3>
                  <p className="text-xs text-gray-500 mb-2">{district.division} Division</p>
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="w-4 h-4 text-gray-600" />
                    <span className="font-medium">{district.count} Branches</span>
                  </div>
                  {district.branches.length > 0 && (
                    <div className="mt-2 pt-2 border-t text-xs text-gray-500">
                      {district.branches.slice(0, 3).map((b) => (
                        <div key={b.id}>{b.branchName}</div>
                      ))}
                      {district.branches.length > 3 && (
                        <div className="text-blue-500">+{district.branches.length - 3} more</div>
                      )}
                    </div>
                  )}
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
