import { Auth } from '@models/index.js';
import { logger } from '@config/loggerConfig';
import CustomError from '@errors/customError';
import { ResponseStatus } from '@constants/responseStatus';

export class AuthRepository {

	static async createMemberAuth(userId, role) {
		try {
			await Auth.create({
				userId,
				role,
			});
		}catch(error) {
			logger.error('Failed to create member auth: ', { userId, error: error.message });
			throw new CustomError(ResponseStatus.INTERNAL_SERVER_ERROR);
		}
	}
}