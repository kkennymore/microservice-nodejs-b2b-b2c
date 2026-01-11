// backend/services/auth/services/fileService.js
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import pligsLogger from '@/utils/logger.js';

class PligsFileService {
  static async pligsUploadFile(file) {
    try {
      const uploadDir = path.join(process.cwd(), 'uploads');
      await fs.mkdir(uploadDir, { recursive: true });

      const fileExtension = path.extname(file.originalname);
      const fileName = `${uuidv4()}${fileExtension}`;
      const filePath = path.join(uploadDir, fileName);

      await fs.writeFile(filePath, file.buffer);

      // In production, upload to cloud storage (AWS S3, Google Cloud, etc.)
      // For now, return local path
      return `/uploads/${fileName}`;
    } catch (error) {
      pligsLogger.error('File upload error:', error);
      throw new Error('Failed to upload file');
    }
  }

  static async pligsDeleteFile(filePath) {
    try {
      const fullPath = path.join(process.cwd(), filePath);
      await fs.unlink(fullPath);
    } catch (error) {
      pligsLogger.error('File delete error:', error);
    }
  }

  static async pligsValidateImage(file) {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!allowedTypes.includes(file.mimetype)) {
      throw new Error('Invalid file type. Only JPEG, PNG, and GIF are allowed');
    }

    if (file.size > maxSize) {
      throw new Error('File size too large. Maximum 5MB allowed');
    }

    return true;
  }

  static async pligsValidateDocument(file) {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!allowedTypes.includes(file.mimetype)) {
      throw new Error('Invalid file type. Only PDF, JPEG, and PNG are allowed');
    }

    if (file.size > maxSize) {
      throw new Error('File size too large. Maximum 10MB allowed');
    }

    return true;
  }
}

export default PligsFileService;