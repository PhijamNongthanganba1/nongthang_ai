class ApiService {
    constructor() {
        this.baseUrl = ''; // Empty - use relative paths
    }

    async request(endpoint, options = {}) {
        const token = localStorage.getItem('authToken');
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        if (options.body && typeof options.body === 'object') {
            config.body = JSON.stringify(options.body);
        }

        try {
            // Use absolute path to Netlify functions
            const response = await fetch(`/.netlify/functions${endpoint}`, config);
            
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const text = await response.text();
                console.error('Non-JSON response:', text.substring(0, 200));
                throw new Error('Server returned HTML instead of JSON');
            }
            
            const data = await response.json();

            if (!response.ok) {
                if (response.status === 402) {
                    throw new Error(data.error || 'Insufficient credits');
                }
                if (response.status === 401) {
                    localStorage.removeItem('authToken');
                    localStorage.removeItem('currentUser');
                    window.location.href = 'login.html';
                    return;
                }
                throw new Error(data.error || `Server error: ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    // Authentication
    async signup(userData) {
        return this.request('/auth', {
            method: 'POST',
            body: { ...userData, action: 'signup' }
        });
    }

    async login(credentials) {
        return this.request('/auth', {
            method: 'POST',
            body: { ...credentials, action: 'login' }
        });
    }

    async verifyToken() {
        return this.request('/auth', {
            method: 'POST',
            body: { action: 'verify' }
        });
    }

    // Keep other methods the same...
    async generateImage(prompt, style = 'digital-art', width = 1024, height = 1024) {
        return this.request('/ai', {
            method: 'POST',
            body: { action: 'generate-image', prompt, style, width, height }
        });
    }

    // ... rest of your methods
}

window.apiService = new ApiService();