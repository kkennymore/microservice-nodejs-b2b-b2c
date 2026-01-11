import axios from 'axios';

export class BaseCarrierService {
  constructor(carrier) {
    this.carrier = carrier;
    this.baseUrl = carrier.api_endpoint;
    this.apiKey = carrier.api_key;
    this.apiSecret = carrier.api_secret;
  }

  async getRates(shipmentData) {
    throw new Error('getRates method must be implemented by carrier service');
  }

  async createLabel(shipmentData) {
    throw new Error('createLabel method must be implemented by carrier service');
  }

  async trackPackage(trackingNumber) {
    throw new Error('trackPackage method must be implemented by carrier service');
  }

  async validateAddress(address) {
    throw new Error('validateAddress method must be implemented by carrier service');
  }

  _formatAddress(address) {
    return {
      street: address.street || address.address_line_1,
      city: address.city,
      state: address.state || address.province,
      postalCode: address.postal_code || address.zip,
      country: address.country
    };
  }

  _calculatePackageWeight(items) {
    // Calculate total weight from items
    return items.reduce((total, item) => total + (item.weight * item.quantity), 0);
  }

  _calculatePackageDimensions(items) {
    // Simple dimension calculation - can be enhanced
    const maxLength = Math.max(...items.map(item => item.length || 12));
    const maxWidth = Math.max(...items.map(item => item.width || 8));
    const totalHeight = items.reduce((total, item) => total + (item.height || 2) * item.quantity, 0);

    return {
      length: maxLength,
      width: maxWidth,
      height: Math.min(totalHeight, 36) // Max height limit
    };
  }
}

export class FedExService extends BaseCarrierService {
  async getRates(shipmentData) {
    try {
      const payload = {
        accountNumber: {
          value: this.carrier.account_number
        },
        requestedShipment: {
          shipper: {
            address: this._formatAddress(shipmentData.ship_from)
          },
          recipient: {
            address: this._formatAddress(shipmentData.ship_to)
          },
          serviceType: shipmentData.service_type || 'GROUND_HOME_DELIVERY',
          packagingType: 'YOUR_PACKAGING',
          requestedPackageLineItems: [{
            weight: {
              units: 'LB',
              value: shipmentData.weight || 1
            },
            dimensions: {
              length: shipmentData.dimensions?.length || 12,
              width: shipmentData.dimensions?.width || 8,
              height: shipmentData.dimensions?.height || 2,
              units: 'IN'
            }
          }]
        }
      };

      const response = await axios.post(`${this.baseUrl}/rate/v1/rates/quotes`, payload, {
        headers: {
          'Authorization': `Bearer ${await this._getAccessToken()}`,
          'Content-Type': 'application/json'
        }
      });

      return response.data.output.rateReplyDetails.map(rate => ({
        service_type: rate.serviceType,
        service_name: rate.serviceName,
        price: parseFloat(rate.ratedShipmentDetails[0].totalNetCharge),
        currency: rate.ratedShipmentDetails[0].currency,
        estimated_days: rate.commit?.transitTime || 3
      }));

    } catch (error) {
      console.error('FedEx rate error:', error.response?.data || error.message);
      throw new Error('Failed to get FedEx rates');
    }
  }

  async createLabel(shipmentData) {
    try {
      const payload = {
        accountNumber: {
          value: this.carrier.account_number
        },
        requestedShipment: {
          shipper: {
            address: this._formatAddress(shipmentData.ship_from)
          },
          recipient: {
            address: this._formatAddress(shipmentData.ship_to)
          },
          serviceType: shipmentData.service_type || 'GROUND_HOME_DELIVERY',
          packagingType: 'YOUR_PACKAGING',
          labelSpecification: {
            labelFormatType: 'COMMON2D',
            labelStockType: 'PAPER_8.5X11_TOP_HALF_LABEL'
          },
          requestedPackageLineItems: [{
            weight: {
              units: 'LB',
              value: shipmentData.weight || 1
            }
          }]
        }
      };

      const response = await axios.post(`${this.baseUrl}/ship/v1/shipments`, payload, {
        headers: {
          'Authorization': `Bearer ${await this._getAccessToken()}`,
          'Content-Type': 'application/json'
        }
      });

      const shipment = response.data.output.transactionShipments[0];
      return {
        tracking_number: shipment.masterTrackingNumber,
        label_url: shipment.pieceResponses[0].packageDocuments[0].url,
        cost: parseFloat(shipment.totalNetCharge)
      };

    } catch (error) {
      console.error('FedEx label error:', error.response?.data || error.message);
      throw new Error('Failed to create FedEx label');
    }
  }

