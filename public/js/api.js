class ApiService {
    constructor() {
        this.baseUrl = '/api';
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
            
            if (!response.ok) {
                const errorText = await response.text();
                try {
                    const errorData = JSON.parse(errorText);
                    throw new Error(errorData.error || `Server error: ${response.status}`);
                } catch (e) {
                    throw new Error(`Server error (${response.status}): ${errorText.substring(0, 100)}`);
                }
            }
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    // Authentication
    async signup(userData) {
        return this.request('/auth', {
            body: { ...userData, action: 'signup' }
        });
    }

    async login(credentials) {
        return this.request('/auth', {
            body: { ...credentials, action: 'login' }
        });
    }

    async verifyToken() {
        return this.request('/auth', {
            body: { action: 'verify' }
        });
    }

    // AI Features
    async generateImage(prompt, style = 'digital-art', width = 1024, height = 1024) {
        return this.request('/ai/generate-image', {
            body: { prompt, style, width, height }
        });
    }

    async removeBackground(imageData) {
        return this.request('/ai/remove-background', {
            body: { image: imageData }
        });
    }

    async generateVideo(text, imageUrl = null, voiceType = 'en_female_1') {
        return this.request('/ai/generate-video', {
            body: { text, image_url: imageUrl, voice_type: voiceType }
        });
    }

    async generateCV(userData, templateType = 'modern') {
        return this.request('/ai/generate-cv', {
            body: { user_data: userData, template_type: templateType }
        });
    }

    // Designs
    async getDesigns() {
        return this.request('/designs', {
            method: 'GET'
        });
    }

    async saveDesign(name, data) {
        return this.request('/designs', {
            body: { name, data }
        });
    }

    async deleteDesign(designId) {
        return this.request(`/designs/${designId}`, {
            method: 'DELETE'
        });
    }
}

window.apiService = new ApiService();