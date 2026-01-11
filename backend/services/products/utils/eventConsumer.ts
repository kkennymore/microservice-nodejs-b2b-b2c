// backend/services/products/utils/eventConsumer.js
import config from '/app/shared/config.js';
import events from '/app/shared/events.js';
import pligsLogger from '@/logger.js';

const pligsEventConsumer = async (rabbitChannel, redisClient, sequelize) => {
  try {
    // Consume user events
    await rabbitChannel.consume(config.rabbitmq.queues.product, async (msg) => {
      if (msg) {
        try {
          const eventData = JSON.parse(msg.content.toString());
          await pligsHandleEvent(eventData, redisClient, sequelize);
          rabbitChannel.ack(msg);
        } catch (error) {
          pligsLogger.error('Error processing product event:', error);
          rabbitChannel.nack(msg, false, true); // Requeue
        }
      }
    }, { noAck: false });

    pligsLogger.info('Product event consumer started');
  } catch (error) {
    pligsLogger.error('Failed to start event consumer:', error);
  }
};

const pligsHandleEvent = async (eventData, redisClient, sequelize) => {
  const { type, data } = eventData;

  switch (type) {
    case events.USER_DELETED:
      // Handle user deletion - remove their products or reassign
      pligsLogger.info('Handling user deletion event:', data.userId);
      // Implementation would go here
      break;

    case events.PAYMENT_COMPLETED:
      // Handle successful payment - update product stock, etc.
      pligsLogger.info('Handling payment completed event:', data);
      break;

    case events.ORDER_CANCELLED:
      // Handle order cancellation - restore product stock
      pligsLogger.info('Handling order cancelled event:', data);
      break;

    default:
      pligsLogger.info('Unhandled event type:', type);
  }
};

export default pligsEventConsumer;