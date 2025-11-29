class AuthManager {
    constructor() {
        this.token = localStorage.getItem('authToken');
        this.currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
        this.apiBase = window.location.origin + '/api';
    }

    async request(endpoint, options = {}) {
        const url = `${this.apiBase}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        if (this.token) {
            config.headers.Authorization = `Bearer ${this.token}`;
        }

        try {
            const response = await fetch(url, config);
            
            if (response.status === 401) {
                this.logout();
                window.location.href = 'login.html';
                return null;
            }

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || `HTTP ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    async login(email, password) {
        try {
            const data = await this.request('/login', {
                method: 'POST',
                body: JSON.stringify({ email, password })
            });

            if (data && data.success) {
                this.token = data.token;
                this.currentUser = data.user;
                
                localStorage.setItem('authToken', this.token);
                localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
                localStorage.setItem('loginTime', new Date().toISOString());
                
                return { success: true, user: data.user };
            }
            
            return { success: false, error: data.error };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async signup(name, email, password) {
        try {
            const data = await this.request('/signup', {
                method: 'POST',
                body: JSON.stringify({ name, email, password })
            });

            if (data && data.success) {
                this.token = data.token;
                this.currentUser = data.user;
                
                localStorage.setItem('authToken', this.token);
                localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
                localStorage.setItem('loginTime', new Date().toISOString());
                
                return { success: true, user: data.user };
            }
            
            return { success: false, error: data.error };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async verifyToken() {
        if (!this.token) return false;
        
        try {
            const data = await this.request('/verify-token', {
                method: 'POST'
            });
            
            return data && data.success;
        } catch (error) {
            return false;
        }
    }

    logout() {
        this.token = null;
        this.currentUser = null;
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
        localStorage.removeItem('loginTime');
        window.location.href = 'login.html';
    }

    isAuthenticated() {
        return !!this.token && !!this.currentUser;
    }

    getCurrentUser() {
        return this.currentUser;
    }
}

// Global auth instance
window.authManager = new AuthManager();