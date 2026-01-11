// backend/services/products/index.js
import express from 'express';
import http from 'http';
import { Server as SocketIO } from 'socket.io';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import winston from 'winston';
import { Sequelize } from 'sequelize';
import redis from 'redis';
import amqp from 'amqplib';
import dotenv from 'dotenv';
dotenv.config();

import config from '/app/shared/config.js';
import events from '/app/shared/events.js';

import { router as pligsProductsRoutes, setController as setProductsController } from '@/routes/productsRoutes.js';
import { router as pligsCategoriesRoutes, setController as setCategoriesController } from '@/routes/categoriesRoutes.js';
import { router as pligsOffersRoutes, setController as setOffersController } from '@/routes/offersRoutes.js';
import pligsSocketHandler from '@/utils/socketHandler.js';
import pligsErrorHandler from '@/middlewares/errorHandler.js';
import pligsLogger from '@/utils/logger.js';
import pligsEventConsumer from '@/utils/eventConsumer.js';

class PligsProductsService {
  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    this.io = new SocketIO(this.server, config.socket);
    this.sequelize = null;
    this.redisClient = null;
    this.rabbitChannel = null;
    this.logger = pligsLogger;
  }

  async pligsInitializeDatabase() {
    this.sequelize = new Sequelize(
      config.database.database,
      config.database.username,
      config.database.password,
      {
        host: config.database.host,
        port: config.database.port,
        dialect: config.database.dialect,
        pool: config.database.pool,
        logging: config.logging.enabled ? this.logger.info.bind(this.logger) : false
      }
    );

    try {
      await this.sequelize.authenticate();
      this.logger.info('Products service database connection established');
    } catch (error) {
      this.logger.error('Products service database connection failed:', error);
      throw error;
    }
  }

  async pligsInitializeRedis() {
    this.logger.warn('Redis initialization skipped - using null client');
    this.redisClient = null;
  }

  async pligsInitializeRabbitMQ() {
    try {
      const connection = await amqp.connect(config.rabbitmq.url);
      this.rabbitChannel = await connection.createChannel();
      await this.rabbitChannel.assertExchange(config.rabbitmq.exchange, 'topic', { durable: true });

      // Assert queues
      await this.rabbitChannel.assertQueue(config.rabbitmq.queues.product, { durable: true });
      await this.rabbitChannel.assertQueue(config.rabbitmq.queues.notification, { durable: true });

      // Bind queues to exchange
      await this.rabbitChannel.bindQueue(config.rabbitmq.queues.product, config.rabbitmq.exchange, 'product.*');
      await this.rabbitChannel.bindQueue(config.rabbitmq.queues.notification, config.rabbitmq.exchange, 'notification.*');

      this.logger.info('Products service RabbitMQ connection established');
    } catch (error) {
      this.logger.error('Products service RabbitMQ connection failed:', error);
      throw error;
    }
  }

  pligsSetupMiddleware() {
    this.app.use(helmet());
    this.app.use(cors());
    this.app.use(morgan('combined'));
    this.app.use(express.json({ limit: '50mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '50mb' }));
  }

  pligsSetupRoutes() {
    this.app.use('/api/products', pligsProductsRoutes);
    this.app.use('/api/categories', pligsCategoriesRoutes);
    this.app.use('/api/offers', pligsOffersRoutes);
    this.app.get('/health', (req, res) => res.status(200).json({ status: 'ok', service: 'products' }));
  }

  pligsSetupSockets() {
    this.io.on('connection', (socket) => pligsSocketHandler(socket, this.io, this.redisClient, this.rabbitChannel));
  }

  pligsSetupEventConsumer() {
    pligsEventConsumer(this.rabbitChannel, this.redisClient, this.sequelize);
  }

  pligsSetupErrorHandling() {
    this.app.use(pligsErrorHandler);
  }

  async pligsPublishEvent(eventType, data) {
    try {
      await this.rabbitChannel.publish(config.rabbitmq.exchange, eventType, Buffer.from(JSON.stringify(data)));
    } catch (error) {
      this.logger.error('Failed to publish event:', error);
    }
  }

  async pligsStart() {
    try {
      await this.pligsInitializeDatabase();
      await this.pligsInitializeRedis();
      await this.pligsInitializeRabbitMQ();

      // Initialize controllers
      setProductsController(this.sequelize, this.redisClient, this.rabbitChannel);
      setCategoriesController(this.sequelize, this.redisClient, this.rabbitChannel);
      setOffersController(this.sequelize, this.redisClient, this.rabbitChannel);

      this.pligsSetupMiddleware();
      this.pligsSetupRoutes();
      this.pligsSetupSockets();
      this.pligsSetupEventConsumer();
      this.pligsSetupErrorHandling();

      this.server.listen(config.ports.products, () => {
        this.logger.info(`Products service listening on port ${config.ports.products}`);
      });

      // Health checks and resilience
      setInterval(async () => {
        await this.pligsPublishEvent(events.SERVICE_HEALTH_CHECK, { service: 'products', status: 'up' });
      }, 30000);

    } catch (error) {
      this.logger.error('Failed to start products service:', error);
      process.exit(1);
    }
  }

  async pligsShutdown() {
    this.logger.info('Shutting down products service...');
    if (this.sequelize) await this.sequelize.close();
    if (this.redisClient) await this.redisClient.quit();
    if (this.rabbitChannel) await this.rabbitChannel.close();
    this.server.close();
  }
}

const service = new PligsProductsService();

process.on('SIGINT', async () => {
  await service.pligsShutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await service.pligsShutdown();
  process.exit(0);
});

service.pligsStart();

export default PligsProductsService;