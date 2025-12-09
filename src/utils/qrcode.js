import QRCode from 'qrcode';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Generate QR code for profile URL
 * @param {string} profileUrl - The full URL to the profile
 * @param {string} profileId - Profile ID for filename
 * @returns {Promise<{qrCodeUrl: string, qrCodePath: string}>}
 */
export const generateQRCode = async (profileUrl, profileId) => {
  try {
    // Create qrcodes directory if it doesn't exist
    const qrcodesDir = path.join(__dirname, '../../uploads/qrcodes');
    await fs.mkdir(qrcodesDir, { recursive: true });

    // Generate QR code filename
    const filename = `${profileId}.png`;
    const qrCodePath = path.join(qrcodesDir, filename);

    // QR code options for high quality
    const options = {
      errorCorrectionLevel: 'H', // High error correction
      type: 'png',
      quality: 1,
      margin: 1,
      width: 1000, // 1000x1000px high resolution
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    };

    // Generate QR code and save to file
    await QRCode.toFile(qrCodePath, profileUrl, options);

    // Return relative URL for accessing the QR code
    const qrCodeUrl = `/uploads/qrcodes/${filename}`;

    return {
      qrCodeUrl,
      qrCodePath
    };
  } catch (error) {
    console.error('QR Code generation error:', error);
    throw new Error(`Failed to generate QR code: ${error.message}`);
  }
};

/**
 * Generate QR code as base64 data URL (for immediate display without file storage)
 * @param {string} profileUrl - The full URL to the profile
 * @returns {Promise<string>} - Base64 data URL
 */
export const generateQRCodeDataURL = async (profileUrl) => {
  try {
    const options = {
      errorCorrectionLevel: 'H',
      quality: 1,
      margin: 1,
      width: 500,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    };

    const dataUrl = await QRCode.toDataURL(profileUrl, options);
    return dataUrl;
  } catch (error) {
    console.error('QR Code data URL generation error:', error);
    throw new Error(`Failed to generate QR code data URL: ${error.message}`);
  }
};

/**
 * Delete QR code file
 * @param {string} profileId - Profile ID
 */
export const deleteQRCode = async (profileId) => {
  try {
    const qrCodePath = path.join(__dirname, '../../uploads/qrcodes', `${profileId}.png`);
    await fs.unlink(qrCodePath);
  } catch (error) {
    // Ignore errors if file doesn't exist
    if (error.code !== 'ENOENT') {
      console.error('QR Code deletion error:', error);
    }
  }
};
