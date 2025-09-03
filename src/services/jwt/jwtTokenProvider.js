import jwt from 'jsonwebtoken';
import { v4 as uuidv4} from 'uuid';
import { jwtConfig } from '@config/jwtConfig';
import { redisService } from '@services/redis/RedisService';
import { logger } from '@config/loggerConfig';
import CustomError from '@errors/customError';

export class JWTTokenProvider {

	// decodeToken. token is string
	static decodeToken(token) {
		const replacedToken = this.#replaceTokenValue(token);

		return jwt.decode(replacedToken);
	}

	// create payload
	static createPayload(userId) {
		return {
			userId,
		};
	};

	// replace token value
	static #replaceTokenValue(token) {
		return token.replace(jwtConfig.tokenPrefix, '');
	}

	// verify Access Token
	static async verifyAccessToken(token, inoValue, res) {
		const replacedToken = this.#replaceTokenValue(token);
		const verifyValue = this.#verifyToken(replacedToken, jwtConfig.accessSecret).userId;
		const redisKey = this.#getRedisKey(jwtConfig.accessKeyPrefix, verifyValue, inoValue);
		const redisValue = await redisService.getTokenValue(redisKey);

		if(redisValue === replacedToken)
			return verifyValue;
		else if(redisValue === null) {
			logger.error('Redis Token Value is Null. ', { redisValue, replacedToken });
			throw new CustomError(800, 'Token Stealing Error');
		} else {
			logger.error('Access Token Stealing. ', { redisValue, replacedToken });
			this.deleteAllTokenCookie(res);
			const refreshKey = this.#getRedisKey(jwtConfig.refreshKeyPrefix, verifyValue, inoValue);
			redisService.deleteTokenValue(redisKey);
			redisService.deleteTokenValue(refreshKey);
			throw new CustomError(800, 'Token Stealing Error');
		}
	}

	// verify Refresh Token
	static async verifyRefreshToken(token, inoValue, res) {
		const replacedToken = this.#replaceTokenValue(token);
		const verifyValue = this.#verifyToken(replacedToken, jwtConfig.refreshSecret).userId;
		const redisKey = this.#getRedisKey(jwtConfig.refreshKeyPrefix, verifyValue, inoValue);
		const redisValue = await redisService.getTokenValue(redisKey);

		if(redisValue === replacedToken)
			return verifyValue;
		else if(redisValue === null) {
			logger.error('Redis Token Value is Null. ', { redisValue, replacedToken });
			throw new CustomError(800, 'Token Stealing Error');
		} else {
			logger.error('Refresh Token Stealing. ', { redisValue, replacedToken });
			this.deleteAllTokenCookie(res);
			const refreshKey = this.#getRedisKey(jwtConfig.refreshKeyPrefix, verifyValue, inoValue);
			redisService.deleteTokenValue(redisKey);
			redisService.deleteTokenValue(refreshKey);
			throw new CustomError(800, 'Token Stealing Error');
		}
	}

	// verify Token
	static #verifyToken(tokenValue, secret) {
		try {
			const verifyValue = jwt.verify(tokenValue, secret);

			return verifyValue;
		}catch (error) {
			if(error instanceof jwt.TokenExpiredError) {
				logger.info('Token Expired', error.expiredAt);
				throw new CustomError(401, 'TOKEN_EXPIRED');
			}else if(error instanceof jwt.JsonWebTokenError) {
				logger.info('Invalid Token', error.message);
				throw new CustomError(401, 'UNAUTHORIZED');
			}else {
				logger.error('token verify error', error.message);
				throw new CustomError(500, 'INTERNAL_SERVER_ERROR');
			}
		}
	}

	static #getRedisKey(keyPrefix, verifyValue, inoValue) {
		return `${keyPrefix}${inoValue}${verifyValue}`;
	}

	static async deleteTokenData(userId, inoValue) {
		const accessKey = this.#getRedisKey(jwtConfig.accessKeyPrefix, userId, inoValue);
		const refreshKey = this.#getRedisKey(jwtConfig.refreshKeyPrefix, userId, inoValue);
		await redisService.deleteTokenValue(accessKey);
		await redisService.deleteTokenValue(refreshKey);
	}

	static deleteAllTokenCookie(res) {
		res.clearCookie(jwtConfig.accessHeader);
		res.clearCookie(jwtConfig.refreshHeader);
		res.clearCookie(jwtConfig.inoHeader);
	}

	static #setTokenCookie(token, expiresIn, name, res) {
		res.cookie(
			name,
			token,
			{
				httpOnly: true,
				secure: true,
				maxAge: expiresIn,
				sameSite: 'strict',
			}
		)
	}

	// issued Access Token
	static async issuedAccessToken(userId, inoValue) {
		const payload = this.createPayload(userId);
		const token = this.#createToken(payload, jwtConfig.accessSecret, jwtConfig.accessExpire);
		const redisKey = this.#getRedisKey(jwtConfig.accessKeyPrefix, userId, inoValue);
		await redisService.setTokenValue(redisKey, token, jwtConfig.accessExpire);

		return this.#setTokenPrefix(token);
	}

	// issued Refresh Token
	static async issuedRefreshToken(userId, inoValue) {
		const payload = this.createPayload(userId);
		const token = this.#createToken(payload, jwtConfig.refreshSecret, jwtConfig.refreshExpire);
		const redisKey = this.#getRedisKey(jwtConfig.refreshKeyPrefix, userId, inoValue);
		await redisService.setTokenValue(redisKey, token, jwtConfig.refreshExpire);

		return this.#setTokenPrefix(token);
	}

	static #setTokenPrefix(token) {
		return `${jwtConfig.tokenPrefix}${token}`;
	}

	static #createToken(payload, secret, expiresIn) {
		return jwt.sign(
			payload,
			secret,
			{
				expiresIn: expiresIn,
				subject: 'boardProject_express',
				algorithm: 'HS512',
			}
		)
	}

	static async issuedToken(userId, inoValue, res) {
		const accessToken = await this.issuedAccessToken(userId, inoValue);
		const refreshToken = await this.issuedRefreshToken(userId, inoValue);
		this.#setTokenCookie(accessToken, this.#convertExpiresToMillisecond(jwtConfig.accessExpire), jwtConfig.accessHeader, res);
		this.#setTokenCookie(refreshToken, this.#convertExpiresToMillisecond(jwtConfig.refreshExpire), jwtConfig.refreshHeader, res);
	}

	static async issuedAllToken(userId, res) {
		const inoValue = this.issuedIno();
		await this.issuedToken(userId, inoValue, res);
		this.#setTokenCookie(inoValue, this.#convertExpiresToMillisecond(jwtConfig.inoExpire), jwtConfig.inoHeader, res);
	}

	static issuedIno() {
		return uuidv4().replaceAll('-', '');
	}

	static async deleteTokenDataAndCookie(userId, inoValue, res) {
		await this.deleteTokenData(userId, inoValue);
		this.deleteAllTokenCookie(res);
	}

	static #convertExpiresToMillisecond(expiresIn) {
		const unit = expiresIn.slice(-1);
		const value = parseInt(expiresIn.slice(0, -1));

		switch(unit) {
			case 's':
				return value * 1000;
			case 'm':
				return value * 60 * 1000;
			case 'h':
				return value * 60 * 60 * 1000;
			case 'd':
				return value * 24 * 60 * 60 * 1000;
			default:
				throw new CustomError(400, 'Invalid convertExpiresToMillisecond');
		}
	}
 }