import { redisClient } from '#config/redisConfig.js';
import logger from '#config/loggerConfig.js';
import CustomError from '#errors/customError.js';
import {ResponseStatus} from "#constants/responseStatus.js";

export class RedisService {
	// get Token Value
	static async getTokenValue(redisKey) {
		try {
			return await redisClient.get(redisKey);
		}catch (error) {
			logger.error('Redis getTokenValue error', {error});
			throw new CustomError(ResponseStatus.INTERNAL_SERVER_ERROR);
		}
	}

	// set Token Value
	static async setTokenValue(redisKey, tokenValue, expiresIn) {
		try {
			return await redisClient.set(redisKey, tokenValue, { EX: expiresIn });
		}catch (error) {
			logger.error('Redis setTokenValue error', {error});
			throw new CustomError(ResponseStatus.INTERNAL_SERVER_ERROR);
		}
	}

	// delete Token Value
	static async deleteTokenValue(redisKey) {
		try {
			return await redisClient.del(redisKey);
		}catch (error) {
			logger.error('Redis deleteTokenValue error', {error});
			throw new CustomError(ResponseStatus.INTERNAL_SERVER_ERROR);
		}
	}
}