class AuthManager {
    constructor() {
        this.apiBase = '/.netlify/functions';
    }

    async request(endpoint, options = {}) {
    const url = `${this.apiBase}${endpoint}`;
    console.log('🔐 Making request to:', url);
    
    try {
        const response = await fetch(url, config);
        console.log('📡 Response status:', response.status);
        console.log('📡 Response headers:', response.headers);
        
        const text = await response.text();
        console.log('📡 Raw response:', text);
        
        // Try to parse as JSON
        const data = JSON.parse(text);
        // ... rest of your code
    } catch (error) {
        console.error('❌ Full error details:', error);
        throw error;
    }
}

    async signup(userData) {
        return this.request('/auth', {
            method: 'POST',
            body: {
                action: 'signup',
                name: userData.name,
                email: userData.email,
                password: userData.password
            }
        });
    }

    async login(credentials) {
        return this.request('/auth', {
            method: 'POST',
            body: {
                action: 'login',
                email: credentials.email,
                password: credentials.password
            }
        });
    }

    async verifyToken() {
        const token = localStorage.getItem('authToken');
        if (!token) {
            throw new Error('No authentication token found');
        }

        return this.request('/auth', {
            method: 'POST',
            body: { action: 'verify' },
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
    }

    // Utility methods
    isAuthenticated() {
        return !!localStorage.getItem('authToken');
    }

    getCurrentUser() {
        const user = localStorage.getItem('currentUser');
        return user ? JSON.parse(user) : null;
    }

    logout() {
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
        window.location.href = 'login.html';
    }

    // Token management
    getToken() {
        return localStorage.getItem('authToken');
    }

    setUserData(token, user) {
        localStorage.setItem('authToken', token);
        localStorage.setItem('currentUser', JSON.stringify(user));
    }
}

// Create global instance
window.authManager = new AuthManager();

// Auto-check authentication on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔐 Auth Manager initialized');
    
    // Check if user is logged in
    if (window.authManager.isAuthenticated()) {
        console.log('✅ User is authenticated');
        
        // Verify token on page load
        window.authManager.verifyToken().catch(error => {
            console.warn('Token verification failed:', error);
            window.authManager.logout();
        });
    } else {
        console.log('ℹ️ User not authenticated');
    }
});