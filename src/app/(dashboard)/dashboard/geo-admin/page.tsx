"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  MapPin, 
  Plus, 
  Pencil, 
  Building2,
  Map,
  Layers,
  Home,
  RefreshCw,
  Search,
  ChevronDown,
  ToggleLeft,
  ToggleRight,
  AlertTriangle,
} from "lucide-react";
import { 
  Button, 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  Modal, 
  Input,
  Badge,
  DataTable,
} from "@/components/ui";
import { ColumnDef } from "@tanstack/react-table";

interface Division {
  id: string;
  geoId: string;
  name: string;
  bnName: string | null;
  isActive: boolean;
  _count?: { districts: number };
}

interface District {
  id: string;
  geoId: string;
  divisionId: string;
  name: string;
  bnName: string | null;
  isActive: boolean;
  division?: { id: string; name: string };
  _count?: { upazilas: number };
}

interface Upazila {
  id: string;
  geoId: string;
  districtId: string;
  name: string;
  bnName: string | null;
  isActive: boolean;
  district?: { id: string; name: string; division?: { id: string; name: string } };
  _count?: { unions: number };
}

interface Union {
  id: string;
  geoId: string;
  upazilaId: string;
  name: string;
  bnName: string | null;
  isActive: boolean;
  upazila?: { id: string; name: string; district?: { id: string; name: string; division?: { id: string; name: string } } };
}

type GeoLevel = "division" | "district" | "upazila" | "union";

interface FormData {
  name: string;
  bnName: string;
  geoId: string;
}

