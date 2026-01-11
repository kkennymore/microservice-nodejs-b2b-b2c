/**
 * Watermark Utility
 * =================
 *
 * Handles adding watermarks to product images with customizable settings.
 */

import sharp from 'sharp';
import path from 'path';
import fs from 'fs';

export class WatermarkService {
  constructor() {
    this.defaultSettings = {
      opacity: 0.3,
      position: 'bottom-right',
      fontSize: 24,
      color: '#FFFFFF',
      backgroundColor: '#000000',
      backgroundOpacity: 0.5,
      margin: 20
    };
  }

  /**
   * Add watermark to an image
   * @param {string} inputPath - Path to input image
   * @param {string} outputPath - Path to save watermarked image
   * @param {string} watermarkText - Text to use as watermark
   * @param {object} settings - Watermark settings
   */
  async addWatermark(inputPath, outputPath, watermarkText, settings = {}) {
    try {
      // Merge settings with defaults
      const config = { ...this.defaultSettings, ...settings };

      // Create watermark overlay
      const watermarkOverlay = this.createWatermarkOverlay(watermarkText, config);

      // Get image dimensions
      const metadata = await sharp(inputPath).metadata();

      // Calculate watermark position
      const position = this.calculatePosition(config.position, metadata.width, metadata.height, watermarkOverlay.width, watermarkOverlay.height, config.margin);

      // Apply watermark using SVG
      await sharp(inputPath)
        .composite([{
          input: watermarkOverlay.buffer,
          top: position.top,
          left: position.left
        }])
        .jpeg({ quality: 90 })
        .toFile(outputPath);

      return {
        success: true,
        originalSize: `${metadata.width}x${metadata.height}`,
        watermarkPosition: config.position,
        watermarkText: watermarkText
      };

    } catch (error) {
      console.error('Watermark processing error:', error);
      throw new Error(`Failed to add watermark: ${error.message}`);
    }
  }

  /**
   * Create watermark overlay using SVG
   * @param {string} text - Watermark text
   * @param {object} config - Watermark configuration
   */
  createWatermarkOverlay(text, config) {
    const fontSize = config.fontSize;
    const padding = 10;
    const estimatedWidth = text.length * (fontSize * 0.6) + (padding * 2);
    const estimatedHeight = fontSize + (padding * 2);

    // Create SVG watermark
    const svgText = `
      <svg width="${estimatedWidth}" height="${estimatedHeight}" xmlns="http://www.w3.org/2000/svg">
        ${config.backgroundColor && config.backgroundOpacity > 0 ?
          `<rect x="0" y="0" width="${estimatedWidth}" height="${estimatedHeight}"
                 fill="${this.hexToRgba(config.backgroundColor, config.backgroundOpacity)}"
                 rx="8" ry="8"/>` : ''}
        <text x="${estimatedWidth / 2}" y="${estimatedHeight / 2}"
              font-family="Arial, sans-serif"
              font-size="${fontSize}"
              fill="${config.color}"
              text-anchor="middle"
              dominant-baseline="middle"
              opacity="${config.opacity}">${text}</text>
      </svg>
    `;

    return {
      buffer: Buffer.from(svgText),
      width: estimatedWidth,
      height: estimatedHeight
    };
  }

  /**
   * Calculate watermark position on image
   * @param {string} position - Position string (top-left, top-right, bottom-left, bottom-right, center)
   * @param {number} imageWidth - Image width
   * @param {number} imageHeight - Image height
   * @param {number} watermarkWidth - Watermark width
   * @param {number} watermarkHeight - Watermark height
   * @param {number} margin - Margin from edges
   */
  calculatePosition(position, imageWidth, imageHeight, watermarkWidth, watermarkHeight, margin) {
    const positions = {
      'top-left': { top: margin, left: margin },
      'top-right': { top: margin, left: imageWidth - watermarkWidth - margin },
      'bottom-left': { top: imageHeight - watermarkHeight - margin, left: margin },
      'bottom-right': { top: imageHeight - watermarkHeight - margin, left: imageWidth - watermarkWidth - margin },
      'center': {
        top: Math.floor((imageHeight - watermarkHeight) / 2),
        left: Math.floor((imageWidth - watermarkWidth) / 2)
      }
    };

    return positions[position] || positions['bottom-right'];
  }

  /**
   * Convert hex color to rgba
   * @param {string} hex - Hex color code
   * @param {number} alpha - Alpha value (0-1)
   */
  hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  /**
   * Get watermark settings for a seller
   * @param {string} sellerId - Seller ID
   * @returns {object} Watermark settings
   */
  async getSellerWatermarkSettings(sellerId) {
    // This would typically fetch from database
    // For now, return default settings
    return {
      enabled: true,
      text: 'Pligs Marketplace',
      opacity: 0.3,
      position: 'bottom-right',
      fontSize: 24,
      color: '#FFFFFF',
      backgroundColor: '#000000',
      backgroundOpacity: 0.5
    };
  }

  /**
   * Validate image file
   * @param {string} filePath - Path to image file
   * @returns {boolean} True if valid image
   */
  async validateImage(filePath) {
    try {
      const metadata = await sharp(filePath).metadata();
      const allowedFormats = ['jpeg', 'jpg', 'png', 'webp'];

      return allowedFormats.includes(metadata.format.toLowerCase());
    } catch (error) {
      console.error('Image validation error:', error);
      return false;
    }
  }

  /**
   * Process image with watermark if enabled
   * @param {string} inputPath - Input image path
   * @param {string} outputPath - Output image path
   * @param {string} sellerId - Seller ID
   */
  async processImageWithWatermark(inputPath, outputPath, sellerId) {
    try {
      // Validate image
      const isValid = await this.validateImage(inputPath);
      if (!isValid) {
        throw new Error('Invalid image format');
      }

      // Get seller watermark settings
      const settings = await this.getSellerWatermarkSettings(sellerId);

      if (!settings.enabled) {
        // If watermark is disabled, just copy the file
        await fs.promises.copyFile(inputPath, outputPath);
        return {
          success: true,
          watermarked: false,
          message: 'Watermark disabled for this seller'
        };
      }

      // Apply watermark
      const result = await this.addWatermark(inputPath, outputPath, settings.text, {
        opacity: settings.opacity,
        position: settings.position,
        fontSize: settings.fontSize,
        color: settings.color,
        backgroundColor: settings.backgroundColor,
        backgroundOpacity: settings.backgroundOpacity
      });

      return {
        success: true,
        watermarked: true,
        ...result
      };

    } catch (error) {
      console.error('Image processing error:', error);
      throw error;
    }
  }
}

export default WatermarkService;