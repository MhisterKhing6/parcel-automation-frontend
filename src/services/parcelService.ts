import axios, { AxiosInstance } from 'axios';
import authService from './authService';
import { API_ENDPOINTS } from '../config/api';

const API_BASE_URL_ADMIN = API_ENDPOINTS.ADMIN;

interface ParcelSearchFilters {
    isPOD?: boolean;
    isDelivered?: boolean;
    isParcelAssigned?: boolean;
    officeId?: string;
    driverId?: string;
    hasCalled?: string;
    limit?: string;
    page?: string;
}

interface PageableRequest {
    page?: number;
    size?: number;
    sort?: string[];
}

interface ApiParcel {
    parcelId: string;
    senderName?: string;
    senderPhoneNumber?: string;
    receiverName?: string;
    receiverAddress?: string;
    recieverPhoneNumber?: string;
    parcelDescription?: string;
    driverName?: string;
    driverPhoneNumber?: string;
    inboundCost?: number;
    pickUpCost?: number;
    deliveryCost?: number;
    storageCost?: number;
    pod?: boolean;
    delivered?: boolean;
    parcelAssigned?: boolean;
    fragile?: boolean;
}

interface PageParcelResponse {
    content: ApiParcel[];
    totalElements: number;
    totalPages: number;
    first: boolean;
    last: boolean;
    size: number;
    number: number;
    numberOfElements: number;
    empty: boolean;
}

interface ParcelResponse {
    success: boolean;
    message: string;
    data?: PageParcelResponse;
}

class ParcelService {
    private apiClientAdmin: AxiosInstance;

    constructor() {
        // Admin API Client
        this.apiClientAdmin = axios.create({
            baseURL: API_BASE_URL_ADMIN,
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
    }

    /**
     * Get all parcels with filters and pagination (using Admin API)
     */
    async getParcels(
        filters: ParcelSearchFilters = {},
        pageable: PageableRequest = { page: 0, size: 50 }
    ): Promise<ParcelResponse> {
        try {
            // Build query parameters
            const params = new URLSearchParams();
            
            // Add pagination
            params.append('page', (pageable.page || 0).toString());
            params.append('size', (pageable.size || 50).toString());
            
            if (pageable.sort && pageable.sort.length > 0) {
                pageable.sort.forEach(sort => {
                    params.append('sort', sort);
                });
            }

            // Add filters
            if (filters.isPOD !== undefined) {
                params.append('isPOD', filters.isPOD.toString());
            }
            if (filters.isDelivered !== undefined) {
                params.append('isDelivered', filters.isDelivered.toString());
            }
            if (filters.isParcelAssigned !== undefined) {
                params.append('isParcelAssigned', filters.isParcelAssigned.toString());
            }
            if (filters.officeId) {
                params.append('officeId', filters.officeId);
            }
            if (filters.driverId) {
                params.append('driverId', filters.driverId);
            }
            if (filters.hasCalled) {
                params.append('hasCalled', filters.hasCalled);
            }
            if (filters.limit) {
                params.append('limit', filters.limit);
            }
            if (filters.page) {
                params.append('page', filters.page);
            }

            const response = await this.apiClientAdmin.get<PageParcelResponse>(
                `/parcels?${params.toString()}`
            );

            return {
                success: true,
                message: 'Parcels retrieved successfully',
                data: response.data,
            };
        } catch (error: any) {
            console.error('Get parcels error:', error);
            return {
                success: false,
                message: error.response?.data?.message || 'Failed to retrieve parcels. Please try again.',
            };
        }
    }
}

export default new ParcelService();
export type { ApiParcel, PageParcelResponse, ParcelSearchFilters, PageableRequest };


