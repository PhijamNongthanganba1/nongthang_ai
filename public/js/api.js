class ApiService {
    constructor() {
        this.baseUrl = '/.netlify/functions';
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

    // Designs
    async getDesigns() {
        return this.request('/designs', {
            method: 'GET'
        });
    }

    async saveDesign(name, data) {
        return this.request('/designs', {
            method: 'POST',
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