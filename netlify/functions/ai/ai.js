const { 
  headers, handleCors, verifyToken, checkUserQuota, updateUserQuota 
} = require('./utils');

// Fallback image generation (using a placeholder service)
async function generateFallbackImage(prompt, width = 1024, height = 1024) {
  // Use a placeholder service for free image generation
  const placeholderUrl = `https://placehold.co/${width}x${height}/7c3aed/ffffff?text=${encodeURIComponent(prompt)}`;
  
  // In a real implementation, you'd fetch and convert to base64
  // For now, return a placeholder
  return `data:image/svg+xml;base64,${Buffer.from(`
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#7c3aed"/>
      <text x="50%" y="50%" font-family="Arial" font-size="24" fill="white" text-anchor="middle" dy=".3em">
        ${prompt}
      </text>
      <text x="50%" y="60%" font-family="Arial" font-size="16" fill="white" text-anchor="middle" dy=".3em">
        AI Generated Image
      </text>
    </svg>
  `).toString('base64')}`;
}

exports.handler = async (event) => {
  const corsResponse = handleCors(event);
  if (corsResponse) return corsResponse;

  try {
    const path = event.path.replace('/api/ai', '');
    const body = event.body ? JSON.parse(event.body) : {};

    // HEALTH CHECK
    if (path === '/health' && event.httpMethod === 'GET') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          status: 'healthy',
          timestamp: new Date().toISOString(),
          version: '2.0.0',
          ai_features: {
            image_generation: true,
            background_removal: true,
            video_generation: true,
            cv_generation: true
          }
        })
      };
    }

    // GENERATE IMAGE
    if (path === '/generate-image' && event.httpMethod === 'POST') {
      const userEmail = verifyToken(event.headers.authorization);
      const quota = checkUserQuota(userEmail, 'image');
      
      const { prompt, style = 'digital-art', width = 1024, height = 1024 } = body;

      if (!prompt || prompt.trim().length === 0) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Prompt is required' })
        };
      }

      if (prompt.length > 1000) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Prompt too long (max 1000 characters)' })
        };
      }

      // Generate image (using fallback for free tier)
      const imageData = await generateFallbackImage(prompt, width, height);
      
      // Update user quota
      updateUserQuota(userEmail, 'image');

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          image: imageData,
          prompt: prompt,
          credits_used: 1,
          message: 'Image generated successfully! (Free tier - upgrade for real AI images)'
        })
      };
    }

    // REMOVE BACKGROUND
    if (path === '/remove-background' && event.httpMethod === 'POST') {
      const userEmail = verifyToken(event.headers.authorization);
      checkUserQuota(userEmail, 'background');
      
      const { image } = body;

      if (!image) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Image data is required' })
        };
      }

      // For free tier, return the same image (mock background removal)
      updateUserQuota(userEmail, 'background');

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          image: image,
          credits_used: 1,
          message: 'Background removal completed! (Free tier - upgrade for real background removal)'
        })
      };
    }

    // GENERATE VIDEO
    if (path === '/generate-video' && event.httpMethod === 'POST') {
      const userEmail = verifyToken(event.headers.authorization);
      checkUserQuota(userEmail, 'video');
      
      const { text, image_url = null, voice_type = 'en_female_1' } = body;

      if (!text || text.trim().length === 0) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Text is required' })
        };
      }

      if (text.length > 1000) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Text too long (max 1000 characters)' })
        };
      }

      // Mock video generation for free tier
      updateUserQuota(userEmail, 'video');

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          video_url: 'https://example.com/mock-video.mp4',
          text: text,
          credits_used: 5,
          message: 'Video generation started! (Free tier - upgrade for real video generation)'
        })
      };
    }

    // GENERATE CV
    if (path === '/generate-cv' && event.httpMethod === 'POST') {
      const userEmail = verifyToken(event.headers.authorization);
      
      const { user_data, template_type = 'modern' } = body;

      if (!user_data?.name || !user_data?.email) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Name and email are required' })
        };
      }

      // Generate CV content
      const cvContent = {
        personal_info: {
          name: user_data.name,
          email: user_data.email,
          phone: user_data.phone || '',
          location: user_data.location || '',
          linkedin: user_data.linkedin || ''
        },
        professional_summary: user_data.summary || 'Experienced professional seeking new opportunities.',
        experience: user_data.experience ? user_data.experience.split('\n').filter(exp => exp.trim()) : [],
        education: user_data.education ? user_data.education.split('\n').filter(edu => edu.trim()) : [],
        skills: user_data.skills ? user_data.skills.split(',').map(skill => skill.trim()) : [],
        template: template_type
      };

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          cv: cvContent,
          template: template_type
        })
      };
    }

    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'AI route not found' })
    };

  } catch (error) {
    console.error('AI function error:', error);
    
    if (error.message.includes('quota') || error.message.includes('credits')) {
      return {
        statusCode: 402,
        headers,
        body: JSON.stringify({ error: error.message })
      };
    }
    
    if (error.message.includes('Authentication')) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: error.message })
      };
    }
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};