import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { generateAccessToken, generateRefreshToken, setTokenCookies, clearTokenCookies, verifyRefreshToken } from '../utils/jwt.js';
import { validateEmail, validatePassword } from '../utils/validation.js';

const prisma = new PrismaClient();

export const register = async (req, res) => {
  try {
    const { email, password, fullName } = req.body;

    // Validate required fields
    if (!email || !password || !fullName) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Email, password, and fullName are required',
      });
    }

    // Validate email format
    if (!validateEmail(email)) {
      return res.status(400).json({
        error: 'Invalid email',
        message: 'Please provide a valid email address',
      });
    }

    // Validate password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        error: 'Invalid password',
        message: passwordValidation.message,
      });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return res.status(409).json({
        error: 'Email already exists',
        message: 'An account with this email already exists',
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        fullName,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        createdAt: true,
      },
    });

    // Generate tokens
    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
    });

    const refreshToken = generateRefreshToken({
      userId: user.id,
      email: user.email,
    });

    // Set cookies
    setTokenCookies(res, accessToken, refreshToken);

    // Return response
    res.status(201).json({
      message: 'User registered successfully',
      user,
      accessToken,
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'An error occurred during registration',
    });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Email and password are required',
      });
    }

    // Validate email format
    if (!validateEmail(email)) {
      return res.status(400).json({
        error: 'Invalid email',
        message: 'Please provide a valid email address',
      });
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        fullName: true,
        googleId: true,
      },
    });

    if (!user) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Invalid email or password',
      });
    }

    // Check if user registered via OAuth without password
    if (!user.passwordHash) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'This account uses Google login. Please sign in with Google.',
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Invalid email or password',
      });
    }

    // Update lastLoginAt timestamp
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Generate tokens
    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
    });

    const refreshToken = generateRefreshToken({
      userId: user.id,
      email: user.email,
    });

    // Set cookies
    setTokenCookies(res, accessToken, refreshToken);

    // Return response (without passwordHash)
    const { passwordHash, ...userWithoutPassword } = user;
    
    res.status(200).json({
      message: 'Login successful',
      user: userWithoutPassword,
      accessToken,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'An error occurred during login',
    });
  }
};

export const refresh = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Refresh token not found',
      });
    }

    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);

    if (!decoded) {
      clearTokenCookies(res);
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired refresh token',
      });
    }

    // Verify user still exists
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        fullName: true,
      },
    });

    if (!user) {
      clearTokenCookies(res);
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User not found',
      });
    }

    // Generate new tokens (token rotation for security)
    const newAccessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
    });

    const newRefreshToken = generateRefreshToken({
      userId: user.id,
      email: user.email,
    });

    // Set new cookies
    setTokenCookies(res, newAccessToken, newRefreshToken);

    res.status(200).json({
      message: 'Token refreshed successfully',
      accessToken: newAccessToken,
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'An error occurred during token refresh',
    });
  }
};

export const logout = async (req, res) => {
  try {
    // Clear cookies
    clearTokenCookies(res);

    res.status(200).json({
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Logout error:', error);
    clearTokenCookies(res);
    res.status(200).json({
      message: 'Logged out successfully',
    });
  }
};

// Google OAuth callback handler
export const googleCallback = async (req, res) => {
  try {
    // User is authenticated by passport
    const user = req.user;

    if (!user) {
      return res.redirect(`${process.env.FRONTEND_URL}?error=authentication_failed`);
    }

    // Generate tokens
    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
    });

    const refreshToken = generateRefreshToken({
      userId: user.id,
      email: user.email,
    });

    // Set cookies
    setTokenCookies(res, accessToken, refreshToken);

    // Redirect to frontend with success
    res.redirect(`${process.env.FRONTEND_URL}/dashboard`);
  } catch (error) {
    console.error('Google callback error:', error);
    res.redirect(`${process.env.FRONTEND_URL}?error=authentication_failed`);
  }
};
