import { Member, Auth } from '@models/index.js';
import { logger } from '@config/loggerConfig';
import { ResponseStatus } from '../constants/responseStatus';
import CustomError from '@errors/customError';

export class MemberRepository {

	static async findUserIdWithRoles(userId) {
		try {
			const member = await Member.findOne({
				where: { userId },
				attributes: ['userId'],
				include: [
					{
						model: Auth,
						as: 'auths',
						attributes: ['auth'],
						required: false, // LEFT JOIN 처리.
					}
				]
			});

			if(!member)
				throw new CustomError(ResponseStatus.BAD_REQUEST);

			if(!member.auths || member.auths.length === 0) {
				logger.error('User has no roles. Data integrity issue ', { 
					userId,
					message: '사용자 정보는 존재하지만 권한 정보가 존재하지 않음.',
				});

				throw new CustomError(ResponseStatus.INTERNAL_SERVER_ERROR);
			}

			return {
				userId: member.userId,
				roles: member.auths.map(auth => auth.auth),
			};
		}catch(error) {
			logger.error('Failed to find user with roles: ', { userId, error: error.message });
			throw new CustomError(ResponseStatus.INTERNAL_SERVER_ERROR);
		}
	}
}