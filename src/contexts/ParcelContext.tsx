import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import parcelService, { ApiParcel, ParcelSearchFilters } from "../services/parcelService";

interface ParcelContextType {
    parcels: ApiParcel[];
    loading: boolean;
    lastFetchTime: number | null;
    pagination: {
        page: number;
        size: number;
        totalElements: number;
        totalPages: number;
    };
    currentFilters: ParcelSearchFilters;
    loadParcelsIfNeeded: (filters?: ParcelSearchFilters, page?: number, size?: number) => Promise<void>;
    refreshParcels: (filters?: ParcelSearchFilters, page?: number, size?: number) => Promise<void>;
    invalidateCache: () => void;
}

const ParcelContext = createContext<ParcelContextType | undefined>(undefined);

// Cache duration: 5 minutes (300000 ms)
const CACHE_DURATION = 5 * 60 * 1000;

export const ParcelProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [parcels, setParcels] = useState<ApiParcel[]>([]);
    const [loading, setLoading] = useState(false);
    const [lastFetchTime, setLastFetchTime] = useState<number | null>(null);
    const [pagination, setPagination] = useState({
        page: 0,
        size: 50,
        totalElements: 0,
        totalPages: 0,
    });
    const [currentFilters, setCurrentFilters] = useState<ParcelSearchFilters>({});

    const loadParcels = useCallback(async (
        filters: ParcelSearchFilters = {},
        page: number = 0,
        size: number = 50,
        forceRefresh = false
    ) => {
        // Check if we have cached data and it's still valid
        const now = Date.now();
        const filtersMatch = JSON.stringify(filters) === JSON.stringify(currentFilters);
        
        if (!forceRefresh && 
            lastFetchTime && 
            (now - lastFetchTime) < CACHE_DURATION && 
            page === pagination.page && 
            size === pagination.size &&
            filtersMatch) {
            // Use cached data if same page, size, and filters
            return;
        }

        setLoading(true);
        try {
            const response = await parcelService.getParcels(filters, { page, size });
            if (response.success && response.data) {
                setParcels(response.data.content);
                setPagination({
                    page: response.data.number,
                    size: response.data.size,
                    totalElements: response.data.totalElements,
                    totalPages: response.data.totalPages,
                });
                setCurrentFilters(filters);
                setLastFetchTime(now);
            }
        } catch (error) {
            console.error('Failed to load parcels:', error);
        } finally {
            setLoading(false);
        }
    }, [lastFetchTime, pagination.page, pagination.size, currentFilters]);

    const loadParcelsIfNeeded = useCallback(async (
        filters: ParcelSearchFilters = {},
        page: number = 0,
        size: number = 50
    ) => {
        await loadParcels(filters, page, size, false);
    }, [loadParcels]);

    const refreshParcels = useCallback(async (
        filters: ParcelSearchFilters = {},
        page: number = 0,
        size: number = 50
    ) => {
        await loadParcels(filters, page, size, true);
    }, [loadParcels]);

    const invalidateCache = useCallback(() => {
        setLastFetchTime(null);
    }, []);

    // Load data on mount if cache is expired or doesn't exist
    useEffect(() => {
        const now = Date.now();
        if (!lastFetchTime || (now - lastFetchTime) >= CACHE_DURATION) {
            loadParcels({}, 0, 50, false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <ParcelContext.Provider
            value={{
                parcels,
                loading,
                lastFetchTime,
                pagination,
                currentFilters,
                loadParcelsIfNeeded,
                refreshParcels,
                invalidateCache,
            }}
        >
            {children}
        </ParcelContext.Provider>
    );
};

export const useParcel = () => {
    const context = useContext(ParcelContext);
    if (context === undefined) {
        throw new Error("useParcel must be used within a ParcelProvider");
    }
    return context;
};

