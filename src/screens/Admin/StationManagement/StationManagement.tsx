import { useState, useEffect } from "react";
import { Plus, MapPin,  X, Loader, Building2, ChevronDown, ChevronUp, Edit2, Trash2, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Badge } from "../../../components/ui/badge";
import { Label } from "../../../components/ui/label";
import { COUNTRY_CODES, getCountryName, getRegionsByCountry } from "../../../data/countriesAndRegions";
import locationService from "../../../services/locationService";
import { useLocation } from "../../../contexts/LocationContext";
import { useToast } from "../../../components/ui/toast";

interface Station {
    id: string;
    name: string;
    code: string;
    address: string;
    locationName: string;
    managerName: string;
    createdAt: number;
}

interface Location {
    id: string;
    name: string;
    region: string;
    country: string;
    offices: Station[];
}

interface DeleteConfirmation {
    stationId: string;
    stationName: string;
    stationCode: string;
}

export const StationManagement = (): JSX.Element => {
    const { locations, stations, loading: loadingLocations, refreshLocations } = useLocation();
    const { showToast } = useToast();
    const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
    const [showAddLocationModal, setShowAddLocationModal] = useState(false);
    const [showAddStationModal, setShowAddStationModal] = useState(false);
    const [showEditStationModal, setShowEditStationModal] = useState(false);
    const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
    const [editingStation, setEditingStation] = useState<Station | null>(null);
    const [deleteConfirmation, setDeleteConfirmation] = useState<DeleteConfirmation | null>(null);
    const [isCreatingLocation, setIsCreatingLocation] = useState(false);
    const [locationFormData, setLocationFormData] = useState({
        name: "",
        country: "",
        region: "",
    });
    const [stationFormData, setStationFormData] = useState({
        name: "",
        code: "",
        address: "",
        managerName: "",
        locationId: "",
    });
    const [selectedCountry, setSelectedCountry] = useState<string>("");
    const [availableRegions, setAvailableRegions] = useState<string[]>([]);
    const [loadingStations, setLoadingStations] = useState(false);

    // Update available regions when country changes
    useEffect(() => {
        if (selectedCountry) {
            const regions = getRegionsByCountry(selectedCountry);
            setAvailableRegions(regions);
            setLocationFormData({
                ...locationFormData,
                country: getCountryName(selectedCountry),
                region: "",
            });
        }
    }, [selectedCountry]);

    // Add new location
    const handleAddLocation = async () => {
        if (!locationFormData.name.trim()) {
            showToast("Location name is required", "error");
            return;
        }

        if (!selectedCountry) {
            showToast("Country is required", "error");
            return;
        }

        if (!locationFormData.region) {
            showToast("Region is required", "error");
            return;
        }

        setIsCreatingLocation(true);
        try {
            const response = await locationService.createLocation({
                name: locationFormData.name,
                country: locationFormData.country,
                region: locationFormData.region,
            });
            if (response.success) {
                showToast(`Location "${locationFormData.name}" created successfully!`, "success");
                setLocationFormData({ name: "", country: "", region: "" });
                setSelectedCountry("");
                setAvailableRegions([]);
                setShowAddLocationModal(false);
                await refreshLocations();
            } else {
                showToast(response.message || "Failed to create location", "error");
            }
        } catch (error) {
            showToast("Failed to create location. Please try again.", "error");
        } finally {
            setIsCreatingLocation(false);
        }
    };

    // Add new station via API
    const handleAddStation = async () => {
        if (!stationFormData.name.trim() || !stationFormData.locationId.trim()) {
            showToast("Station name and location are required", "error");
            return;
        }

        const selectedLoc = locations.find(l => l.id === stationFormData.locationId);
        if (!selectedLoc) {
            showToast("Selected location not found", "error");
            return;
        }

        setLoadingStations(true);
        try {
            const response = await locationService.createStation({
                name: stationFormData.name,
                address: stationFormData.address,
                locationId: stationFormData.locationId,
                managerId: stationFormData.managerName || null, // Optional, can be null
            });

            if (response.success) {
                showToast(`Station "${stationFormData.name}" created successfully!`, "success");
                setStationFormData({ name: "", code: "", address: "", managerName: "", locationId: "" });
                setShowAddStationModal(false);
                await refreshLocations(); // Reload to refresh the list
            } else {
                showToast(response.message || "Failed to create station", "error");
            }
        } catch (error) {
            console.error("Failed to create station:", error);
            showToast("Failed to create station. Please try again.", "error");
        } finally {
            setLoadingStations(false);
        }
    };

    // Edit station
    const handleEditStation = (station: Station) => {
        setEditingStation(station);
        setStationFormData({
            name: station.name,
            code: station.code,
            address: station.address,
            managerName: station.managerName,
            locationId: "",
        });
        setShowEditStationModal(true);
    };

    // Save edited station
    const handleSaveEditStation = () => {
        if (!stationFormData.name.trim() || !stationFormData.code.trim()) {
            showToast("Station name and code are required", "error");
            return;
        }

        showToast(`Station "${stationFormData.name}" updated successfully!`, "success");
        setShowEditStationModal(false);
        setEditingStation(null);
        setStationFormData({ name: "", code: "", address: "", managerName: "", locationId: "" });
        // In a real implementation, call: await locationService.updateStation(editingStation.id, stationFormData);
        // Then refresh: await refreshLocations();
    };

    // Initiate delete with confirmation modal
    const handleInitiateDelete = (station: Station) => {
        setDeleteConfirmation({
            stationId: station.id,
            stationName: station.name,
            stationCode: station.code,
        });
        setShowDeleteConfirmModal(true);
    };

    // Confirm and delete station
    const handleConfirmDelete = async () => {
        if (!deleteConfirmation) return;

        // In a real implementation, call: await locationService.deleteStation(deleteConfirmation.stationId);
        showToast(`Station "${deleteConfirmation.stationName}" deleted successfully!`, "success");
        setShowDeleteConfirmModal(false);
        setDeleteConfirmation(null);
        await refreshLocations(); // Reload to refresh the list
    };

    const handleCloseLocationModal = () => {
        setShowAddLocationModal(false);
        setLocationFormData({ name: "", country: "", region: "" });
        setSelectedCountry("");
        setAvailableRegions([]);
    };

    const handleCloseStationModal = () => {
        setShowAddStationModal(false);
        setStationFormData({ name: "", code: "", address: "", managerName: "", locationId: "" });
    };

    const handleCloseEditStationModal = () => {
        setShowEditStationModal(false);
        setEditingStation(null);
        setStationFormData({ name: "", code: "", address: "", managerName: "", locationId: "" });
    };

    const handleCloseDeleteConfirmModal = () => {
        setShowDeleteConfirmModal(false);
        setDeleteConfirmation(null);
    };

    return (
        <div className="w-full">
            <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
                <main className="flex-1 space-y-6">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-neutral-800">Station Management</h1>
                            <p className="text-sm text-[#5d5d5d] mt-2">Manage locations and their stations (offices)</p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <Button
                                onClick={() => setShowAddStationModal(true)}
                                className="bg-[#ea690c] text-white hover:bg-[#ea690c]/90 flex items-center gap-2"
                                disabled={locations.length === 0}
                            >
                                <Plus size={20} />
                                New Station
                            </Button>
                            <Button
                                onClick={() => setShowAddLocationModal(true)}
                                className="bg-orange-500 text-white hover:bg-orange-600 flex items-center gap-2"
                            >
                                <Plus size={20} />
                                New Location
                            </Button>
                        </div>
                    </div>

                    {/* Add Location Modal */}
                    {showAddLocationModal && (
                        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                            <Card className="w-full max-w-md rounded-lg border border-[#d1d1d1] bg-white shadow-lg max-h-[90vh] overflow-y-auto">
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between mb-6">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-orange-50 rounded-lg">
                                                <MapPin className="w-5 h-5 text-[#ea690c]" />
                                            </div>
                                            <h2 className="text-lg font-bold text-neutral-800">Create New Location</h2>
                                        </div>
                                        <button
                                            onClick={handleCloseLocationModal}
                                            className="text-[#9a9a9a] hover:text-neutral-800"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>

                                    <div className="space-y-4">
                                        <div>
                                            <Label className="block text-sm font-semibold text-neutral-800 mb-2">
                                                Location Name <span className="text-[#e22420]">*</span>
                                            </Label>
                                            <Input
                                                value={locationFormData.name}
                                                onChange={(e) => setLocationFormData({ ...locationFormData, name: e.target.value })}
                                                placeholder="e.g., Accra Central Hub"
                                                className="border border-[#d1d1d1]"
                                            />
                                        </div>

                                        <div>
                                            <Label className="block text-sm font-semibold text-neutral-800 mb-2">
                                                Country <span className="text-[#e22420]">*</span>
                                            </Label>
                                            <select
                                                value={selectedCountry}
                                                onChange={(e) => setSelectedCountry(e.target.value)}
                                                className="w-full border border-[#d1d1d1] rounded px-3 py-2 text-sm bg-white"
                                            >
                                                <option value="">Select a country</option>
                                                {COUNTRY_CODES.map((code) => (
                                                    <option key={code} value={code}>
                                                        {getCountryName(code)}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <Label className="block text-sm font-semibold text-neutral-800 mb-2">
                                                Region <span className="text-[#e22420]">*</span>
                                            </Label>
                                            <select
                                                value={locationFormData.region}
                                                onChange={(e) => setLocationFormData({ ...locationFormData, region: e.target.value })}
                                                disabled={!selectedCountry || availableRegions.length === 0}
                                                className="w-full border border-[#d1d1d1] rounded px-3 py-2 text-sm bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <option value="">Select a region</option>
                                                {availableRegions.map((region) => (
                                                    <option key={region} value={region}>
                                                        {region}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="flex gap-3 pt-4">
                                            <Button
                                                onClick={handleAddLocation}
                                                disabled={!locationFormData.name.trim() || !selectedCountry || !locationFormData.region || isCreatingLocation}
                                                className="flex-1 bg-[#ea690c] text-white hover:bg-orange-600 disabled:opacity-50 flex items-center justify-center gap-2"
                                            >
                                                {isCreatingLocation ? (
                                                    <>
                                                        <Loader className="w-4 h-4 animate-spin" />
                                                        Creating...
                                                    </>
                                                ) : (
                                                    "Create Location"
                                                )}
                                            </Button>
                                            <Button
                                                onClick={handleCloseLocationModal}
                                                variant="outline"
                                                className="flex-1 border border-[#d1d1d1]"
                                            >
                                                Cancel
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {/* Add Station Modal */}
                    {showAddStationModal && (
                        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                            <Card className="w-full max-w-md rounded-lg border border-[#d1d1d1] bg-white shadow-lg">
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between mb-6">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-orange-50 rounded-lg">
                                                <Plus className="w-5 h-5 text-[#ea690c]" />
                                            </div>
                                            <h2 className="text-lg font-bold text-neutral-800">Create New Station</h2>
                                        </div>
                                        <button
                                            onClick={handleCloseStationModal}
                                            className="text-[#9a9a9a] hover:text-neutral-800"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>

                                    <div className="space-y-4">
                                        <div>
                                            <Label className="block text-sm font-semibold text-neutral-800 mb-2">
                                                Station Name <span className="text-[#e22420]">*</span>
                                            </Label>
                                            <Input
                                                value={stationFormData.name}
                                                onChange={(e) => setStationFormData({ ...stationFormData, name: e.target.value })}
                                                placeholder="e.g., Accra Main Station"
                                                className="border border-[#d1d1d1]"
                                            />
                                        </div>

                                        <div>
                                            <Label className="block text-sm font-semibold text-neutral-800 mb-2">
                                                Location <span className="text-[#e22420]">*</span>
                                            </Label>
                                            <select
                                                value={stationFormData.locationId}
                                                onChange={(e) => setStationFormData({ ...stationFormData, locationId: e.target.value })}
                                                className="w-full border border-[#d1d1d1] rounded px-3 py-2 text-sm bg-white"
                                            >
                                                <option value="">Select a location</option>
                                                {locations.map((loc) => (
                                                    <option key={loc.id} value={loc.id}>
                                                        {loc.name} {loc.region && `- ${loc.region}`} {loc.country && `(${loc.country})`}
                                                    </option>
                                                ))}
                                            </select>
                                            {locations.length === 0 && (
                                                <p className="text-xs text-orange-600 mt-2">
                                                    No locations available. Create a location first.
                                                </p>
                                            )}
                                        </div>

                                        <div>
                                            <Label className="block text-sm font-semibold text-neutral-800 mb-2">
                                                Address
                                            </Label>
                                            <Input
                                                value={stationFormData.address}
                                                onChange={(e) => setStationFormData({ ...stationFormData, address: e.target.value })}
                                                placeholder="e.g., 123 Main Street, Accra"
                                                className="border border-[#d1d1d1]"
                                            />
                                        </div>

                                        <div>
                                            <Label className="block text-sm font-semibold text-neutral-800 mb-2">
                                                Manager ID <span className="text-[#9a9a9a] text-xs">(Optional)</span>
                                            </Label>
                                            <Input
                                                value={stationFormData.managerName}
                                                onChange={(e) => setStationFormData({ ...stationFormData, managerName: e.target.value })}
                                                placeholder="e.g., mgr_12345"
                                                className="border border-[#d1d1d1]"
                                            />
                                            <p className="text-xs text-[#5d5d5d] mt-1">Leave empty if no manager assigned yet</p>
                                        </div>

                                        <div className="flex gap-3 pt-4">
                                            <Button
                                                onClick={handleAddStation}
                                                disabled={!stationFormData.name.trim() || !stationFormData.locationId.trim() || loadingStations}
                                                className="flex-1 bg-[#ea690c] text-white hover:bg-[#ea690c]/90 disabled:opacity-50 flex items-center justify-center gap-2"
                                            >
                                                {loadingStations ? (
                                                    <>
                                                        <Loader className="w-4 h-4 animate-spin" />
                                                        Creating...
                                                    </>
                                                ) : (
                                                    "Create Station"
                                                )}
                                            </Button>
                                            <Button
                                                onClick={handleCloseStationModal}
                                                variant="outline"
                                                className="flex-1 border border-[#d1d1d1]"
                                            >
                                                Cancel
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {/* Edit Station Modal */}
                    {showEditStationModal && editingStation && (
                        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                            <Card className="w-full max-w-md rounded-lg border border-[#d1d1d1] bg-white shadow-lg">
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between mb-6">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-orange-50 rounded-lg">
                                                <Edit2 className="w-5 h-5 text-[#ea690c]" />
                                            </div>
                                            <h2 className="text-lg font-bold text-neutral-800">Edit Station</h2>
                                        </div>
                                        <button
                                            onClick={handleCloseEditStationModal}
                                            className="text-[#9a9a9a] hover:text-neutral-800"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>

                                    <div className="space-y-4">
                                        <div>
                                            <Label className="block text-sm font-semibold text-neutral-800 mb-2">
                                                Station Name <span className="text-[#e22420]">*</span>
                                            </Label>
                                            <Input
                                                value={stationFormData.name}
                                                onChange={(e) => setStationFormData({ ...stationFormData, name: e.target.value })}
                                                placeholder="e.g., Accra Main Station"
                                                className="border border-[#d1d1d1]"
                                            />
                                        </div>

                                        <div>
                                            <Label className="block text-sm font-semibold text-neutral-800 mb-2">
                                                Station Code <span className="text-[#e22420]">*</span>
                                            </Label>
                                            <Input
                                                value={stationFormData.code}
                                                onChange={(e) => setStationFormData({ ...stationFormData, code: e.target.value })}
                                                placeholder="e.g., ACC-001"
                                                className="border border-[#d1d1d1]"
                                            />
                                        </div>

                                        <div>
                                            <Label className="block text-sm font-semibold text-neutral-800 mb-2">
                                                Address
                                            </Label>
                                            <Input
                                                value={stationFormData.address}
                                                onChange={(e) => setStationFormData({ ...stationFormData, address: e.target.value })}
                                                placeholder="e.g., 123 Main Street, Accra"
                                                className="border border-[#d1d1d1]"
                                            />
                                        </div>

                                        <div>
                                            <Label className="block text-sm font-semibold text-neutral-800 mb-2">
                                                Manager Name
                                            </Label>
                                            <Input
                                                value={stationFormData.managerName}
                                                onChange={(e) => setStationFormData({ ...stationFormData, managerName: e.target.value })}
                                                placeholder="e.g., John Smith"
                                                className="border border-[#d1d1d1]"
                                            />
                                        </div>

                                        <div className="flex gap-3 pt-4">
                                            <Button
                                                onClick={handleSaveEditStation}
                                                disabled={!stationFormData.name.trim() || !stationFormData.code.trim()}
                                                className="flex-1 bg-[#ea690c] text-white hover:bg-[#ea690c]/90 disabled:opacity-50"
                                            >
                                                Save Changes
                                            </Button>
                                            <Button
                                                onClick={handleCloseEditStationModal}
                                                variant="outline"
                                                className="flex-1 border border-[#d1d1d1]"
                                            >
                                                Cancel
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {/* Delete Confirmation Modal */}
                    {showDeleteConfirmModal && deleteConfirmation && (
                        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                            <Card className="w-full max-w-md rounded-lg border border-[#d1d1d1] bg-white shadow-lg">
                                <CardContent className="p-6">
                                    <div className="flex items-start gap-4 mb-4">
                                        <div className="p-3 bg-red-50 rounded-lg flex-shrink-0">
                                            <AlertTriangle className="w-6 h-6 text-red-600" />
                                        </div>
                                        <div className="flex-1">
                                            <h2 className="text-lg font-bold text-neutral-800 mb-2">Delete Station?</h2>
                                            <p className="text-sm text-neutral-700 mb-1">
                                                Are you sure you want to delete this station?
                                            </p>
                                            <div className="bg-gray-50 rounded p-3 mt-3">
                                                <p className="text-sm font-semibold text-neutral-800">{deleteConfirmation.stationName}</p>
                                                <p className="text-xs text-[#5d5d5d]">Code: {deleteConfirmation.stationCode}</p>
                                            </div>
                                            <p className="text-xs text-red-600 mt-3 font-semibold">
                                                ⚠️ This action cannot be undone.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex gap-3">
                                        <Button
                                            onClick={handleCloseDeleteConfirmModal}
                                            variant="outline"
                                            className="flex-1 border border-[#d1d1d1] text-neutral-700 hover:bg-gray-50"
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            onClick={handleConfirmDelete}
                                            className="flex-1 bg-red-600 text-white hover:bg-red-700 flex items-center justify-center gap-2"
                                        >
                                            <Trash2 size={16} />
                                            Delete Station
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {/* Locations Section */}
                    <div className="mt-8">
                        <h2 className="text-2xl font-bold text-neutral-800 mb-4">Locations & Stations</h2>
                        {loadingLocations ? (
                            <Card className="border border-[#d1d1d1] bg-white">
                                <CardContent className="p-12 text-center">
                                    <Loader className="w-8 h-8 text-[#ea690c] mx-auto mb-4 animate-spin" />
                                    <p className="text-neutral-700">Loading locations...</p>
                                </CardContent>
                            </Card>
                        ) : locations.length === 0 ? (
                            <Card className="border border-[#d1d1d1] bg-white">
                                <CardContent className="p-12 text-center">
                                    <MapPin className="w-16 h-16 text-[#9a9a9a] mx-auto mb-4 opacity-50" />
                                    <p className="text-neutral-700 font-medium">No locations found</p>
                                    <p className="text-sm text-[#5d5d5d] mt-2">
                                        Create your first location to get started
                                    </p>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="space-y-6">
                                {locations.map((location) => (
                                    <div key={location.id} className="border border-[#d1d1d1] rounded-lg bg-white overflow-hidden">
                                        {/* Location Header */}
                                        <div
                                            className="bg-gradient-to-r from-orange-50 to-orange-100 p-6 cursor-pointer hover:from-orange-100 hover:to-orange-200 transition-colors"
                                            onClick={() => setSelectedLocation(selectedLocation?.id === location.id ? null : location)}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className="p-3 bg-orange-200 rounded-lg">
                                                        <MapPin className="w-6 h-6 text-[#ea690c]" />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold text-lg text-neutral-800">{location.name}</h3>
                                                        <p className="text-sm text-[#5d5d5d]">{location.region}, {location.country}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <Badge className="bg-orange-100 text-orange-800">
                                                        {location.offices?.length || 0} Station{location.offices?.length !== 1 ? 's' : ''}
                                                    </Badge>
                                                    {selectedLocation?.id === location.id ? (
                                                        <ChevronUp className="w-6 h-6 text-[#ea690c]" />
                                                    ) : (
                                                        <ChevronDown className="w-6 h-6 text-[#ea690c]" />
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Stations Table */}
                                        {selectedLocation?.id === location.id && location.offices && location.offices.length > 0 && (
                                            <div className="border-t border-[#d1d1d1] overflow-x-auto">
                                                <table className="w-full">
                                                    <thead>
                                                        <tr className="bg-gray-50 border-b border-[#d1d1d1]">
                                                            <th className="text-left px-6 py-3 text-xs font-semibold text-neutral-700 uppercase">Station Name</th>
                                                            <th className="text-left px-6 py-3 text-xs font-semibold text-neutral-700 uppercase">Code</th>
                                                            <th className="text-left px-6 py-3 text-xs font-semibold text-neutral-700 uppercase">Address</th>
                                                            <th className="text-left px-6 py-3 text-xs font-semibold text-neutral-700 uppercase">Manager</th>
                                                            <th className="text-left px-6 py-3 text-xs font-semibold text-neutral-700 uppercase">Created</th>
                                                            <th className="text-center px-6 py-3 text-xs font-semibold text-neutral-700 uppercase">Status</th>
                                                            <th className="text-center px-6 py-3 text-xs font-semibold text-neutral-700 uppercase">Actions</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {location.offices.map((station, index) => (
                                                            <tr
                                                                key={station.id}
                                                                className={`border-b border-[#d1d1d1] hover:bg-gray-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                                                            >
                                                                <td className="px-6 py-4">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="p-2 bg-orange-50 rounded">
                                                                            <Building2 className="w-4 h-4 text-[#ea690c]" />
                                                                        </div>
                                                                        <div>
                                                                            <p className="font-semibold text-neutral-800 text-sm">{station.name}</p>
                                                                            <p className="text-xs text-[#5d5d5d]">ID: {station.id}</p>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4">
                                                                    <Badge className="bg-gray-100 text-gray-800 font-mono text-xs">
                                                                        {station.code}
                                                                    </Badge>
                                                                </td>
                                                                <td className="px-6 py-4">
                                                                    <p className="text-sm text-neutral-700 truncate max-w-xs">{station.address}</p>
                                                                </td>
                                                                <td className="px-6 py-4">
                                                                    <p className="text-sm text-neutral-700">{station.managerName}</p>
                                                                </td>
                                                                <td className="px-6 py-4">
                                                                    <p className="text-sm text-[#5d5d5d]">
                                                                        {new Date(station.createdAt).toLocaleDateString()}
                                                                    </p>
                                                                </td>
                                                                <td className="px-6 py-4 text-center">
                                                                    <Badge className="bg-green-100 text-green-800 text-xs">Active</Badge>
                                                                </td>
                                                                <td className="px-6 py-4 text-center">
                                                                    <div className="flex items-center justify-center gap-2">
                                                                        <button
                                                                            onClick={() => handleEditStation(station)}
                                                                            className="text-[#ea690c] hover:bg-orange-50 p-2 rounded transition-colors"
                                                                            title="Edit station"
                                                                        >
                                                                            <Edit2 size={16} />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleInitiateDelete(station)}
                                                                            className="text-[#e22420] hover:bg-red-50 p-2 rounded transition-colors"
                                                                            title="Delete station"
                                                                        >
                                                                            <Trash2 size={16} />
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}

                                        {/* No Stations Message */}
                                        {selectedLocation?.id === location.id && (!location.offices || location.offices.length === 0) && (
                                            <div className="border-t border-[#d1d1d1] p-6 text-center">
                                                <p className="text-sm text-[#5d5d5d]">No stations in this location yet</p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* All Stations Table */}
                    {stations.length > 0 && (
                        <div className="mt-8">
                            <h2 className="text-2xl font-bold text-neutral-800 mb-4">All Stations ({stations.length})</h2>
                            <Card className="border border-[#d1d1d1] bg-white overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="bg-gray-50 border-b border-[#d1d1d1]">
                                                <th className="text-left px-6 py-3 text-xs font-semibold text-neutral-700 uppercase">Station Name</th>
                                                <th className="text-left px-6 py-3 text-xs font-semibold text-neutral-700 uppercase">Code</th>
                                                <th className="text-left px-6 py-3 text-xs font-semibold text-neutral-700 uppercase">Location</th>
                                                <th className="text-left px-6 py-3 text-xs font-semibold text-neutral-700 uppercase">Address</th>
                                                <th className="text-left px-6 py-3 text-xs font-semibold text-neutral-700 uppercase">Manager</th>
                                                <th className="text-left px-6 py-3 text-xs font-semibold text-neutral-700 uppercase">Created</th>
                                                <th className="text-center px-6 py-3 text-xs font-semibold text-neutral-700 uppercase">Status</th>
                                                <th className="text-center px-6 py-3 text-xs font-semibold text-neutral-700 uppercase">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {stations.map((station, index) => (
                                                <tr
                                                    key={station.id}
                                                    className={`border-b border-[#d1d1d1] hover:bg-gray-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                                                >
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-2">
                                                            <div className="p-2 bg-orange-50 rounded">
                                                                <Building2 className="w-4 h-4 text-[#ea690c]" />
                                                            </div>
                                                            <div>
                                                                <p className="font-semibold text-neutral-800 text-sm">{station.name}</p>
                                                                <p className="text-xs text-[#5d5d5d]">ID: {station.id}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <Badge className="bg-gray-100 text-gray-800 font-mono text-xs">
                                                            {station.code}
                                                        </Badge>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <p className="text-sm text-neutral-700">{station.locationName}</p>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <p className="text-sm text-neutral-700 truncate max-w-xs" title={station.address}>
                                                            {station.address}
                                                        </p>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <p className="text-sm text-neutral-700">{station.managerName}</p>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <p className="text-sm text-[#5d5d5d]">
                                                            {new Date(station.createdAt).toLocaleDateString()}
                                                        </p>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <Badge className="bg-green-100 text-green-800 text-xs">Active</Badge>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <div className="flex items-center justify-center gap-2">
                                                            <button
                                                                onClick={() => handleEditStation(station)}
                                                                className="text-[#ea690c] hover:bg-orange-50 p-2 rounded transition-colors"
                                                                title="Edit station"
                                                            >
                                                                <Edit2 size={16} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleInitiateDelete(station)}
                                                                className="text-[#e22420] hover:bg-red-50 p-2 rounded transition-colors"
                                                                title="Delete station"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </Card>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};
