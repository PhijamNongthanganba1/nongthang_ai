const { 
  headers, handleCors, verifyToken, designs, designId 
} = require('./utils');

exports.handler = async (event) => {
  const corsResponse = handleCors(event);
  if (corsResponse) return corsResponse;

  try {
    const userEmail = verifyToken(event.headers.authorization);
    const body = event.body ? JSON.parse(event.body) : {};

    // GET ALL DESIGNS
    if (event.httpMethod === 'GET' && !event.path.includes('/api/designs/')) {
      const userDesigns = Array.from(designs.entries())
        .filter(([_, design]) => design.user_email === userEmail)
        .map(([id, design]) => ({
          id,
          name: design.name,
          data: design.data,
          created_at: design.created_at
        }))
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          designs: userDesigns
        })
      };
    }

    // GET SPECIFIC DESIGN
    if (event.httpMethod === 'GET' && event.path.includes('/api/designs/')) {
      const designId = event.path.split('/').pop();
      const design = designs.get(parseInt(designId));

      if (!design || design.user_email !== userEmail) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Design not found' })
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          design: {
            id: parseInt(designId),
            name: design.name,
            data: design.data,
            created_at: design.created_at
          }
        })
      };
    }

    // SAVE DESIGN
    if (event.httpMethod === 'POST') {
      const { name, data } = body;

      if (!name || !name.trim()) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Design name is required' })
        };
      }

      const newDesign = {
        id: designId,
        user_email: userEmail,
        name: name.trim(),
        data: data || '{}',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      designs.set(designId, newDesign);
      designId++;

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Design saved successfully',
          design_id: newDesign.id
        })
      };
    }

    // DELETE DESIGN
    if (event.httpMethod === 'DELETE' && event.path.includes('/api/designs/')) {
      const designIdToDelete = event.path.split('/').pop();
      const design = designs.get(parseInt(designIdToDelete));

      if (!design || design.user_email !== userEmail) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Design not found' })
        };
      }

      designs.delete(parseInt(designIdToDelete));

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Design deleted successfully'
        })
      };
    }

    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Route not found' })
    };

  } catch (error) {
    console.error('Designs error:', error);
    
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