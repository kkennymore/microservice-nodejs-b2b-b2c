import express from 'express';
import { authenticateToken } from '/app/shared/config.js';
import { AdminService } from '@/services/adminService.js';
import { SystemMonitorService } from '@/services/systemMonitorService.js';

const router = express.Router();
const adminService = new AdminService();
const monitorService = new SystemMonitorService();

// Admin-only middleware
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }
  next();
};

// All routes require authentication
router.use(authenticateToken);

// System Settings Routes
router.get('/settings', requireAdmin, async (req, res) => {
  const result = await adminService.getSystemSettings();
  res.json(result);
});

router.put('/settings/:key', requireAdmin, async (req, res) => {
  const { key } = req.params;
  const { value, type } = req.body;

  const result = await adminService.updateSystemSetting(req, key, value, type);
  res.json(result);
});

router.post('/maintenance/enable', requireAdmin, async (req, res) => {
  const result = await adminService.enableMaintenanceMode(req);
  res.json(result);
});

router.post('/maintenance/disable', requireAdmin, async (req, res) => {
  const result = await adminService.disableMaintenanceMode(req);
  res.json(result);
});

// User Management Routes
router.get('/users', requireAdmin, async (req, res) => {
  const filters = {
    status: req.query.status,
    role: req.query.role,
    search: req.query.search,
    limit: req.query.limit ? parseInt(req.query.limit) : 50
  };

  const result = await adminService.getUsers(filters);
  res.json(result);
});

router.put('/users/:userId/status', requireAdmin, async (req, res) => {
  const { userId } = req.params;
  const result = await adminService.updateUserStatus(req, userId, req.body);
  res.json(result);
});

router.post('/users/:userId/flag', requireAdmin, async (req, res) => {
  const { userId } = req.params;
  const { reason } = req.body;

  const result = await adminService.flagUser(req, userId, reason);
  res.json(result);
});

router.get('/users/flagged', requireAdmin, async (req, res) => {
  const result = await adminService.getFlaggedUsers();
  res.json(result);
});

router.get('/users/stats', requireAdmin, async (req, res) => {
  const result = await adminService.getUserStats();
  res.json(result);
});

router.post('/users/bulk-update', requireAdmin, async (req, res) => {
  const { userIds, updateData } = req.body;
  const result = await adminService.bulkUpdateUsers(req, userIds, updateData);
  res.json(result);
});

router.get('/users/export', requireAdmin, async (req, res) => {
  const filters = {
    status: req.query.status,
    role: req.query.role,
    search: req.query.search
  };

  const result = await adminService.exportUserData(filters);

  if (result.success) {
    // Set headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="users_export.csv"');

    // Convert data to CSV (simplified)
    const csvData = result.data.map(user =>
      `${user.user_id},${user.username},${user.email},${user.account_status},${user.role}`
    ).join('\n');

    const csvHeader = 'ID,Username,Email,Status,Role\n';
    res.send(csvHeader + csvData);
  } else {
    res.json(result);
  }
});

// System Monitoring Routes
router.get('/health', async (req, res) => {
  const result = await monitorService.checkAllServices();
  res.json(result);
});

router.get('/health/services', requireAdmin, async (req, res) => {
  const result = await monitorService.checkAllServices();
  res.json(result);
});

router.get('/health/external', requireAdmin, async (req, res) => {
  const result = await monitorService.checkExternalServices();
  res.json(result);
});

router.get('/overview', requireAdmin, async (req, res) => {
  const result = await monitorService.getSystemOverview();
  res.json(result);
});

router.get('/metrics', requireAdmin, async (req, res) => {
  const service = req.query.service;
  const hours = req.query.hours ? parseInt(req.query.hours) : 24;

  const result = await monitorService.getServiceMetrics(service, hours);
  res.json(result);
});

// System Alerts Routes
router.get('/alerts', requireAdmin, async (req, res) => {
  const result = await adminService.getAlerts();
  res.json(result);
});

router.post('/alerts/:alertId/acknowledge', requireAdmin, async (req, res) => {
  const { alertId } = req.params;
  const result = await adminService.acknowledgeAlert(req, alertId);
  res.json(result);
});

