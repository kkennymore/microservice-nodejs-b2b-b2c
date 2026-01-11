import express from 'express';
import { authenticateToken } from '/app/shared/config.js';
import { ShippingService } from '@/services/shippingService.js';

const router = express.Router();
const shippingService = new ShippingService();

// All routes require authentication
router.use(authenticateToken);

// Get shipping rates for a quote
router.post('/rates', async (req, res) => {
  try {
    const result = await shippingService.getShippingRates({
      seller_id: req.user.id,
      ...req.body
    });

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Get shipping rates error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get shipping rates'
    });
  }
});

// Create a new shipment
router.post('/shipments', async (req, res) => {
  try {
    // Only allow sellers to create shipments
    if (req.user.role !== 'seller' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only sellers can create shipments'
      });
    }

    const result = await shippingService.createShipment({
      seller_id: req.user.id,
      ...req.body
    });

    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Create shipment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create shipment'
    });
  }
});

// Get shipment by ID
router.get('/shipments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await shippingService.getShipmentById(id, req.user);

    if (result.success) {
      res.json(result);
    } else {
      res.status(404).json(result);
    }
  } catch (error) {
    console.error('Get shipment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get shipment'
    });
  }
});

// Get seller's shipments
router.get('/seller/shipments', async (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      date_from: req.query.date_from,
      date_to: req.query.date_to,
      limit: req.query.limit ? parseInt(req.query.limit) : 50
    };

    const result = await shippingService.getSellerShipments(req.user.id, filters);

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Get seller shipments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get shipments'
    });
  }
});

// Track a shipment
router.get('/track/:trackingNumber', async (req, res) => {
  try {
    const { trackingNumber } = req.params;

    const result = await shippingService.trackShipment({
      tracking_number: trackingNumber
    });

    if (result.success) {
      res.json(result);
    } else {
      res.status(404).json(result);
    }
  } catch (error) {
    console.error('Track shipment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to track shipment'
    });
  }
});

// Update seller shipping settings
router.put('/seller/settings', async (req, res) => {
  try {
    // Only allow sellers to update their settings
    if (req.user.role !== 'seller') {
      return res.status(403).json({
        success: false,
        message: 'Only sellers can update shipping settings'
      });
    }

    const result = await shippingService.updateSellerSettings(req.user.id, req.body);

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Update shipping settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update shipping settings'
    });
  }
});

// Get seller shipping settings
router.get('/seller/settings', async (req, res) => {
  try {
    const result = await shippingService.getSellerSettings(req.user.id);

    if (result.success) {
      res.json(result);
    } else {
      res.status(404).json(result);
    }
  } catch (error) {
    console.error('Get shipping settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get shipping settings'
    });
  }
});

// Get available carriers
router.get('/carriers', async (req, res) => {
  try {
    const result = await shippingService.getAvailableCarriers();

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Get carriers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get carriers'
    });
  }
});

// Validate shipping address
router.post('/validate-address', async (req, res) => {
  try {
    const result = await shippingService.validateAddress(req.body);

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Validate address error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to validate address'
    });
  }
});

// Get shipping zones
router.get('/zones', async (req, res) => {
  try {
    const result = await shippingService.getShippingZones();

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Get shipping zones error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get shipping zones'
    });
  }
});

// Admin routes (require admin role)
router.use('/admin', (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }
  next();
});

// Admin: Get all shipments
router.get('/admin/shipments', async (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      carrier_id: req.query.carrier_id,
      date_from: req.query.date_from,
      date_to: req.query.date_to,
      limit: req.query.limit ? parseInt(req.query.limit) : 100
    };

    const result = await shippingService.getAllShipments(filters);

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Get all shipments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get shipments'
    });
  }
});

// Admin: Update carrier status
router.put('/admin/carriers/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    const result = await shippingService.updateCarrierStatus(id, is_active);

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Update carrier status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update carrier status'
    });
  }
});

// Admin: Create shipping rate
router.post('/admin/rates', async (req, res) => {
  try {
    const result = await shippingService.createShippingRate(req.body);

    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Create shipping rate error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create shipping rate'
    });
  }
});

export default router;