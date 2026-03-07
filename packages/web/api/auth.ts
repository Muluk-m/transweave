import { apiClient } from "../lib/api";

// API Base Path
const API_BASE = '/api/auth';

// User type definition
export interface User {
  userId: string;
  name: string;
  email: string;
  avatar: string;
}

// Login response type
interface LoginResponse {
  success: boolean;
  message: string;
  token: string;
  user: User;
}

// Registration response type
interface RegisterResponse {
  success: boolean;
  message: string;
  token: string;
  user: User;
}

// Authentication status response type
interface AuthStatusResponse {
  status: string;
  user: User;
}

/**
 * User login
 */
export async function login(email: string, password: string): Promise<LoginResponse> {
  return apiClient.post<LoginResponse>(`${API_BASE}/login`, {
    email,
    password
  }, {
    requireAuth: false // Login doesn't require authentication header
  });
}

/**
 * User registration
 */
export async function register(name: string, email: string, password: string): Promise<RegisterResponse> {
  return apiClient.post<RegisterResponse>(`${API_BASE}/register`, {
    name,
    email,
    password
  }, {
    requireAuth: false // Registration doesn't require authentication header
  });
}

/**
 * Check user authentication status
 */
export async function checkAuthStatus(): Promise<AuthStatusResponse> {
  return apiClient.get<AuthStatusResponse>(`${API_BASE}/status`);
}

/**
 * Get current user information
 */
export async function getCurrentUser(): Promise<User> {
  const response = await checkAuthStatus();
  return response.user;
}

/**
 * Update user profile
 */
export async function updateUserProfile(data: {
  name?: string;
  avatar?: string;
}): Promise<User> {
  return apiClient.put<User>('/api/user/profile', data);
}

/**
 * Change password
 */
export async function changePassword(currentPassword: string, newPassword: string): Promise<{success: boolean; message: string}> {
  return apiClient.post<{success: boolean; message: string}>('/api/user/change-password', {
    currentPassword,
    newPassword
  });
}

/**
 * Check if first-run setup is needed
 */
export async function checkSetupStatus(): Promise<{ needsSetup: boolean }> {
  return apiClient.get<{ needsSetup: boolean }>(`${API_BASE}/setup/status`, {
    requireAuth: false,
  });
}

/**
 * Run first-time setup (create admin user and team)
 */
export async function runSetup(data: {
  name: string;
  email: string;
  password: string;
  teamName: string;
}): Promise<LoginResponse> {
  return apiClient.post<LoginResponse>(`${API_BASE}/setup`, data, {
    requireAuth: false,
  });
}
