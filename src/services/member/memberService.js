import { MemberRepository } from "#repositories/memberRepository.js"
import { AuthRepository } from "#repositories/authRepository.js"
import logger from "#config/loggerConfig.js"
import CustomError from "#errors/customError.js"
import { ResponseStatus } from "#constants/responseStatus.js"
import bcrypt from "bcrypt"
import { sequelize } from "#models/index.js"
import { deleteImageFile } from "#utils/fileUtils.js";
import { getResizeProfileName } from "#utils/fileNameUtils.js";
import { ImageConstants } from "#constants/imageConstants.js";
import {getMaxRole} from "#utils/authUtils.js";
import {memberCheckConstants} from "#constants/memberCheckConstants.js";
import {findSuffixType, MailConstants} from "#constants/mailConstants.js";

export async function getMemberStatus(userId) {
	try {
		const member = await MemberRepository.findUserIdAndRoleById(userId);

		if(!member) {
			logger.warn('getMemberStatus Member not found.', { userId });
			throw new CustomError(ResponseStatus.FORBIDDEN);
		}

		const maxRole = getMaxRole(member.roles);

		return {
			userId: member.userId,
			role: maxRole,
		}
	}catch(error) {
		logger.warn('memberService.getMemberStatus error', {error});

		if(error instanceof CustomError)
			throw error;

		throw new CustomError(ResponseStatus.INTERNAL_SERVER_ERROR);
	}
}

export async function registerService ( {userId, password, username, nickname, email}, profileThumbnail = null ) {
	const transaction = await sequelize.transaction();
	let profile = profileThumbnail ? getResizeProfileName(profileThumbnail) : null;
	try {
		const member = await MemberRepository.findMemberByUserId(userId);
		if(member)
			throw new CustomError(ResponseStatus.BAD_REQUEST);
		const hashedPw = await bcrypt.hash(password, 10);

		const saveMember = await MemberRepository.createMember(userId, hashedPw, username, nickname, email, profile, { transaction });
		await AuthRepository.createMemberAuth(saveMember.id, 'ROLE_MEMBER', { transaction });

		await transaction.commit();
	}catch(error) {
		await transaction.rollback();
		logger.error('Failed to register service.');

		if(profile)
			await deleteImageFile(profile, ImageConstants.PROFILE_TYPE);

		if(error instanceof CustomError && error.status === ResponseStatus.BAD_REQUEST.CODE){
			logger.error('Register service member already exists.');
			throw error;
		}

		throw new CustomError(ResponseStatus.INTERNAL_SERVER_ERROR);
	}
}

export async function checkIdService (userId) {
	try {
		const member = await MemberRepository.findMemberByUserId(userId);

		if(member)
			throw new CustomError(ResponseStatus.CONFLICT);

		return memberCheckConstants.VALID;
	}catch(error) {
		if(error instanceof CustomError)
			throw error;

		logger.error('Failed to check id service.')
		throw new CustomError(ResponseStatus.INTERNAL_SERVER_ERROR);
	}
}

export async function checkNicknameService (userId, nickName) {
	try {
		const member = await MemberRepository.findMemberByNickname(nickName);

		if(member) {
			if(userId === member.userId)  // 동일한 nickName이 존재하지만 사용자의 닉네임인 경우
				return memberCheckConstants.VALID;

			throw new CustomError(ResponseStatus.CONFLICT);
		}

		return memberCheckConstants.VALID;
	}catch(error) {
		logger.error('Failed to check nickname service.')

		if(error instanceof CustomError)
			throw error;

		throw new CustomError(ResponseStatus.INTERNAL_SERVER_ERROR);
	}
}

export async function patchProfileService (userId, nickName, email, profileThumbnail = null, deleteProfile = null) {
	const transaction = await sequelize.transaction();
	try {
		let dbProfileThumbnail = null;
		if(profileThumbnail)
			dbProfileThumbnail = `${getResizeProfileName(profileThumbnail)}`;

		if(!profileThumbnail && !deleteProfile)
			dbProfileThumbnail = undefined;

		if(!profileThumbnail && deleteProfile)
			dbProfileThumbnail = null;

		await MemberRepository.patchMemberProfile(userId, nickName, email, dbProfileThumbnail, { transaction });

		if(deleteProfile){
			await deleteImageFile(deleteProfile, ImageConstants.PROFILE_TYPE);
		}
			
		await transaction.commit();
	}catch(error) {
		await transaction.rollback();

		logger.error('Failed to patch profile service.', error);

		if(profileThumbnail)
			await deleteImageFile(profileThumbnail, ImageConstants.PROFILE_TYPE);

		throw new CustomError(ResponseStatus.INTERNAL_SERVER_ERROR);
	}
}

export async function getProfileService (id) {
	try {
		const member = await MemberRepository.getMemberProfile(id);

		if(!member){
			logger.error('getProfileService member is null', {id})
			throw new CustomError(ResponseStatus.BAD_REQUEST);
		}


		const splitMail = member.email.split('@');
		const suffix = splitMail[1].substring(0, splitMail[1].indexOf('.'));
		const type = findSuffixType(suffix);

		return {
			nickname: member.nickname,
			mailPrefix: splitMail[0],
			mailSuffix: splitMail[1],
			mailType: type,
			profile: member.profile
		}
	}catch (error) {
		logger.error('Failed to get profile service.')

		if(error instanceof CustomError)
			throw error;

		throw new CustomError(ResponseStatus.INTERNAL_SERVER_ERROR);
	}
}

export async function patchOAuthProfileService(userId, { nickname }, profile) {
	const transaction = await sequelize.transaction();
	let newProfile = profile ? getResizeProfileName(profile) : null;
	try {
		const member = await MemberRepository.findMemberById(userId);
		if(!member){
			logger.error('patchOAuthProfileService member is null', {id});
			throw new CustomError(ResponseStatus.BAD_REQUEST);
		}

		await MemberRepository.patchOAuthJoinProfile(userId, nickname, newProfile, { transaction });

		await transaction.commit();
	}catch(error) {
		await transaction.rollback();

		logger.error('Failed to patch OAuth profile service.', {error});

		if(newProfile)
			await deleteImageFile(newProfile, ImageConstants.PROFILE_TYPE);

		if(error instanceof CustomError)
			throw error;

		throw new CustomError(ResponseStatus.INTERNAL_SERVER_ERROR);
	}
}