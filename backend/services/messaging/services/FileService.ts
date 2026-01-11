import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class FileService {
  constructor() {
    this.uploadDir = path.join(__dirname, '../../../uploads/messages');
    this.maxFileSize = 10 * 1024 * 1024; // 10MB
    this.allowedTypes = [
      // Images
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      // Documents
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      // Spreadsheets
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      // Text files
      'text/plain',
      'text/csv',
      // Archives
      'application/zip',
      'application/x-rar-compressed'
    ];

    this.initializeUploadDir();
  }

  // Initialize upload directory
  async initializeUploadDir() {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
      console.log('📁 Message uploads directory initialized');
    } catch (error) {
      console.error('Failed to create uploads directory:', error);
    }
  }

  // Generate unique filename
  generateFilename(originalFilename) {
    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString('hex');
    const extension = path.extname(originalFilename);
    return `${timestamp}_${random}${extension}`;
  }

  // Validate file type
  validateFileType(mimeType) {
    return this.allowedTypes.includes(mimeType);
  }

  // Get file category
  getFileCategory(mimeType) {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType === 'application/pdf') return 'document';
    if (mimeType.includes('word') || mimeType.includes('document')) return 'document';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'spreadsheet';
    if (mimeType.includes('zip') || mimeType.includes('rar')) return 'archive';
    if (mimeType.startsWith('text/')) return 'text';
    return 'file';
  }

  // Configure multer storage
  getStorage() {
    return multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, this.uploadDir);
      },
      filename: (req, file, cb) => {
        const filename = this.generateFilename(file.originalname);
        cb(null, filename);
      }
    });
  }

  // File filter
  getFileFilter() {
    return (req, file, cb) => {
      if (this.validateFileType(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error(`File type ${file.mimetype} is not allowed`), false);
      }
    };
  }

  // Create multer upload middleware
  createUploadMiddleware() {
    const storage = this.getStorage();
    const fileFilter = this.getFileFilter();

    return multer({
      storage,
      fileFilter,
      limits: {
        fileSize: this.maxFileSize
      }
    });
  }

  // Process uploaded file
  async processUploadedFile(file, userId) {
    try {
      const fileInfo = {
        filename: file.filename,
        original_filename: file.originalname,
        mime_type: file.mimetype,
        file_size: file.size,
        file_path: file.path,
        uploaded_by: userId,
        category: this.getFileCategory(file.mimetype),
        url: `/uploads/messages/${file.filename}`
      };

      // Generate thumbnail for images
      if (file.mimetype.startsWith('image/')) {
        fileInfo.thumbnail_url = await this.generateImageThumbnail(file.path);
      }

      return fileInfo;
    } catch (error) {
      console.error('File processing error:', error);
      throw new Error('Failed to process uploaded file');
    }
  }

  // Generate image thumbnail
  async generateImageThumbnail(imagePath) {
    // For now, return the original image URL
    // In production, you'd use a library like sharp to generate thumbnails
    const filename = path.basename(imagePath);
    return `/uploads/messages/thumbnails/${filename}`;
  }

  // Delete file
  async deleteFile(filename) {
    try {
      const filePath = path.join(this.uploadDir, filename);
      await fs.unlink(filePath);
      console.log(`🗑️ Deleted file: ${filename}`);
    } catch (error) {
      console.error('File deletion error:', error);
      // Don't throw error if file doesn't exist
    }
  }

  // Get file info
  async getFileInfo(filename) {
    try {
      const filePath = path.join(this.uploadDir, filename);
      const stats = await fs.stat(filePath);

      return {
        filename,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        path: filePath
      };
    } catch (error) {
      console.error('File info retrieval error:', error);
      return null;
    }
  }

  // Clean up old files (for maintenance)
  async cleanupOldFiles(daysOld = 30) {
    try {
      const files = await fs.readdir(this.uploadDir);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      let deletedCount = 0;
      for (const file of files) {
        const filePath = path.join(this.uploadDir, file);
        const stats = await fs.stat(filePath);

        if (stats.mtime < cutoffDate) {
          await fs.unlink(filePath);
          deletedCount++;
        }
      }

      console.log(`🧹 Cleaned up ${deletedCount} old files`);
      return deletedCount;
    } catch (error) {
      console.error('File cleanup error:', error);
      throw new Error('Failed to cleanup old files');
    }
  }

  // Validate file before processing
  validateFile(file) {
    if (!file) {
      throw new Error('No file provided');
    }

    if (file.size > this.maxFileSize) {
      throw new Error(`File size exceeds maximum allowed size of ${this.maxFileSize / (1024 * 1024)}MB`);
    }

    if (!this.validateFileType(file.mimetype)) {
      throw new Error(`File type ${file.mimetype} is not allowed`);
    }

    return true;
  }
}

export default new FileService();