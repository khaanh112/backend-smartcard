import { verifyAccessToken } from '../utils/jwt.js';

export const authenticate = async (req, res, next) => {
  try {
    // Extract token from cookie or Authorization header
    let token = req.cookies.accessToken;
    
    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Access token not found',
      });
    }

    // Verify token
    const decoded = verifyAccessToken(token);

    if (!decoded) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired access token',
      });
    }

    // Attach user to request
    req.user = {
      id: decoded.userId,
      email: decoded.email,
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Access token has expired',
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid token signature',
      });
    }

    return res.status(500).json({
      error: 'Internal server error',
      message: 'An error occurred during authentication',
    });
  }
};
