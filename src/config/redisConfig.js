import { createClient } from 'redis';
import { logger } from '@config/loggerConfig';

const redisConfig = {
	host: process.env.REDIS_HOST,
	port: process.env.REDIS_PORT,
};

export const redisClient = createClient({
	url: `redis://${redisConfig.host}:${redisConfig.port}`
});

redisClient.on('error', (err) => {
	logger.error('Redis Client Error', err);
});

redisClient.on('connect', () => {
	logger.info('Redis Client Connected');
});

export default redisConfig;