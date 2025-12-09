import express from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  trackView,
  getAnalytics,
  exportAnalytics,
} from '../controllers/analytics.controller.js';

const router = express.Router();

// Track view (no auth required)
router.post('/track-view', trackView);

// Get analytics (authenticated)
router.get('/profiles/:profileId/analytics', authenticate, getAnalytics);

// Export analytics CSV (authenticated)
router.get('/profiles/:profileId/analytics/export', authenticate, exportAnalytics);

export default router;