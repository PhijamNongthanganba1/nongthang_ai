class AuthManager {
    constructor() {
        this.apiBase = '/api';
    }

    async request(endpoint, options = {}) {
        const config = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        if (options.body && typeof options.body === 'object') {
            config.body = JSON.stringify(options.body);
        }

        const url = `${this.apiBase}${endpoint}`;
        console.log('🔐 Making request to:', url);
        
        try {
            const response = await fetch(url, config);
            console.log('📡 Response status:', response.status);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Server error:', errorText);
                
                try {
                    const errorData = JSON.parse(errorText);
                    throw new Error(errorData.error || `Server error: ${response.status}`);
                } catch (e) {
                    throw new Error(`Server error (${response.status}): ${errorText.substring(0, 100)}`);
                }
            }
            
            const data = await response.json();
            console.log('✅ API Response:', data);
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
        const token = localStorage.getItem('authToken');
        const user = localStorage.getItem('currentUser');
        return !!(token && user);
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

window.authManager = new AuthManager();