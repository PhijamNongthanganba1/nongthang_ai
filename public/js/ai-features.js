class AIFeatures {
    constructor(canvasManager) {
        this.canvasManager = canvasManager;
        this.isGenerating = false;
    }

    // Text to Image
    async generateImage(prompt, style = 'digital-art', width = 1024, height = 1024) {
        if (this.isGenerating) {
            throw new Error('Another AI operation is in progress');
        }

        if (!prompt || prompt.trim().length === 0) {
            throw new Error('Please enter a prompt');
        }

        this.isGenerating = true;

        try {
            utils.showAlert('Generating image... This may take a few seconds.', 'info', 0);

            const data = await apiService.generateImage(prompt, style, width, height);

            if (data.success) {
                // Add generated image to canvas
                const img = await this.canvasManager.addImage(data.image, {
                    scaleToWidth: 500,
                    center: true
                });

                utils.showAlert('Image generated successfully!', 'success');
                return img;
            } else {
                throw new Error(data.error || 'Image generation failed');
            }
        } catch (error) {
            console.error('Image generation error:', error);
            utils.showAlert(`Image generation failed: ${error.message}`, 'error');
            throw error;
        } finally {
            this.isGenerating = false;
        }
    }

    // Background Removal
    async removeBackground() {
        const activeObject = this.canvasManager.getActiveObject();
        
        if (!activeObject || activeObject.type !== 'image') {
            throw new Error('Please select an image to remove background');
        }

        if (this.isGenerating) {
            throw new Error('Another AI operation is in progress');
        }

        this.isGenerating = true;

        try {
            utils.showAlert('Removing background...', 'info', 0);

            // Get image data
            const imageData = activeObject.toDataURL({
                format: 'png',
                quality: 1
            });

            const data = await apiService.removeBackground(imageData);

            if (data.success) {
                // Replace original image with background-removed version
                const originalLeft = activeObject.left;
                const originalTop = activeObject.top;
                const originalScaleX = activeObject.scaleX;
                const originalScaleY = activeObject.scaleY;

                this.canvasManager.canvas.remove(activeObject);

                const newImg = await this.canvasManager.addImage(data.image, {
                    left: originalLeft,
                    top: originalTop,
                    scaleX: originalScaleX,
                    scaleY: originalScaleY
                });

                utils.showAlert('Background removed successfully!', 'success');
                return newImg;
            } else {
                throw new Error(data.error || 'Background removal failed');
            }
        } catch (error) {
            console.error('Background removal error:', error);
            utils.showAlert(`Background removal failed: ${error.message}`, 'error');
            throw error;
        } finally {
            this.isGenerating = false;
        }
    }

    // Text to Video
    async generateVideo(text, imageUrl = null, voiceType = 'en_female_1') {
        if (this.isGenerating) {
            throw new Error('Another AI operation is in progress');
        }

        if (!text || text.trim().length === 0) {
            throw new Error('Please enter text for the video');
        }

        this.isGenerating = true;

        try {
            utils.showAlert('Generating video... This may take up to 2 minutes.', 'info', 0);

            const data = await apiService.generateVideo(text, imageUrl, voiceType);

            if (data.success) {
                utils.showAlert('Video generated successfully!', 'success');
                
                // Create video element and add to canvas
                const videoElement = document.createElement('video');
                videoElement.src = data.video_url;
                videoElement.controls = true;
                videoElement.style.maxWidth = '500px';
                videoElement.style.maxHeight = '500px';

                // Create a fabric group for the video
                const videoGroup = new fabric.Group([], {
                    left: this.canvasManager.canvas.width / 2,
                    top: this.canvasManager.canvas.height / 2
                });

                this.canvasManager.canvas.add(videoGroup);
                
                return {
                    videoUrl: data.video_url,
                    videoElement: videoElement
                };
            } else {
                throw new Error(data.error || 'Video generation failed');
            }
        } catch (error) {
            console.error('Video generation error:', error);
            utils.showAlert(`Video generation failed: ${error.message}`, 'error');
            throw error;
        } finally {
            this.isGenerating = false;
        }
    }

    // CV Generation
    async generateCV(userData, templateType = 'modern') {
        if (this.isGenerating) {
            throw new Error('Another AI operation is in progress');
        }

        if (!userData.name || !userData.email) {
            throw new Error('Name and email are required for CV generation');
        }

        this.isGenerating = true;

        try {
            utils.showAlert('Generating professional CV...', 'info', 0);

            const data = await apiService.generateCV(userData, templateType);

            if (data.success) {
                utils.showAlert('CV generated successfully!', 'success');
                return this.createCVOnCanvas(data.cv);
            } else {
                throw new Error(data.error || 'CV generation failed');
            }
        } catch (error) {
            console.error('CV generation error:', error);
            utils.showAlert(`CV generation failed: ${error.message}`, 'error');
            throw error;
        } finally {
            this.isGenerating = false;
        }
    }

    createCVOnCanvas(cvData) {
        // Create CV elements on canvas
        const cvGroup = new fabric.Group([], {
            left: 50,
            top: 50
        });

        let currentTop = 0;

        // Add name as title
        const nameText = new fabric.Text(cvData.personal_info?.name || 'Your Name', {
            left: 0,
            top: currentTop,
            fontSize: 36,
            fontFamily: 'Inter',
            fontWeight: 'bold',
            fill: '#1a1a2e'
        });
        cvGroup.addWithUpdate(nameText);
        currentTop += 50;

        // Add contact information
        const contactInfo = [];
        if (cvData.personal_info?.email) contactInfo.push(`Email: ${cvData.personal_info.email}`);
        if (cvData.personal_info?.phone) contactInfo.push(`Phone: ${cvData.personal_info.phone}`);
        if (cvData.personal_info?.location) contactInfo.push(`Location: ${cvData.personal_info.location}`);

        contactInfo.forEach(info => {
            const contactText = new fabric.Text(info, {
                left: 0,
                top: currentTop,
                fontSize: 14,
                fontFamily: 'Inter',
                fill: '#666666'
            });
            cvGroup.addWithUpdate(contactText);
            currentTop += 25;
        });

        // Add professional summary
        currentTop += 20;
        const summaryTitle = new fabric.Text('Professional Summary', {
            left: 0,
            top: currentTop,
            fontSize: 18,
            fontFamily: 'Inter',
            fontWeight: 'bold',
            fill: '#1a1a2e'
        });
        cvGroup.addWithUpdate(summaryTitle);

        currentTop += 30;
        const summaryText = new fabric.Text(cvData.professional_summary || 'Experienced professional seeking new opportunities.', {
            left: 0,
            top: currentTop,
            fontSize: 14,
            fontFamily: 'Inter',
            fill: '#333333',
            width: 400,
            lineHeight: 1.4
        });
        cvGroup.addWithUpdate(summaryText);
        currentTop += 80;

        // Add experience
        if (cvData.experience && cvData.experience.length > 0) {
            const experienceTitle = new fabric.Text('Work Experience', {
                left: 0,
                top: currentTop,
                fontSize: 18,
                fontFamily: 'Inter',
                fontWeight: 'bold',
                fill: '#1a1a2e'
            });
            cvGroup.addWithUpdate(experienceTitle);
            currentTop += 30;

            cvData.experience.forEach(exp => {
                const expText = new fabric.Text('• ' + exp, {
                    left: 0,
                    top: currentTop,
                    fontSize: 14,
                    fontFamily: 'Inter',
                    fill: '#333333',
                    width: 400,
                    lineHeight: 1.4
                });
                cvGroup.addWithUpdate(expText);
                currentTop += 30;
            });
        }

        // Add skills
        if (cvData.skills && cvData.skills.length > 0) {
            currentTop += 20;
            const skillsTitle = new fabric.Text('Skills', {
                left: 0,
                top: currentTop,
                fontSize: 18,
                fontFamily: 'Inter',
                fontWeight: 'bold',
                fill: '#1a1a2e'
            });
            cvGroup.addWithUpdate(skillsTitle);
            currentTop += 30;

            const skillsText = new fabric.Text(cvData.skills.join(', '), {
                left: 0,
                top: currentTop,
                fontSize: 14,
                fontFamily: 'Inter',
                fill: '#333333',
                width: 400
            });
            cvGroup.addWithUpdate(skillsText);
        }

        this.canvasManager.canvas.add(cvGroup);
        this.canvasManager.canvas.setActiveObject(cvGroup);
        this.canvasManager.canvas.renderAll();

        return cvGroup;
    }

    // Utility methods
    getStatus() {
        return {
            isGenerating: this.isGenerating
        };
    }

    cancelOperation() {
        this.isGenerating = false;
        utils.showAlert('Operation cancelled', 'warning');
    }
}

// Make AIFeatures globally available
window.AIFeatures = AIFeatures;