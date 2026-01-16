import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CheckIcon, UserIcon, MapPinIcon, PhoneIcon, AlertCircleIcon, Loader } from "lucide-react";
import { ErrorNotificationSection } from "../ParcelRegistration/sections/ErrorNotificationSection";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import { useStation } from "../../contexts/StationContext";
import { formatPhoneNumber } from "../../utils/dataHelpers";
import frontdeskService, { RiderResponse } from "../../services/frontdeskService";
import { useToast } from "../../components/ui/toast";

export const ParcelRiderSelection = (): JSX.Element => {
  const { currentUser } = useStation();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [selectedRider, setSelectedRider] = useState<string | null>(null);
  const [selectedParcelIds, setSelectedParcelIds] = useState<string[]>([]);
  const [isAssigning, setIsAssigning] = useState(false);
  const [riders, setRiders] = useState<RiderResponse[]>([]);
  const [loadingRiders, setLoadingRiders] = useState(false);

  useEffect(() => {
    // Get selected parcel IDs from sessionStorage
    const storedIds = sessionStorage.getItem("selectedParcelIds");
    if (storedIds) {
      try {
        const ids = JSON.parse(storedIds);
        setSelectedParcelIds(ids);
      } catch (e) {
        console.error("Failed to parse selected parcel IDs", e);
        showToast("Failed to load selected parcels", "error");
        navigate("/package-assignments");
      }
    } else {
      // No parcels selected, redirect back
      navigate("/package-assignments");
    }
  }, [navigate, showToast]);

  // Fetch riders for the current office (API uses authenticated user's office automatically)
  useEffect(() => {
    const fetchRiders = async () => {
      setLoadingRiders(true);
      try {
        const response = await frontdeskService.getRiders();
        
        if (response.success && response.data) {
          setRiders(response.data as RiderResponse[]);
        } else {
          showToast(response.message || "Failed to load riders", "error");
        }
      } catch (error) {
        console.error("Failed to fetch riders:", error);
        showToast("Failed to load riders. Please try again.", "error");
      } finally {
        setLoadingRiders(false);
      }
    };

    fetchRiders();
  }, [showToast]);

  const handleAssign = async () => {
    if (!selectedRider || selectedParcelIds.length === 0 || !currentUser) {
      showToast("Please select a rider", "warning");
      return;
    }

    setIsAssigning(true);

    try {
      const response = await frontdeskService.assignParcelsToRider(selectedRider, selectedParcelIds);

      if (response.success) {
        // Clear session storage
        sessionStorage.removeItem("selectedParcelIds");

        // Show success and redirect
        showToast(`Successfully assigned ${selectedParcelIds.length} parcel(s) to rider!`, "success");
        setTimeout(() => {
          navigate("/active-deliveries");
        }, 1500);
      } else {
        showToast(response.message || "Failed to assign parcels. Please try again.", "error");
      }
    } catch (error) {
      console.error("Failed to assign parcels:", error);
      showToast("Failed to assign parcels. Please try again.", "error");
    } finally {
      setIsAssigning(false);
    }
  };

  const selectedRiderData = riders.find((r) => r.userId === selectedRider);

  return (
    <div className="w-full">
      <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <main className="flex-1 space-y-6">
          <ErrorNotificationSection />

          {/* Info Banner */}
          {selectedParcelIds.length > 0 && (
            <div className="w-full rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
              <p className="[font-family:'Lato',Helvetica] font-normal text-blue-800 text-sm">
                <span className="font-semibold">{selectedParcelIds.length} Parcel(s)</span> selected for assignment
              </p>
            </div>
          )}

          <Card className="w-full rounded-2xl border border-[#d1d1d1] bg-white shadow-[0px_2px_4px_#0000000d,0px_8px_8px_#0000000a,0px_17px_10px_#00000008,0px_30px_12px_#00000003,0px_47px_13px_transparent]">
            <CardContent className="flex flex-col gap-6 p-4 sm:p-6">
              <header className="inline-flex items-center gap-2">
                <UserIcon className="w-6 h-6 text-[#ea690c]" />
                <h1 className="font-body-lg-semibold font-[number:var(--body-lg-semibold-font-weight)] text-[#ea690c] text-[length:var(--body-lg-semibold-font-size)] tracking-[var(--body-lg-semibold-letter-spacing)] leading-[var(--body-lg-semibold-line-height)] [font-style:var(--body-lg-semibold-font-style)]">
                  Parcel Rider Selection
                </h1>
              </header>

              <div className="flex flex-col gap-4 w-full">
                <p className="font-body-md font-[number:var(--body-md-font-weight)] text-[#5d5d5d] text-[length:var(--body-md-font-size)] tracking-[var(--body-md-letter-spacing)] leading-[var(--body-md-line-height)] [font-style:var(--body-md-font-style)]">
                  Select an available rider for the selected parcels
                </p>

                {loadingRiders ? (
                  <div className="text-center py-8">
                    <Loader className="w-12 h-12 text-[#ea690c] mx-auto mb-4 animate-spin" />
                    <p className="text-neutral-700 font-medium">Loading riders...</p>
                  </div>
                ) : riders.length === 0 ? (
                  <div className="text-center py-8">
                    <AlertCircleIcon className="w-12 h-12 text-[#9a9a9a] mx-auto mb-4 opacity-50" />
                    <p className="text-neutral-700 font-medium">No riders available</p>
                    <p className="text-sm text-[#5d5d5d] mt-2">
                      Please add riders to this station first
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {riders.map((rider) => {
                        const isSelected = selectedRider === rider.userId;
                        const riderName = rider.name || rider.email || "Unknown";

                        return (
                          <div
                            key={rider.userId}
                            onClick={() => setSelectedRider(rider.userId)}
                            className={`flex flex-col gap-4 p-4 rounded-lg border cursor-pointer transition-colors ${isSelected
                                ? "border-[#ea690c] bg-orange-50"
                                : "border-[#d1d1d1] bg-white hover:bg-gray-50"
                              }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-3">
                                <Avatar className="h-12 w-12 border border-solid border-[#d1d1d1]">
                                  <AvatarImage src="/vector.svg" alt={riderName} />
                                  <AvatarFallback>
                                    {riderName
                                      .split(" ")
                                      .map((n) => n[0])
                                      .join("")
                                      .toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col">
                                  <span className="[font-family:'Lato',Helvetica] font-semibold text-neutral-800 text-base">
                                    {riderName}
                                  </span>
                                  {rider.phoneNumber && (
                                    <span className="[font-family:'Lato',Helvetica] font-normal text-[#9a9a9a] text-xs">
                                      {formatPhoneNumber(rider.phoneNumber)}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {isSelected && (
                                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-[#ea690c]">
                                  <CheckIcon className="w-4 h-4 text-white" />
                                </div>
                              )}
                            </div>

                            {rider.phoneNumber && (
                              <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-2">
                                  <PhoneIcon className="w-4 h-4 text-[#5d5d5d]" />
                                  <a
                                    href={`tel:${rider.phoneNumber}`}
                                    className="[font-family:'Lato',Helvetica] font-normal text-neutral-700 text-sm hover:text-[#ea690c]"
                                  >
                                    {formatPhoneNumber(rider.phoneNumber)}
                                  </a>
                                </div>
                              </div>
                            )}

                            {rider.office && (
                              <div className="flex items-center gap-2 pt-2 border-t border-[#d1d1d1]">
                                <MapPinIcon className="w-4 h-4 text-[#5d5d5d]" />
                                <span className="[font-family:'Lato',Helvetica] font-normal text-neutral-700 text-sm">
                                  {rider.office.name}
                                </span>
                              </div>
                            )}

                            {rider.status && (
                              <div className="flex items-center justify-end pt-2">
                                <Badge
                                  className={`${
                                    rider.status === "ACTIVE"
                                      ? "bg-green-100 text-green-800 hover:bg-green-100"
                                      : "bg-gray-100 text-gray-800 hover:bg-gray-100"
                                  }`}
                                >
                                  {rider.status}
                                </Badge>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {selectedRider && (
                      <div className="flex justify-end pt-4 border-t border-[#d1d1d1]">
                        <Button
                          onClick={handleAssign}
                          disabled={isAssigning}
                          className="flex items-center justify-center gap-3 rounded bg-[#ea690c] px-6 py-3 hover:bg-[#ea690c]/90 disabled:opacity-50"
                        >
                          <span className="font-body-md-semibold font-[number:var(--body-md-semibold-font-weight)] text-white text-[length:var(--body-md-semibold-font-size)] tracking-[var(--body-md-semibold-letter-spacing)] leading-[var(--body-md-semibold-line-height)] [font-style:var(--body-md-semibold-font-style)]">
                            {isAssigning
                              ? "Assigning..."
                              : `Assign ${selectedParcelIds.length} Parcel(s) to ${selectedRiderData?.name || "Rider"}`}
                          </span>
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
};
