// backend/services/products/utils/socketHandler.js
import pligsLogger from '@/logger.js';
import events from '/app/shared/events.js';

const pligsSocketHandler = (socket, io, redisClient, rabbitChannel) => {
  pligsLogger.info(`User connected: ${socket.id}`);

  // Join user-specific room
  socket.on('join', (userId) => {
    socket.join(`user_${userId}`);
    pligsLogger.info(`User ${userId} joined room`);
  });

  // Handle offer negotiations
  socket.on('offer_response', async (data) => {
    const { offerId, response, buyerId, sellerId, newPrice } = data;

    try {
      // Update offer in cache/database
      const offerKey = `offer:${offerId}`;
      const offer = await redisClient.get(offerKey);

      if (offer) {
        const offerData = JSON.parse(offer);
        offerData.status = response;
        if (newPrice) offerData.counterPrice = newPrice;

        await redisClient.setex(offerKey, 86400, JSON.stringify(offerData));

        // Notify buyer
        io.to(`user_${buyerId}`).emit('offer_update', {
          offerId,
          status: response,
          counterPrice: newPrice
        });

        // Publish event
        await rabbitChannel.publish(
          'marketplace_exchange',
          response === 'accepted' ? events.PRODUCT_OFFER_ACCEPTED : events.PRODUCT_OFFER_REJECTED,
          Buffer.from(JSON.stringify({ offerId, buyerId, sellerId, response, newPrice }))
        );
      }
    } catch (error) {
      pligsLogger.error('Offer response error:', error);
    }
  });

  // Handle product view tracking
  socket.on('view_product', async (data) => {
    const { productId, userId } = data;
    try {
      // Track view in analytics
      await redisClient.incr(`views:product:${productId}`);
      if (userId) {
        await redisClient.sadd(`viewed:products:${userId}`, productId);
      }
    } catch (error) {
      pligsLogger.error('Product view tracking error:', error);
    }
  });

  // Handle product likes
  socket.on('like_product', async (data) => {
    const { productId, userId } = data;
    try {
      // In a real implementation, you'd track individual user likes
      // For now, just broadcast the like event
      io.to(`product_${productId}`).emit('product_liked', {
        productId,
        userId,
        timestamp: new Date().toISOString()
      });

      // Publish event for analytics
      await rabbitChannel.publish(
        'marketplace_exchange',
        events.PRODUCT_LIKED,
        Buffer.from(JSON.stringify({ productId, userId }))
      );
    } catch (error) {
      pligsLogger.error('Product like error:', error);
    }
  });

  // Handle product reviews
  socket.on('add_review', async (data) => {
    const { productId, userId, rating, comment, sellerId } = data;
    try {
      // Broadcast review to product viewers and seller
      const reviewData = {
        productId,
        userId,
        rating,
        comment,
        timestamp: new Date().toISOString()
      };

      io.to(`product_${productId}`).emit('new_review', reviewData);
      io.to(`user_${sellerId}`).emit('product_reviewed', reviewData);

      // Publish event for processing
      await rabbitChannel.publish(
        'marketplace_exchange',
        events.PRODUCT_REVIEWED,
        Buffer.from(JSON.stringify(reviewData))
      );
    } catch (error) {
      pligsLogger.error('Add review error:', error);
    }
  });

  // Handle contact seller requests
  socket.on('contact_seller', async (data) => {
    const { productId, buyerId, sellerId, message, contactMethod } = data;
    try {
      const contactData = {
        productId,
        buyerId,
        sellerId,
        message,
        contactMethod,
        timestamp: new Date().toISOString()
      };

      // Notify seller
      io.to(`user_${sellerId}`).emit('new_contact_request', contactData);

      // Publish event for processing
      await rabbitChannel.publish(
        'marketplace_exchange',
        events.SELLER_CONTACTED,
        Buffer.from(JSON.stringify(contactData))
      );

      // Send confirmation to buyer
      socket.emit('contact_request_sent', {
        productId,
        sellerId,
        status: 'sent'
      });
    } catch (error) {
      pligsLogger.error('Contact seller error:', error);
      socket.emit('contact_request_error', {
        productId,
        sellerId,
        error: 'Failed to send contact request'
      });
    }
  });

  // Join product room for real-time updates
  socket.on('join_product', (productId) => {
    socket.join(`product_${productId}`);
    pligsLogger.info(`User joined product room: ${productId}`);
  });

  // Leave product room
  socket.on('leave_product', (productId) => {
    socket.leave(`product_${productId}`);
    pligsLogger.info(`User left product room: ${productId}`);
  });

  // Handle live search
  socket.on('search_products', async (data) => {
    const { query, filters, userId } = data;
    try {
      // In a real implementation, you'd perform the search
      // For now, just acknowledge and send basic response
      socket.emit('search_results', {
        query,
        results: [],
        timestamp: new Date().toISOString()
      });

      // Track search analytics
      if (userId) {
        await redisClient.incr(`searches:query:${query}`);
        await redisClient.sadd(`searched:users:${userId}`, query);
      }
    } catch (error) {
      pligsLogger.error('Search products error:', error);
    }
  });

  socket.on('disconnect', () => {
    pligsLogger.info(`User disconnected: ${socket.id}`);
  });
};

export default pligsSocketHandler;