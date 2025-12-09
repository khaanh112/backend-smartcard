import { PrismaClient } from '@prisma/client';
import { generateQRCode, deleteQRCode } from '../utils/qrcode.js';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

const prisma = new PrismaClient();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer for avatar upload
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/avatars');
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// Upload avatar
export const uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'No file uploaded',
        message: 'Please upload an image file',
      });
    }

    const avatarUrl = `/uploads/avatars/${req.file.filename}`;

    res.json({
      message: 'Avatar uploaded successfully',
      avatarUrl,
    });
  } catch (error) {
    console.error('Upload avatar error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to upload avatar',
    });
  }
};

// Generate unique slug from full name
const generateSlug = async (fullName) => {
  const baseSlug = fullName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  let slug = baseSlug;
  let counter = 1;

  // Check if slug exists and append counter if needed
  while (await prisma.profile.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
};

// Create profile with all related data
export const createProfile = async (req, res) => {
  try {
    const userId = req.user.id; // From auth middleware
    const {
      fullName,
      title,
      phone,
      address,
      email,
      avatarUrl,
      workExperiences,
      socialLinks,
    } = req.body;

    // Validate required fields
    if (!fullName || !email) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Full name and email are required',
      });
    }

    // No theme selection - removed

    // Generate unique slug
    const slug = await generateSlug(fullName);

    // Generate profile URL
    const profileUrl = `${process.env.FRONTEND_URL}/${slug}`;

    // Create profile with all related data in a transaction
    const profile = await prisma.$transaction(async (tx) => {
      // Create profile
      const newProfile = await tx.profile.create({
        data: {
          userId,
          slug,
          fullName,
          title,
          phone,
          address,
          email,
          avatarUrl,
          profileUrl,
          isPublished: true,
        },
      });

      // Create work experiences
      if (workExperiences && workExperiences.length > 0) {
        await tx.workExperience.createMany({
          data: workExperiences.map((exp, index) => ({
            profileId: newProfile.id,
            company: exp.company,
            position: exp.position,
            startDate: new Date(exp.startDate),
            endDate: exp.endDate ? new Date(exp.endDate) : null,
            description: exp.description,
            displayOrder: index,
          })),
        });
      }

      // Create social links
      if (socialLinks && socialLinks.length > 0) {
        await tx.socialLink.createMany({
          data: socialLinks.map((link, index) => ({
            profileId: newProfile.id,
            platform: link.platform.toUpperCase(),
            url: link.url,
            displayOrder: index,
          })),
        });
      }

      // Fetch complete profile with relations
      return await tx.profile.findUnique({
        where: { id: newProfile.id },
        include: {
          experiences: {
            orderBy: { displayOrder: 'asc' },
          },
          socialLinks: {
            orderBy: { displayOrder: 'asc' },
          },
        },
      });
    });

    // Generate QR code after profile creation
    let qrCodeUrl = null;
    try {
      const qrResult = await generateQRCode(profileUrl, profile.id);
      qrCodeUrl = qrResult.qrCodeUrl;

      // Update profile with QR code URL
      await prisma.profile.update({
        where: { id: profile.id },
        data: { qrCodeUrl },
      });
    } catch (qrError) {
      console.error('QR code generation failed:', qrError);
      // Continue without QR code - non-critical error
    }

    res.status(201).json({
      message: 'Profile created successfully',
      profile: {
        id: profile.id,
        slug: profile.slug,
        profileUrl,
        qrCodeUrl,
        fullName: profile.fullName,
        title: profile.title,
        address: profile.address,
        avatarUrl: profile.avatarUrl,
        experiences: profile.experiences,
        socialLinks: profile.socialLinks,
        isPublished: profile.isPublished,
        createdAt: profile.createdAt,
      },
    });
  } catch (error) {
    console.error('Create profile error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to create profile',
    });
  }
};

// Get user's profiles
export const getUserProfiles = async (req, res) => {
  try {
    const userId = req.user.id;

    const profiles = await prisma.profile.findMany({
      where: { userId },
      include: {
        _count: {
          select: {
            experiences: true,
            socialLinks: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      profiles: profiles.map((p) => ({
        id: p.id,
        slug: p.slug,
        fullName: p.fullName,
        title: p.title,
        avatarUrl: p.avatarUrl,
        qrCodeUrl: p.qrCodeUrl,
        profileUrl: p.profileUrl,
        isPublished: p.isPublished,
        experienceCount: p._count.experiences,
        socialLinkCount: p._count.socialLinks,
        createdAt: p.createdAt,
      })),
    });
  } catch (error) {
    console.error('Get user profiles error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch profiles',
    });
  }
};

// Get profile by slug (public access)
export const getProfileBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const profile = await prisma.profile.findUnique({
      where: { slug, isPublished: true },
      include: {
        experiences: {
          orderBy: { displayOrder: 'asc' },
        },
        socialLinks: {
          orderBy: { displayOrder: 'asc' },
        },
      },
    });

    if (!profile) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Profile not found',
      });
    }

    const response = {
      profile: {
        id: profile.id,
        slug: profile.slug,
        fullName: profile.fullName,
        title: profile.title,
        phone: profile.phone,
        address: profile.address,
        avatarUrl: profile.avatarUrl,
        qrCodeUrl: profile.qrCodeUrl,
        experiences: profile.experiences,
        socialLinks: profile.socialLinks,
      },
    };

    res.json(response);
  } catch (error) {
    console.error('Get profile by slug error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch profile',
    });
  }
};

