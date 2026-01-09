"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { 
  MapPin, 
  Plus, 
  Pencil, 
  Trash2, 
  ChevronDown, 
  ChevronRight,
  Building2,
  Map,
  Layers,
  Home,
  RefreshCw,
  Search,
  X
} from "lucide-react";
import { 
  Button, 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  Modal, 
  Input,
  Badge 
} from "@/components/ui";

interface Division {
  id: string;
  geoId: string;
  name: string;
  bnName: string | null;
  isActive: boolean;
  districts?: District[];
}

interface District {
  id: string;
  geoId: string;
  divisionId: string;
  name: string;
  bnName: string | null;
  isActive: boolean;
  division?: { name: string };
  upazilas?: Upazila[];
}

interface Upazila {
  id: string;
  geoId: string;
  districtId: string;
  name: string;
  bnName: string | null;
  isActive: boolean;
  district?: { name: string; division?: { name: string } };
  unions?: Union[];
}

interface Union {
  id: string;
  geoId: string;
  upazilaId: string;
  name: string;
  bnName: string | null;
  isActive: boolean;
  upazila?: { name: string };
}

type GeoLevel = "division" | "district" | "upazila" | "union";

interface FormData {
  name: string;
  bnName: string;
  parentId: string;
}

export default function GeoAdminPage() {
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedDivisions, setExpandedDivisions] = useState<Set<string>>(new Set());
  const [expandedDistricts, setExpandedDistricts] = useState<Set<string>>(new Set());
  const [expandedUpazilas, setExpandedUpazilas] = useState<Set<string>>(new Set());
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [currentLevel, setCurrentLevel] = useState<GeoLevel>("division");
  const [editingItem, setEditingItem] = useState<Division | District | Upazila | Union | null>(null);
  const [selectedParentId, setSelectedParentId] = useState<string>("");
  const [formData, setFormData] = useState<FormData>({ name: "", bnName: "", parentId: "" });
  
  // Search
  const [searchTerm, setSearchTerm] = useState("");

  const fetchGeoData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/geo");
      const data = await res.json();
      setDivisions(data);
    } catch (error) {
      console.error("Error fetching geo data:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGeoData();
  }, [fetchGeoData]);

  const toggleDivision = (id: string) => {
    const newSet = new Set(expandedDivisions);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedDivisions(newSet);
  };

  const toggleDistrict = (id: string) => {
    const newSet = new Set(expandedDistricts);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedDistricts(newSet);
  };

  const toggleUpazila = (id: string) => {
    const newSet = new Set(expandedUpazilas);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedUpazilas(newSet);
  };

  const openAddModal = (level: GeoLevel, parentId?: string) => {
    setCurrentLevel(level);
    setEditingItem(null);
    setSelectedParentId(parentId || "");
    setFormData({ name: "", bnName: "", parentId: parentId || "" });
    setIsModalOpen(true);
  };

  const openEditModal = (level: GeoLevel, item: Division | District | Upazila | Union) => {
    setCurrentLevel(level);
    setEditingItem(item);
    setFormData({
      name: item.name,
      bnName: item.bnName || "",
      parentId: "",
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const endpoint = `/api/geo/${currentLevel}s`;
      const method = editingItem ? "PUT" : "POST";
      const body = editingItem 
        ? { id: editingItem.id, ...formData }
        : { ...formData, parentId: selectedParentId };

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        fetchGeoData();
        setIsModalOpen(false);
      } else {
        const error = await res.json();
        alert(error.error || "Failed to save");
      }
    } catch (error) {
      console.error("Error saving:", error);
    }
  };

  const handleDelete = async () => {
    if (!editingItem) return;
    
    try {
      const res = await fetch(`/api/geo/${currentLevel}s/${editingItem.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        fetchGeoData();
        setIsDeleteModalOpen(false);
        setEditingItem(null);
      } else {
        const error = await res.json();
        alert(error.error || "Failed to delete");
      }
    } catch (error) {
      console.error("Error deleting:", error);
    }
  };

  const handleToggleActive = async (level: GeoLevel, item: Division | District | Upazila | Union) => {
    try {
      const res = await fetch(`/api/geo/${level}s/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !item.isActive }),
      });

      if (res.ok) {
        fetchGeoData();
      }
    } catch (error) {
      console.error("Error toggling status:", error);
    }
  };

  const getLevelIcon = (level: GeoLevel) => {
    switch (level) {
      case "division": return Map;
      case "district": return Building2;
      case "upazila": return Layers;
      case "union": return Home;
    }
  };

  const getLevelTitle = (level: GeoLevel) => {
    switch (level) {
      case "division": return "Division";
      case "district": return "District";
      case "upazila": return "Upazila";
      case "union": return "Union";
    }
  };

  // Filter divisions based on search
  const filteredDivisions = divisions.filter(div => 
    div.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    div.bnName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    div.districts?.some(dist =>
      dist.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dist.bnName?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Geo Admin</h1>
          <p className="text-gray-500 mt-1">Manage Bangladesh geographic data hierarchy</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={fetchGeoData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => openAddModal("division")}>
            <Plus className="w-4 h-4 mr-2" />
            Add Division
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-blue-100">
                <Map className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{divisions.length}</p>
                <p className="text-sm text-gray-500">Divisions</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-green-100">
                <Building2 className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {divisions.reduce((acc, d) => acc + (d.districts?.length || 0), 0)}
                </p>
                <p className="text-sm text-gray-500">Districts</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-purple-100">
                <Layers className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {divisions.reduce((acc, d) => 
                    acc + (d.districts?.reduce((a, dist) => a + (dist.upazilas?.length || 0), 0) || 0), 0
                  )}
                </p>
                <p className="text-sm text-gray-500">Upazilas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-orange-100">
                <Home className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {divisions.reduce((acc, d) => 
                    acc + (d.districts?.reduce((a, dist) => 
                      a + (dist.upazilas?.reduce((u, upz) => u + (upz.unions?.length || 0), 0) || 0), 0
                    ) || 0), 0
                  )}
                </p>
                <p className="text-sm text-gray-500">Unions</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search divisions, districts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Hierarchical View */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Geographic Hierarchy
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : filteredDivisions.length === 0 ? (
            <div className="text-center py-12">
              <MapPin className="w-12 h-12 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">No geo data found</p>
              <p className="text-sm text-gray-400 mt-1">Click &quot;Seed From JSON&quot; to import Bangladesh geo data</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredDivisions.map((division) => (
                <div key={division.id} className="border border-gray-200 rounded-lg overflow-hidden">
                  {/* Division Row */}
                  <div className="flex items-center justify-between bg-blue-50 px-4 py-3">
                    <button
                      onClick={() => toggleDivision(division.id)}
                      className="flex items-center gap-3 flex-1 text-left"
                    >
                      {expandedDivisions.has(division.id) ? (
                        <ChevronDown className="w-5 h-5 text-blue-600" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-blue-600" />
                      )}
                      <Map className="w-5 h-5 text-blue-600" />
                      <div>
                        <span className="font-medium text-gray-900">{division.name}</span>
                        {division.bnName && (
                          <span className="text-sm text-gray-500 ml-2">({division.bnName})</span>
                        )}
                      </div>
                      <Badge variant="info" className="ml-2">
                        {division.districts?.length || 0} districts
                      </Badge>
                    </button>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => openAddModal("district", division.id)}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => openEditModal("division", division)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Districts */}
                  {expandedDivisions.has(division.id) && division.districts && (
                    <div className="ml-6 border-l-2 border-blue-200">
                      {division.districts.map((district) => (
                        <div key={district.id} className="border-b last:border-b-0">
                          {/* District Row */}
                          <div className="flex items-center justify-between bg-green-50 px-4 py-2">
                            <button
                              onClick={() => toggleDistrict(district.id)}
                              className="flex items-center gap-3 flex-1 text-left"
                            >
                              {expandedDistricts.has(district.id) ? (
                                <ChevronDown className="w-4 h-4 text-green-600" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-green-600" />
                              )}
                              <Building2 className="w-4 h-4 text-green-600" />
                              <div>
                                <span className="font-medium text-sm">{district.name}</span>
                                {district.bnName && (
                                  <span className="text-xs text-gray-500 ml-1">({district.bnName})</span>
                                )}
                              </div>
                              <Badge variant="success" className="ml-2 text-xs">
                                {district.upazilas?.length || 0} upazilas
                              </Badge>
                            </button>
                            <div className="flex items-center gap-1">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => openAddModal("upazila", district.id)}
                              >
                                <Plus className="w-3 h-3" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => openEditModal("district", district)}
                              >
                                <Pencil className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>

                          {/* Upazilas */}
                          {expandedDistricts.has(district.id) && district.upazilas && (
                            <div className="ml-6 border-l-2 border-green-200">
                              {district.upazilas.map((upazila) => (
                                <div key={upazila.id} className="border-b last:border-b-0">
                                  {/* Upazila Row */}
                                  <div className="flex items-center justify-between bg-purple-50 px-4 py-1.5">
                                    <button
                                      onClick={() => toggleUpazila(upazila.id)}
                                      className="flex items-center gap-2 flex-1 text-left"
                                    >
                                      {expandedUpazilas.has(upazila.id) ? (
                                        <ChevronDown className="w-3 h-3 text-purple-600" />
                                      ) : (
                                        <ChevronRight className="w-3 h-3 text-purple-600" />
                                      )}
                                      <Layers className="w-3 h-3 text-purple-600" />
                                      <span className="text-sm">{upazila.name}</span>
                                      {upazila.bnName && (
                                        <span className="text-xs text-gray-400">({upazila.bnName})</span>
                                      )}
                                      <Badge variant="default" className="ml-1 text-xs">
                                        {upazila.unions?.length || 0}
                                      </Badge>
                                    </button>
                                    <div className="flex items-center gap-1">
                                      <Button 
                                        variant="ghost" 
                                        size="sm"
                                        onClick={() => openAddModal("union", upazila.id)}
                                      >
                                        <Plus className="w-3 h-3" />
                                      </Button>
                                      <Button 
                                        variant="ghost" 
                                        size="sm"
                                        onClick={() => openEditModal("upazila", upazila)}
                                      >
                                        <Pencil className="w-3 h-3" />
                                      </Button>
                                    </div>
                                  </div>

                                  {/* Unions */}
                                  {expandedUpazilas.has(upazila.id) && upazila.unions && (
                                    <div className="ml-6 border-l-2 border-purple-200 bg-orange-50/50">
                                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1 p-2">
                                        {upazila.unions.map((union) => (
                                          <div
                                            key={union.id}
                                            className="flex items-center justify-between px-2 py-1 bg-white rounded border hover:border-orange-300 group"
                                          >
                                            <div className="flex items-center gap-1">
                                              <Home className="w-3 h-3 text-orange-500" />
                                              <span className="text-xs truncate max-w-[100px]">{union.name}</span>
                                            </div>
                                            <button
                                              onClick={() => openEditModal("union", union)}
                                              className="opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                              <Pencil className="w-3 h-3 text-gray-400 hover:text-gray-600" />
                                            </button>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={`${editingItem ? "Edit" : "Add"} ${getLevelTitle(currentLevel)}`}
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Name (English)"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder={`Enter ${currentLevel} name`}
          />
          <Input
            label="Name (Bengali)"
            value={formData.bnName}
            onChange={(e) => setFormData({ ...formData, bnName: e.target.value })}
            placeholder="Enter Bengali name (optional)"
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

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title={`Delete ${getLevelTitle(currentLevel)}`}
        size="sm"
      >
        <div className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
            <Trash2 className="w-6 h-6 text-red-600" />
          </div>
          <p className="text-gray-600 mb-6">
            Are you sure you want to delete this {currentLevel}? This will also delete all child items.
          </p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} className="flex-1">
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
