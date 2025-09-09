import { JWTTokenProvider } from "@services/jwt/jwtTokenProvider.js"
import logger from "@config/loggerConfig.js"

export const createTestToken = async (userId) => {
	try {
		const ino = JWTTokenProvider.issuedIno();
		const accessToken = await JWTTokenProvider.issuedAccessToken(userId, ino);
		const refreshToken = await JWTTokenProvider.issuedRefreshToken(userId, ino);

		return { accessToken, refreshToken, ino };
	}catch(error) {
		logger.error('createTestToken Error', error);
		throw error;
	}
}