// Get profile by ID (authenticated - for editing)
export const getProfileById = async (req, res) => {
  try {
    const userId = req.user.id;
    const { profileId } = req.params;

    const profile = await prisma.profile.findFirst({
      where: { id: profileId, userId },
      include: {
        experiences: {
          orderBy: { displayOrder: 'asc' },
        },
        socialLinks: {
          orderBy: { displayOrder: 'asc' },
        },
      },
    });

    if (!profile) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Profile not found or unauthorized',
      });
    }

    res.json({
      profile: {
        id: profile.id,
        slug: profile.slug,
        fullName: profile.fullName,
        title: profile.title,
        email: profile.email,
        phone: profile.phone,
        address: profile.address,
        avatarUrl: profile.avatarUrl,
        profileUrl: profile.profileUrl,
        qrCodeUrl: profile.qrCodeUrl,
        isPublished: profile.isPublished,
        experiences: profile.experiences.map(exp => ({
          id: exp.id,
          company: exp.company,
          position: exp.position,
          startDate: exp.startDate,
          endDate: exp.endDate,
          description: exp.description,
          displayOrder: exp.displayOrder,
        })),
        socialLinks: profile.socialLinks.map(link => ({
          id: link.id,
          platform: link.platform,
          url: link.url,
          displayOrder: link.displayOrder,
        })),
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt,
      },
    });
  } catch (error) {
    console.error('Get profile by ID error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch profile',
    });
  }
};

// Update profile
export const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { profileId } = req.params;
    const {
      fullName,
      title,
      phone,
      address,
      avatarUrl,
      workExperiences,
      socialLinks,
    } = req.body;

    // Check if profile belongs to user
    const existingProfile = await prisma.profile.findFirst({
      where: { id: profileId, userId },
    });

    if (!existingProfile) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Profile not found or unauthorized',
      });
    }

    // Update profile in transaction
    const updatedProfile = await prisma.$transaction(async (tx) => {
      // Update profile
      const profile = await tx.profile.update({
        where: { id: profileId },
        data: {
          fullName,
          title,
          phone,
          address,
          avatarUrl,
        },
      });

      // Update work experiences - delete old and create new
      if (workExperiences !== undefined) {
        await tx.workExperience.deleteMany({
          where: { profileId },
        });

        if (workExperiences.length > 0) {
          await tx.workExperience.createMany({
            data: workExperiences.map((exp, index) => ({
              profileId,
              company: exp.company,
              position: exp.position,
              startDate: new Date(exp.startDate),
              endDate: exp.endDate ? new Date(exp.endDate) : null,
              description: exp.description,
              displayOrder: index,
            })),
          });
        }
      }

      // Update social links - delete old and create new
      if (socialLinks !== undefined) {
        await tx.socialLink.deleteMany({
          where: { profileId },
        });

        if (socialLinks.length > 0) {
          await tx.socialLink.createMany({
            data: socialLinks.map((link, index) => ({
              profileId,
              platform: link.platform.toUpperCase(),
              url: link.url,
              displayOrder: index,
            })),
          });
        }
      }

      // Fetch complete profile
      return await tx.profile.findUnique({
        where: { id: profileId },
        include: {
          experiences: {
            orderBy: { displayOrder: 'asc' },
          },
          socialLinks: {
            orderBy: { displayOrder: 'asc' },
          },
        },
      });
    });

    res.json({
      message: 'Profile updated successfully',
      profile: updatedProfile,
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update profile',
    });
  }
};

// Delete profile
export const deleteProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { profileId } = req.params;

    // Check if profile belongs to user
    const profile = await prisma.profile.findFirst({
      where: { id: profileId, userId },
    });

    if (!profile) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Profile not found or unauthorized',
      });
    }

    // Delete profile (cascade will handle related records)
    await prisma.profile.delete({
      where: { id: profileId },
    });

    // Delete QR code file if exists
    await deleteQRCode(profileId);

    res.json({
      message: 'Profile deleted successfully',
    });
  } catch (error) {
    console.error('Delete profile error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to delete profile',
    });
  }
};

// Regenerate QR code for profile
export const regenerateQRCode = async (req, res) => {
  try {
    const userId = req.user.id;
    const { profileId } = req.params;

    // Check if profile belongs to user
    const profile = await prisma.profile.findFirst({
      where: { id: profileId, userId },
    });

    if (!profile) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Profile not found or unauthorized',
      });
    }

    // Delete old QR code
    await deleteQRCode(profileId);

    // Generate new QR code
    const profileUrl = profile.profileUrl || `${process.env.FRONTEND_URL}/${profile.slug}`;
    const qrResult = await generateQRCode(profileUrl, profileId);

    // Update profile with new QR code URL
    const updatedProfile = await prisma.profile.update({
      where: { id: profileId },
      data: { 
        qrCodeUrl: qrResult.qrCodeUrl,
        profileUrl 
      },
    });

    res.json({
      message: 'QR code regenerated successfully',
      qrCodeUrl: updatedProfile.qrCodeUrl,
      profileUrl: updatedProfile.profileUrl,
    });
  } catch (error) {
    console.error('Regenerate QR code error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to regenerate QR code',
    });
  }
};
