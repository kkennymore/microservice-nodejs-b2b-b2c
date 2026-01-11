import express from 'express';
import FileService from '@/services/FileService.js';
import { MessageAttachmentModel } from '@/models/index.js';
import { authenticateToken } from '/app/shared/config.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Configure multer upload
const upload = FileService.createUploadMiddleware();

// Upload single file
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const userId = req.user.id;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Process the uploaded file
    const fileInfo = await FileService.processUploadedFile(req.file, userId);

    res.json({
      success: true,
      message: 'File uploaded successfully',
      data: fileInfo
    });
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload file'
    });
  }
});

// Upload multiple files
router.post('/upload/multiple', upload.array('files', 5), async (req, res) => {
  try {
    const userId = req.user.id;

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }

    // Process all uploaded files
    const uploadedFiles = [];
    for (const file of req.files) {
      const fileInfo = await FileService.processUploadedFile(file, userId);
      uploadedFiles.push(fileInfo);
    }

    res.json({
      success: true,
      message: `${uploadedFiles.length} files uploaded successfully`,
      data: uploadedFiles
    });
  } catch (error) {
    console.error('Multiple file upload error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload files'
    });
  }
});

// Get file info
router.get('/:filename/info', async (req, res) => {
  try {
    const { filename } = req.params;
    const fileInfo = await FileService.getFileInfo(filename);

    if (!fileInfo) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    res.json({
      success: true,
      data: fileInfo
    });
  } catch (error) {
    console.error('Get file info error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get file information'
    });
  }
});

// Delete file
router.delete('/:filename', async (req, res) => {
  try {
    const userId = req.user.id;
    const { filename } = req.params;

    // Check if user owns the file (through message attachments)
    const attachmentModel = new MessageAttachmentModel();
    // TODO: Add ownership validation

    await FileService.deleteFile(filename);

    res.json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    console.error('File deletion error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete file'
    });
  }
});

// Serve uploaded files (static file serving)
router.use('/files', express.static(FileService.uploadDir));

export default router;