export default function GeoAdminPage() {
  const [activeTab, setActiveTab] = useState<GeoLevel>("division");
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [upazilas, setUpazilas] = useState<Upazila[]>([]);
  const [unions, setUnions] = useState<Union[]>([]);
  const [allDivisions, setAllDivisions] = useState<Division[]>([]);
  const [allDistricts, setAllDistricts] = useState<District[]>([]);
  const [allUpazilas, setAllUpazilas] = useState<Upazila[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Division | District | Upazila | Union | null>(null);
  const [formData, setFormData] = useState<FormData>({ name: "", bnName: "", geoId: "" });
  const [formError, setFormError] = useState("");
  
  // Cascading dropdown states
  const [selectedDivisionId, setSelectedDivisionId] = useState("");
  const [selectedDistrictId, setSelectedDistrictId] = useState("");
  const [selectedUpazilaId, setSelectedUpazilaId] = useState("");
  const [filteredDistricts, setFilteredDistricts] = useState<District[]>([]);
  const [filteredUpazilas, setFilteredUpazilas] = useState<Upazila[]>([]);
  
  // Dropdown open states
  const [isDivisionDropdownOpen, setIsDivisionDropdownOpen] = useState(false);
  const [isDistrictDropdownOpen, setIsDistrictDropdownOpen] = useState(false);
  const [isUpazilaDropdownOpen, setIsUpazilaDropdownOpen] = useState(false);
  const [divisionSearch, setDivisionSearch] = useState("");
  const [districtSearch, setDistrictSearch] = useState("");
  const [upazilaSearch, setUpazilaSearch] = useState("");
  
  const divisionDropdownRef = useRef<HTMLDivElement>(null);
  const districtDropdownRef = useRef<HTMLDivElement>(null);
  const upazilaDropdownRef = useRef<HTMLDivElement>(null);

  // Stats
  const [stats, setStats] = useState({ divisions: 0, districts: 0, upazilas: 0, unions: 0 });

  const fetchStats = useCallback(async () => {
    try {
      const [divRes, distRes, upzRes, uniRes] = await Promise.all([
        fetch("/api/geo/divisions"),
        fetch("/api/geo/districts"),
        fetch("/api/geo/upazilas"),
        fetch("/api/geo/unions"),
      ]);
      const [divData, distData, upzData, uniData] = await Promise.all([
        divRes.json(),
        distRes.json(),
        upzRes.json(),
        uniRes.json(),
      ]);
      setStats({
        divisions: divData.length || 0,
        districts: distData.length || 0,
        upazilas: upzData.length || 0,
        unions: uniData.length || 0,
      });
      setAllDivisions(divData);
      setAllDistricts(distData);
      setAllUpazilas(upzData);
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  }, []);

  const fetchDivisions = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/geo/divisions");
      const data = await res.json();
      setDivisions(data);
    } catch (error) {
      console.error("Error fetching divisions:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchDistricts = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/geo/districts");
      const data = await res.json();
      setDistricts(data);
    } catch (error) {
      console.error("Error fetching districts:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchUpazilas = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/geo/upazilas");
      const data = await res.json();
      setUpazilas(data);
    } catch (error) {
      console.error("Error fetching upazilas:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchUnions = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/geo/unions");
      const data = await res.json();
      setUnions(data);
    } catch (error) {
      console.error("Error fetching unions:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    if (activeTab === "division") fetchDivisions();
    else if (activeTab === "district") fetchDistricts();
    else if (activeTab === "upazila") fetchUpazilas();
    else if (activeTab === "union") fetchUnions();
  }, [activeTab, fetchDivisions, fetchDistricts, fetchUpazilas, fetchUnions]);

  // Filter districts when division changes
  useEffect(() => {
    if (selectedDivisionId) {
      setFilteredDistricts(allDistricts.filter(d => d.divisionId === selectedDivisionId));
      setSelectedDistrictId("");
      setSelectedUpazilaId("");
      setFilteredUpazilas([]);
    } else {
      setFilteredDistricts([]);
    }
  }, [selectedDivisionId, allDistricts]);

  // Filter upazilas when district changes
  useEffect(() => {
    if (selectedDistrictId) {
      setFilteredUpazilas(allUpazilas.filter(u => u.districtId === selectedDistrictId));
      setSelectedUpazilaId("");
    } else {
      setFilteredUpazilas([]);
    }
  }, [selectedDistrictId, allUpazilas]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (divisionDropdownRef.current && !divisionDropdownRef.current.contains(e.target as Node)) {
        setIsDivisionDropdownOpen(false);
      }
      if (districtDropdownRef.current && !districtDropdownRef.current.contains(e.target as Node)) {
        setIsDistrictDropdownOpen(false);
      }
      if (upazilaDropdownRef.current && !upazilaDropdownRef.current.contains(e.target as Node)) {
        setIsUpazilaDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const openAddModal = () => {
    setEditingItem(null);
    setFormData({ name: "", bnName: "", geoId: "" });
    setSelectedDivisionId("");
    setSelectedDistrictId("");
    setSelectedUpazilaId("");
    setFormError("");
    setIsModalOpen(true);
  };

  const openEditModal = (item: Division | District | Upazila | Union) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      bnName: item.bnName || "",
      geoId: item.geoId || "",
    });
    // Set parent selections for cascading
    if (activeTab === "district") {
      const dist = item as District;
      setSelectedDivisionId(dist.divisionId);
    } else if (activeTab === "upazila") {
      const upz = item as Upazila;
      setSelectedDistrictId(upz.districtId);
      setSelectedDivisionId(upz.district?.division?.id || "");
    } else if (activeTab === "union") {
      const uni = item as Union;
      setSelectedUpazilaId(uni.upazilaId);
      setSelectedDistrictId(uni.upazila?.district?.id || "");
      setSelectedDivisionId(uni.upazila?.district?.division?.id || "");
    }
    setFormError("");
    setIsModalOpen(true);
  };

  const openStatusModal = (item: Division | District | Upazila | Union) => {
    setEditingItem(item);
    setIsStatusModalOpen(true);
  };

  const handleSave = async () => {
    setFormError("");
    
    if (!formData.name.trim()) {
      setFormError("Name is required");
      return;
    }

    // Validate parent selection for cascading levels
    if (activeTab === "district" && !selectedDivisionId) {
      setFormError("Please select a division");
      return;
    }
    if (activeTab === "upazila" && !selectedDistrictId) {
      setFormError("Please select a district");
      return;
    }
    if (activeTab === "union" && !selectedUpazilaId) {
      setFormError("Please select an upazila");
      return;
    }

    try {
      const endpoint = `/api/geo/${activeTab}s${editingItem ? `/${editingItem.id}` : ""}`;
      const method = editingItem ? "PUT" : "POST";
      
      const body: Record<string, string> = {
        name: formData.name.trim(),
        bnName: formData.bnName.trim(),
        geoId: formData.geoId.trim(),
      };
      
      if (activeTab === "district") {
        body.divisionId = selectedDivisionId;
      } else if (activeTab === "upazila") {
        body.districtId = selectedDistrictId;
      } else if (activeTab === "union") {
        body.upazilaId = selectedUpazilaId;
      }

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setIsModalOpen(false);
        fetchStats();
        if (activeTab === "division") fetchDivisions();
        else if (activeTab === "district") fetchDistricts();
        else if (activeTab === "upazila") fetchUpazilas();
        else if (activeTab === "union") fetchUnions();
      } else {
        const error = await res.json();
        setFormError(error.error || "Failed to save");
      }
    } catch (error) {
      console.error("Error saving:", error);
      setFormError("An error occurred while saving");
    }
  };

  const handleToggleStatus = async () => {
    if (!editingItem) return;
    
    try {
      const res = await fetch(`/api/geo/${activeTab}s/${editingItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !editingItem.isActive }),
      });

      if (res.ok) {
        setIsStatusModalOpen(false);
        setEditingItem(null);
        fetchStats();
        if (activeTab === "division") fetchDivisions();
        else if (activeTab === "district") fetchDistricts();
        else if (activeTab === "upazila") fetchUpazilas();
        else if (activeTab === "union") fetchUnions();
      } else {
        const error = await res.json();
        alert(error.error || "Failed to update status");
      }
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const tabs = [
    { id: "division" as GeoLevel, label: "Divisions", icon: Map, count: stats.divisions },
    { id: "district" as GeoLevel, label: "Districts", icon: Building2, count: stats.districts },
    { id: "upazila" as GeoLevel, label: "Upazilas", icon: Layers, count: stats.upazilas },
    { id: "union" as GeoLevel, label: "Unions", icon: Home, count: stats.unions },
  ];

  // Division columns
  const divisionColumns: ColumnDef<Division>[] = [
    {
      accessorKey: "name",
      header: "Division Name",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
            <Map className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-medium text-gray-900">{row.original.name}</p>
            {row.original.bnName && (
              <p className="text-xs text-gray-500">{row.original.bnName}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "geoId",
      header: "Geo ID",
      cell: ({ row }) => <Badge variant="default">{row.original.geoId || "-"}</Badge>,
    },
    {
      accessorKey: "_count.districts",
      header: "Districts",
      cell: ({ row }) => <Badge variant="info">{row.original._count?.districts || 0}</Badge>,
    },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={row.original.isActive ? "success" : "warning"}>
          {row.original.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => openEditModal(row.original)}>
            <Pencil className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => openStatusModal(row.original)}>
            {row.original.isActive ? <ToggleRight className="w-4 h-4 text-green-600" /> : <ToggleLeft className="w-4 h-4 text-gray-400" />}
          </Button>
        </div>
      ),
    },
  ];

  // District columns
  const districtColumns: ColumnDef<District>[] = [
    {
      accessorKey: "name",
      header: "District Name",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-medium text-gray-900">{row.original.name}</p>
            {row.original.bnName && <p className="text-xs text-gray-500">{row.original.bnName}</p>}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "division.name",
      header: "Division",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Map className="w-4 h-4 text-blue-500" />
          <span>{row.original.division?.name || "-"}</span>
        </div>
      ),
    },
    {
      accessorKey: "_count.upazilas",
      header: "Upazilas",
      cell: ({ row }) => <Badge variant="info">{row.original._count?.upazilas || 0}</Badge>,
    },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={row.original.isActive ? "success" : "warning"}>
          {row.original.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => openEditModal(row.original)}>
            <Pencil className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => openStatusModal(row.original)}>
            {row.original.isActive ? <ToggleRight className="w-4 h-4 text-green-600" /> : <ToggleLeft className="w-4 h-4 text-gray-400" />}
          </Button>
        </div>
      ),
    },
  ];

  // Upazila columns
  const upazilaColumns: ColumnDef<Upazila>[] = [
    {
      accessorKey: "name",
      header: "Upazila Name",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
            <Layers className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-medium text-gray-900">{row.original.name}</p>
            {row.original.bnName && <p className="text-xs text-gray-500">{row.original.bnName}</p>}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "district.name",
      header: "District",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-green-500" />
          <span>{row.original.district?.name || "-"}</span>
        </div>
      ),
    },
    {
      accessorKey: "district.division.name",
      header: "Division",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Map className="w-4 h-4 text-blue-500" />
          <span>{row.original.district?.division?.name || "-"}</span>
        </div>
      ),
    },
    {
      accessorKey: "_count.unions",
      header: "Unions",
      cell: ({ row }) => <Badge variant="info">{row.original._count?.unions || 0}</Badge>,
    },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={row.original.isActive ? "success" : "warning"}>
          {row.original.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => openEditModal(row.original)}>
            <Pencil className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => openStatusModal(row.original)}>
            {row.original.isActive ? <ToggleRight className="w-4 h-4 text-green-600" /> : <ToggleLeft className="w-4 h-4 text-gray-400" />}
          </Button>
        </div>
      ),
    },
  ];

  // Union columns
  const unionColumns: ColumnDef<Union>[] = [
    {
      accessorKey: "name",
      header: "Union Name",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
            <Home className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-medium text-gray-900">{row.original.name}</p>
            {row.original.bnName && <p className="text-xs text-gray-500">{row.original.bnName}</p>}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "upazila.name",
      header: "Upazila",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-purple-500" />
          <span>{row.original.upazila?.name || "-"}</span>
        </div>
      ),
    },
    {
      accessorKey: "upazila.district.name",
      header: "District",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-green-500" />
          <span>{row.original.upazila?.district?.name || "-"}</span>
        </div>
      ),
    },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={row.original.isActive ? "success" : "warning"}>
          {row.original.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => openEditModal(row.original)}>
            <Pencil className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => openStatusModal(row.original)}>
            {row.original.isActive ? <ToggleRight className="w-4 h-4 text-green-600" /> : <ToggleLeft className="w-4 h-4 text-gray-400" />}
          </Button>
        </div>
      ),
    },
  ];

  const getModalTitle = () => {
    const action = editingItem ? "Edit" : "Add";
    switch (activeTab) {
      case "division": return `${action} Division`;
      case "district": return `${action} District`;
      case "upazila": return `${action} Upazila`;
      case "union": return `${action} Union`;
    }
  };

  const getAddButtonLabel = () => {
    switch (activeTab) {
      case "division": return "Add Division";
      case "district": return "Add District";
      case "upazila": return "Add Upazila";
      case "union": return "Add Union";
    }
  };

  // Render cascading dropdowns based on activeTab
  const renderParentDropdowns = () => {
    if (activeTab === "division") return null;

    const renderDivisionDropdown = () => (
      <div className="space-y-1" ref={divisionDropdownRef}>
        <label className="block text-sm font-medium text-gray-700">
          Division <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsDivisionDropdownOpen(!isDivisionDropdownOpen)}
            className="w-full flex items-center justify-between px-4 py-2 border border-gray-300 rounded-lg bg-white text-left"
          >
            <span className={selectedDivisionId ? "text-gray-900" : "text-gray-400"}>
              {selectedDivisionId ? allDivisions.find(d => d.id === selectedDivisionId)?.name : "Select Division"}
            </span>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </button>
          {isDivisionDropdownOpen && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-hidden">
              <div className="p-2 border-b">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search divisions..."
                    value={divisionSearch}
                    onChange={(e) => setDivisionSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                </div>
              </div>
              <div className="max-h-48 overflow-y-auto">
                {allDivisions
                  .filter(d => d.name.toLowerCase().includes(divisionSearch.toLowerCase()))
                  .map((div) => (
                    <button
                      key={div.id}
                      type="button"
                      onClick={() => {
                        setSelectedDivisionId(div.id);
                        setIsDivisionDropdownOpen(false);
                        setDivisionSearch("");
                      }}
                      className={`w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 ${
                        selectedDivisionId === div.id ? "bg-blue-50 text-blue-600" : ""
                      }`}
                    >
                      <Map className="w-4 h-4" />
                      {div.name}
                    </button>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );

    const renderDistrictDropdown = () => (
      <div className="space-y-1" ref={districtDropdownRef}>
        <label className="block text-sm font-medium text-gray-700">
          District <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <button
            type="button"
            onClick={() => selectedDivisionId && setIsDistrictDropdownOpen(!isDistrictDropdownOpen)}
            disabled={!selectedDivisionId}
            className={`w-full flex items-center justify-between px-4 py-2 border border-gray-300 rounded-lg bg-white text-left ${
              !selectedDivisionId ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            <span className={selectedDistrictId ? "text-gray-900" : "text-gray-400"}>
              {selectedDistrictId ? filteredDistricts.find(d => d.id === selectedDistrictId)?.name : "Select District"}
            </span>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </button>
          {isDistrictDropdownOpen && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-hidden">
              <div className="p-2 border-b">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search districts..."
                    value={districtSearch}
                    onChange={(e) => setDistrictSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                </div>
              </div>
              <div className="max-h-48 overflow-y-auto">
                {filteredDistricts
                  .filter(d => d.name.toLowerCase().includes(districtSearch.toLowerCase()))
                  .map((dist) => (
                    <button
                      key={dist.id}
                      type="button"
                      onClick={() => {
                        setSelectedDistrictId(dist.id);
                        setIsDistrictDropdownOpen(false);
                        setDistrictSearch("");
                      }}
                      className={`w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 ${
                        selectedDistrictId === dist.id ? "bg-blue-50 text-blue-600" : ""
                      }`}
                    >
                      <Building2 className="w-4 h-4" />
                      {dist.name}
                    </button>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );

    const renderUpazilaDropdown = () => (
      <div className="space-y-1" ref={upazilaDropdownRef}>
        <label className="block text-sm font-medium text-gray-700">
          Upazila <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <button
            type="button"
            onClick={() => selectedDistrictId && setIsUpazilaDropdownOpen(!isUpazilaDropdownOpen)}
            disabled={!selectedDistrictId}
            className={`w-full flex items-center justify-between px-4 py-2 border border-gray-300 rounded-lg bg-white text-left ${
              !selectedDistrictId ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            <span className={selectedUpazilaId ? "text-gray-900" : "text-gray-400"}>
              {selectedUpazilaId ? filteredUpazilas.find(u => u.id === selectedUpazilaId)?.name : "Select Upazila"}
            </span>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </button>
          {isUpazilaDropdownOpen && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-hidden">
              <div className="p-2 border-b">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search upazilas..."
                    value={upazilaSearch}
                    onChange={(e) => setUpazilaSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                </div>
              </div>
              <div className="max-h-48 overflow-y-auto">
                {filteredUpazilas
                  .filter(u => u.name.toLowerCase().includes(upazilaSearch.toLowerCase()))
                  .map((upz) => (
                    <button
                      key={upz.id}
                      type="button"
                      onClick={() => {
                        setSelectedUpazilaId(upz.id);
                        setIsUpazilaDropdownOpen(false);
                        setUpazilaSearch("");
                      }}
                      className={`w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 ${
                        selectedUpazilaId === upz.id ? "bg-blue-50 text-blue-600" : ""
                      }`}
                    >
                      <Layers className="w-4 h-4" />
                      {upz.name}
                    </button>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );

    if (activeTab === "district") {
      return renderDivisionDropdown();
    }
    if (activeTab === "upazila") {
      return (
        <>
          {renderDivisionDropdown()}
          {renderDistrictDropdown()}
        </>
      );
    }
    if (activeTab === "union") {
      return (
        <>
          {renderDivisionDropdown()}
          {renderDistrictDropdown()}
          {renderUpazilaDropdown()}
        </>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Geo Location Management</h1>
          <p className="text-gray-500 mt-1">Manage Bangladesh geographic data hierarchy</p>
        </div>
        <Button variant="outline" onClick={fetchStats}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {tabs.map((tab) => (
          <Card 
            key={tab.id} 
            className={`cursor-pointer transition-all ${activeTab === tab.id ? 'ring-2 ring-blue-500' : 'hover:shadow-md'}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg ${
                  tab.id === "division" ? "bg-blue-100" :
                  tab.id === "district" ? "bg-green-100" :
                  tab.id === "upazila" ? "bg-purple-100" : "bg-orange-100"
                }`}>
                  <tab.icon className={`w-6 h-6 ${
                    tab.id === "division" ? "text-blue-600" :
                    tab.id === "district" ? "text-green-600" :
                    tab.id === "upazila" ? "text-purple-600" : "text-orange-600"
                  }`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{tab.count}</p>
                  <p className="text-sm text-gray-500">{tab.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            {tabs.find(t => t.id === activeTab)?.label} List
          </CardTitle>
          <Button onClick={openAddModal}>
            <Plus className="w-4 h-4 mr-2" />
            {getAddButtonLabel()}
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                {activeTab === "division" && <DataTable columns={divisionColumns} data={divisions} searchKey="name" />}
                {activeTab === "district" && <DataTable columns={districtColumns} data={districts} searchKey="name" />}
                {activeTab === "upazila" && <DataTable columns={upazilaColumns} data={upazilas} searchKey="name" />}
                {activeTab === "union" && <DataTable columns={unionColumns} data={unions} searchKey="name" />}
              </motion.div>
            </AnimatePresence>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={getModalTitle()} size="md">
        <div className="space-y-4">
          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {formError}
            </div>
          )}
          {renderParentDropdowns()}
          <Input
            label="Name (English)"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder={`Enter ${activeTab} name`}
            required
          />
          <Input
            label="Name (Bengali)"
            value={formData.bnName}
            onChange={(e) => setFormData({ ...formData, bnName: e.target.value })}
            placeholder="Enter Bengali name (optional)"
          />
          <Input
            label="Geo ID"
            value={formData.geoId}
            onChange={(e) => setFormData({ ...formData, geoId: e.target.value })}
            placeholder="Enter geo ID (optional)"
          />
          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={() => setIsModalOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSave} className="flex-1">
              {editingItem ? "Update" : "Create"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Status Toggle Confirmation Modal */}
      <Modal
        isOpen={isStatusModalOpen}
        onClose={() => { setIsStatusModalOpen(false); setEditingItem(null); }}
        title={editingItem?.isActive ? "Deactivate Location" : "Activate Location"}
        size="sm"
      >
        <div className="text-center">
          <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-4 ${
            editingItem?.isActive ? "bg-yellow-100" : "bg-green-100"
          }`}>
            <AlertTriangle className={`w-6 h-6 ${editingItem?.isActive ? "text-yellow-600" : "text-green-600"}`} />
          </div>
          <p className="text-gray-600 mb-2">
            Are you sure you want to {editingItem?.isActive ? "deactivate" : "activate"} <strong>{editingItem?.name}</strong>?
          </p>
          {editingItem?.isActive && (
            <p className="text-sm text-yellow-600 mb-4">
              Deactivated locations will not appear in dropdowns and API responses.
            </p>
          )}
          <div className="flex gap-3 mt-6">
            <Button variant="outline" onClick={() => { setIsStatusModalOpen(false); setEditingItem(null); }} className="flex-1">
              Cancel
            </Button>
            <Button variant={editingItem?.isActive ? "destructive" : "default"} onClick={handleToggleStatus} className="flex-1">
              {editingItem?.isActive ? "Deactivate" : "Activate"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
