import { createClient } from 'redis';
import logger from '#config/loggerConfig.js';

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

export async function initRedis() {
	if(!redisClient.isOpen)
		await redisClient.connect();
}

export async function closeRedis() {
	if(redisClient.isOpen)
		await redisClient.quit();
}

export default redisConfig;