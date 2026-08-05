/**
 * Token Cleanup Utility
 * Runs on app initialization to detect and remove invalid/corrupted tokens
 */

const TOKEN_KEY = 'elevate_auth_token'
const USER_KEY = 'elevate_user'

export const cleanupTokens = () => {
    if (typeof window === 'undefined') return
    
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) return
    
    try {
        // Decode JWT without verification
        const parts = token.split('.')
        if (parts.length !== 3) {
            console.warn('Token: Invalid JWT format - removing')
            cleanupInvalidToken()
            return
        }
        
        // Decode payload using atob for browser compatibility
        const payload = JSON.parse(atob(parts[1]))
        
        const userId = payload.userId || payload.sub
        
        // Check if userId looks like a guest ID (contains "guest_" pattern)
        if (userId && typeof userId === 'string') {
            if (userId.includes('guest_') || userId.startsWith('guest')) {
                console.warn('Token: Contains guest user ID - removing', { userId })
                cleanupInvalidToken()
                return
            }
            
            // Check if userId is valid MongoDB ObjectId format (24 hex chars)
            if (!/^[0-9a-f]{24}$/i.test(userId)) {
                console.warn('Token: Invalid ObjectId format - removing', { userId })
                cleanupInvalidToken()
                return
            }
        } else {
            console.warn('Token: Missing userId - removing')
            cleanupInvalidToken()
            return
        }
        
        // Check if token is expired
        if (payload.exp && typeof payload.exp === 'number') {
            if (payload.exp * 1000 < Date.now()) {
                console.warn('Token: Expired token - removing')
                cleanupInvalidToken()
                return
            }
        }
        
        console.log('Token: Valid token found')
        
    } catch (error) {
        console.error('Token: Error during cleanup validation', error)
        cleanupInvalidToken()
    }
}

const cleanupInvalidToken = () => {
    console.log('Cleaning up invalid token and user data')
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
}

// Force cleanup helper (for manual testing)
export const forceCleanupTokens = () => {
    console.log('Force cleaning up all stored tokens')
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    if (typeof window !== 'undefined' && window.location.pathname !== '/auth/login') {
        window.location.href = '/auth/login'
    }
}
