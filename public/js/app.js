// Main Application - Ties all modules together
class App {
    constructor() {
        this.canvasManager = null;
        this.aiFeatures = null;
        this.cvBuilder = null;
        this.isInitialized = false;
    }

    async initialize() {
        try {
            // Check authentication
            if (!window.authManager.isAuthenticated()) {
                window.location.href = 'login.html';
                return;
            }

            // Check dependencies
            await this.checkDependencies();

            // Initialize canvas manager
            this.canvasManager = new CanvasManager();
            await this.canvasManager.init('canvas', 1080, 1080);

            // Initialize AI features
            this.aiFeatures = new AIFeatures(this.canvasManager);
            
            // Initialize CV builder
            this.cvBuilder = new CVBuilder(this.canvasManager);
            this.cvBuilder.init();

            // Setup UI
            this.setupUIListeners();
            this.setupKeyboardShortcuts();

            // Check for auto-save
            this.checkAutoSave();

            // Open specific feature if requested
            this.openRequestedFeature();

            this.isInitialized = true;
            console.log('🎨 AI Design Studio initialized successfully!');
            
            utils.showAlert('Design Studio loaded successfully!', 'success', 3000);

        } catch (error) {
            console.error('❌ Error initializing application:', error);
            utils.showAlert('Failed to initialize application. Please refresh the page.', 'error');
        }
    }

    async checkDependencies() {
        const dependencies = {
            'Fabric.js': typeof fabric,
            'Authentication': typeof authManager,
            'Utils': typeof utils,
            'API Service': typeof apiService
        };

        for (const [name, value] of Object.entries(dependencies)) {
            if (value === 'undefined') {
                throw new Error(`${name} is not loaded`);
            }
        }
    }

    setupUIListeners() {
        this.setupSidebarTabs();
        this.setupToolbarListeners();
        this.setupPropertiesPanel();
        this.setupPageSizeControls();
    }

