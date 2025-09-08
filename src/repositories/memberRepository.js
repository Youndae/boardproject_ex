import { Member, Auth } from '@models/index.js';
import logger from '@config/loggerConfig.js';
import { ResponseStatus } from '@constants/responseStatus.js';
import CustomError from '@errors/customError.js';

export class MemberRepository {

	static async findMemberByUserId(userId) {
		return await Member.findOne({ where: { userId } });
	}

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
			if(error instanceof CustomError)
				throw error;
			throw new CustomError(ResponseStatus.INTERNAL_SERVER_ERROR);
		}
	}

	static async findOAuthMember(provider, userId) {
		return await Member.findOne({
			where: { userId, provider },
		});
	}

	static async createOAuthMember(userId, email, username, provider, userPw) {
		return await Member.create({
			userId,
			email,
			userName: username,
			provider,
			userPw,
		});
	}

	static async createMember(userId, hashedPw, email, username, nickname, profileImage) {
		return await Member.create({
			userId,
			userPw: hashedPw,
			email,
			userName: username,
			nickName: nickname,
			profileThumbnail: profileImage,
		});
	}

	static async findMemberByNickname(nickname) {
		return await Member.findOne({
			where: { nickName: nickname },
			attributes: ['userId'],
		});
	}

	static async patchMemberProfile(userId, nickname, profileImage) {
		return await Member.update({
			nickName: nickname,
			profileThumbnail: profileImage,
		}, {
			where: { userId },
		});
	}

	static async getMemberProfile(userId) {
		return await Member.findOne({
			where: { userId },
			attributes: ['nickName', 'profileThumbnail'],
		});
	}
}