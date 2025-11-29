class ApiService {
    constructor() {
        this.baseUrl = this.getApiUrl();
    }

    getApiUrl() {
        const hostname = window.location.hostname;
        
        // Development
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return 'http://localhost:8000/api';
        }
        
        // Production - UPDATE THIS AFTER DEPLOYMENT
        return 'https://ai-design-studio-api.up.railway.app/api';
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

    // User methods
    async getProfile() {
        return this.request('/user/profile');
    }

    async upgradePlan(plan) {
        return this.request('/user/upgrade', {
            method: 'POST',
            body: { plan }
        });
    }

    // Design methods
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

    // Utility methods
    async checkHealth() {
        try {
            const response = await fetch(`${this.baseUrl.replace('/api', '')}/health`);
            return await response.json();
        } catch (error) {
            throw new Error('Cannot connect to server');
        }
    }

    updateApiUrl(newUrl) {
        this.baseUrl = newUrl;
        console.log('API URL updated to:', this.baseUrl);
    }
}

window.apiService = new ApiService();