import express from 'express';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';
import swaggerUi from 'swagger-ui-express';
import authRoutes from './routes/auth.routes.js';
import profileRoutes from './routes/profile.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import swaggerSpec from './config/swagger.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const prisma = new PrismaClient();

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve uploaded files
app.use('/uploads', express.static('uploads'));

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     description: Check the health status of the API and its dependencies (database, Redis)
 *     tags:
 *       - Health
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: healthy
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 version:
 *                   type: string
 *                   example: 1.0.0
 *                 database:
 *                   type: string
 *                   example: connected
 *                 redis:
 *                   type: string
 *                   example: connected
 *       503:
 *         description: Service is unhealthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: unhealthy
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 version:
 *                   type: string
 *                   example: 1.0.0
 *                 database:
 *                   type: string
 *                   example: disconnected
 *                 redis:
 *                   type: string
 *                   example: disconnected
 *                 error:
 *                   type: string
 */
// Health check endpoint
app.get('/health', async (req, res) => {
  const healthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    database: 'unknown',
  };

  let isHealthy = true;

  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;
    healthStatus.database = 'connected';
  } catch (error) {
    healthStatus.database = 'disconnected';
    healthStatus.error = healthStatus.error || '';
    healthStatus.error += `Database: ${error.message}. `;
    isHealthy = false;
  }

  if (!isHealthy) {
    healthStatus.status = 'unhealthy';
    return res.status(503).json(healthStatus);
  }

  res.json(healthStatus);
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Smart QR Business Card Platform API',
    version: '1.0.0',
    docs: '/api/v1/docs',
  });
});

// API Documentation
app.use('/api/v1/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Smart Card API Docs',
}));

// Serve static files (uploaded avatars)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/profiles', profileRoutes);
app.use('/api/v1/analytics', analyticsRoutes);

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/api/v1/docs`);
  console.log(`❤️  Health check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

export default app;
