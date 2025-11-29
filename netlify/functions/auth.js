const { 
  headers, handleCors, validateEmail, validatePassword, 
  users, bcrypt, jwt, SECRET_KEY 
} = require('./utils');

exports.handler = async (event) => {
  const corsResponse = handleCors(event);
  if (corsResponse) return corsResponse;

  try {
    const path = event.path.replace('/api/auth', '');
    const body = event.body ? JSON.parse(event.body) : {};

    // SIGNUP
    if (path === '/signup' && event.httpMethod === 'POST') {
      const { email, password, name } = body;

      if (!email || !password || !name) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'All fields are required' })
        };
      }

      if (!validateEmail(email)) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid email format' })
        };
      }

      if (!validatePassword(password)) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Password must be at least 8 characters with uppercase letter and number' })
        };
      }

      if (users.has(email)) {
        return {
          statusCode: 409,
          headers,
          body: JSON.stringify({ error: 'Email already exists' })
        };
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = {
        email: email.toLowerCase(),
        name: name.trim(),
        password: hashedPassword,
        plan: 'free',
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString()
      };

      users.set(email.toLowerCase(), user);

      const token = jwt.sign({ email: email.toLowerCase() }, SECRET_KEY, { expiresIn: '7d' });

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Account created successfully! Welcome to AI Design Studio!',
          token,
          user: {
            email: user.email,
            name: user.name,
            plan: user.plan,
            credits: 100
          }
        })
      };
    }

    // LOGIN
    if (path === '/login' && event.httpMethod === 'POST') {
      const { email, password } = body;

      if (!email || !password) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Email and password are required' })
        };
      }

      const user = users.get(email.toLowerCase());
      if (!user || !(await bcrypt.compare(password, user.password))) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ error: 'Invalid email or password' })
        };
      }

      // Update last login
      user.lastLogin = new Date().toISOString();
      users.set(email.toLowerCase(), user);

      const token = jwt.sign({ email: email.toLowerCase() }, SECRET_KEY, { expiresIn: '7d' });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          token,
          user: {
            email: user.email,
            name: user.name,
            plan: user.plan,
            credits: 100,
            usage: {
              images: 0,
              videos: 0
            }
          }
        })
      };
    }

    // VERIFY TOKEN
    if (path === '/verify' && event.httpMethod === 'POST') {
      const token = event.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ error: 'Authentication token required' })
        };
      }

      try {
        const decoded = jwt.verify(token, SECRET_KEY);
        const user = users.get(decoded.email);

        if (!user) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'User not found' })
          };
        }

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            user: {
              email: user.email,
              name: user.name,
              plan: user.plan,
              credits: 100,
              usage: {
                images: 0,
                videos: 0
              }
            }
          })
        };
      } catch (error) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ error: 'Invalid token' })
        };
      }
    }

    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Route not found' })
    };

  } catch (error) {
    console.error('Auth error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};