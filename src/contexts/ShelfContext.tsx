import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import shelfService, { ApiShelf } from "../services/shelfService";
import { useStation } from "./StationContext";

interface ShelfContextType {
    shelves: ApiShelf[];
    loading: boolean;
    lastFetchTime: number | null;
    loadShelves: (officeId: string) => Promise<void>;
    refreshShelves: (officeId: string) => Promise<void>;
    invalidateCache: () => void;
}

const ShelfContext = createContext<ShelfContextType | undefined>(undefined);

// Cache duration: 5 minutes (300000 ms)
const CACHE_DURATION = 5 * 60 * 1000;

export const ShelfProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [shelves, setShelves] = useState<ApiShelf[]>([]);
    const [loading, setLoading] = useState(false);
    const [lastFetchTime, setLastFetchTime] = useState<number | null>(null);
    const [currentOfficeId, setCurrentOfficeId] = useState<string | null>(null);

    const loadShelves = useCallback(async (officeId: string, forceRefresh = false) => {
        // Check if we have cached data and it's still valid
        const now = Date.now();
        
        if (!forceRefresh && 
            lastFetchTime && 
            (now - lastFetchTime) < CACHE_DURATION && 
            currentOfficeId === officeId &&
            shelves.length > 0) {
            // Use cached data
            return;
        }

        setLoading(true);
        try {
            const response = await shelfService.getShelvesByOffice(officeId);
            
            if (response.success && response.data) {
                setShelves(response.data);
                setLastFetchTime(now);
                setCurrentOfficeId(officeId);
            } else {
                console.error("Failed to load shelves:", response.message);
            }
        } catch (error) {
            console.error("Error loading shelves:", error);
        } finally {
            setLoading(false);
        }
    }, [lastFetchTime, currentOfficeId, shelves.length]);

    const refreshShelves = useCallback(async (officeId: string) => {
        await loadShelves(officeId, true);
    }, [loadShelves]);

    const invalidateCache = useCallback(() => {
        setLastFetchTime(null);
        setCurrentOfficeId(null);
    }, []);

    return (
        <ShelfContext.Provider
            value={{
                shelves,
                loading,
                lastFetchTime,
                loadShelves,
                refreshShelves,
                invalidateCache,
            }}
        >
            {children}
        </ShelfContext.Provider>
    );
};

export const useShelf = () => {
    const context = useContext(ShelfContext);
    if (context === undefined) {
        throw new Error("useShelf must be used within a ShelfProvider");
    }
    return context;
};


