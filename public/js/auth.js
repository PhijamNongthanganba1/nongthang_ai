class AuthManager {
    constructor() {
        this.apiBase = '/.netlify/functions';
    }

    async request(endpoint, options = {}) {
        const url = `${this.apiBase}${endpoint}`;
        console.log('🔐 Calling:', url, options.body);
        
        const config = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            body: JSON.stringify(options.body || {})
        };

        try {
            const response = await fetch(url, config);
            
            // Handle non-JSON responses
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const text = await response.text();
                throw new Error(`Server returned: ${text.substring(0, 100)}`);
            }
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || `Request failed with status ${response.status}`);
            }
            
            console.log('✅ Success:', data);
            return data;
        } catch (error) {
            console.error('❌ Request failed:', error);
            throw error;
        }
    }

    async signup(userData) {
        return this.request('/auth', {
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
            body: { action: 'verify' },
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
    }

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

    getToken() {
        return localStorage.getItem('authToken');
    }

    setUserData(token, user) {
        localStorage.setItem('authToken', token);
        localStorage.setItem('currentUser', JSON.stringify(user));
    }
}

// Initialize auth manager
window.authManager = new AuthManager();

// Auto-check auth on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔐 Auth Manager initialized');
    
    if (window.authManager.isAuthenticated()) {
        console.log('✅ User is authenticated');
        // Verify token on page load
        window.authManager.verifyToken().catch(error => {
            console.warn('Token verification failed:', error);
            window.authManager.logout();
        });
    }
});