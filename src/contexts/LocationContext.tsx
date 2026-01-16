import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import locationService from "../services/locationService";

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

interface LocationContextType {
    locations: Location[];
    stations: Station[];
    loading: boolean;
    lastFetchTime: number | null;
    refreshLocations: () => Promise<void>;
    invalidateCache: () => void;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

// Cache duration: 5 minutes (300000 ms)
const CACHE_DURATION = 5 * 60 * 1000;

export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [locations, setLocations] = useState<Location[]>([]);
    const [stations, setStations] = useState<Station[]>([]);
    const [loading, setLoading] = useState(false);
    const [lastFetchTime, setLastFetchTime] = useState<number | null>(null);

    const loadLocations = useCallback(async (forceRefresh = false) => {
        // Check if we have cached data and it's still valid
        const now = Date.now();
        if (!forceRefresh && lastFetchTime && (now - lastFetchTime) < CACHE_DURATION) {
            // Use cached data
            return;
        }

        setLoading(true);
        try {
            const response = await locationService.getLocations();
            if (response.success && Array.isArray(response.data)) {
                setLocations(response.data);

                // Flatten all stations from all locations
                const allStations: Station[] = [];
                response.data.forEach((location) => {
                    if (location.offices && Array.isArray(location.offices)) {
                        allStations.push(...location.offices);
                    }
                });
                setStations(allStations);
                setLastFetchTime(now);
            }
        } catch (error) {
            console.error('Failed to load locations:', error);
        } finally {
            setLoading(false);
        }
    }, [lastFetchTime]);

    const refreshLocations = useCallback(async () => {
        await loadLocations(true);
    }, [loadLocations]);

    const invalidateCache = useCallback(() => {
        setLastFetchTime(null);
    }, []);

    // Load data on mount if cache is expired or doesn't exist
    useEffect(() => {
        const now = Date.now();
        if (!lastFetchTime || (now - lastFetchTime) >= CACHE_DURATION) {
            loadLocations(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <LocationContext.Provider
            value={{
                locations,
                stations,
                loading,
                lastFetchTime,
                refreshLocations,
                invalidateCache,
            }}
        >
            {children}
        </LocationContext.Provider>
    );
};

export const useLocation = () => {
    const context = useContext(LocationContext);
    if (context === undefined) {
        throw new Error("useLocation must be used within a LocationProvider");
    }
    return context;
};

