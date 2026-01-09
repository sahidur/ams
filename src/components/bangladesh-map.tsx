"use client";

import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ZoomIn, ZoomOut, RotateCcw, MapPin, Building2, Layers, X } from "lucide-react";
import { Button, Badge } from "@/components/ui";

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

interface BangladeshMapProps {
  branchByDistrict: DistrictData[];
  onDistrictClick?: (district: DistrictData) => void;
}

// Bangladesh district coordinates (approximate center points)
const DISTRICT_COORDS: Record<string, { x: number; y: number }> = {
  // Dhaka Division
  "Dhaka": { x: 320, y: 380 },
  "Gazipur": { x: 330, y: 350 },
  "Narayanganj": { x: 340, y: 390 },
  "Tangail": { x: 310, y: 310 },
  "Manikganj": { x: 290, y: 360 },
  "Munshiganj": { x: 330, y: 410 },
  "Narsingdi": { x: 360, y: 370 },
  "Kishoreganj": { x: 370, y: 320 },
  "Madaripur": { x: 300, y: 450 },
  "Gopalganj": { x: 280, y: 460 },
  "Faridpur": { x: 280, y: 420 },
  "Rajbari": { x: 260, y: 400 },
  "Shariatpur": { x: 320, y: 440 },
  
  // Chattogram Division
  "Chattogram": { x: 460, y: 450 },
  "Chittagong": { x: 460, y: 450 },
  "Cox's Bazar": { x: 470, y: 540 },
  "Comilla": { x: 400, y: 400 },
  "Cumilla": { x: 400, y: 400 },
  "Chandpur": { x: 380, y: 430 },
  "Brahmanbaria": { x: 390, y: 350 },
  "Noakhali": { x: 420, y: 450 },
  "Feni": { x: 440, y: 430 },
  "Lakshmipur": { x: 400, y: 460 },
  "Khagrachhari": { x: 480, y: 400 },
  "Rangamati": { x: 500, y: 450 },
  "Bandarban": { x: 490, y: 510 },
  
  // Rajshahi Division
  "Rajshahi": { x: 170, y: 280 },
  "Chapainawabganj": { x: 140, y: 260 },
  "Naogaon": { x: 180, y: 250 },
  "Natore": { x: 200, y: 290 },
  "Nawabganj": { x: 140, y: 260 },
  "Bogra": { x: 230, y: 260 },
  "Bogura": { x: 230, y: 260 },
  "Joypurhat": { x: 210, y: 240 },
  "Pabna": { x: 240, y: 310 },
  "Sirajganj": { x: 260, y: 290 },
  
  // Khulna Division
  "Khulna": { x: 230, y: 470 },
  "Satkhira": { x: 200, y: 500 },
  "Jessore": { x: 220, y: 440 },
  "Jashore": { x: 220, y: 440 },
  "Jhenaidah": { x: 240, y: 400 },
  "Magura": { x: 260, y: 430 },
  "Narail": { x: 250, y: 460 },
  "Kushtia": { x: 230, y: 370 },
  "Chuadanga": { x: 210, y: 390 },
  "Meherpur": { x: 200, y: 370 },
  "Bagerhat": { x: 260, y: 500 },
  
  // Barishal Division
  "Barisal": { x: 320, y: 490 },
  "Barishal": { x: 320, y: 490 },
  "Patuakhali": { x: 340, y: 530 },
  "Bhola": { x: 370, y: 510 },
  "Pirojpur": { x: 290, y: 510 },
  "Jhalokati": { x: 300, y: 500 },
  "Jhalokathi": { x: 300, y: 500 },
  "Barguna": { x: 310, y: 540 },
  
  // Sylhet Division
  "Sylhet": { x: 440, y: 280 },
  "Moulvibazar": { x: 450, y: 320 },
  "Habiganj": { x: 420, y: 330 },
  "Sunamganj": { x: 410, y: 270 },
  
  // Rangpur Division
  "Rangpur": { x: 230, y: 180 },
  "Dinajpur": { x: 180, y: 200 },
  "Thakurgaon": { x: 170, y: 170 },
  "Panchagarh": { x: 200, y: 150 },
  "Nilphamari": { x: 220, y: 170 },
  "Lalmonirhat": { x: 250, y: 180 },
  "Kurigram": { x: 270, y: 170 },
  "Gaibandha": { x: 250, y: 210 },
  
  // Mymensingh Division
  "Mymensingh": { x: 340, y: 290 },
  "Jamalpur": { x: 300, y: 260 },
  "Sherpur": { x: 320, y: 250 },
  "Netrokona": { x: 360, y: 270 },
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

export default function BangladeshMap({ branchByDistrict, onDistrictClick }: BangladeshMapProps) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredDistrict, setHoveredDistrict] = useState<DistrictData | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<DistrictData | null>(null);

  // Create a map for quick lookup
  const districtMap = useMemo(() => {
    const map: Record<string, DistrictData> = {};
    branchByDistrict.forEach(d => {
      map[d.district] = d;
      // Handle alternate names
      if (d.district === "Chittagong") map["Chattogram"] = d;
      if (d.district === "Chattogram") map["Chittagong"] = d;
      if (d.district === "Comilla") map["Cumilla"] = d;
      if (d.district === "Cumilla") map["Comilla"] = d;
    });
    return map;
  }, [branchByDistrict]);

  const handleZoomIn = () => setScale(s => Math.min(s + 0.3, 3));
  const handleZoomOut = () => setScale(s => Math.max(s - 0.3, 0.5));
  const handleReset = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setSelectedDistrict(null);
  };

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  }, [position]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  }, [isDragging, dragStart]);

  const handleMouseUp = () => setIsDragging(false);

  const handleDistrictClick = (district: DistrictData) => {
    setSelectedDistrict(district);
    onDistrictClick?.(district);
  };

  // Get max count for scaling marker sizes
  const maxCount = useMemo(() => {
    return Math.max(...branchByDistrict.map(d => d.count), 1);
  }, [branchByDistrict]);

  return (
    <div className="relative w-full h-[500px] bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl overflow-hidden border border-gray-200">
      {/* Controls */}
      <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
        <Button size="sm" variant="outline" onClick={handleZoomIn} className="bg-white">
          <ZoomIn className="w-4 h-4" />
        </Button>
        <Button size="sm" variant="outline" onClick={handleZoomOut} className="bg-white">
          <ZoomOut className="w-4 h-4" />
        </Button>
        <Button size="sm" variant="outline" onClick={handleReset} className="bg-white">
          <RotateCcw className="w-4 h-4" />
        </Button>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-20 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg">
        <p className="text-xs font-semibold mb-2">Divisions</p>
        <div className="grid grid-cols-2 gap-1">
          {Object.entries(DIVISION_COLORS).map(([div, color]) => (
            <div key={div} className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-xs">{div}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Stats Badge */}
      <div className="absolute top-4 left-4 z-20 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg">
        <div className="flex items-center gap-4">
          <div>
            <p className="text-xs text-gray-500">Districts</p>
            <p className="text-lg font-bold">{branchByDistrict.length}</p>
          </div>
          <div className="w-px h-8 bg-gray-200" />
          <div>
            <p className="text-xs text-gray-500">Branches</p>
            <p className="text-lg font-bold">{branchByDistrict.reduce((sum, d) => sum + d.count, 0)}</p>
          </div>
        </div>
      </div>

      {/* Map SVG Container */}
      <div 
        className={`w-full h-full ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <svg
          viewBox="0 0 600 700"
          className="w-full h-full"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transformOrigin: "center center",
            transition: isDragging ? "none" : "transform 0.2s ease-out"
          }}
        >
          {/* Bangladesh Division Boundaries - More detailed SVG paths */}
          <defs>
            <filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="2" dy="2" stdDeviation="2" floodOpacity="0.3"/>
            </filter>
          </defs>
          
          {/* Rangpur Division */}
          <path
            d="M160,130 L200,120 L250,130 L290,140 L290,180 L280,220 L250,250 L200,250 L170,240 L150,200 L150,160 Z"
            fill={DIVISION_COLORS["Rangpur"] + "40"}
            stroke={DIVISION_COLORS["Rangpur"]}
            strokeWidth="2"
            filter="url(#dropShadow)"
          />
          
          {/* Mymensingh Division */}
          <path
            d="M290,180 L350,190 L390,220 L400,270 L370,300 L330,310 L290,290 L280,250 L280,220 Z"
            fill={DIVISION_COLORS["Mymensingh"] + "40"}
            stroke={DIVISION_COLORS["Mymensingh"]}
            strokeWidth="2"
            filter="url(#dropShadow)"
          />
          
          {/* Sylhet Division */}
          <path
            d="M390,220 L430,200 L480,210 L500,250 L490,300 L460,340 L420,350 L400,320 L400,270 Z"
            fill={DIVISION_COLORS["Sylhet"] + "40"}
            stroke={DIVISION_COLORS["Sylhet"]}
            strokeWidth="2"
            filter="url(#dropShadow)"
          />
          
          {/* Rajshahi Division */}
          <path
            d="M120,230 L170,220 L200,250 L250,250 L280,270 L280,340 L250,370 L200,380 L160,360 L120,320 L110,280 Z"
            fill={DIVISION_COLORS["Rajshahi"] + "40"}
            stroke={DIVISION_COLORS["Rajshahi"]}
            strokeWidth="2"
            filter="url(#dropShadow)"
          />
          
          {/* Dhaka Division */}
          <path
            d="M280,290 L330,310 L370,320 L390,360 L400,410 L380,450 L340,460 L300,480 L270,460 L250,420 L260,380 L280,340 Z"
            fill={DIVISION_COLORS["Dhaka"] + "40"}
            stroke={DIVISION_COLORS["Dhaka"]}
            strokeWidth="2"
            filter="url(#dropShadow)"
          />
          
          {/* Khulna Division */}
          <path
            d="M160,360 L200,380 L250,380 L270,420 L270,480 L260,520 L220,550 L180,540 L150,500 L140,450 L140,400 Z"
            fill={DIVISION_COLORS["Khulna"] + "40"}
            stroke={DIVISION_COLORS["Khulna"]}
            strokeWidth="2"
            filter="url(#dropShadow)"
          />
          
          {/* Barishal Division */}
          <path
            d="M270,460 L300,480 L340,470 L380,480 L400,510 L380,560 L340,580 L300,570 L270,540 L260,500 Z"
            fill={DIVISION_COLORS["Barishal"] + "40"}
            stroke={DIVISION_COLORS["Barishal"]}
            strokeWidth="2"
            filter="url(#dropShadow)"
          />
          
          {/* Chattogram Division */}
          <path
            d="M380,360 L400,350 L440,340 L480,350 L510,390 L530,450 L520,520 L490,570 L450,590 L410,570 L380,540 L370,490 L380,450 L390,400 Z"
            fill={DIVISION_COLORS["Chattogram"] + "40"}
            stroke={DIVISION_COLORS["Chattogram"]}
            strokeWidth="2"
            filter="url(#dropShadow)"
          />
          
          {/* District markers */}
          {Object.entries(DISTRICT_COORDS).map(([district, coords]) => {
            const data = districtMap[district];
            if (!data) return null;
            
            const size = 8 + (data.count / maxCount) * 12;
            const color = DIVISION_COLORS[data.division] || "#6B7280";
            
            return (
              <g key={district}>
                {/* Marker circle */}
                <motion.circle
                  cx={coords.x}
                  cy={coords.y}
                  r={size}
                  fill={color}
                  fillOpacity={0.8}
                  stroke="white"
                  strokeWidth="2"
                  className="cursor-pointer"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  whileHover={{ scale: 1.3 }}
                  onMouseEnter={() => setHoveredDistrict(data)}
                  onMouseLeave={() => setHoveredDistrict(null)}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDistrictClick(data);
                  }}
                />
                {/* Count badge */}
                <text
                  x={coords.x}
                  y={coords.y + 4}
                  textAnchor="middle"
                  fill="white"
                  fontSize="10"
                  fontWeight="bold"
                  className="pointer-events-none"
                >
                  {data.count}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Hover Tooltip */}
      <AnimatePresence>
        {hoveredDistrict && !selectedDistrict && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-20 left-1/2 -translate-x-1/2 z-30 bg-white rounded-lg shadow-xl p-4 min-w-[250px]"
          >
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-5 h-5 text-blue-500" />
              <h4 className="font-semibold">{hoveredDistrict.district}</h4>
              <Badge variant="info" className="text-xs">{hoveredDistrict.division}</Badge>
            </div>
            <p className="text-sm text-gray-600">
              {hoveredDistrict.count} branch{hoveredDistrict.count > 1 ? "es" : ""} active
            </p>
            <p className="text-xs text-gray-400 mt-1">Click to view details</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selected District Panel */}
      <AnimatePresence>
        {selectedDistrict && (
          <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            className="absolute right-0 top-0 bottom-0 w-80 bg-white shadow-xl z-30 overflow-y-auto"
          >
            <div className="p-4 border-b sticky top-0 bg-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg">{selectedDistrict.district}</h3>
                  <Badge 
                    variant="info" 
                    className="mt-1"
                    style={{ backgroundColor: DIVISION_COLORS[selectedDistrict.division] + "20", color: DIVISION_COLORS[selectedDistrict.division] }}
                  >
                    {selectedDistrict.division} Division
                  </Badge>
                </div>
                <button onClick={() => setSelectedDistrict(null)} className="p-1 hover:bg-gray-100 rounded">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="p-4 space-y-3">
              <p className="text-sm text-gray-600 font-medium">
                {selectedDistrict.count} Active Branch{selectedDistrict.count > 1 ? "es" : ""}
              </p>
              
              {selectedDistrict.branches.map((branch) => (
                <div key={branch.id} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="flex items-start gap-2">
                    <Building2 className="w-4 h-4 text-blue-500 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-sm">{branch.branchName}</p>
                      {branch.branchCode && (
                        <p className="text-xs text-gray-500">{branch.branchCode}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">{branch.upazila}</p>
                    </div>
                    <Badge variant="default" className="text-xs">
                      {branch._count.batches} batches
                    </Badge>
                  </div>
                  
                  {branch.cohort && (
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <div className="flex items-center gap-1 text-xs text-gray-600">
                        <Layers className="w-3 h-3" />
                        <span>{branch.cohort.project.name}</span>
                        <span className="text-gray-400">→</span>
                        <span>{branch.cohort.name}</span>
                      </div>
                      {(branch.cohort.project.modelType || branch.cohort.project.trainingType) && (
                        <div className="flex gap-1 mt-1">
                          {branch.cohort.project.modelType && (
                            <Badge variant="success" className="text-xs">
                              {branch.cohort.project.modelType.name}
                            </Badge>
                          )}
                          {branch.cohort.project.trainingType && (
                            <Badge variant="warning" className="text-xs">
                              {branch.cohort.project.trainingType.name}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
