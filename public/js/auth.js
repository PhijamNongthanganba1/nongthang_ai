class AuthManager {
    constructor() {
        this.apiBase = '/.netlify/functions';
    }

    async request(endpoint, options = {}) {
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        if (options.body && typeof options.body === 'object') {
            config.body = JSON.stringify(options.body);
        }

        try {
            console.log('🔐 Auth API Call:', endpoint, options.body);
            const response = await fetch(`${this.apiBase}${endpoint}`, config);
            
            // Check if response is JSON
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const text = await response.text();
                console.error('❌ Non-JSON response:', text.substring(0, 200));
                throw new Error('Server error: Received HTML instead of JSON. Please check if the function is deployed.');
            }
            
            const data = await response.json();
            console.log('✅ Auth API Response:', data);

            if (!response.ok) {
                throw new Error(data.error || `Server error: ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error('❌ Auth API request failed:', error);
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