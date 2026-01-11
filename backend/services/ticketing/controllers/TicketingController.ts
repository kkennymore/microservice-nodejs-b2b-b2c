// Ticketing Controller - Request/Response Layer

import TicketingService from '@/services/ticketingService.js'
import { errorResponse, successResponse } from '@/shared/utils/responseHelper.js'
import path from 'path'

export class TicketingController {
  constructor() {
    this.ticketingService = new TicketingService()
  }

  // Create ticket
  async createTicket(req, res) {
    try {
      // For customers, use their user ID and info
      if (req.user.role === 'customer') {
        req.body.customer_id = req.user.id
        req.body.customer_email = req.user.email

        // Get customer profile info
        try {
          const profile = await req.app.locals.db.query(
            'SELECT first_name, last_name FROM user_profiles WHERE user_id = ?',
            [req.user.id]
          )
          if (profile[0]) {
            req.body.customer_name = `${profile[0].first_name} ${profile[0].last_name}`.trim()
          }
        } catch (error) {
          console.warn('Could not fetch customer profile:', error)
        }
      }

      const result = await this.ticketingService.createTicket(req.body)

      if (result.success) {
        return successResponse(res, 'Ticket created successfully', result.ticket, 201)
      } else {
        return errorResponse(res, result.message, 400)
      }
    } catch (error) {
      console.error('Create ticket error:', error)
      return errorResponse(res, 'Failed to create ticket', 500)
    }
  }

  // Get tickets with filtering
  async getTickets(req, res) {
    try {
      const filters = {
        status: req.query.status,
        priority: req.query.priority,
        category: req.query.category,
        assigned_to: req.query.assigned_to,
        department: req.query.department,
        search: req.query.search,
        limit: req.query.limit ? parseInt(req.query.limit) : 50,
        offset: req.query.offset ? parseInt(req.query.offset) : 0
      }

      const result = await this.ticketingService.getTickets(filters, req.user.id, req.user.role)

      if (result.success) {
        return successResponse(res, 'Tickets retrieved successfully', {
          tickets: result.tickets,
          stats: result.stats,
          pagination: result.pagination
        })
      } else {
        return errorResponse(res, result.message, 400)
      }
    } catch (error) {
      console.error('Get tickets error:', error)
      return errorResponse(res, 'Failed to get tickets', 500)
    }
  }

  // Get single ticket
  async getTicket(req, res) {
    try {
      const result = await this.ticketingService.getTicket(req.params.id, req.user.id, req.user.role)

      if (result.success) {
        return successResponse(res, 'Ticket retrieved successfully', result.ticket)
      } else {
        const statusCode = result.message.includes('not found') ? 404 : 403
        return errorResponse(res, result.message, statusCode)
      }
    } catch (error) {
      console.error('Get ticket error:', error)
      return errorResponse(res, 'Failed to get ticket', 500)
    }
  }

  // Update ticket
  async updateTicket(req, res) {
    try {
      const result = await this.ticketingService.updateTicket(req.params.id, req.body, req.user.id, req.user.role)

      if (result.success) {
        return successResponse(res, 'Ticket updated successfully', result.ticket)
      } else {
        return errorResponse(res, result.message, 400)
      }
    } catch (error) {
      console.error('Update ticket error:', error)
      return errorResponse(res, 'Failed to update ticket', 500)
    }
  }

  // Add message to ticket
  async addMessage(req, res) {
    try {
      const messageData = {
        content: req.body.content,
        message_type: req.body.message_type || 'message',
        is_internal: req.body.is_internal === 'true' && (req.user.role === 'admin' || req.user.role === 'agent'),
        attachments: req.files ? req.files.map(file => ({
          filename: file.originalname,
          uploaded_filename: file.filename,
          size: file.size,
          mime_type: file.mimetype
        })) : []
      }

      const result = await this.ticketingService.addMessage(req.params.ticketId, messageData, req.user.id, req.user.role)

      if (result.success) {
        return successResponse(res, 'Message added successfully', result.message, 201)
      } else {
        return errorResponse(res, result.message, 400)
      }
    } catch (error) {
      console.error('Add message error:', error)
      return errorResponse(res, 'Failed to add message', 500)
    }
  }

  // Get ticket messages
  async getMessages(req, res) {
    try {
      const result = await this.ticketingService.getMessages(req.params.ticketId, req.user.id, req.user.role)

      if (result.success) {
        return successResponse(res, 'Messages retrieved successfully', result.messages)
      } else {
        return errorResponse(res, result.message, 403)
      }
    } catch (error) {
      console.error('Get messages error:', error)
      return errorResponse(res, 'Failed to get messages', 500)
    }
  }

