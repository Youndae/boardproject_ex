import { Member, Auth } from '#models/index.js';
import logger from '#config/loggerConfig.js';
import { ResponseStatus } from '#constants/responseStatus.js';
import CustomError from '#errors/customError.js';

export class MemberRepository {

	static async findMemberByUserId(userId) {
		return await Member.findOne({ where: { userId: userId } });
	}

	static async findMemberById(id) {
		return await Member.findOne({ where: { id } });
	}

	static async findMemberByUserIdFromLocal(userId) {
		return await Member.findOne({ where: { userId: userId, provider: 'local' } });
	}

	static async findUserIdAndRoleById(id) {
		const member = await Member.findOne({
			attributes: [
				'userId'
			],
			where: { id },
			include: [
				{
					model: Auth,
					as: 'auths',
					attributes: ['auth']
				}
			],
		});

		if(!member) return null;

		const rawData = member.get({ plain: true });

		return {
			userId: rawData.userId,
			roles: rawData.auths.map(auth => auth.auth),
		}
	}

	static async findUserIdWithRoles(userId) {
		try {
			const member = await Member.findOne({
				attributes: ['id'],
				where: { userId },
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
				id: member.id,
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

	static async createOAuthMember(userId, email, userName, provider, userPw, options = {}) {
		return await Member.create({
			userId: userId,
			email: email,
			username: userName,
			provider: provider,
			password: userPw,
		}, { transaction: options.transaction });
	}

	static async createMember(userId, hashedPw, userName, nickname, email, profileThumbnail, options = {}) {
		return await Member.create({
			userId: userId,
			password: hashedPw,
			email: email,
			username: userName,
			nickname: nickname,
			profile: profileThumbnail,
		}, { transaction: options.transaction });
	}

	static async findMemberByNickname(nickname) {
		return await Member.findOne({
			where: { nickname: nickname },
			attributes: ['userId'],
		});
	}

	static async patchMemberProfile(id, nickname, email, profileImage, options = {}) {
		const updateData = { nickname: nickname, email: email };

		if(profileImage !== undefined)
			updateData.profile = profileImage;

		return await Member.update(updateData, { where: { id }, transaction: options.transaction });
	}

	static async getMemberProfile(id) {
		return await Member.findOne({
			where: { id },
			attributes: ['nickname', 'profile', 'email'],
		});
	}

	static async patchOAuthJoinProfile(id, nickname, profile, options = {}) {
		await Member.update(
			{
				nickname: nickname,
				profile: profile,
			},
			{
				where: { id },
				transaction: options.transaction
			}
		)
	}
}