// backend/services/auth/index.js
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

import config from '@/shared/config.js';
import events from '@/shared/events.js';

// Import all models
import PligsUser from '@/models/User.js';
import PligsUserPassword from '@/models/UserPassword.js';
import PligsUserProfile from '@/models/UserProfile.js';
import PligsUserKyc from '@/models/UserKyc.js';
import PligsUserBusiness from '@/models/UserBusiness.js';
import PligsUserBank from '@/models/UserBank.js';
import PligsUserSecurity from '@/models/UserSecurity.js';
import PligsUserPreference from '@/models/UserPreference.js';

import pligsAuthRoutes from '@/routes/authRoutes.js';
import { router as pligsSellerRoutes, setController as setSellerController } from '@/routes/sellerRoutes.js';
import pligsSocketHandler from '@/utils/socketHandler.js';
import pligsErrorHandler from '@/middlewares/errorHandler.js';
import pligsLogger from '@/utils/logger.js';
import { setController } from '@/routes/authRoutes.js';

class PligsAuthService {
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
    this.sequelize = new Sequelize(config.database.database, config.database.username, config.database.password, {
      host: config.database.host,
      port: config.database.port,
      dialect: config.database.dialect,
      pool: config.database.pool,
      logging: config.logging.enabled ? this.logger.info.bind(this.logger) : false
    });

    // Initialize all models with sequelize instance
    this.models = {
      user: new PligsUser(this.sequelize),
      password: new PligsUserPassword(this.sequelize),
      profile: new PligsUserProfile(this.sequelize),
      kyc: new PligsUserKyc(this.sequelize),
      business: new PligsUserBusiness(this.sequelize),
      bank: new PligsUserBank(this.sequelize),
      security: new PligsUserSecurity(this.sequelize),
      preference: new PligsUserPreference(this.sequelize)
    };

    try {
      await this.sequelize.authenticate();
      this.logger.info('Auth service database connection established');
    } catch (error) {
      this.logger.error('Auth service database connection failed:', error);
      throw error;
    }
  }

  async pligsInitializeRedis() {
    this.logger.info('Initializing Redis with config:', config.redis);

    // Skip Redis initialization entirely for now
    this.logger.warn('Redis initialization skipped - using null client');
    this.redisClient = null;
  }

  async pligsInitializeRabbitMQ() {
    try {
      const connection = await amqp.connect(config.rabbitmq.url);
      this.rabbitChannel = await connection.createChannel();
      await this.rabbitChannel.assertExchange(config.rabbitmq.exchange, 'topic', { durable: true });
      this.logger.info('RabbitMQ connection established');
    } catch (error) {
      this.logger.error('RabbitMQ connection failed:', error);
      throw error;
    }
  }

  pligsSetupMiddleware() {
    this.app.use(helmet());
    this.app.use(cors());
    this.app.use(morgan('combined'));
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Serve uploaded files statically
    this.app.use('/uploads', express.static('uploads'));
  }

  pligsSetupRoutes() {
    this.app.use('/api/auth', pligsAuthRoutes);
    this.app.use('/api/seller', pligsSellerRoutes);
    this.app.get('/health', (req, res) => res.status(200).json({ status: 'ok', service: 'auth' }));
  }

  pligsSetupSockets() {
    this.io.on('connection', (socket) => pligsSocketHandler(socket, this.io, this.redisClient, this.rabbitChannel));
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
      setController(this.sequelize, this.redisClient, this.rabbitChannel);
      setSellerController(this.sequelize, this.redisClient, this.rabbitChannel);

      this.pligsSetupMiddleware();
      this.pligsSetupRoutes();
      this.pligsSetupSockets();
      this.pligsSetupErrorHandling();

      this.server.listen(config.ports.auth, () => {
        this.logger.info(`Auth service listening on port ${config.ports.auth}`);
      });

      // Health checks and resilience
      setInterval(async () => {
        // Publish health check event
        await this.pligsPublishEvent(events.SERVICE_HEALTH_CHECK, { service: 'auth', status: 'up' });
      }, 30000);

    } catch (error) {
      this.logger.error('Failed to start auth service:', error);
      process.exit(1);
    }
  }

  async pligsShutdown() {
    this.logger.info('Shutting down auth service...');
    if (this.sequelize) await this.sequelize.close();
    if (this.redisClient) await this.redisClient.quit();
    if (this.rabbitChannel) await this.rabbitChannel.close();
    this.server.close();
  }
}

const service = new PligsAuthService();

process.on('SIGINT', async () => {
  await service.pligsShutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await service.pligsShutdown();
  process.exit(0);
});

service.pligsStart();

export default PligsAuthService;