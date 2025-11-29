class ApiService {
    constructor() {
        this.baseUrl = '/api'; // Same domain - no CORS issues!
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
            const response = await fetch(`${this.baseUrl}${endpoint}`, config);
            
            // Handle non-JSON responses
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error('Server returned non-JSON response');
            }
            
            const data = await response.json();

            if (!response.ok) {
                if (response.status === 402) {
                    throw new Error(data.error || 'Insufficient credits. Please upgrade your plan.');
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
            
            if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
                throw new Error('Network error: Cannot connect to server. Please check your internet connection.');
            }
            
            throw error;
        }
    }

    // Health check
    async checkHealth() {
        return this.request('/ai/health');
    }

    // Authentication
    async signup(userData) {
        return this.request('/auth/signup', {
            method: 'POST',
            body: userData
        });
    }

    async login(credentials) {
        return this.request('/auth/login', {
            method: 'POST',
            body: credentials
        });
    }

    async verifyToken() {
        return this.request('/auth/verify', {
            method: 'POST'
        });
    }

    // User management
    async getProfile() {
        // For now, return mock data - you can extend this later
        const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
        return {
            success: true,
            user: {
                ...user,
                credits: 100,
                usage: { images: 0, videos: 0 }
            }
        };
    }

    async upgradePlan(plan) {
        // Mock upgrade for free tier
        return {
            success: true,
            message: `Upgraded to ${plan} plan successfully!`,
            plan: plan
        };
    }

    // AI Features
    async generateImage(prompt, style = 'digital-art', width = 1024, height = 1024) {
        return this.request('/ai/generate-image', {
            method: 'POST',
            body: { prompt, style, width, height }
        });
    }

    async removeBackground(imageData) {
        return this.request('/ai/remove-background', {
            method: 'POST',
            body: { image: imageData }
        });
    }

    async generateVideo(text, imageUrl = null, voiceType = 'en_female_1') {
        return this.request('/ai/generate-video', {
            method: 'POST',
            body: { text, image_url: imageUrl, voice_type: voiceType }
        });
    }

    async generateCV(userData, templateType = 'modern') {
        return this.request('/ai/generate-cv', {
            method: 'POST',
            body: { user_data: userData, template_type: templateType }
        });
    }

    // Design management
    async saveDesign(designData) {
        return this.request('/designs', {
            method: 'POST',
            body: designData
        });
    }

    async getDesigns() {
        return this.request('/designs');
    }

    async getDesign(id) {
        return this.request(`/designs/${id}`);
    }

    async deleteDesign(id) {
        return this.request(`/designs/${id}`, {
            method: 'DELETE'
        });
    }
}

// Create global instance
window.apiService = new ApiService();

// Test connection on load
document.addEventListener('DOMContentLoaded', function() {
    console.log('AI Design Studio API Service initialized');
    
    // Optional: Test health check
    window.apiService.checkHealth().then(health => {
        console.log('✅ Backend health:', health.status);
    }).catch(error => {
        console.log('ℹ️ Backend health check:', error.message);
    });
});