import axios, { AxiosInstance } from 'axios';
import authService from './authService';
import { API_ENDPOINTS } from '../config/api';

const API_BASE_URL_ADMIN = API_ENDPOINTS.ADMIN;
const API_BASE_URL_USER = API_ENDPOINTS.USER;

interface ShelfRequest {
    name: string;
    officeId: string;
}

interface ApiShelf {
    id: string;
    name: string;
    office?: {
        id: string;
        name: string;
        code: string;
        address?: string;
    };
}

interface ApiResponse {
    success: boolean;
    message: string;
    data?: any;
}

class ShelfService {
    private adminClient: AxiosInstance;
    private userClient: AxiosInstance;

    constructor() {
        // Admin client for creating shelves
        this.adminClient = axios.create({
            baseURL: API_BASE_URL_ADMIN,
            headers: {
                'Content-Type': 'application/json',
            },
        });

        // User client for fetching shelves
        this.userClient = axios.create({
            baseURL: API_BASE_URL_USER,
            headers: {
                'Content-Type': 'application/json',
            },
        });

        // Add request interceptors to include token
        [this.adminClient, this.userClient].forEach(client => {
            client.interceptors.request.use(
                (config) => {
                    const token = authService.getToken();
                    if (token) {
                        config.headers.Authorization = `Bearer ${token}`;
                    }
                    return config;
                },
                (error) => Promise.reject(error)
            );

            // Add response interceptor to handle errors
            client.interceptors.response.use(
                (response) => response,
                (error) => {
                    if (error.response?.status === 401) {
                        authService.logout();
                        window.location.href = '/login';
                    }
                    return Promise.reject(error);
                }
            );
        });
    }

    /**
     * Add a new shelf
     */
    async addShelf(name: string, officeId: string): Promise<ApiResponse> {
        try {
            console.log('Adding shelf:', { name, officeId });
            const response = await this.adminClient.post<{ message: string; id?: string }>('/shelf', {
                name,
                officeId,
            });
            console.log('Shelf added successfully:', response.data);
            return {
                success: true,
                message: response.data.message || 'Shelf added successfully',
                data: response.data,
            };
        } catch (error: any) {
            console.error('Add shelf error:', error);
            console.error('Error response:', error.response?.data);
            console.error('Error status:', error.response?.status);
            
            // Handle different error cases
            let errorMessage = 'Failed to add shelf. Please try again.';
            
            if (error.response) {
                // Server responded with error
                if (error.response.status === 409) {
                    errorMessage = error.response.data?.message || 'A shelf with this name already exists in this office';
                } else if (error.response.data?.message) {
                    errorMessage = error.response.data.message;
                } else {
                    errorMessage = `Server error (${error.response.status}). Please try again.`;
                }
            } else if (error.request) {
                // Request made but no response
                errorMessage = 'No response from server. Please check your connection.';
            } else {
                // Error setting up request
                errorMessage = error.message || 'Failed to add shelf. Please try again.';
            }
            
            return {
                success: false,
                message: errorMessage,
            };
        }
    }

    /**
     * Get shelves for an office
     */
    async getShelvesByOffice(officeId: string): Promise<ApiResponse> {
        try {
            const response = await this.userClient.get<ApiShelf[]>(`/shelf/office/${officeId}`);
            return {
                success: true,
                message: 'Shelves retrieved successfully',
                data: response.data,
            };
        } catch (error: any) {
            console.error('Get shelves error:', error);
            return {
                success: false,
                message: error.response?.data?.message || 'Failed to retrieve shelves. Please try again.',
            };
        }
    }
}

export default new ShelfService();
export type { ApiShelf, ShelfRequest };

