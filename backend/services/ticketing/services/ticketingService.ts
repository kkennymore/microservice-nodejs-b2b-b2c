// Ticketing Service - Business Logic Layer

import { TicketModel, TicketMessageModel, TicketTemplateModel, AgentWorkloadModel } from '@/models/index.js'
import serviceCommunicator from '/app/shared/communication/serviceCommunicator.js'
import { eventPublisher } from '/app/shared/events/eventSystem.js'
import nodemailer from 'nodemailer'

export class TicketingService {
  constructor() {
    this.ticketModel = new TicketModel()
    this.messageModel = new TicketMessageModel()
    this.templateModel = new TicketTemplateModel()
    this.workloadModel = new AgentWorkloadModel()
    this.eventPublisher = eventPublisher(serviceCommunicator)
    this.pool = this.ticketModel.pool // Share the database pool

    // Email transporter
    this.emailTransporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: process.env.EMAIL_PORT || 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    })
  }

  // Ticket Management
  async createTicket(ticketData) {
    try {
      // Validate ticket data
      await this.validateTicketData(ticketData)

      // Create ticket
      const ticket = await this.ticketModel.create(ticketData)

      // Send confirmation email to customer
      await this.sendTicketConfirmationEmail(ticket, ticketData)

      // Publish ticket created event
      await this.eventPublisher.publishSystemEvent('ticket.created', {
        ticketId: ticket.id,
        ticketNumber: ticket.ticketNumber,
        customerId: ticketData.customer_id,
        category: ticketData.category,
        priority: ticketData.priority
      })

      return {
        success: true,
        ticket: {
          id: ticket.id,
          ticketNumber: ticket.ticketNumber,
          status: 'open',
          priority: ticketData.priority,
          category: ticketData.category
        }
      }
    } catch (error) {
      console.error('Error creating ticket:', error)
      return {
        success: false,
        message: error.message
      }
    }
  }

  async getTicket(ticketId, userId, userRole) {
    try {
      const ticket = await this.ticketModel.getById(ticketId, userId, userRole)

      if (!ticket) {
        return {
          success: false,
          message: 'Ticket not found or access denied'
        }
      }

      // Get ticket messages
      const messages = await this.messageModel.getByTicketId(ticketId, userRole === 'admin' || userRole === 'agent')

      // Check SLA status
      const slaStatus = await this.ticketModel.checkSLABreach(ticketId)

      return {
        success: true,
        ticket: {
          ...ticket,
          messages,
          sla_status: slaStatus
        }
      }
    } catch (error) {
      console.error('Error getting ticket:', error)
      return {
        success: false,
        message: error.message
      }
    }
  }

  async getTickets(filters, userId, userRole) {
    try {
      const tickets = await this.ticketModel.getTickets(filters, userId, userRole)
      const stats = await this.ticketModel.getTicketStats(filters)

      return {
        success: true,
        tickets,
        stats,
        total: tickets.length
      }
    } catch (error) {
      console.error('Error getting tickets:', error)
      return {
        success: false,
        message: error.message
      }
    }
  }

  async updateTicket(ticketId, updateData, userId, userRole) {
    try {
      // Get current ticket for audit
      const currentTicket = await this.ticketModel.getById(ticketId)

      if (!currentTicket) {
        return {
          success: false,
          message: 'Ticket not found'
        }
      }

      // Check permissions
      if (!this.canUpdateTicket(currentTicket, userId, userRole)) {
        return {
          success: false,
          message: 'Permission denied'
        }
      }

      // Update ticket
      const updated = await this.ticketModel.updateTicket(ticketId, updateData)

      if (updated) {
        // Log the change
        await this.logTicketChange(ticketId, updateData, userId)

        // Send notifications if needed
        await this.handleTicketUpdate(currentTicket, updateData)

        // Publish event
        await this.eventPublisher.publishSystemEvent('ticket.updated', {
          ticketId,
          ticketNumber: currentTicket.ticket_number,
          changes: updateData,
          updatedBy: userId
        })

        return {
          success: true,
          message: 'Ticket updated successfully'
        }
      }

      return {
        success: false,
        message: 'Failed to update ticket'
      }
    } catch (error) {
      console.error('Error updating ticket:', error)
      return {
        success: false,
        message: error.message
      }
    }
  }

  // Message Management
  async addMessage(ticketId, messageData, userId, userRole) {
    try {
      // Validate ticket access
      const ticket = await this.ticketModel.getById(ticketId, userId, userRole)

      if (!ticket) {
        return {
          success: false,
          message: 'Ticket not found or access denied'
        }
      }

      // Create message
      const messageId = await this.messageModel.create({
        ticket_id: ticketId,
        author_id: userId,
        author_type: userRole === 'customer' ? 'customer' : 'agent',
        ...messageData
      })

      // Update ticket status if needed
      if (ticket.status === 'waiting_for_customer' && userRole === 'customer') {
        await this.ticketModel.updateTicket(ticketId, { status: 'open' })
      } else if (ticket.status === 'open' && userRole !== 'customer') {
        await this.ticketModel.updateTicket(ticketId, { status: 'in_progress' })
      }

      // Send email notification
      await this.sendMessageNotification(ticket, messageData, userId)

      // Publish event
      await this.eventPublisher.publishSystemEvent('ticket.message_added', {
        ticketId,
        messageId,
        authorId: userId,
        authorType: userRole === 'customer' ? 'customer' : 'agent'
      })

      return {
        success: true,
        messageId
      }
    } catch (error) {
      console.error('Error adding message:', error)
      return {
        success: false,
        message: error.message
      }
    }
  }

  // Template Management
  async getTemplates(category = null) {
    try {
      const templates = category
        ? await this.templateModel.getByCategory(category)
        : await this.templateModel.getAllActive()

      return {
        success: true,
        templates
      }
    } catch (error) {
      console.error('Error getting templates:', error)
      return {
        success: false,
        message: error.message
      }
    }
  }

  async createTemplate(templateData, userId) {
    try {
      const templateId = await this.templateModel.create({
        ...templateData,
        created_by: userId
      })

      return {
        success: true,
        templateId
      }
    } catch (error) {
      console.error('Error creating template:', error)
      return {
        success: false,
        message: error.message
      }
    }
  }

  // Agent Workload Management
  async getAvailableAgents(department, category) {
    try {
      const agents = await this.workloadModel.getAvailableAgents(department, category)

      return {
        success: true,
        agents
      }
    } catch (error) {
      console.error('Error getting available agents:', error)
      return {
        success: false,
        message: error.message
      }
    }
  }

  async assignTicket(ticketId, agentId, userId) {
    try {
      // Check agent availability
      const agentWorkload = await this.workloadModel.getAgentWorkload(agentId)

      if (!agentWorkload || !agentWorkload.is_available) {
        return {
          success: false,
          message: 'Agent is not available'
        }
      }

      if (agentWorkload.active_tickets >= agentWorkload.max_capacity) {
        return {
          success: false,
          message: 'Agent has reached maximum capacity'
        }
      }

      // Assign ticket
      const updated = await this.ticketModel.updateTicket(ticketId, {
        assigned_to: agentId,
        status: 'in_progress'
      })

      if (updated) {
        // Update agent workload
        await this.workloadModel.updateWorkload(agentId, {
          active_tickets: agentWorkload.active_tickets + 1
        })

        // Log assignment
        await this.logTicketChange(ticketId, { assigned_to: agentId }, userId)

        return {
          success: true,
          message: 'Ticket assigned successfully'
        }
      }

      return {
        success: false,
        message: 'Failed to assign ticket'
      }
    } catch (error) {
      console.error('Error assigning ticket:', error)
      return {
        success: false,
        message: error.message
      }
    }
  }

  // Message Management
  async getMessages(ticketId, userId, userRole) {
    try {
      // Validate ticket access
      const ticket = await this.ticketModel.getById(ticketId, userId, userRole)

      if (!ticket) {
        return {
          success: false,
          message: 'Ticket not found or access denied'
        }
      }

      const messages = await this.messageModel.getByTicketId(ticketId, userRole === 'admin' || userRole === 'agent')

      return {
        success: true,
        messages
      }
    } catch (error) {
      console.error('Error getting messages:', error)
      return {
        success: false,
        message: error.message
      }
    }
  }

  // Admin Statistics
  async getAdminStats() {
    try {
      const [tickets, agents] = await Promise.all([
        this.ticketModel.getTickets({}, null, 'admin'),
        this.workloadModel.getWorkloadStats()
      ])

      const ticketStats = await this.ticketModel.getTicketStats()
      const slaBreaches = tickets.filter(t => t.sla_breached).length

      return {
        success: true,
        stats: {
          tickets: {
            ...ticketStats,
            sla_breaches_today: slaBreaches
          },
          agents: agents
        }
      }
    } catch (error) {
      console.error('Error getting admin stats:', error)
      return {
        success: false,
        message: error.message
      }
    }
  }

  // File Access Validation
  async validateFileAccess(filename, userId, userRole) {
    try {
      // Find the message that contains this file
      const [rows] = await this.pool.execute(
        `SELECT tm.ticket_id, tm.author_id, tm.is_internal
         FROM ticket_messages tm
         JOIN message_attachments ma ON tm.id = ma.message_id
         WHERE ma.uploaded_filename = ?`,
        [filename]
      )

      if (rows.length === 0) {
        return { success: false, message: 'File not found' }
      }

      const { ticket_id, author_id, is_internal } = rows[0]

      // Check if user has access to this ticket
      const ticket = await this.ticketModel.getById(ticket_id, userId, userRole)

      if (!ticket) {
        return { success: false, message: 'Access denied' }
      }

      // Check if file is internal and user has permission
      if (is_internal && userRole === 'customer') {
        return { success: false, message: 'Access denied to internal file' }
      }

      return { success: true }
    } catch (error) {
      console.error('Error validating file access:', error)
      return { success: false, message: 'Access validation failed' }
    }
  }

  // SLA Management
  async checkSLABreaches() {
    try {
      // This would be called periodically to check for SLA breaches
      const tickets = await this.ticketModel.getTickets({
        status: ['open', 'in_progress'],
        sla_breached: false
      })

      const breaches = []

      for (const ticket of tickets) {
        const slaStatus = await this.ticketModel.checkSLABreach(ticket.id)

        if (slaStatus && (slaStatus.response_sla_breached || slaStatus.resolution_sla_breached)) {
          // Mark as breached
          await this.ticketModel.updateTicket(ticket.id, {
            sla_breached: true
          })

          breaches.push({
            ticketId: ticket.id,
            ticketNumber: ticket.ticket_number,
            breaches: slaStatus
          })

          // Send alert
          await this.sendSLABreachAlert(ticket, slaStatus)
        }
      }

      return {
        success: true,
        breaches_found: breaches.length,
        breaches
      }
    } catch (error) {
      console.error('Error checking SLA breaches:', error)
      return {
        success: false,
        message: error.message
      }
    }
  }

  // Private helper methods
  async validateTicketData(ticketData) {
    const required = ['title', 'description', 'customer_id', 'customer_email']

    for (const field of required) {
      if (!ticketData[field]) {
        throw new Error(`Missing required field: ${field}`)
      }
    }

    // Validate category
    const validCategories = ['account', 'payment', 'shipping', 'product', 'technical', 'refund', 'other']
    if (ticketData.category && !validCategories.includes(ticketData.category)) {
      throw new Error('Invalid category')
    }

    // Validate priority
    const validPriorities = ['low', 'medium', 'high', 'urgent']
    if (ticketData.priority && !validPriorities.includes(ticketData.priority)) {
      throw new Error('Invalid priority')
    }
  }

  async sendTicketConfirmationEmail(ticket, ticketData) {
    try {
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: ticketData.customer_email,
        subject: `Support Ticket Created - ${ticket.ticketNumber}`,
        html: `
          <h2>Your support ticket has been created</h2>
          <p><strong>Ticket Number:</strong> ${ticket.ticketNumber}</p>
          <p><strong>Subject:</strong> ${ticketData.title}</p>
          <p><strong>Priority:</strong> ${ticketData.priority || 'medium'}</p>
          <p><strong>Status:</strong> Open</p>
          <br>
          <p>We will respond to your ticket within our SLA timeframe. You can check the status of your ticket at any time.</p>
          <br>
          <p>Thank you for contacting support!</p>
        `
      }

      await this.emailTransporter.sendMail(mailOptions)
    } catch (error) {
      console.error('Error sending ticket confirmation email:', error)
      // Don't throw - email failure shouldn't stop ticket creation
    }
  }

  async sendMessageNotification(ticket, messageData, senderId) {
    try {
      // Get ticket customer info
      const customerInfo = await serviceCommunicator.get('auth', `/users/${ticket.customer_id}`)

      if (customerInfo.data) {
        const mailOptions = {
          from: process.env.EMAIL_USER,
          to: customerInfo.data.email,
          subject: `Update on Support Ticket ${ticket.ticket_number}`,
          html: `
            <h2>New message on your support ticket</h2>
            <p><strong>Ticket:</strong> ${ticket.ticket_number}</p>
            <p><strong>Subject:</strong> ${ticket.title}</p>
            <br>
            <p>${messageData.content.substring(0, 200)}${messageData.content.length > 200 ? '...' : ''}</p>
            <br>
            <p>Please log in to your account to view the full message and respond.</p>
          `
        }

        await this.emailTransporter.sendMail(mailOptions)
      }
    } catch (error) {
      console.error('Error sending message notification:', error)
    }
  }

  async sendSLABreachAlert(ticket, slaStatus) {
    try {
      const alertMessage = `
        SLA Breach Alert for Ticket ${ticket.ticket_number}
        Customer: ${ticket.customer_email}
        Priority: ${ticket.priority}
        Current Age: ${Math.floor(slaStatus.current_age_minutes / 60)}h ${slaStatus.current_age_minutes % 60}m
      `

      // Send to configured alert recipients
      const recipients = process.env.ALERT_EMAIL_RECIPIENTS
        ? JSON.parse(process.env.ALERT_EMAIL_RECIPIENTS)
        : ['admin@platform.com']

      for (const recipient of recipients) {
        await this.emailTransporter.sendMail({
          from: process.env.EMAIL_USER,
          to: recipient,
          subject: 'SLA Breach Alert',
          text: alertMessage
        })
      }
    } catch (error) {
      console.error('Error sending SLA breach alert:', error)
    }
  }

  canUpdateTicket(ticket, userId, userRole) {
    if (userRole === 'admin') return true
    if (userRole === 'agent' && ticket.assigned_to === userId) return true
    if (userRole === 'customer' && ticket.customer_id === userId) return true
    return false
  }

  async logTicketChange(ticketId, changes, userId) {
    // This would log changes to ticket_history table
    // Implementation depends on specific audit requirements
    console.log(`Ticket ${ticketId} updated by user ${userId}:`, changes)
  }

  async handleTicketUpdate(oldTicket, newUpdates) {
    // Handle status changes, assignments, etc.
    if (newUpdates.status === 'resolved' && !oldTicket.resolved_at) {
      await this.ticketModel.updateTicket(oldTicket.id, {
        resolved_at: new Date(),
        resolution_time_hours: Math.round((Date.now() - new Date(oldTicket.created_at).getTime()) / (1000 * 60 * 60))
      })
    }

    if (newUpdates.status === 'closed') {
      await this.ticketModel.updateTicket(oldTicket.id, {
        closed_at: new Date()
      })
    }
  }
}

export default TicketingService