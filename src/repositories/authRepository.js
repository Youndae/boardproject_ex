import { Auth } from '@models/index.js';
import logger from '@config/loggerConfig.js';
import CustomError from '@errors/customError.js';
import { ResponseStatus } from '@constants/responseStatus.js';

export class AuthRepository {

	static async createMemberAuth(userId, role, options = {}) {
		try {
			await Auth.create({
				userId: userId,
				auth: role,
			}, { transaction: options.transaction });
		}catch(error) {
			logger.error('Failed to create member auth: ', { userId, error: error.message });
			throw new CustomError(ResponseStatus.INTERNAL_SERVER_ERROR);
		}
	}
}