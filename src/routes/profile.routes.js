import express from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  createProfile,
  getUserProfiles,
  getProfileById,
  getProfileBySlug,
  updateProfile,
  deleteProfile,
  regenerateQRCode,
  uploadAvatar,
  upload,
} from '../controllers/profile.controller.js';

const router = express.Router();

// Create profile (authenticated)
router.post('/', authenticate, createProfile);

// Upload avatar (authenticated)
router.post('/upload-avatar', authenticate, upload.single('avatar'), uploadAvatar);

// Get user's profiles (authenticated)
router.get('/my-profiles', authenticate, getUserProfiles);

// Update profile (authenticated) - must be before /:slug
router.put('/:profileId', authenticate, updateProfile);

// Regenerate QR code (authenticated) - must be before /:slug
router.post('/:profileId/regenerate-qr', authenticate, regenerateQRCode);

// Delete profile (authenticated) - must be before /:slug
router.delete('/:profileId', authenticate, deleteProfile);

// Get profile by ID for editing (authenticated) - must be before /:slug
router.get('/edit/:profileId', authenticate, getProfileById);

// Get profile by slug (public) - MUST BE LAST as it catches everything
router.get('/:slug', getProfileBySlug);

export default router;
