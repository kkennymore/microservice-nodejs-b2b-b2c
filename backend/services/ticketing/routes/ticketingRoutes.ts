import express from 'express'
import { authenticateToken } from '/app/shared/config.js'
import { TicketingController } from '@/controllers/TicketingController.js'
import multer from 'multer'
import path from 'path'

const router = express.Router()
const ticketingController = new TicketingController()

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/tickets/',
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 5 // Max 5 files per upload
  },
  fileFilter: (req, file, cb) => {
    // Allow common file types
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt|zip|rar/
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase())
    const mimetype = allowedTypes.test(file.mimetype)

    if (mimetype && extname) {
      return cb(null, true)
    } else {
      cb(new Error('Invalid file type'))
    }
  }
})

// All routes require authentication
router.use(authenticateToken)

// Ticket CRUD routes
router.post('/tickets', ticketingController.createTicket.bind(ticketingController))

router.get('/tickets', ticketingController.getTickets.bind(ticketingController))

router.get('/tickets/:id', ticketingController.getTicket.bind(ticketingController))
router.put('/tickets/:id', ticketingController.updateTicket.bind(ticketingController))

// Message routes
router.post('/tickets/:ticketId/messages', upload.array('attachments', 5), ticketingController.addMessage.bind(ticketingController))

// Template routes
router.get('/templates', ticketingController.getTemplates.bind(ticketingController))

// Agent routes (admin/agent only)
router.use('/agents', (req, res, next) => {
  if (req.user.role !== 'admin' && req.user.role !== 'agent') {
    return res.status(403).json({
      success: false,
      message: 'Agent access required'
    })
  }
  next()
})

router.get('/agents/available', ticketingController.getAvailableAgents.bind(ticketingController))
router.post('/tickets/:ticketId/assign/:agentId', ticketingController.assignTicket.bind(ticketingController))

// Admin-only routes
router.use('/admin', (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    })
  }
  next()
})

router.get('/admin/stats', ticketingController.getAdminStats.bind(ticketingController))
router.post('/admin/templates', ticketingController.createTemplate.bind(ticketingController))
router.get('/admin/sla-check', ticketingController.checkSLABreaches.bind(ticketingController))

// File download route
router.get('/files/:filename', ticketingController.downloadFile.bind(ticketingController))

export default router