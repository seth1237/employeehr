// Authentication utilities for token management

const TOKEN_KEY = 'elevate_auth_token'
const TOKEN_COOKIE = 'elevate_auth_token'
const USER_KEY = 'elevate_user'

const setAuthCookie = (token: string): void => {
    document.cookie = `${TOKEN_COOKIE}=${encodeURIComponent(token)}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`
}

const clearAuthCookie = (): void => {
    document.cookie = `${TOKEN_COOKIE}=; path=/; max-age=0; SameSite=Lax`
}

export interface AuthUser {
    _id: string
    userId?: string // Alias for _id
    email: string
    first_name: string
    last_name: string
    role: 'company_admin' | 'admin' | 'hr' | 'manager' | 'employee'
    org_id: string
    token?: string
}

// Token management
export const setToken = (token: string): void => {
    if (typeof window !== 'undefined') {
        // Validate token before storing - check if it's a valid MongoDB ObjectId in payload
        try {
            const parts = token.split('.')
            if (parts.length === 3) {
                // Use atob for browser compatibility
                const payload = JSON.parse(atob(parts[1]))
                const userId = payload.userId || payload.sub
                // MongoDB ObjectId: 24 hex characters
                if (!userId || !/^[0-9a-f]{24}$/i.test(userId)) {
                    console.error('Rejected invalid token: userId is not a valid ObjectId', { userId })
                    return
                }
            }
        } catch (e) {
            console.error('Failed to validate token structure', e)
            return
        }
        localStorage.setItem(TOKEN_KEY, token)
        setAuthCookie(token)
    }
}

export const getToken = (): string | null => {
    if (typeof window !== 'undefined') {
        const token = localStorage.getItem(TOKEN_KEY)
        
        // If token exists but looks invalid, remove it
        if (token) {
            try {
                const parts = token.split('.')
                if (parts.length === 3) {
                    // Use atob for browser compatibility
                    const payload = JSON.parse(atob(parts[1]))
                    const userId = payload.userId || payload.sub
                    if (!userId || !/^[0-9a-f]{24}$/i.test(userId)) {
                        console.warn('Stored token has invalid userId format, clearing it', { userId })
                        localStorage.removeItem(TOKEN_KEY)
                        localStorage.removeItem(USER_KEY)
                        return null
                    }
                }
            } catch (e) {
                console.warn('Failed to validate stored token, clearing it', e)
                localStorage.removeItem(TOKEN_KEY)
                localStorage.removeItem(USER_KEY)
                return null
            }
        }
        
        return token
    }
    return null
}

export const removeToken = (): void => {
    if (typeof window !== 'undefined') {
        localStorage.removeItem(TOKEN_KEY)
        clearAuthCookie()
    }
}

// User management
export const setUser = (user: AuthUser): void => {
    if (typeof window !== 'undefined') {
        localStorage.setItem(USER_KEY, JSON.stringify(user))
    }
}

export const getUser = (): AuthUser | null => {
    if (typeof window !== 'undefined') {
        const userStr = localStorage.getItem(USER_KEY)
        if (userStr) {
            try {
                return JSON.parse(userStr)
            } catch {
                return null
            }
        }
    }
    return null
}

export const removeUser = (): void => {
    if (typeof window !== 'undefined') {
        localStorage.removeItem(USER_KEY)
    }
}

// Auth state
export const isAuthenticated = (): boolean => {
    return !!getToken()
}

// Logout
export const logout = (): void => {
    removeToken()
    removeUser()
    if (typeof window !== 'undefined') {
        // Only redirect if not already on auth page
        const currentPath = window.location.pathname
        if (!currentPath.startsWith('/auth/')) {
            window.location.href = '/auth/login'
        }
    }
}

// Get auth header
export const getAuthHeader = (): { Authorization: string } | {} => {
    const token = getToken()
    return token ? { Authorization: `Bearer ${token}` } : {}
}

// Check if user has role
export const hasRole = (requiredRoles: string[]): boolean => {
    const user = getUser()
    if (!user) return false
    return requiredRoles.includes(user.role)
}

// Check if user is admin
export const isAdmin = (): boolean => {
    return hasRole(['company_admin', 'admin', 'hr'])
}
