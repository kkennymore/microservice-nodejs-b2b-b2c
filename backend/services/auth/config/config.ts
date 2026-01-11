import config from '@/../../shared/config.js';

export default {
  development: {
    username: config.database.username,
    password: config.database.password,
    database: config.database.database,
    host: config.database.host,
    port: config.database.port,
    dialect: config.database.dialect,
    logging: console.log,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  },
  production: {
    username: config.database.username,
    password: config.database.password,
    database: config.database.database,
    host: config.database.host,
    port: config.database.port,
    dialect: config.database.dialect,
    logging: false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
};