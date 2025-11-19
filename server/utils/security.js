// Security utilities using Node.js core crypto module
const crypto = require('crypto');
const { promisify } = require('util');

const scrypt = promisify(crypto.scrypt);
const randomBytes = promisify(crypto.randomBytes);

// Password hashing with scrypt
const SALT_LENGTH = 32;
const KEY_LENGTH = 64;

async function hashPassword(password) {
  const salt = await randomBytes(SALT_LENGTH);
  const derivedKey = await scrypt(password, salt, KEY_LENGTH);
  
  // Store salt and hash together
  return salt.toString('hex') + ':' + derivedKey.toString('hex');
}

async function verifyPassword(password, hashedPassword) {
  const [saltHex, keyHex] = hashedPassword.split(':');
  const salt = Buffer.from(saltHex, 'hex');
  const storedKey = Buffer.from(keyHex, 'hex');
  
  const derivedKey = await scrypt(password, salt, KEY_LENGTH);
  
  // Constant-time comparison to prevent timing attacks
  return crypto.timingSafeEqual(storedKey, derivedKey);
}

// Session token generation
async function generateToken(length = 32) {
  const token = await randomBytes(length);
  return token.toString('hex');
}

// CSRF token generation
async function generateCSRFToken() {
  return generateToken(16);
}

// Input sanitization for XSS prevention
function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

// Sanitize object recursively
function sanitizeObject(obj) {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return sanitizeInput(obj);
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  
  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    sanitized[key] = sanitizeObject(value);
  }
  return sanitized;
}

// Validate email format
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Validate password strength
function isValidPassword(password) {
  // Minimum 8 characters
  return typeof password === 'string' && password.length >= 8;
}

// Rate limiting helper (in-memory, simple)
class RateLimiter {
  constructor(maxAttempts = 5, windowMs = 15 * 60 * 1000) {
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
    this.attempts = new Map();
  }

  check(identifier) {
    const now = Date.now();
    const key = String(identifier);
    
    if (!this.attempts.has(key)) {
      this.attempts.set(key, []);
    }

    const userAttempts = this.attempts.get(key);
    
    // Remove old attempts outside the window
    const validAttempts = userAttempts.filter(timestamp => 
      now - timestamp < this.windowMs
    );
    
    this.attempts.set(key, validAttempts);

    if (validAttempts.length >= this.maxAttempts) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: validAttempts[0] + this.windowMs
      };
    }

    return {
      allowed: true,
      remaining: this.maxAttempts - validAttempts.length - 1,
      resetTime: now + this.windowMs
    };
  }

  record(identifier) {
    const key = String(identifier);
    if (!this.attempts.has(key)) {
      this.attempts.set(key, []);
    }
    this.attempts.get(key).push(Date.now());
  }

  reset(identifier) {
    this.attempts.delete(String(identifier));
  }
}

// Create rate limiters for different endpoints
const loginLimiter = new RateLimiter(5, 15 * 60 * 1000); // 5 attempts per 15 minutes
const apiLimiter = new RateLimiter(100, 60 * 1000); // 100 requests per minute

module.exports = {
  hashPassword,
  verifyPassword,
  generateToken,
  generateCSRFToken,
  sanitizeInput,
  sanitizeObject,
  isValidEmail,
  isValidPassword,
  loginLimiter,
  apiLimiter,
  RateLimiter
};
