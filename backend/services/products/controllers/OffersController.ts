// backend/services/products/controllers/OffersController.js
import Joi from 'joi';
import events from '/app/shared/events.js';
import pligsLogger from '@/utils/logger.js';

class PligsOffersController {
  constructor(sequelize, redisClient, rabbitChannel) {
    // Handle Redis client - use mock if not available
    this.redisClient = redisClient || {
      get: () => Promise.resolve(null),
      set: () => Promise.resolve(null),
      setex: () => Promise.resolve(null),
      del: () => Promise.resolve(null),
      quit: () => Promise.resolve()
    };
    this.rabbitChannel = rabbitChannel;
  }

  pligsValidateOfferResponse = (req, res, next) => {
    const schema = Joi.object({
      response: Joi.string().valid('accept', 'reject', 'counter').required(),
      counterPrice: Joi.number().positive().when('response', {
        is: 'counter',
        then: Joi.required()
      })
    });

    const { error } = schema.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });
    next();
  };

  pligsGetOffers = async (req, res) => {
    try {
      const userId = req.user.id;
      const pattern = `offer:*`;
      const keys = await this.redisClient.keys(pattern);

      const offers = [];
      for (const key of keys) {
        const offerData = await this.redisClient.get(key);
        if (offerData) {
          const offer = JSON.parse(offerData);
          if (offer.buyerId === userId || offer.sellerId === userId) {
            offers.push({ id: key.split(':')[1], ...offer });
          }
        }
      }

      res.json({
        success: true,
        data: offers
      });

    } catch (error) {
      pligsLogger.error('Get offers error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch offers' });
    }
  };

  pligsGetOffer = async (req, res) => {
    try {
      const { id } = req.params;
      const offerData = await this.redisClient.get(`offer:${id}`);

      if (!offerData) {
        return res.status(404).json({ success: false, message: 'Offer not found' });
      }

      const offer = JSON.parse(offerData);

      // Check permissions
      if (offer.buyerId !== req.user.id && offer.sellerId !== req.user.id) {
        return res.status(403).json({ success: false, message: 'Unauthorized' });
      }

      res.json({
        success: true,
        data: { id, ...offer }
      });

    } catch (error) {
      pligsLogger.error('Get offer error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch offer' });
    }
  };

  pligsRespondToOffer = async (req, res) => {
    try {
      const { id } = req.params;
      const { response, counterPrice } = req.body;

      const offerData = await this.redisClient.get(`offer:${id}`);
      if (!offerData) {
        return res.status(404).json({ success: false, message: 'Offer not found' });
      }

      const offer = JSON.parse(offerData);

      // Check if user is the seller
      if (offer.sellerId !== req.user.id) {
        return res.status(403).json({ success: false, message: 'Only seller can respond to offers' });
      }

      offer.response = response;
      if (counterPrice) offer.counterPrice = counterPrice;
      offer.respondedAt = new Date();

      await this.redisClient.setex(`offer:${id}`, 86400, JSON.stringify(offer));

      // Publish event
      await this.pligsPublishEvent(
        response === 'accept' ? events.PRODUCT_OFFER_ACCEPTED : events.PRODUCT_OFFER_REJECTED,
        { offerId: id, buyerId: offer.buyerId, sellerId: offer.sellerId, response, counterPrice }
      );

      res.json({
        success: true,
        message: 'Offer response submitted',
        data: { id, ...offer }
      });

    } catch (error) {
      pligsLogger.error('Respond to offer error:', error);
      res.status(500).json({ success: false, message: 'Failed to respond to offer' });
    }
  };

  async pligsPublishEvent(eventType, data) {
    try {
      await this.rabbitChannel.publish('marketplace_exchange', eventType, Buffer.from(JSON.stringify(data)));
    } catch (error) {
      pligsLogger.error('Failed to publish event:', error);
    }
  }
}

export default PligsOffersController;