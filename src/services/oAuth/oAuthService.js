import { MemberRepository } from '@repositories/memberRepository.js';
import { AuthRepository } from '@repositories/authRepository.js';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import logger from '@config/loggerConfig.js';
import { sequelize } from '@models/index.js';
import CustomError from '@errors/customError.js';
import { ResponseStatus } from '@constants/responseStatus.js';

async function findOrCreateOAuthMember({
	provider,
	userId,
	email,
	username
}) {
	const transaction = await sequelize.transaction();

	try {
		let member = await MemberRepository.findOAuthMember(provider, userId);

		if(!member) {
			member = await MemberRepository.createOAuthMember(
				userId,
				email,
				username,
				provider,
				await bcrypt.hash(uuidv4().replaceAll('-', ''), 10),
				{ transaction }
			)

			await AuthRepository.createMemberAuth(userId, 'ROLE_MEMBER', { transaction });
		}

		await transaction.commit();
		return member;
	} catch(err) {
		await transaction.rollback();
		logger.error('Failed to find or create OAuth member: ', { err: err.message });
		throw new CustomError(ResponseStatus.INTERNAL_SERVER_ERROR);
	}
}

export const parsers = {
	google: (profile) => ({
		userId: `google_${profile.id}`,
		email: profile.emails && profile.emails[0] ? profile.emails[0].value : null,
		username: profile.displayName || `${profile.name?.givenName ?? ''} ${profile.name?.familyName ?? ''}`,
	}),
	kakao: (profile) => ({
		userId: `kakao_${profile.id}`,
		email: profile._json?.kakao_account?.email,
		username: profile._json?.kakao_account?.profile?.nickname,
	}),
	naver: (profile) => ({
		userId: `naver_${profile.id}`,
		email: profile._json?.email || (profile.emails?.[0]?.value ?? null),
		username: profile._json?.nickname || profile.displayName,
	})
}

export const oAuthCallback = (provider, parseProfile) =>
	async (accessToken, refreshToken, profile, done) => {
		try {
			const { userId, email, username } = parseProfile(profile);
			const member = await findOrCreateOAuthMember({ provider, userId, email, username });

			return done(null, member);			
		} catch(err) {
			return done(err);
		}
	}