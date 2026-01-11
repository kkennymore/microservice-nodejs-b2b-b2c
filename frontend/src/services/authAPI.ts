import axios from 'axios'

// Create axios instance with base configuration
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('authToken')
      localStorage.removeItem('refreshToken')
      // Redirect to login if not already there
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export interface LoginData {
  email: string
  password: string
  rememberMe?: boolean
}

export interface RegisterData {
  username: string
  email: string
  firstName: string
  lastName: string
  phone: string
  password: string
  role: 'buyer' | 'seller'
}

export interface User {
  id: string
  username: string
  email: string
  firstName: string
  lastName: string
  phone: string
  role: 'buyer' | 'seller' | 'admin'
  subscriptionPlan: 'free' | 'silver' | 'gold' | 'platinum'
  subscriptionStatus: 'active' | 'expired' | 'cancelled' | 'trial'
  subscriptionEndDate?: string
  preferences: {
    language: string
    currency: string
    theme: string
    notifications: boolean
  }
  avatar?: string
  isEmailVerified: boolean
  isPhoneVerified: boolean
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface AuthResponse {
  success: boolean
  data: {
    user: User
    accessToken: string
    refreshToken: string
  }
  message?: string
}

export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
  errors?: string[]
}

class AuthAPI {
  // Authentication methods
  async login(data: LoginData): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/login', data)
    return response.data
  }

  async register(data: RegisterData): Promise<ApiResponse<{ message: string }>> {
    const response = await api.post<ApiResponse<{ message: string }>>('/auth/register', data)
    return response.data
  }

  async logout(): Promise<ApiResponse<{ message: string }>> {
    const response = await api.post<ApiResponse<{ message: string }>>('/auth/logout')
    return response.data
  }

  async refreshToken(): Promise<AuthResponse> {
    const refreshToken = localStorage.getItem('refreshToken')
    const response = await api.post<AuthResponse>('/auth/refresh', {
      refreshToken
    })
    return response.data
  }

  async getCurrentUser(): Promise<ApiResponse<User>> {
    const response = await api.get<ApiResponse<User>>('/auth/me')
    return response.data
  }

  // Email verification
  async verifyEmail(token: string): Promise<ApiResponse<{ message: string }>> {
    const response = await api.post<ApiResponse<{ message: string }>>('/auth/verify-email', { token })
    return response.data
  }

  async resendVerification(email: string): Promise<ApiResponse<{ message: string }>> {
    const response = await api.post<ApiResponse<{ message: string }>>('/auth/resend-verification', { email })
    return response.data
  }

  // Password reset
  async forgotPassword(email: string): Promise<ApiResponse<{ message: string }>> {
    const response = await api.post<ApiResponse<{ message: string }>>('/auth/forgot-password', { email })
    return response.data
  }

  async resetPassword(token: string, newPassword: string): Promise<ApiResponse<{ message: string }>> {
    const response = await api.post<ApiResponse<{ message: string }>>('/auth/reset-password', {
      token,
      password: newPassword
    })
    return response.data
  }

  // Profile management
  async updateProfile(userData: Partial<User>): Promise<ApiResponse<User>> {
    const response = await api.put<ApiResponse<User>>('/auth/profile', userData)
    return response.data
  }

  async updatePreferences(preferences: User['preferences']): Promise<ApiResponse<User>> {
    const response = await api.put<ApiResponse<User>>('/auth/preferences', preferences)
    return response.data
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<ApiResponse<{ message: string }>> {
    const response = await api.post<ApiResponse<{ message: string }>>('/auth/change-password', {
      currentPassword,
      newPassword
    })
    return response.data
  }

  async changeEmail(newEmail: string, password: string): Promise<ApiResponse<{ message: string }>> {
    const response = await api.post<ApiResponse<{ message: string }>>('/auth/change-email', {
      newEmail,
      password
    })
    return response.data
  }

  async uploadAvatar(file: File): Promise<ApiResponse<{ avatar: string }>> {
    const formData = new FormData()
    formData.append('avatar', file)

    const response = await api.post<ApiResponse<{ avatar: string }>>('/auth/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    return response.data
  }

  // Two-factor authentication
  async enable2FA(): Promise<ApiResponse<{ secret: string; qrCode: string }>> {
    const response = await api.post<ApiResponse<{ secret: string; qrCode: string }>>('/auth/2fa/enable')
    return response.data
  }

  async verify2FA(token: string): Promise<ApiResponse<{ message: string }>> {
    const response = await api.post<ApiResponse<{ message: string }>>('/auth/2fa/verify', { token })
    return response.data
  }

  async disable2FA(password: string): Promise<ApiResponse<{ message: string }>> {
    const response = await api.post<ApiResponse<{ message: string }>>('/auth/2fa/disable', { password })
    return response.data
  }

  // Social authentication
  async loginWithGoogle(): Promise<void> {
    window.location.href = `${api.defaults.baseURL}/auth/google`
  }

  async loginWithFacebook(): Promise<void> {
    window.location.href = `${api.defaults.baseURL}/auth/facebook`
  }

  // Subscription management
  async getSubscription(): Promise<ApiResponse<{
    plan: string
    status: string
    features: Record<string, boolean>
    endDate?: string
  }>> {
    const response = await api.get<ApiResponse<{
      plan: string
      status: string
      features: Record<string, boolean>
      endDate?: string
    }>>('/auth/subscription')
    return response.data
  }

  async upgradeSubscription(plan: string, durationMonths: number = 1): Promise<ApiResponse<{
    plan: string
    endDate: string
  }>> {
    const response = await api.post<ApiResponse<{
      plan: string
      endDate: string
    }>>('/auth/subscription/upgrade', { plan, durationMonths })
    return response.data
  }

  // Security
  async getLoginHistory(): Promise<ApiResponse<Array<{
    id: string
    ip: string
    userAgent: string
    location: string
    createdAt: string
  }>>> {
    const response = await api.get<ApiResponse<Array<{
      id: string
      ip: string
      userAgent: string
      location: string
      createdAt: string
    }>>>('/auth/security/login-history')
    return response.data
  }

  async getActiveSessions(): Promise<ApiResponse<Array<{
    id: string
    device: string
    location: string
    lastActivity: string
  }>>> {
    const response = await api.get<ApiResponse<Array<{
      id: string
      device: string
      location: string
      lastActivity: string
    }>>>('/auth/security/sessions')
    return response.data
  }

  async terminateSession(sessionId: string): Promise<ApiResponse<{ message: string }>> {
    const response = await api.delete<ApiResponse<{ message: string }>>(`/auth/security/sessions/${sessionId}`)
    return response.data
  }

  async terminateAllSessions(): Promise<ApiResponse<{ message: string }>> {
    const response = await api.delete<ApiResponse<{ message: string }>>('/auth/security/sessions')
    return response.data
  }
}

export const authAPI = new AuthAPI()
export default authAPI