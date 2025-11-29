// Utility functions for all endpoints
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const SECRET_KEY = process.env.SECRET_KEY || 'your-super-secret-key-change-in-production';

// Simple in-memory store (replace with database later)
const users = new Map();
const designs = new Map();
let designId = 1;

// User quotas
const userQuotas = new Map();

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-requested-with',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Content-Type': 'application/json'
};

function handleCors(event) {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }
  return null;
}

function validateEmail(email) {
  const pattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return pattern.test(email);
}

function validatePassword(password) {
  if (password.length < 8) return false;
  if (!/[A-Z]/.test(password)) return false;
  if (!/\d/.test(password)) return false;
  return true;
}

function verifyToken(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Authentication token required');
  }
  
  const token = authHeader.replace('Bearer ', '');
  const decoded = jwt.verify(token, SECRET_KEY);
  return decoded.email;
}

function checkUserQuota(email, featureType) {
  if (!userQuotas.has(email)) {
    userQuotas.set(email, {
      images: 0,
      videos: 0,
      backgrounds: 0,
      credits: 100
    });
  }
  
  const quota = userQuotas.get(email);
  const user = users.get(email);
  
  const limits = {
    free: { images: 50, videos: 5, backgrounds: 20 },
    pro: { images: 1000, videos: 100, backgrounds: 500 }
  };
  
  const plan = user?.plan || 'free';
  const planLimits = limits[plan];
  
  if (featureType === 'image' && quota.images >= planLimits.images) {
    throw new Error(`Image generation quota exceeded. ${planLimits.images} images per month allowed.`);
  }
  
  if (featureType === 'video' && quota.videos >= planLimits.videos) {
    throw new Error(`Video generation quota exceeded. ${planLimits.videos} videos per month allowed.`);
  }
  
  if (quota.credits <= 0) {
    throw new Error('Insufficient credits. Please upgrade your plan.');
  }
  
  return quota;
}

function updateUserQuota(email, featureType) {
  const quota = userQuotas.get(email);
  
  switch (featureType) {
    case 'image':
      quota.images += 1;
      quota.credits -= 1;
      break;
    case 'video':
      quota.videos += 1;
      quota.credits -= 5;
      break;
    case 'background':
      quota.backgrounds += 1;
      quota.credits -= 1;
      break;
  }
  
  userQuotas.set(email, quota);
}

module.exports = {
  headers,
  handleCors,
  validateEmail,
  validatePassword,
  verifyToken,
  checkUserQuota,
  updateUserQuota,
  users,
  designs,
  designId,
  SECRET_KEY,
  bcrypt,
  jwt
};