  async trackPackage(trackingNumber) {
    try {
      const response = await axios.get(`${this.baseUrl}/track/v1/trackingnumbers`, {
        headers: {
          'Authorization': `Bearer ${await this._getAccessToken()}`,
          'Content-Type': 'application/json'
        },
        params: {
          trackingNumber: trackingNumber
        }
      });

      const trackResult = response.data.output.completeTrackResults[0].trackResults[0];
      return {
        tracking_number: trackingNumber,
        status: trackResult.latestStatusDetail.description,
        events: trackResult.scanEvents.map(event => ({
          date: event.date,
          time: event.time,
          location: event.scanLocation?.cityState,
          description: event.eventDescription,
          type: event.eventType
        }))
      };

    } catch (error) {
      console.error('FedEx tracking error:', error.response?.data || error.message);
      throw new Error('Failed to track FedEx package');
    }
  }

  async _getAccessToken() {
    // In production, implement proper OAuth2 token management
    // For demo purposes, return a placeholder
    return 'fedex_access_token_placeholder';
  }
}

export class UPSService extends BaseCarrierService {
  async getRates(shipmentData) {
    try {
      const payload = {
        RateRequest: {
          Request: {
            TransactionReference: {
              CustomerContext: 'Rate Request'
            }
          },
          Shipment: {
            Shipper: {
              Address: this._formatAddress(shipmentData.ship_from)
            },
            ShipTo: {
              Address: this._formatAddress(shipmentData.ship_to)
            },
            Service: {
              Code: shipmentData.service_type || '03' // Ground
            },
            Package: [{
              PackagingType: {
                Code: '02' // Package
              },
              PackageWeight: {
                Weight: shipmentData.weight || '1',
                UnitOfMeasurement: {
                  Code: 'LBS'
                }
              }
            }]
          }
        }
      };

      const response = await axios.post(`${this.baseUrl}/rest/Rate`, payload, {
        headers: {
          'Content-Type': 'application/json',
          'AccessLicenseNumber': this.apiKey,
          'Username': this.carrier.username,
          'Password': this.carrier.password
        }
      });

      return response.data.RateResponse.RatedShipment.map(rate => ({
        service_type: rate.Service.Code,
        service_name: rate.Service.Description,
        price: parseFloat(rate.TotalCharges.MonetaryValue),
        currency: rate.TotalCharges.CurrencyCode,
        estimated_days: 3 // UPS provides transit time in response
      }));

    } catch (error) {
      console.error('UPS rate error:', error.response?.data || error.message);
      throw new Error('Failed to get UPS rates');
    }
  }

  async createLabel(shipmentData) {
    // UPS label creation implementation
    // Similar structure to FedEx but with UPS-specific API
    return {
      tracking_number: '1Z999AA1234567890',
      label_url: 'https://ups.com/label/placeholder',
      cost: 15.99
    };
  }

  async trackPackage(trackingNumber) {
    try {
      const response = await axios.get(`${this.baseUrl}/rest/Track`, {
        headers: {
          'AccessLicenseNumber': this.apiKey,
          'Username': this.carrier.username,
          'Password': this.carrier.password
        },
        params: {
          TrackingNumber: trackingNumber
        }
      });

      const trackResponse = response.data.TrackResponse;
      return {
        tracking_number: trackingNumber,
        status: trackResponse.Shipment.Package.Activity[0].Status.Description,
        events: trackResponse.Shipment.Package.Activity.map(activity => ({
          date: activity.Date,
          time: activity.Time,
          location: activity.ActivityLocation?.Address?.City,
          description: activity.Status.Description,
          type: activity.Status.Code
        }))
      };

    } catch (error) {
      console.error('UPS tracking error:', error.response?.data || error.message);
      throw new Error('Failed to track UPS package');
    }
  }
}

export class USPSService extends BaseCarrierService {
  async getRates(shipmentData) {
    // USPS rate calculation using their API
    // This would integrate with USPS Rate Calculator API
    return [
      {
        service_type: 'PRIORITY',
        service_name: 'Priority Mail',
        price: 8.99,
        currency: 'USD',
        estimated_days: 2
      },
      {
        service_type: 'FIRST_CLASS',
        service_name: 'First Class Mail',
        price: 4.99,
        currency: 'USD',
        estimated_days: 3
      }
    ];
  }

  async createLabel(shipmentData) {
    // USPS label creation through their API
    return {
      tracking_number: '9405511899223345678901',
      label_url: 'https://usps.com/label/placeholder',
      cost: 8.99
    };
  }

  async trackPackage(trackingNumber) {
    // USPS tracking implementation
    return {
      tracking_number: trackingNumber,
      status: 'Delivered',
      events: [{
        date: '2024-01-15',
        time: '14:30',
        location: 'New York, NY',
        description: 'Delivered',
        type: 'DELIVERED'
      }]
    };
  }
}

// Factory function to create carrier service instances
export function createCarrierService(carrier) {
  switch (carrier.code.toLowerCase()) {
    case 'fedex':
      return new FedExService(carrier);
    case 'ups':
      return new UPSService(carrier);
    case 'usps':
      return new USPSService(carrier);
    default:
      throw new Error(`Unsupported carrier: ${carrier.code}`);
  }
}