  // Assign ticket to agent
  async assignTicket(req, res) {
    try {
      const result = await this.ticketingService.assignTicket(req.params.ticketId, req.params.agentId, req.user.id)

      if (result.success) {
        return successResponse(res, 'Ticket assigned successfully', result.assignment)
      } else {
        return errorResponse(res, result.message, 400)
      }
    } catch (error) {
      console.error('Assign ticket error:', error)
      return errorResponse(res, 'Failed to assign ticket', 500)
    }
  }

  // Get available agents
  async getAvailableAgents(req, res) {
    try {
      const result = await this.ticketingService.getAvailableAgents(req.query.department, req.query.category)

      if (result.success) {
        return successResponse(res, 'Available agents retrieved successfully', result.agents)
      } else {
        return errorResponse(res, result.message, 400)
      }
    } catch (error) {
      console.error('Get available agents error:', error)
      return errorResponse(res, 'Failed to get available agents', 500)
    }
  }

  // Get templates
  async getTemplates(req, res) {
    try {
      const result = await this.ticketingService.getTemplates(req.query.category)

      if (result.success) {
        return successResponse(res, 'Templates retrieved successfully', result.templates)
      } else {
        return errorResponse(res, result.message, 400)
      }
    } catch (error) {
      console.error('Get templates error:', error)
      return errorResponse(res, 'Failed to get templates', 500)
    }
  }

  // Create template (admin only)
  async createTemplate(req, res) {
    try {
      const result = await this.ticketingService.createTemplate(req.body, req.user.id)

      if (result.success) {
        return successResponse(res, 'Template created successfully', result.template, 201)
      } else {
        return errorResponse(res, result.message, 400)
      }
    } catch (error) {
      console.error('Create template error:', error)
      return errorResponse(res, 'Failed to create template', 500)
    }
  }

  // Get admin statistics
  async getAdminStats(req, res) {
    try {
      const result = await this.ticketingService.getAdminStats()

      if (result.success) {
        return successResponse(res, 'Admin stats retrieved successfully', result.stats)
      } else {
        return errorResponse(res, result.message, 400)
      }
    } catch (error) {
      console.error('Get admin stats error:', error)
      return errorResponse(res, 'Failed to get admin stats', 500)
    }
  }

  // Check SLA breaches
  async checkSLABreaches(req, res) {
    try {
      const result = await this.ticketingService.checkSLABreaches()

      if (result.success) {
        return successResponse(res, 'SLA check completed successfully', result.breaches)
      } else {
        return errorResponse(res, result.message, 400)
      }
    } catch (error) {
      console.error('SLA check error:', error)
      return errorResponse(res, 'Failed to check SLA breaches', 500)
    }
  }

  // Get ticket messages
  async getMessages(req, res) {
    try {
      const result = await this.ticketingService.getMessages(req.params.ticketId, req.user.id, req.user.role)

      if (result.success) {
        return successResponse(res, 'Messages retrieved successfully', result.messages)
      } else {
        return errorResponse(res, result.message, 403)
      }
    } catch (error) {
      console.error('Get messages error:', error)
      return errorResponse(res, 'Failed to get messages', 500)
    }
  }

  // Get admin statistics
  async getAdminStats(req, res) {
    try {
      const result = await this.ticketingService.getAdminStats()

      if (result.success) {
        return successResponse(res, 'Admin stats retrieved successfully', result.stats)
      } else {
        return errorResponse(res, result.message, 400)
      }
    } catch (error) {
      console.error('Get admin stats error:', error)
      return errorResponse(res, 'Failed to get admin stats', 500)
    }
  }

  // Check SLA breaches
  async checkSLABreaches(req, res) {
    try {
      const result = await this.ticketingService.checkSLABreaches()

      if (result.success) {
        return successResponse(res, 'SLA check completed successfully', result.breaches)
      } else {
        return errorResponse(res, result.message, 400)
      }
    } catch (error) {
      console.error('SLA check error:', error)
      return errorResponse(res, 'Failed to check SLA breaches', 500)
    }
  }

  // Download file attachment
  async downloadFile(req, res) {
    try {
      const result = await this.ticketingService.validateFileAccess(req.params.filename, req.user.id, req.user.role)

      if (!result.success) {
        return errorResponse(res, result.message, 403)
      }

      const filePath = path.join(process.cwd(), 'uploads', 'tickets', req.params.filename)

      res.download(filePath, (error) => {
        if (error) {
          console.error('File download error:', error)
          return errorResponse(res, 'File not found', 404)
        }
      })
    } catch (error) {
      console.error('File download error:', error)
      return errorResponse(res, 'Failed to download file', 500)
    }
  }
}