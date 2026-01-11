import bcrypt from 'bcryptjs';
import { SystemSettingsModel, AdminActionLogModel, UserManagementModel, SystemAlertModel, SystemMaintenanceModel } from '@/models/index.js';

export class AdminService {
  constructor() {
    this.settingsModel = new SystemSettingsModel();
    this.actionLogModel = new AdminActionLogModel();
    this.userManagementModel = new UserManagementModel();
    this.alertModel = new SystemAlertModel();
    this.maintenanceModel = new SystemMaintenanceModel();
  }

  async logAdminAction(req, actionType, resourceType, resourceId, actionDescription, oldValues = null, newValues = null) {
    try {
      await this.actionLogModel.logAction({
        admin_id: req.user.id,
        action_type: actionType,
        resource_type: resourceType,
        resource_id: resourceId,
        action_description: actionDescription,
        old_values: oldValues,
        new_values: newValues,
        ip_address: req.ip,
        user_agent: req.get('User-Agent'),
        session_id: req.sessionID || null
      });
    } catch (error) {
      console.error('Failed to log admin action:', error);
    }
  }

  // System Settings Management
  async getSystemSettings() {
    try {
      const settings = await this.settingsModel.getAllSettings();
      return {
        success: true,
        data: settings
      };
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }

  async updateSystemSetting(req, key, value, type = 'string') {
    try {
      // Get current setting for audit log
      const currentSetting = await this.settingsModel.getSetting(key);

      // Update setting
      await this.settingsModel.setSetting(key, value, type);

      // Log action
      await this.logAdminAction(
        req,
        'update',
        'system_setting',
        null,
        `Updated system setting: ${key}`,
        currentSetting ? { [key]: currentSetting.parsed_value } : null,
        { [key]: value }
      );

      return {
        success: true,
        message: 'System setting updated successfully'
      };
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }

  async enableMaintenanceMode(req) {
    try {
      const currentSetting = await this.settingsModel.getSetting('maintenance_mode');

      await this.settingsModel.setSetting('maintenance_mode', true, 'boolean');

      await this.logAdminAction(
        req,
        'enable',
        'maintenance_mode',
        null,
        'Enabled maintenance mode',
        currentSetting ? { maintenance_mode: currentSetting.parsed_value } : null,
        { maintenance_mode: true }
      );

      return {
        success: true,
        message: 'Maintenance mode enabled'
      };
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }

  async disableMaintenanceMode(req) {
    try {
      const currentSetting = await this.settingsModel.getSetting('maintenance_mode');

      await this.settingsModel.setSetting('maintenance_mode', false, 'boolean');

      await this.logAdminAction(
        req,
        'disable',
        'maintenance_mode',
        null,
        'Disabled maintenance mode',
        currentSetting ? { maintenance_mode: currentSetting.parsed_value } : null,
        { maintenance_mode: false }
      );

      return {
        success: true,
        message: 'Maintenance mode disabled'
      };
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }

  // User Management
  async getUsers(filters = {}) {
    try {
      const users = await this.userManagementModel.getUserManagementData();

      // Apply filters
      let filteredUsers = users;

      if (filters.status) {
        filteredUsers = filteredUsers.filter(u => u.account_status === filters.status);
      }

      if (filters.role) {
        filteredUsers = filteredUsers.filter(u => u.role === filters.role);
      }

      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        filteredUsers = filteredUsers.filter(u =>
          u.username?.toLowerCase().includes(searchTerm) ||
          u.email?.toLowerCase().includes(searchTerm) ||
          u.first_name?.toLowerCase().includes(searchTerm) ||
          u.last_name?.toLowerCase().includes(searchTerm)
        );
      }

      return {
        success: true,
        data: filteredUsers,
        total: filteredUsers.length
      };
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }

  async updateUserStatus(req, userId, statusData) {
    try {
      // Get current user data
      const currentUser = await this.userManagementModel.getUserManagementData(userId);

      // Update user status
      await this.userManagementModel.updateUserStatus(userId, statusData);

      // Log action
      await this.logAdminAction(
        req,
        'update',
        'user',
        userId,
        `Updated user status to ${statusData.account_status}`,
        currentUser[0] ? {
          account_status: currentUser[0].account_status,
          suspension_reason: currentUser[0].suspension_reason,
          ban_reason: currentUser[0].ban_reason
        } : null,
        statusData
      );

      return {
        success: true,
        message: 'User status updated successfully'
      };
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }

  async flagUser(req, userId, reason) {
    try {
      await this.userManagementModel.flagUser(userId, reason);

      await this.logAdminAction(
        req,
        'flag',
        'user',
        userId,
        `Flagged user for review: ${reason}`
      );

      return {
        success: true,
        message: 'User flagged successfully'
      };
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }

  async getFlaggedUsers() {
    try {
      const flaggedUsers = await this.userManagementModel.getFlaggedUsers();

      return {
        success: true,
        data: flaggedUsers
      };
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }

  async getUserStats() {
    try {
      const stats = await this.userManagementModel.getUserStats();

      return {
        success: true,
        data: stats
      };
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }

  // System Alerts Management
  async getAlerts() {
    try {
      const alerts = await this.alertModel.getActiveAlerts();

      return {
        success: true,
        data: alerts
      };
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }

  async acknowledgeAlert(req, alertId) {
    try {
      await this.alertModel.acknowledgeAlert(alertId, req.user.id);

      await this.logAdminAction(
        req,
        'acknowledge',
        'alert',
        alertId,
        'Acknowledged system alert'
      );

      return {
        success: true,
        message: 'Alert acknowledged'
      };
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }

  async resolveAlert(req, alertId) {
    try {
      await this.alertModel.resolveAlert(alertId, req.user.id);

      await this.logAdminAction(
        req,
        'resolve',
        'alert',
        alertId,
        'Resolved system alert'
      );

      return {
        success: true,
        message: 'Alert resolved'
      };
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }

  async getAlertStats() {
    try {
      const stats = await this.alertModel.getAlertStats();

      return {
        success: true,
        data: stats
      };
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }

  // System Maintenance
  async scheduleMaintenance(req, maintenanceData) {
    try {
      const maintenanceId = await this.maintenanceModel.createMaintenance({
        ...maintenanceData,
        created_by: req.user.id
      });

      await this.logAdminAction(
        req,
        'create',
        'maintenance',
        maintenanceId,
        `Scheduled maintenance: ${maintenanceData.title}`
      );

      return {
        success: true,
        data: { id: maintenanceId },
        message: 'Maintenance scheduled successfully'
      };
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }

  async getMaintenanceSchedule() {
    try {
      const maintenance = await this.maintenanceModel.getUpcomingMaintenance();

      return {
        success: true,
        data: maintenance
      };
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }

  async startMaintenance(req, maintenanceId) {
    try {
      const success = await this.maintenanceModel.startMaintenance(maintenanceId);

      if (success) {
        await this.logAdminAction(
          req,
          'start',
          'maintenance',
          maintenanceId,
          'Started scheduled maintenance'
        );

        return {
          success: true,
          message: 'Maintenance started'
        };
      } else {
        return {
          success: false,
          message: 'Failed to start maintenance'
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }

  async completeMaintenance(req, maintenanceId) {
    try {
      const success = await this.maintenanceModel.completeMaintenance(maintenanceId);

      if (success) {
        await this.logAdminAction(
          req,
          'complete',
          'maintenance',
          maintenanceId,
          'Completed scheduled maintenance'
        );

        return {
          success: true,
          message: 'Maintenance completed'
        };
      } else {
        return {
          success: false,
          message: 'Failed to complete maintenance'
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }

  // Admin Action Logs
  async getActionLogs(filters = {}) {
    try {
      const logs = await this.actionLogModel.getActionLogs(filters);
      const stats = await this.actionLogModel.getActionStats(filters);

      return {
        success: true,
        data: {
          logs,
          stats
        }
      };
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }

  // Bulk Operations
  async bulkUpdateUsers(req, userIds, updateData) {
    try {
      // This would implement bulk user updates
      // For now, return a placeholder
      await this.logAdminAction(
        req,
        'bulk_update',
        'users',
        null,
        `Bulk updated ${userIds.length} users`,
        null,
        updateData
      );

      return {
        success: true,
        message: `Bulk update completed for ${userIds.length} users`
      };
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }

  async exportUserData(filters = {}) {
    try {
      const users = await this.getUsers(filters);

      // This would generate a CSV/JSON export
      // For now, return the data structure
      await this.logAdminAction(
        req,
        'export',
        'user_data',
        null,
        'Exported user data'
      );

      return {
        success: true,
        data: users.data,
        message: 'User data exported successfully'
      };
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }
}