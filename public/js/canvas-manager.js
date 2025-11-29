class CanvasManager {
    constructor() {
        this.canvas = null;
        this.history = [];
        this.historyStep = -1;
        this.maxHistorySize = 50;
        this.zoomLevel = 1;
    }

    init(canvasId, width = 1080, height = 1080) {
        return new Promise((resolve, reject) => {
            try {
                if (typeof fabric === 'undefined') {
                    throw new Error('Fabric.js not loaded');
                }

                this.canvas = new fabric.Canvas(canvasId, {
                    width: width,
                    height: height,
                    backgroundColor: '#ffffff'
                });

                this.setupEventListeners();
                this.saveState(); // Initial state

                console.log('✅ Canvas initialized successfully');
                resolve(this.canvas);
            } catch (error) {
                console.error('❌ Canvas initialization failed:', error);
                reject(error);
            }
        });
    }

    setupEventListeners() {
        this.canvas.on('object:added', () => this.saveState());
        this.canvas.on('object:modified', () => this.saveState());
        this.canvas.on('object:removed', () => this.saveState());

        this.canvas.on('selection:created', (e) => {
            this.onSelectionChanged(e.selected);
        });

        this.canvas.on('selection:updated', (e) => {
            this.onSelectionChanged(e.selected);
        });

        this.canvas.on('selection:cleared', () => {
            this.onSelectionChanged([]);
        });

        // Zoom with mouse wheel
        this.canvas.on('mouse:wheel', (opt) => {
            const delta = opt.e.deltaY;
            let zoom = this.canvas.getZoom();
            zoom *= 0.999 ** delta;
            if (zoom > 20) zoom = 20;
            if (zoom < 0.01) zoom = 0.01;
            this.zoom(zoom);
            opt.e.preventDefault();
            opt.e.stopPropagation();
        });
    }

    onSelectionChanged(selected) {
        // Dispatch custom event for properties panel
        const event = new CustomEvent('canvas:selectionChanged', {
            detail: { selected }
        });
        window.dispatchEvent(event);
    }

    saveState() {
        // Remove future states if we're not at the end
        if (this.historyStep < this.history.length - 1) {
            this.history = this.history.slice(0, this.historyStep + 1);
        }

        // Add new state
        const state = JSON.stringify(this.canvas);
        this.history.push(state);
        this.historyStep++;

        // Limit history size
        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
            this.historyStep--;
        }
    }

    undo() {
        if (this.historyStep > 0) {
            this.historyStep--;
            this.loadState(this.history[this.historyStep]);
            return true;
        }
        return false;
    }

    redo() {
        if (this.historyStep < this.history.length - 1) {
            this.historyStep++;
            this.loadState(this.history[this.historyStep]);
            return true;
        }
        return false;
    }

    loadState(state) {
        this.canvas.loadFromJSON(state, () => {
            this.canvas.renderAll();
        });
    }

    // Object management
    addText(content = 'New Text', options = {}) {
        const text = new fabric.IText(content, {
            left: this.canvas.width / 2 - 100,
            top: this.canvas.height / 2,
            fontSize: options.fontSize || 48,
            fontFamily: options.fontFamily || 'Inter',
            fontWeight: options.fontWeight || 'normal',
            fill: options.fill || '#000000',
            ...options
        });

        this.canvas.add(text);
        this.canvas.setActiveObject(text);
        this.canvas.renderAll();
        return text;
    }

    addRectangle(options = {}) {
        const rect = new fabric.Rect({
            left: this.canvas.width / 2 - 100,
            top: this.canvas.height / 2 - 75,
            width: options.width || 200,
            height: options.height || 150,
            fill: options.fill || '#7c3aed',
            rx: options.rx || 10,
            ry: options.ry || 10,
            ...options
        });

        this.canvas.add(rect);
        this.canvas.setActiveObject(rect);
        this.canvas.renderAll();
        return rect;
    }

    addCircle(options = {}) {
        const circle = new fabric.Circle({
            left: this.canvas.width / 2 - 75,
            top: this.canvas.height / 2 - 75,
            radius: options.radius || 75,
            fill: options.fill || '#10b981',
            ...options
        });

        this.canvas.add(circle);
        this.canvas.setActiveObject(circle);
        this.canvas.renderAll();
        return circle;
    }

    addImage(url, options = {}) {
        return new Promise((resolve, reject) => {
            fabric.Image.fromURL(url, (img) => {
                if (options.scaleToWidth) {
                    img.scaleToWidth(options.scaleToWidth);
                } else if (options.scaleToHeight) {
                    img.scaleToHeight(options.scaleToHeight);
                }

                if (options.center) {
                    this.canvas.add(img);
                    this.canvas.centerObject(img);
                } else {
                    img.set({
                        left: options.left || this.canvas.width / 2,
                        top: options.top || this.canvas.height / 2,
                        ...options
                    });
                    this.canvas.add(img);
                }

                this.canvas.setActiveObject(img);
                this.canvas.renderAll();
                resolve(img);
            }, {
                crossOrigin: 'anonymous',
                ...options
            });
        });
    }

    // Selection management
    getActiveObject() {
        return this.canvas.getActiveObject();
    }

    getActiveObjects() {
        return this.canvas.getActiveObjects();
    }

    deleteSelected() {
        const activeObjects = this.canvas.getActiveObjects();
        if (activeObjects.length > 0) {
            this.canvas.discardActiveObject();
            activeObjects.forEach(obj => this.canvas.remove(obj));
            this.canvas.renderAll();
            this.saveState();
            return true;
        }
        return false;
    }

    // Canvas operations
    setSize(width, height) {
        this.canvas.setDimensions({ width, height });
        this.canvas.renderAll();
        this.saveState();
    }

    setBackgroundColor(color) {
        this.canvas.backgroundColor = color;
        this.canvas.renderAll();
        this.saveState();
    }

    clear() {
        this.canvas.clear();
        this.canvas.backgroundColor = '#ffffff';
        this.saveState();
    }

    // Export methods
    toDataURL(options = {}) {
        const defaultOptions = {
            format: 'png',
            quality: 0.9,
            multiplier: 1
        };
        return this.canvas.toDataURL({ ...defaultOptions, ...options });
    }

    // Zoom and viewport controls
    zoom(scale) {
        this.canvas.setZoom(scale);
        this.zoomLevel = scale;
        this.updateZoomDisplay();
        this.canvas.renderAll();
    }

    zoomIn() {
        const currentZoom = this.canvas.getZoom();
        this.zoom(currentZoom * 1.2);
    }

    zoomOut() {
        const currentZoom = this.canvas.getZoom();
        this.zoom(currentZoom / 1.2);
    }

    fitToScreen() {
        const container = this.canvas.getElement().parentElement;
        const scaleX = container.offsetWidth / this.canvas.width;
        const scaleY = container.offsetHeight / this.canvas.height;
        const scale = Math.min(scaleX, scaleY) * 0.9; // 90% of container
        
        this.zoom(scale);
        this.canvas.viewportTransform[4] = (container.offsetWidth - this.canvas.width * scale) / 2;
        this.canvas.viewportTransform[5] = (container.offsetHeight - this.canvas.height * scale) / 2;
        this.canvas.renderAll();
    }

    updateZoomDisplay() {
        const zoomDisplay = document.getElementById('zoomLevel');
        if (zoomDisplay) {
            zoomDisplay.textContent = Math.round(this.zoomLevel * 100) + '%';
        }
    }

    // Template loading
    loadTemplate(type) {
        this.clear();
        
        const templates = {
            'instagram': { width: 1080, height: 1080 },
            'story': { width: 1080, height: 1920 },
            'facebook': { width: 1200, height: 630 },
            'twitter': { width: 1500, height: 500 },
            'youtube': { width: 1280, height: 720 },
            'linkedin': { width: 1200, height: 627 }
        };

        const template = templates[type];
        if (template) {
            this.setSize(template.width, template.height);
            document.getElementById('canvasWidth').value = template.width;
            document.getElementById('canvasHeight').value = template.height;
            
            // Add template placeholder elements
            this.addText('Your Title Here', {
                fontSize: 72,
                fontWeight: 'bold',
                fill: '#1a1a2e',
                top: 100
            });
            
            this.addText('Add your content here...', {
                fontSize: 36,
                fill: '#666666',
                top: 200
            });
            
            utils.showAlert(`Loaded ${type} template`, 'success');
        }
    }
}

// Make CanvasManager globally available
window.CanvasManager = CanvasManager;