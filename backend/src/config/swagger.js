import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Smart QR Business Card Platform API',
      version: '1.0.0',
      description: 'API documentation for Smart QR Business Card Platform - A platform for creating smart business cards with QR codes and profile websites',
      contact: {
        name: 'API Support',
        email: 'support@smartcard.com',
      },
    },
    servers: [
      {
        url: process.env.API_URL || 'http://localhost:3000',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT access token',
        },
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'accessToken',
          description: 'JWT token stored in httpOnly cookie',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'User unique identifier',
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address',
            },
            fullName: {
              type: 'string',
              description: 'User full name',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Account creation timestamp',
            },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error type',
            },
            message: {
              type: 'string',
              description: 'Error message',
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
      {
        cookieAuth: [],
      },
    ],
  },
  apis: ['./src/routes/*.js', './src/index.js'], // Path to API routes
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