    setupSidebarTabs() {
        const sidebarTabs = document.querySelectorAll('.sidebar-tab');
        const tabContents = document.querySelectorAll('.tab-content');

        sidebarTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.dataset.tab;

                // Update active tab
                sidebarTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                // Show corresponding content
                tabContents.forEach(content => {
                    content.classList.remove('active');
                    if (content.id === tabName + 'Tab') {
                        content.classList.add('active');
                    }
                });
            });
        });
    }

    setupToolbarListeners() {
        // Add object buttons
        document.addEventListener('click', (e) => {
            if (e.target.closest('[onclick]')) {
                const onclick = e.target.closest('[onclick]').getAttribute('onclick');
                if (onclick && onclick.includes('app.')) {
                    // These are handled by the onclick attributes in HTML
                    return;
                }
            }
        });
    }

    setupPropertiesPanel() {
        // Listen for selection changes
        window.addEventListener('canvas:selectionChanged', (e) => {
            const selected = e.detail.selected;
            if (selected.length === 1) {
                this.updatePropertiesPanel(selected[0]);
            } else if (selected.length > 1) {
                this.showMultipleSelection();
            } else {
                this.clearPropertiesPanel();
            }
        });
    }

    setupPageSizeControls() {
        const applyBtn = document.getElementById('applySizeBtn');
        if (applyBtn) {
            applyBtn.addEventListener('click', () => {
                this.resizeCanvas();
            });
        }
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Only handle shortcuts when not in input fields
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
                return;
            }

            // Delete/Backspace
            if (e.key === 'Delete' || e.key === 'Backspace') {
                e.preventDefault();
                if (this.canvasManager.deleteSelected()) {
                    utils.showAlert('Object deleted', 'info', 2000);
                }
            }

            // Undo/Redo
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                if (this.canvasManager.undo()) {
                    utils.showAlert('Undo', 'info', 1000);
                }
            }

            if (((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z') || 
                ((e.ctrlKey || e.metaKey) && e.key === 'y')) {
                e.preventDefault();
                if (this.canvasManager.redo()) {
                    utils.showAlert('Redo', 'info', 1000);
                }
            }
        });
    }

    updatePropertiesPanel(obj) {
        const panel = document.getElementById('propertiesPanel');
        if (!panel) return;

        let html = `
            <div class="property-group">
                <label class="property-label">Position</label>
                <div style="display: flex; gap: 10px; margin-bottom: 10px;">
                    <input type="number" class="property-input" value="${Math.round(obj.left)}" 
                           onchange="app.updateObjectProperty('left', parseInt(this.value))" placeholder="X">
                    <input type="number" class="property-input" value="${Math.round(obj.top)}" 
                           onchange="app.updateObjectProperty('top', parseInt(this.value))" placeholder="Y">
                </div>
            </div>

            <div class="property-group">
                <label class="property-label">Size</label>
                <div style="display: flex; gap: 10px;">
                    <input type="number" class="property-input" value="${Math.round(obj.width * obj.scaleX)}" 
                           onchange="app.updateObjectSize('width', parseInt(this.value))" placeholder="Width">
                    <input type="number" class="property-input" value="${Math.round(obj.height * obj.scaleY)}" 
                           onchange="app.updateObjectSize('height', parseInt(this.value))" placeholder="Height">
                </div>
            </div>

            <div class="property-group">
                <label class="property-label">Rotation</label>
                <input type="range" min="0" max="360" value="${Math.round(obj.angle)}" 
                       oninput="app.updateObjectProperty('angle', parseInt(this.value))">
                <div style="text-align: center; color: #8e9caf; font-size: 12px;">
                    ${Math.round(obj.angle)}°
                </div>
            </div>
        `;

        if (obj.type === 'i-text') {
            html += `
                <div class="property-group">
                    <label class="property-label">Text</label>
                    <textarea class="property-input" onchange="app.updateObjectProperty('text', this.value)">${obj.text}</textarea>
                </div>
                <div class="property-group">
                    <label class="property-label">Font Size</label>
                    <input type="number" class="property-input" value="${obj.fontSize}" 
                           onchange="app.updateObjectProperty('fontSize', parseInt(this.value))">
                </div>
                <div class="property-group">
                    <label class="property-label">Color</label>
                    <input type="color" class="property-input" value="${obj.fill}" 
                           onchange="app.updateObjectProperty('fill', this.value)" style="height: 40px;">
                </div>
            `;
        } else if (obj.type === 'rect' || obj.type === 'circle') {
            html += `
                <div class="property-group">
                    <label class="property-label">Fill Color</label>
                    <input type="color" class="property-input" value="${obj.fill}" 
                           onchange="app.updateObjectProperty('fill', this.value)" style="height: 40px;">
                </div>
            `;
        }

        panel.innerHTML = html;
    }

    updateObjectProperty(property, value) {
        const obj = this.canvasManager.getActiveObject();
        if (obj) {
            obj.set(property, value);
            this.canvasManager.canvas.renderAll();
        }
    }

    updateObjectSize(dimension, value) {
        const obj = this.canvasManager.getActiveObject();
        if (obj) {
            if (dimension === 'width') {
                const scaleX = value / obj.width;
                obj.set('scaleX', scaleX);
            } else if (dimension === 'height') {
                const scaleY = value / obj.height;
                obj.set('scaleY', scaleY);
            }
            this.canvasManager.canvas.renderAll();
        }
    }

    showMultipleSelection() {
        const panel = document.getElementById('propertiesPanel');
        panel.innerHTML = `
            <div style="text-align: center; color: #8e9caf; margin-top: 50px;">
                <i class="fas fa-object-group" style="font-size: 2rem; margin-bottom: 1rem;"></i>
                <p>Multiple objects selected</p>
                <p style="font-size: 0.8rem; margin-top: 1rem;">Group them to edit together</p>
            </div>
        `;
    }

    clearPropertiesPanel() {
        const panel = document.getElementById('propertiesPanel');
        panel.innerHTML = `
            <div style="text-align: center; color: #8e9caf; margin-top: 50px;">
                <i class="fas fa-mouse-pointer" style="font-size: 2rem; margin-bottom: 1rem;"></i>
                <p>Select an object to edit properties</p>
            </div>
        `;
    }

    checkAutoSave() {
        const autoSave = localStorage.getItem('autoSave');
        if (autoSave) {
            const restore = confirm('An auto-saved design was found. Would you like to restore it?');
            if (restore) {
                try {
                    const design = JSON.parse(autoSave);
                    this.canvasManager.loadState(design);
                    utils.showAlert('Auto-save restored', 'success');
                } catch (error) {
                    console.error('Failed to restore auto-save:', error);
                }
            }
            localStorage.removeItem('autoSave');
        }
    }

    openRequestedFeature() {
        const openFeature = localStorage.getItem('openFeature');
        if (openFeature) {
            localStorage.removeItem('openFeature');
            
            switch (openFeature) {
                case 'image':
                    this.showImageGenerator();
                    break;
                case 'background':
                    this.removeBackground();
                    break;
                case 'video':
                    this.showVideoGenerator();
                    break;
                case 'cv':
                    // Switch to CV tab
                    document.querySelector('[data-tab="cv"]').click();
                    break;
            }
        }
    }

    // Toolbar Actions
    addText() {
        this.canvasManager.addText();
        utils.showAlert('Text added to canvas', 'success', 2000);
    }

    addRectangle() {
        this.canvasManager.addRectangle();
        utils.showAlert('Rectangle added to canvas', 'success', 2000);
    }

    addCircle() {
        this.canvasManager.addCircle();
        utils.showAlert('Circle added to canvas', 'success', 2000);
    }

    deleteSelected() {
        if (this.canvasManager.deleteSelected()) {
            utils.showAlert('Object deleted', 'info', 2000);
        }
    }

    undo() {
        if (this.canvasManager.undo()) {
            utils.showAlert('Undo', 'info', 1000);
        }
    }

    redo() {
        if (this.canvasManager.redo()) {
            utils.showAlert('Redo', 'info', 1000);
        }
    }

    resizeCanvas() {
        const width = parseInt(document.getElementById('canvasWidth').value);
        const height = parseInt(document.getElementById('canvasHeight').value);
        
        if (width > 0 && height > 0) {
            this.canvasManager.setSize(width, height);
            utils.showAlert(`Canvas size set to ${width}×${height}`, 'success');
        } else {
            utils.showAlert('Please enter valid dimensions', 'error');
        }
    }

    zoomIn() {
        this.canvasManager.zoomIn();
    }

    zoomOut() {
        this.canvasManager.zoomOut();
    }

    fitToScreen() {
        this.canvasManager.fitToScreen();
    }

    loadTemplate(type) {
        this.canvasManager.loadTemplate(type);
    }

    // AI Features
    showImageGenerator() {
        document.getElementById('imageGeneratorModal').classList.add('active');
    }

    closeImageGenerator() {
        document.getElementById('imageGeneratorModal').classList.remove('active');
    }

    async generateImage() {
        const prompt = document.getElementById('aiPrompt').value.trim();
        const style = document.getElementById('aiStyle').value;

        if (!prompt) {
            utils.showAlert('Please enter a prompt', 'error');
            return;
        }

        try {
            await this.aiFeatures.generateImage(prompt, style);
            this.closeImageGenerator();
        } catch (error) {
            // Error is handled in AIFeatures
        }
    }

    async removeBackground() {
        try {
            await this.aiFeatures.removeBackground();
        } catch (error) {
            // Error is handled in AIFeatures
        }
    }

    showVideoGenerator() {
        document.getElementById('videoGeneratorModal').classList.add('active');
    }

    closeVideoGenerator() {
        document.getElementById('videoGeneratorModal').classList.remove('active');
    }

    async generateVideo() {
        const text = document.getElementById('videoText').value.trim();
        const voice = document.getElementById('videoVoice').value;

        if (!text) {
            utils.showAlert('Please enter text for the video', 'error');
            return;
        }

        try {
            await this.aiFeatures.generateVideo(text, null, voice);
            this.closeVideoGenerator();
        } catch (error) {
            // Error is handled in AIFeatures
        }
    }

    async generateCV() {
        await this.cvBuilder.generateCV();
    }

    // Upload
    uploadImage() {
        const input = document.getElementById('imageUpload');
        const file = input.files[0];

        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                this.canvasManager.addImage(e.target.result, {
                    scaleToWidth: 500,
                    center: true
                });
                utils.showAlert('Image uploaded successfully', 'success');
                
                // Add to upload grid
                this.addToUploadGrid(e.target.result);
            };
            reader.readAsDataURL(file);
            
            // Clear input
            input.value = '';
        } else {
            utils.showAlert('Please select an image file', 'error');
        }
    }

    addToUploadGrid(imageData) {
        const grid = document.getElementById('uploadGrid');
        if (!grid) return;

        const item = document.createElement('div');
        item.className = 'upload-item';
        item.innerHTML = `<img src="${imageData}" alt="Uploaded image">`;
        item.onclick = () => {
            this.canvasManager.addImage(imageData, {
                scaleToWidth: 500,
                center: true
            });
        };

        grid.appendChild(item);
    }

    // Export
    showExportModal() {
        document.getElementById('exportModal').classList.add('active');
    }

    closeExportModal() {
        document.getElementById('exportModal').classList.remove('active');
    }

    toggleJpgQuality() {
        const format = document.getElementById('exportFormat').value;
        document.getElementById('jpgQualityDiv').style.display = format === 'jpeg' ? 'block' : 'none';
    }

    updateQualityLabel() {
        const val = document.getElementById('jpgQuality').value;
        document.getElementById('jpgQualityValue').textContent = Math.round(val * 100);
    }

    async confirmExport() {
        const format = document.getElementById('exportFormat').value;
        const scale = parseFloat(document.getElementById('exportScale').value);
        const quality = parseFloat(document.getElementById('jpgQuality').value);

        try {
            const dataURL = this.canvasManager.toDataURL({
                format: format,
                quality: quality,
                multiplier: scale
            });

            const link = document.createElement('a');
            link.download = `design-${Date.now()}.${format === 'jpeg' ? 'jpg' : 'png'}`;
            link.href = dataURL;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            utils.showAlert(`Design exported as ${format.toUpperCase()}`, 'success');
            this.closeExportModal();
        } catch (error) {
            console.error('Export failed:', error);
            utils.showAlert('Export failed', 'error');
        }
    }

    // Auto-save
    setupAutoSave() {
        setInterval(() => {
            if (this.canvasManager && this.canvasManager.history.length > 0) {
                const currentState = this.canvasManager.history[this.canvasManager.historyStep];
                localStorage.setItem('autoSave', currentState);
            }
        }, 30000); // Auto-save every 30 seconds
    }
}

// Make App globally available
window.App = App;