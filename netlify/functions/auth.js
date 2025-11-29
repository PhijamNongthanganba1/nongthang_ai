const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const SECRET_KEY = process.env.SECRET_KEY || 'your-super-secret-key-change-in-production';

// Simple in-memory storage (replace with database later)
const users = new Map();

exports.handler = async (event) => {
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-requested-with',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
    };

    // Handle preflight requests
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    try {
        const body = JSON.parse(event.body || '{}');
        const { action, name, email, password } = body;

        console.log('Auth request:', { action, email });

        // SIGNUP
        if (action === 'signup') {
            if (!name || !email || !password) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ 
                        error: 'All fields are required: name, email, password' 
                    })
                };
            }

            // Email validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ 
                        error: 'Please enter a valid email address' 
                    })
                };
            }

            // Password validation
            if (password.length < 8) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ 
                        error: 'Password must be at least 8 characters long' 
                    })
                };
            }

            if (!/[A-Z]/.test(password)) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ 
                        error: 'Password must contain at least one uppercase letter' 
                    })
                };
            }

            if (!/\d/.test(password)) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ 
                        error: 'Password must contain at least one number' 
                    })
                };
            }

            // Check if user already exists
            if (users.has(email.toLowerCase())) {
                return {
                    statusCode: 409,
                    headers,
                    body: JSON.stringify({ 
                        error: 'Email already exists. Please use a different email or login.' 
                    })
                };
            }

            // Hash password and create user
            const hashedPassword = await bcrypt.hash(password, 10);
            const user = {
                name: name.trim(),
                email: email.toLowerCase(),
                password: hashedPassword,
                plan: 'free',
                credits: 100,
                createdAt: new Date().toISOString(),
                lastLogin: new Date().toISOString()
            };

            users.set(email.toLowerCase(), user);

            // Generate JWT token
            const token = jwt.sign(
                { 
                    email: user.email,
                    name: user.name 
                }, 
                SECRET_KEY, 
                { expiresIn: '7d' }
            );

            return {
                statusCode: 201,
                headers,
                body: JSON.stringify({
                    success: true,
                    message: '🎉 Account created successfully! Welcome to AI Design Studio!',
                    token: token,
                    user: {
                        name: user.name,
                        email: user.email,
                        plan: user.plan,
                        credits: user.credits,
                        joined: user.createdAt
                    }
                })
            };
        }

        // LOGIN
        if (action === 'login') {
            if (!email || !password) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ 
                        error: 'Email and password are required' 
                    })
                };
            }

            const user = users.get(email.toLowerCase());
            
            // Check if user exists and password matches
            if (!user || !(await bcrypt.compare(password, user.password))) {
                return {
                    statusCode: 401,
                    headers,
                    body: JSON.stringify({ 
                        error: 'Invalid email or password. Please try again.' 
                    })
                };
            }

            // Update last login
            user.lastLogin = new Date().toISOString();
            users.set(email.toLowerCase(), user);

            // Generate JWT token
            const token = jwt.sign(
                { 
                    email: user.email,
                    name: user.name 
                }, 
                SECRET_KEY, 
                { expiresIn: '7d' }
            );

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    message: '✅ Login successful! Welcome back!',
                    token: token,
                    user: {
                        name: user.name,
                        email: user.email,
                        plan: user.plan,
                        credits: user.credits,
                        lastLogin: user.lastLogin
                    }
                })
            };
        }

        // VERIFY TOKEN
        if (action === 'verify') {
            const authHeader = event.headers.authorization;
            
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return {
                    statusCode: 401,
                    headers,
                    body: JSON.stringify({ 
                        error: 'Authentication token required' 
                    })
                };
            }

            const token = authHeader.replace('Bearer ', '');

            try {
                const decoded = jwt.verify(token, SECRET_KEY);
                const user = users.get(decoded.email);

                if (!user) {
                    return {
                        statusCode: 404,
                        headers,
                        body: JSON.stringify({ 
                            error: 'User not found' 
                        })
                    };
                }

                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({
                        success: true,
                        user: {
                            name: user.name,
                            email: user.email,
                            plan: user.plan,
                            credits: user.credits,
                            lastLogin: user.lastLogin
                        }
                    })
                };
            } catch (error) {
                return {
                    statusCode: 401,
                    headers,
                    body: JSON.stringify({ 
                        error: 'Invalid or expired token. Please login again.' 
                    })
                };
            }
        }

        // Invalid action
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ 
                error: 'Invalid action. Supported actions: signup, login, verify' 
            })
        };

    } catch (error) {
        console.error('Auth error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'Internal server error. Please try again later.' 
            })
        };
    }
};