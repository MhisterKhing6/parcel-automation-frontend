import { useState, useEffect } from "react";
import { Plus, Trash2, Package, AlertCircleIcon, X, Loader } from "lucide-react";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Badge } from "../../components/ui/badge";
import { useStation } from "../../contexts/StationContext";
import { useShelf } from "../../contexts/ShelfContext";
import shelfService, { ApiShelf } from "../../services/shelfService";
import frontdeskService, { ParcelResponse } from "../../services/frontdeskService";
import { useToast } from "../../components/ui/toast";
import authService from "../../services/authService";

type ParcelType = ParcelResponse;

// Helper function to get manager's office ID
const getManagerOfficeId = (): string | undefined => {
    // Try to get from authService first
    const userData = authService.getUser();
    if (userData && (userData as any).office?.id) {
        return (userData as any).office.id;
    }
    
    // Fallback: check localStorage for full user response (might be stored during login)
    try {
        const storedUser = JSON.parse(localStorage.getItem("user_data") || localStorage.getItem("user") || "{}");
        if (storedUser?.office?.id) {
            return storedUser.office.id;
        }
    } catch (e) {
        console.error("Error reading user data from localStorage:", e);
    }
    
    return undefined;
};

export const ShelfManagement = (): JSX.Element => {
    const { currentStation, currentUser, userRole } = useStation();
    const { shelves, loading, loadShelves, refreshShelves } = useShelf();
    const { showToast } = useToast();
    const [shelfParcelCounts, setShelfParcelCounts] = useState<Record<string, number>>({});
    const [newShelfName, setNewShelfName] = useState("");
    const [showAddModal, setShowAddModal] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [adding, setAdding] = useState(false);
    const [loadingCounts, setLoadingCounts] = useState(false);

    // Fetch parcel counts for shelves
    const fetchShelfParcelCounts = async (shelvesList: ApiShelf[]) => {
        if (shelvesList.length === 0) return;

        setLoadingCounts(true);
        try {
            // Fetch all parcels for the station
            const response = await frontdeskService.searchParcels(
                {},
                { page: 0, size: 1000 } // Get a large number to count all parcels
            );

            if (response.success && response.data) {
                const parcels = response.data.content;
                const counts: Record<string, number> = {};

                // Count parcels per shelf
                shelvesList.forEach((shelf) => {
                    counts[shelf.id] = parcels.filter(
                        (p: ParcelType) => p.shelfNumber === shelf.name
                    ).length;
                });

                setShelfParcelCounts(counts);
            }
        } catch (error) {
            console.error("Failed to fetch parcel counts:", error);
        } finally {
            setLoadingCounts(false);
        }
    };

    // Load shelves when station changes or for managers, load their office shelves
    useEffect(() => {
        if (userRole === "MANAGER" && currentUser) {
            // For managers, get office ID from user profile
            const managerOfficeId = getManagerOfficeId();
            if (managerOfficeId) {
                loadShelves(managerOfficeId);
            }
        } else if (userRole === "ADMIN" && currentStation) {
            // For admins, use selected station
            loadShelves(currentStation.id);
        }
    }, [currentStation, currentUser, userRole, loadShelves]);

    // Fetch parcel counts when shelves change
    useEffect(() => {
        if (shelves.length > 0) {
            // For managers, we don't need currentStation - shelves are already filtered by their office
            // For admins, we need currentStation
            if (userRole === "ADMIN" && !currentStation) {
                return;
            }
            fetchShelfParcelCounts(shelves);
        }
    }, [shelves, currentStation, userRole]);

    const handleAddShelf = async () => {
        if (!newShelfName.trim()) {
            showToast("Please enter a shelf name", "warning");
            return;
        }

        if (!currentUser) {
            showToast("User not authenticated. Please log in again.", "error");
            return;
        }

        // Get office ID based on user role
        let officeId: string | undefined;
        
        if (userRole === "MANAGER") {
            // For managers, use their office ID from their profile
            officeId = getManagerOfficeId();
            
            if (!officeId) {
                showToast("Manager office not found. Please contact administrator.", "error");
                return;
            }
        } else if (userRole === "ADMIN") {
            // For admins, use the selected station
            if (!currentStation) {
                showToast("No station selected. Please select a station first.", "error");
                return;
            }
            if (!currentStation.id) {
                showToast("Invalid station. Please refresh and try again.", "error");
                return;
            }
            officeId = currentStation.id;
        } else {
            showToast("You don't have permission to create shelves.", "error");
            return;
        }

        // Check if shelf name already exists in this station (client-side validation)
        const existingShelf = shelves.find(
            (s) => s.name.toLowerCase() === newShelfName.trim().toLowerCase()
        );
        if (existingShelf) {
            showToast("A shelf with this name already exists in this station.", "warning");
            return;
        }

        setAdding(true);
        try {
            console.log("Attempting to add shelf:", {
                name: newShelfName.trim(),
                officeId: officeId,
                userRole: userRole,
                currentUser: currentUser
            });
            
            const response = await shelfService.addShelf(newShelfName.trim(), officeId);
            
            console.log("Add shelf response:", response);

            if (response.success) {
                showToast(response.message || `Shelf "${newShelfName.trim()}" created successfully!`, "success");
                setNewShelfName("");
                setShowAddModal(false);
                // Refresh shelves list
                await refreshShelves(officeId);
            } else {
                console.error("Add shelf failed:", response.message);
                showToast(response.message || "Failed to create shelf", "error");
            }
        } catch (error) {
            console.error("Add shelf exception:", error);
            showToast("Failed to create shelf. Please try again.", "error");
        } finally {
            setAdding(false);
        }
    };

    const handleDeleteShelf = async (shelfId: string, shelfName: string) => {
        if (!currentStation) return;

        // Check if shelf can be deleted (check parcel count)
        const parcelCount = shelfParcelCounts[shelfId] || 0;
        
        if (parcelCount > 0) {
            showToast(`Cannot delete shelf "${shelfName}". It contains ${parcelCount} parcel(s). Please move or deliver all parcels first.`, "warning");
            setDeleteConfirm(null);
            return;
        }

        // Note: API doesn't have a delete endpoint based on the docs, so we'll just remove from UI
        // If delete endpoint exists, we would call it here
        showToast("Delete functionality is not available via API. Please contact administrator.", "info");
        setDeleteConfirm(null);
    };

    const handleCloseModal = () => {
        setShowAddModal(false);
        setNewShelfName("");
    };

    const canManageShelves = userRole === "MANAGER" || userRole === "ADMIN";

    return (
        <div className="w-full">
            <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
                <main className="flex-1 space-y-6">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-neutral-800">Shelf Management</h1>
                            <p className="text-sm text-[#5d5d5d] mt-1">
                                {currentStation?.name} - Manage parcel shelves
                            </p>
                        </div>
                        {canManageShelves && (
                            <Button
                                onClick={() => setShowAddModal(true)}
                                className="bg-[#ea690c] text-white hover:bg-[#ea690c]/90 flex items-center gap-2"
                            >
                                <Plus size={20} />
                                Add Shelf
                            </Button>
                        )}
                    </div>

                    {/* Add Shelf Modal */}
                    {showAddModal && canManageShelves && (
                        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                            <Card className="w-full max-w-md rounded-2xl border border-[#d1d1d1] bg-white shadow-lg">
                                <CardContent className="p-6">
                                    {/* Modal Header */}
                                    <div className="flex items-center justify-between mb-6">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-orange-50 rounded-lg">
                                                <Plus className="w-5 h-5 text-[#ea690c]" />
                                            </div>
                                            <h2 className="text-lg font-bold text-neutral-800">Add New Shelf</h2>
                                        </div>
                                        <button
                                            onClick={handleCloseModal}
                                            className="text-[#5d5d5d] hover:bg-gray-100 p-1 rounded transition-colors"
                                        >
                                            <X size={20} />
                                        </button>
                                    </div>

                                    {/* Modal Content */}
                                    <div className="space-y-4">
                                        <div>
                                            <Label className="block text-sm font-semibold text-neutral-800 mb-2">
                                                Shelf Name/Code <span className="text-[#e22420]">*</span>
                                            </Label>
                                            <Input
                                                value={newShelfName}
                                                onChange={(e) => setNewShelfName(e.target.value)}
                                                placeholder="e.g., A1, B2, Ground-Left"
                                                className="border border-[#d1d1d1] w-full"
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter") {
                                                        handleAddShelf();
                                                    }
                                                }}
                                                autoFocus
                                            />
                                            <p className="text-xs text-[#5d5d5d] mt-1">
                                                Enter a unique identifier for this shelf
                                            </p>
                                        </div>
                                    </div>

                                    {/* Modal Actions */}
                                    <div className="flex gap-3 mt-6">
                                        <Button
                                            onClick={handleCloseModal}
                                            variant="outline"
                                            className="flex-1 border border-[#d1d1d1] text-neutral-700 hover:bg-gray-50"
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            onClick={handleAddShelf}
                                            disabled={!newShelfName.trim() || adding}
                                            className="flex-1 bg-[#ea690c] text-white hover:bg-[#ea690c]/90 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {adding ? (
                                                <>
                                                    <Loader className="w-4 h-4 animate-spin mr-2" />
                                                    Creating...
                                                </>
                                            ) : (
                                                "Create Shelf"
                                            )}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {/* Shelves Grid */}
                    {loading ? (
                        <Card className="border border-[#d1d1d1] bg-white">
                            <CardContent className="p-12 text-center">
                                <Loader className="w-8 h-8 text-[#ea690c] mx-auto mb-4 animate-spin" />
                                <p className="text-sm text-neutral-700">Loading shelves...</p>
                            </CardContent>
                        </Card>
                    ) : shelves.length === 0 ? (
                        <Card className="border border-[#d1d1d1] bg-white">
                            <CardContent className="p-12 text-center">
                                <Package className="w-16 h-16 text-[#9a9a9a] mx-auto mb-4 opacity-50" />
                                <p className="text-neutral-700 font-medium">No shelves found</p>
                                <p className="text-sm text-[#5d5d5d] mt-2">
                                    {canManageShelves
                                        ? "Create your first shelf to start organizing parcels"
                                        : "No shelves available in this station"}
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {shelves.map((shelf) => {
                                // Get parcel count for this shelf
                                const parcelCount = shelfParcelCounts[shelf.id] || 0;
                                const canDelete = parcelCount === 0;
                                const isDeleting = deleteConfirm === shelf.id;

                                return (
                                    <Card
                                        key={shelf.id}
                                        className="border border-[#d1d1d1] bg-white hover:shadow-md transition-shadow"
                                    >
                                        <CardContent className="p-6">
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-3 bg-orange-50 rounded-lg">
                                                        <Package className="w-6 h-6 text-[#ea690c]" />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold text-lg text-neutral-800">{shelf.name}</h3>
                                                        <p className="text-xs text-[#5d5d5d]">ID: {shelf.id}</p>
                                                    </div>
                                                </div>
                                                {canManageShelves && (
                                                    <div className="flex gap-1">
                                                        {!isDeleting && canDelete && (
                                                            <button
                                                                onClick={() => setDeleteConfirm(shelf.id)}
                                                                className="text-[#e22420] hover:bg-red-50 p-2 rounded transition-colors"
                                                                title="Delete shelf"
                                                            >
                                                                <Trash2 size={18} />
                                                            </button>
                                                        )}
                                                        {isDeleting && (
                                                            <div className="flex gap-1">
                                                                <button
                                                                    onClick={() => handleDeleteShelf(shelf.id, shelf.name)}
                                                                    className="text-[#e22420] hover:bg-red-50 p-1 rounded text-xs font-semibold"
                                                                >
                                                                    Confirm
                                                                </button>
                                                                <button
                                                                    onClick={() => setDeleteConfirm(null)}
                                                                    className="text-[#5d5d5d] hover:bg-gray-50 p-1 rounded text-xs"
                                                                >
                                                                    Cancel
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="space-y-2">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-sm text-[#5d5d5d]">Current Parcels</span>
                                                    {loadingCounts ? (
                                                        <Loader className="w-4 h-4 animate-spin text-[#5d5d5d]" />
                                                    ) : (
                                                        <Badge
                                                            className={
                                                                parcelCount > 0
                                                                    ? "bg-blue-100 text-blue-800"
                                                                    : "bg-gray-100 text-gray-800"
                                                            }
                                                        >
                                                            {parcelCount}
                                                        </Badge>
                                                    )}
                                                </div>
                                                {shelf.office && (
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-sm text-[#5d5d5d]">Office</span>
                                                        <span className="text-xs text-neutral-700">
                                                            {shelf.office.name}
                                                        </span>
                                                    </div>
                                                )}
                                                {!canDelete && parcelCount > 0 && (
                                                    <div className="mt-3 pt-3 border-t border-[#d1d1d1]">
                                                        <div className="flex items-center gap-2 text-xs text-orange-600">
                                                            <AlertCircleIcon className="w-4 h-4" />
                                                            <span>Contains {parcelCount} parcel(s)</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};
