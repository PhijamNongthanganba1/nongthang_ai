class CVBuilder {
    constructor(canvasManager) {
        this.canvasManager = canvasManager;
        this.templates = {
            'modern': this.modernTemplate,
            'professional': this.professionalTemplate,
            'creative': this.creativeTemplate
        };
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        // CV generation button
        document.addEventListener('click', (e) => {
            if (e.target.closest('#generateCVBtn')) {
                this.generateCV();
            }
        });
    }

    async generateCV() {
        const userData = this.getFormData();
        
        if (!userData.name || !userData.email) {
            utils.showAlert('Please fill in at least name and email', 'error');
            return;
        }

        try {
            const aiFeatures = new AIFeatures(this.canvasManager);
            await aiFeatures.generateCV(userData, 'modern');
        } catch (error) {
            console.error('CV generation failed:', error);
        }
    }

    getFormData() {
        return {
            name: document.getElementById('cvName')?.value.trim() || '',
            email: document.getElementById('cvEmail')?.value.trim() || '',
            phone: document.getElementById('cvPhone')?.value.trim() || '',
            location: document.getElementById('cvLocation')?.value.trim() || '',
            linkedin: document.getElementById('cvLinkedIn')?.value.trim() || '',
            summary: document.getElementById('cvSummary')?.value.trim() || '',
            experience: document.getElementById('cvExperience')?.value.trim() || '',
            education: document.getElementById('cvEducation')?.value.trim() || '',
            skills: document.getElementById('cvSkills')?.value.trim() || ''
        };
    }

    // Template implementations
    modernTemplate(userData) {
        this.createCVOnCanvas(userData, 'modern');
    }

    professionalTemplate(userData) {
        this.createCVOnCanvas(userData, 'professional');
    }

    creativeTemplate(userData) {
        this.createCVOnCanvas(userData, 'creative');
    }

    createCVOnCanvas(userData, style) {
        // Implementation for different CV styles
        const cvGroup = new fabric.Group([], {
            left: 50,
            top: 50
        });

        // Add styling based on template
        this.applyTemplateStyle(cvGroup, style, userData);
        
        this.canvasManager.canvas.add(cvGroup);
        this.canvasManager.canvas.setActiveObject(cvGroup);
        this.canvasManager.canvas.renderAll();

        return cvGroup;
    }

    applyTemplateStyle(cvGroup, style, userData) {
        // Apply different styles based on template
        switch (style) {
            case 'modern':
                this.applyModernStyle(cvGroup, userData);
                break;
            case 'professional':
                this.applyProfessionalStyle(cvGroup, userData);
                break;
            case 'creative':
                this.applyCreativeStyle(cvGroup, userData);
                break;
        }
    }

    applyModernStyle(cvGroup, userData) {
        let currentTop = 0;

        // Modern header with accent color
        const headerBg = new fabric.Rect({
            left: 0,
            top: 0,
            width: 500,
            height: 120,
            fill: '#7c3aed'
        });
        cvGroup.addWithUpdate(headerBg);

        const nameText = new fabric.Text(userData.name.toUpperCase(), {
            left: 20,
            top: 20,
            fontSize: 28,
            fontFamily: 'Inter',
            fontWeight: 'bold',
            fill: '#ffffff'
        });
        cvGroup.addWithUpdate(nameText);

        currentTop = 150;

        // Add sections with modern styling
        this.addSection(cvGroup, 'Professional Summary', userData.summary, currentTop);
        currentTop += 100;

        if (userData.experience) {
            this.addSection(cvGroup, 'Experience', userData.experience, currentTop);
            currentTop += 150;
        }

        if (userData.skills) {
            this.addSection(cvGroup, 'Skills', userData.skills, currentTop);
        }
    }

    applyProfessionalStyle(cvGroup, userData) {
        let currentTop = 0;

        // Professional header
        const nameText = new fabric.Text(userData.name, {
            left: 0,
            top: currentTop,
            fontSize: 32,
            fontFamily: 'Inter',
            fontWeight: 'bold',
            fill: '#1a1a2e'
        });
        cvGroup.addWithUpdate(nameText);
        currentTop += 50;

        // Contact info in a row
        const contactInfo = [];
        if (userData.email) contactInfo.push(userData.email);
        if (userData.phone) contactInfo.push(userData.phone);
        if (userData.location) contactInfo.push(userData.location);

        const contactText = new fabric.Text(contactInfo.join(' | '), {
            left: 0,
            top: currentTop,
            fontSize: 14,
            fontFamily: 'Inter',
            fill: '#666666'
        });
        cvGroup.addWithUpdate(contactText);
        currentTop += 40;

        // Add sections with professional styling
        this.addSection(cvGroup, 'PROFESSIONAL SUMMARY', userData.summary, currentTop);
        currentTop += 100;

        if (userData.experience) {
            this.addSection(cvGroup, 'EXPERIENCE', userData.experience, currentTop);
        }
    }

    applyCreativeStyle(cvGroup, userData) {
        let currentTop = 0;

        // Creative header with gradient text
        const nameText = new fabric.Text(userData.name, {
            left: 0,
            top: currentTop,
            fontSize: 36,
            fontFamily: 'Inter',
            fontWeight: 'bold',
            fill: '#10b981'
        });
        cvGroup.addWithUpdate(nameText);
        currentTop += 60;

        // Creative layout with icons
        this.addCreativeSection(cvGroup, userData, currentTop);
    }

    addSection(cvGroup, title, content, top) {
        const titleText = new fabric.Text(title, {
            left: 0,
            top: top,
            fontSize: 18,
            fontFamily: 'Inter',
            fontWeight: 'bold',
            fill: '#1a1a2e',
            underline: true
        });
        cvGroup.addWithUpdate(titleText);

        const contentText = new fabric.Text(content, {
            left: 0,
            top: top + 30,
            fontSize: 14,
            fontFamily: 'Inter',
            fill: '#333333',
            width: 450,
            lineHeight: 1.4
        });
        cvGroup.addWithUpdate(contentText);
    }

    addCreativeSection(cvGroup, userData, top) {
        // Implementation for creative sections
        // This would include more graphical elements and creative layouts
    }
}

// Make CVBuilder globally available
window.CVBuilder = CVBuilder;