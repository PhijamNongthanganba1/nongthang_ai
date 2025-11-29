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
            console.log('Auth API Call:', endpoint, options.body);
            const response = await fetch(`${this.apiBase}${endpoint}`, config);
            
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const text = await response.text();
                console.error('Non-JSON response:', text.substring(0, 200));
                throw new Error('Server returned HTML instead of JSON. Check if function exists.');
            }
            
            const data = await response.json();
            console.log('Auth API Response:', data);

            if (!response.ok) {
                throw new Error(data.error || `Server error: ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error('Auth API request failed:', error);
            throw error;
        }
    }

    async signup(userData) {
        return this.request('/auth', {
            method: 'POST',
            body: userData
        });
    }

    async login(credentials) {
        return this.request('/auth', {
            method: 'POST',
            body: credentials
        });
    }

    async verifyToken() {
        const token = localStorage.getItem('authToken');
        if (!token) {
            throw new Error('No token found');
        }

        return this.request('/auth', {
            method: 'POST',
            body: { action: 'verify' },
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
    }
}

// Global auth instance
window.authManager = new AuthManager();