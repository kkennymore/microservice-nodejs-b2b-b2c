import { ShippingCarrierModel, ShippingRateModel, ShipmentModel, TrackingEventModel, SellerShippingSettingsModel } from '@/models/index.js';
import { createCarrierService } from '@/carrierServices.js';

export class ShippingService {
  constructor() {
    this.carrierModel = new ShippingCarrierModel();
    this.rateModel = new ShippingRateModel();
    this.shipmentModel = new ShipmentModel();
    this.trackingModel = new TrackingEventModel();
    this.settingsModel = new SellerShippingSettingsModel();
  }

  async getShippingRates(quoteRequest) {
    const { seller_id, ship_from, ship_to, items, weight } = quoteRequest;

    try {
      // Get seller's shipping settings
      const sellerSettings = await this.settingsModel.getBySellerId(seller_id);

      // Get active carriers
      const carriers = await this.carrierModel.getAllActive();

      // Determine shipping zone based on destination country
      const zoneId = await this._determineShippingZone(ship_to.country);

      if (!zoneId) {
        throw new Error('Shipping not available to this destination');
      }

      const totalWeight = weight || this._calculateTotalWeight(items);
      const allRates = [];

      // Get rates from each carrier
      for (const carrier of carriers) {
        try {
          const carrierService = createCarrierService(carrier);
          const carrierRates = await carrierService.getRates({
            ship_from,
            ship_to,
            weight: totalWeight,
            items
          });

          // Filter and format rates
          const formattedRates = carrierRates.map(rate => ({
            carrier_id: carrier.id,
            carrier_name: carrier.name,
            carrier_code: carrier.code,
            service_type: rate.service_type,
            service_name: rate.service_name,
            price: rate.price,
            currency: rate.currency || 'USD',
            estimated_days: rate.estimated_days,
            zone_id: zoneId
          }));

          allRates.push(...formattedRates);
        } catch (error) {
          console.warn(`Failed to get rates from ${carrier.name}:`, error.message);
        }
      }

      // Sort by price
      allRates.sort((a, b) => a.price - b.price);

      // Apply free shipping threshold if applicable
      if (sellerSettings?.free_shipping_threshold) {
        const itemTotal = items.reduce((total, item) => total + (item.price * item.quantity), 0);
        if (itemTotal >= sellerSettings.free_shipping_threshold) {
          // Add free shipping option
          allRates.unshift({
            carrier_id: null,
            carrier_name: 'Free Shipping',
            carrier_code: 'free',
            service_type: 'FREE',
            service_name: 'Free Shipping',
            price: 0,
            currency: 'USD',
            estimated_days: 5,
            zone_id: zoneId
          });
        }
      }

      return {
        success: true,
        data: {
          rates: allRates,
          total_weight: totalWeight,
          zone_id: zoneId,
          seller_settings: sellerSettings
        }
      };

    } catch (error) {
      console.error('Shipping rates error:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  async createShipment(shipmentRequest) {
    const { order_id, seller_id, carrier_id, service_type, items, ship_from, ship_to, weight } = shipmentRequest;

    try {
      // Validate shipment data
      const carrier = await this.carrierModel.getById(carrier_id);
      if (!carrier) {
        throw new Error('Invalid carrier selected');
      }

      // Get seller settings
      const sellerSettings = await this.settingsModel.getBySellerId(seller_id);

      // Calculate weight and dimensions
      const totalWeight = weight || this._calculateTotalWeight(items);
      const dimensions = this._calculateDimensions(items);

      // Create shipment record
      const shipmentId = await this.shipmentModel.create({
        order_id,
        seller_id,
        carrier_id,
        service_type,
        shipping_cost: 0, // Will be updated after label creation
        weight: totalWeight,
        dimensions,
        ship_from,
        ship_to,
        notes: shipmentRequest.notes
      });

      // Create carrier service and generate label
      const carrierService = createCarrierService(carrier);
      const labelResult = await carrierService.createLabel({
        ship_from,
        ship_to,
        weight: totalWeight,
        dimensions,
        service_type,
        items
      });

      // Update shipment with tracking info
      await this.shipmentModel.updateTracking(
        shipmentId,
        labelResult.tracking_number,
        labelResult.label_url,
        `${carrier.tracking_url}?tracknum=${labelResult.tracking_number}`
      );

      // Update shipping cost
      await this.shipmentModel.updateStatus(shipmentId, 'shipped');

      // Create shipment items records
      await this._createShipmentItems(shipmentId, items);

      // Get complete shipment data
      const shipment = await this.shipmentModel.getById(shipmentId);

      return {
        success: true,
        data: {
          shipment,
          label_url: labelResult.label_url,
          tracking_url: shipment.tracking_url,
          cost: labelResult.cost
        }
      };

    } catch (error) {
      console.error('Create shipment error:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  async trackShipment(trackingRequest) {
    const { tracking_number } = trackingRequest;

    try {
      // Find shipment by tracking number
      const shipment = await this.shipmentModel.getByTrackingNumber(tracking_number);
      if (!shipment) {
        throw new Error('Shipment not found');
      }

      // Get carrier service
      const carrier = await this.carrierModel.getById(shipment.carrier_id);
      const carrierService = createCarrierService(carrier);

      // Get tracking data from carrier
      const trackingData = await carrierService.trackPackage(tracking_number);

      // Store tracking events
      await this._storeTrackingEvents(shipment.id, trackingData.events);

      // Update shipment status if needed
      const latestEvent = trackingData.events[0];
      if (latestEvent && this._shouldUpdateStatus(latestEvent.type)) {
        await this.shipmentModel.updateStatus(shipment.id, this._mapEventToStatus(latestEvent.type));
      }

      // Get all tracking events
      const allEvents = await this.trackingModel.getByShipmentId(shipment.id);

      return {
        success: true,
        data: {
          shipment,
          tracking: trackingData,
          events: allEvents
        }
      };

    } catch (error) {
      console.error('Track shipment error:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  async getSellerShipments(sellerId, filters = {}) {
    try {
      const shipments = await this.shipmentModel.getBySeller(sellerId, filters);

      return {
        success: true,
        data: shipments
      };

    } catch (error) {
      console.error('Get seller shipments error:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  async updateSellerSettings(sellerId, settings) {
    try {
      await this.settingsModel.createOrUpdate(sellerId, settings);

      return {
        success: true,
        message: 'Shipping settings updated successfully'
      };

    } catch (error) {
      console.error('Update seller settings error:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  async _determineShippingZone(countryCode) {
    // This would query the shipping_zones table to find the appropriate zone
    // For now, return a default zone ID
    return 1; // Domestic US zone
  }

  async _createShipmentItems(shipmentId, items) {
    // Implementation for creating shipment_items records
    // This would need to be implemented when we have the order_items table structure
  }

  async _storeTrackingEvents(shipmentId, events) {
    for (const event of events) {
      await this.trackingModel.create({
        shipment_id: shipmentId,
        tracking_number: event.tracking_number,
        event_type: event.type,
        event_description: event.description,
        location: event.location,
        city: event.city,
        state: event.state,
        country: event.country,
        postal_code: event.postal_code,
        event_date: new Date(`${event.date} ${event.time || '00:00'}`),
        carrier_event_data: event
      });
    }
  }

  _calculateTotalWeight(items) {
    return items.reduce((total, item) => {
      return total + ((item.weight || 1) * (item.quantity || 1));
    }, 0);
  }

  _calculateDimensions(items) {
    // Simple dimension calculation
    const maxLength = Math.max(...items.map(item => item.length || 12));
    const maxWidth = Math.max(...items.map(item => item.width || 8));
    const totalHeight = items.reduce((total, item) => {
      return total + ((item.height || 2) * (item.quantity || 1));
    }, 0);

    return {
      length: maxLength,
      width: maxWidth,
      height: Math.min(totalHeight, 36)
    };
  }

  _shouldUpdateStatus(eventType) {
    const statusEvents = ['DELIVERED', 'DELIVERED', 'OUT_FOR_DELIVERY', 'IN_TRANSIT'];
    return statusEvents.includes(eventType?.toUpperCase());
  }

  _mapEventToStatus(eventType) {
    const statusMap = {
      'DELIVERED': 'delivered',
      'OUT_FOR_DELIVERY': 'out_for_delivery',
      'IN_TRANSIT': 'in_transit',
      'PICKUP': 'shipped'
    };

    return statusMap[eventType?.toUpperCase()] || 'in_transit';
  }

  async getShipmentById(id, user) {
    try {
      const shipment = await this.shipmentModel.getById(id);

      if (!shipment) {
        return {
          success: false,
          message: 'Shipment not found'
        };
      }

      // Check if user has permission to view this shipment
      if (user.role !== 'admin' && shipment.seller_id !== user.id) {
        return {
          success: false,
          message: 'Access denied'
        };
      }

      return {
        success: true,
        data: shipment
      };

    } catch (error) {
      console.error('Get shipment by ID error:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  async getSellerSettings(sellerId) {
    try {
      const settings = await this.settingsModel.getBySellerId(sellerId);

      return {
        success: true,
        data: settings || {}
      };

    } catch (error) {
      console.error('Get seller settings error:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  async getAvailableCarriers() {
    try {
      const carriers = await this.carrierModel.getAllActive();

      return {
        success: true,
        data: carriers
      };

    } catch (error) {
      console.error('Get available carriers error:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  async validateAddress(address) {
    try {
      // Basic address validation
      const required = ['street', 'city', 'state', 'postal_code', 'country'];
      const missing = required.filter(field => !address[field]);

      if (missing.length > 0) {
        return {
          success: false,
          message: `Missing required fields: ${missing.join(', ')}`
        };
      }

      // Validate postal code format
      if (address.country === 'US' && !/^\d{5}(-\d{4})?$/.test(address.postal_code)) {
        return {
          success: false,
          message: 'Invalid US postal code format'
        };
      }

      return {
        success: true,
        message: 'Address is valid',
        data: {
          validated: true,
          formatted_address: address
        }
      };

    } catch (error) {
      console.error('Validate address error:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  async getShippingZones() {
    try {
      // For now, return hardcoded zones
      // In production, this would query the shipping_zones table
      const zones = [
        { id: 1, name: 'United States', countries: ['US'] },
        { id: 2, name: 'Canada', countries: ['CA'] },
        { id: 3, name: 'Europe', countries: ['DE', 'FR', 'GB', 'IT', 'ES'] },
        { id: 4, name: 'Asia Pacific', countries: ['JP', 'CN', 'AU', 'SG'] }
      ];

      return {
        success: true,
        data: zones
      };

    } catch (error) {
      console.error('Get shipping zones error:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  async getAllShipments(filters = {}) {
    try {
      // Admin method to get all shipments with filters
      // Implementation would query shipments with admin filters
      return {
        success: true,
        data: [],
        message: 'Admin shipment listing - implementation pending'
      };

    } catch (error) {
      console.error('Get all shipments error:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  async updateCarrierStatus(id, isActive) {
    try {
      const success = await this.carrierModel.updateCarrierStatus(id, isActive);

      return {
        success,
        message: success ? 'Carrier status updated' : 'Failed to update carrier status'
      };

    } catch (error) {
      console.error('Update carrier status error:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  async createShippingRate(rateData) {
    try {
      const rateId = await this.rateModel.createRate(rateData);

      return {
        success: true,
        data: { id: rateId },
        message: 'Shipping rate created successfully'
      };

    } catch (error) {
      console.error('Create shipping rate error:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }
}