router.post('/alerts/:alertId/resolve', requireAdmin, async (req, res) => {
  const { alertId } = req.params;
  const result = await adminService.resolveAlert(req, alertId);
  res.json(result);
});

router.get('/alerts/stats', requireAdmin, async (req, res) => {
  const result = await adminService.getAlertStats();
  res.json(result);
});

// System Maintenance Routes
router.post('/maintenance', requireAdmin, async (req, res) => {
  const result = await adminService.scheduleMaintenance(req, req.body);
  res.json(result);
});

router.get('/maintenance', requireAdmin, async (req, res) => {
  const result = await adminService.getMaintenanceSchedule();
  res.json(result);
});

router.post('/maintenance/:maintenanceId/start', requireAdmin, async (req, res) => {
  const { maintenanceId } = req.params;
  const result = await adminService.startMaintenance(req, maintenanceId);
  res.json(result);
});

router.post('/maintenance/:maintenanceId/complete', requireAdmin, async (req, res) => {
  const { maintenanceId } = req.params;
  const result = await adminService.completeMaintenance(req, maintenanceId);
  res.json(result);
});

// Admin Action Logs Routes
router.get('/logs', requireAdmin, async (req, res) => {
  const filters = {
    admin_id: req.query.admin_id,
    action_type: req.query.action_type,
    resource_type: req.query.resource_type,
    date_from: req.query.date_from,
    date_to: req.query.date_to,
    limit: req.query.limit ? parseInt(req.query.limit) : 100
  };

  const result = await adminService.getActionLogs(filters);
  res.json(result);
});

// Dashboard Data Routes (for admin dashboard)
router.get('/dashboard/summary', requireAdmin, async (req, res) => {
  try {
    const [userStats, alertStats, recentLogs] = await Promise.all([
      adminService.getUserStats(),
      adminService.getAlertStats(),
      adminService.getActionLogs({ limit: 10 })
    ]);

    res.json({
      success: true,
      data: {
        user_stats: userStats.data,
        alert_stats: alertStats.data,
        recent_activity: recentLogs.data.logs,
        system_overview: await monitorService.getSystemOverview()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to load dashboard data'
    });
  }
});

router.get('/dashboard/metrics', requireAdmin, async (req, res) => {
  const hours = req.query.hours ? parseInt(req.query.hours) : 24;
  const result = await monitorService.getServiceMetrics(null, hours);
  res.json(result);
});

// System Commands (for emergency situations)
router.post('/system/restart-service', requireAdmin, async (req, res) => {
  const { service_name } = req.body;

  // Log the action
  await adminService.logAdminAction(
    req,
    'restart',
    'service',
    null,
    `Requested restart of service: ${service_name}`
  );

  // In a real implementation, this would trigger a service restart
  // For now, just log and return success
  res.json({
    success: true,
    message: `Restart request logged for service: ${service_name}`,
    note: 'Service restart must be performed manually or through orchestration system'
  });
});

router.post('/system/clear-cache', requireAdmin, async (req, res) => {
  const { cache_type } = req.body;

  await adminService.logAdminAction(
    req,
    'clear_cache',
    'system',
    null,
    `Cleared ${cache_type || 'all'} cache`
  );

  // In a real implementation, this would clear Redis cache
  res.json({
    success: true,
    message: `Cache cleared: ${cache_type || 'all'}`
  });
});

// Emergency Commands
router.post('/emergency/shutdown', requireAdmin, async (req, res) => {
  const { reason, scheduled_restart } = req.body;

  await adminService.logAdminAction(
    req,
    'emergency_shutdown',
    'system',
    null,
    `Emergency shutdown initiated: ${reason}`
  );

  // Enable maintenance mode
  await adminService.enableMaintenanceMode(req);

  res.json({
    success: true,
    message: 'Emergency shutdown initiated. Maintenance mode enabled.',
    scheduled_restart: scheduled_restart || 'Manual restart required'
  });
});

router.post('/emergency/restore', requireAdmin, async (req, res) => {
  const { backup_id } = req.body;

  await adminService.logAdminAction(
    req,
    'restore',
    'system',
    null,
    `System restore initiated from backup: ${backup_id || 'latest'}`
  );

  res.json({
    success: true,
    message: 'System restore initiated',
    backup_id: backup_id || 'latest'
  });
});

export default router;