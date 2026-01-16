import axios, { AxiosInstance } from 'axios';
import authService from './authService';
import { API_ENDPOINTS } from '../config/api';

const API_BASE_URL_ADMIN = API_ENDPOINTS.ADMIN;
const API_BASE_URL_OFFICES = API_ENDPOINTS.OFFICES;

interface Office {
    id: string;
    name: string;
    code: string;
    address: string;
    locationName: string;
    managerName: string;
    createdAt: number;
}

interface Station extends Office { }

interface Location {
    id: string;
    name: string;
    region: string;
    country: string;
    offices: Station[]; // offices are stations
}

interface CreateLocationRequest {
    name: string;
    region?: string;
    country?: string;
}

interface CreateStationRequest {
    name: string;
    address: string;
    locationId: string;
    managerId?: string | null;
}

interface StationResponse {
    success: boolean;
    message: string;
    data?: Station | Station[];
}

interface LocationResponse {
    success: boolean;
    message: string;
    data?: Location | Location[];
}

class LocationService {
    private apiClientAdmin: AxiosInstance;
    private apiClientOffices: AxiosInstance;

    constructor() {
        // Admin API Client
        this.apiClientAdmin = axios.create({
            baseURL: API_BASE_URL_ADMIN,
            headers: {
                'Content-Type': 'application/json',
            },
        });

        // Offices API Client
        this.apiClientOffices = axios.create({
            baseURL: API_BASE_URL_OFFICES,
            headers: {
                'Content-Type': 'application/json',
            },
        });

        // Add request interceptor to include token for Admin API
        this.apiClientAdmin.interceptors.request.use(
            (config) => {
                const token = authService.getToken();
                if (token) {
                    config.headers.Authorization = `Bearer ${token}`;
                }
                return config;
            },
            (error) => Promise.reject(error)
        );

        // Add request interceptor to include token for Offices API
        this.apiClientOffices.interceptors.request.use(
            (config) => {
                const token = authService.getToken();
                if (token) {
                    config.headers.Authorization = `Bearer ${token}`;
                }
                return config;
            },
            (error) => Promise.reject(error)
        );

        // Add response interceptor to handle errors for Admin API
        this.apiClientAdmin.interceptors.response.use(
            (response) => response,
            (error) => {
                if (error.response?.status === 401) {
                    authService.logout();
                    window.location.href = '/login';
                }
                return Promise.reject(error);
            }
        );

        // Add response interceptor to handle errors for Offices API
        this.apiClientOffices.interceptors.response.use(
            (response) => response,
            (error) => {
                if (error.response?.status === 401) {
                    authService.logout();
                    window.location.href = '/login';
                }
                return Promise.reject(error);
            }
        );
    }

    /**
     * Create a new location (using Admin API)
     */
    async createLocation(locationData: CreateLocationRequest): Promise<LocationResponse> {
        try {
            const response = await this.apiClientAdmin.post<LocationResponse>(
                '/location',
                locationData
            );

            return {
                success: true,
                message: 'Location created successfully',
                data: response.data.data,
            };
        } catch (error: any) {
            console.error('Create location error:', error);
            return {
                success: false,
                message: error.response?.data?.message || 'Failed to create location. Please try again.',
            };
        }
    }

    /**
     * Create a new station/office (using Admin API)
     */
    async createStation(stationData: CreateStationRequest): Promise<StationResponse> {
        try {
            // Only include managerId if it's provided and not null
            const payload = {
                name: stationData.name,
                address: stationData.address,
                locationId: stationData.locationId,
                ...(stationData.managerId && { managerId: stationData.managerId }),
            };

            const response = await this.apiClientAdmin.post<StationResponse>(
                '/office',
                payload
            );

            return {
                success: true,
                message: 'Station created successfully',
                data: response.data.data,
            };
        } catch (error: any) {
            console.error('Create station error:', error);
            return {
                success: false,
                message: error.response?.data?.message || 'Failed to create station. Please try again.',
            };
        }
    }

    /**
     * Get all locations with offices (stations) (using Offices API)
     */
    async getLocations(): Promise<LocationResponse> {
        try {
            const response = await this.apiClientOffices.get<Location[]>('/locations');

            return {
                success: true,
                message: 'Locations retrieved successfully',
                data: response.data,
            };
        } catch (error: any) {
            console.error('Get locations error:', error);
            return {
                success: false,
                message: error.response?.data?.message || 'Failed to retrieve locations. Please try again.',
            };
        }
    }

    /**
     * Get all stations (offices) from all locations
     */
    async getAllStations(): Promise<{ success: boolean; message: string; data?: Station[] }> {
        try {
            const response = await this.getLocations();

            if (response.success && Array.isArray(response.data)) {
                // Flatten all offices from all locations
                const allStations: Station[] = [];
                response.data.forEach((location) => {
                    if (location.offices && Array.isArray(location.offices)) {
                        allStations.push(...location.offices);
                    }
                });

                return {
                    success: true,
                    message: 'Stations retrieved successfully',
                    data: allStations,
                };
            }

            return {
                success: false,
                message: 'No stations found',
            };
        } catch (error: any) {
            console.error('Get all stations error:', error);
            return {
                success: false,
                message: error.message || 'Failed to retrieve stations. Please try again.',
            };
        }
    }

    /**
     * Get stations by location ID
     */
    async getStationsByLocation(locationId: string): Promise<{ success: boolean; message: string; data?: Station[] }> {
        try {
            const response = await this.getLocationById(locationId);

            if (response.success && response.data && !Array.isArray(response.data)) {
                const location = response.data as Location;
                return {
                    success: true,
                    message: 'Stations retrieved successfully',
                    data: location.offices || [],
                };
            }

            return {
                success: false,
                message: 'Location not found',
            };
        } catch (error: any) {
            console.error('Get stations by location error:', error);
            return {
                success: false,
                message: error.message || 'Failed to retrieve stations. Please try again.',
            };
        }
    }

    /**
     * Get location by ID (using Offices API)
     */
    async getLocationById(locationId: string): Promise<LocationResponse> {
        try {
            const response = await this.apiClientOffices.get<Location>(
                `/${locationId}`
            );

            return {
                success: true,
                message: 'Location retrieved successfully',
                data: response.data,
            };
        } catch (error: any) {
            console.error('Get location error:', error);
            return {
                success: false,
                message: error.response?.data?.message || 'Failed to retrieve location. Please try again.',
            };
        }
    }

    /**
     * Update location (using Admin API)
     */
    async updateLocation(
        locationId: string,
        locationData: Partial<CreateLocationRequest>
    ): Promise<LocationResponse> {
        try {
            const response = await this.apiClientAdmin.put<LocationResponse>(
                `/location/${locationId}`,
                locationData
            );

            return {
                success: true,
                message: 'Location updated successfully',
                data: response.data.data,
            };
        } catch (error: any) {
            console.error('Update location error:', error);
            return {
                success: false,
                message: error.response?.data?.message || 'Failed to update location. Please try again.',
            };
        }
    }

    /**
     * Delete location (using Admin API)
     */
    async deleteLocation(locationId: string): Promise<LocationResponse> {
        try {
            const response = await this.apiClientAdmin.delete<LocationResponse>(
                `/location/${locationId}`
            );

            return {
                success: true,
                message: 'Location deleted successfully',
                data: response.data.data,
            };
        } catch (error: any) {
            console.error('Delete location error:', error);
            return {
                success: false,
                message: error.response?.data?.message || 'Failed to delete location. Please try again.',
            };
        }
    }
}

export default new LocationService();
