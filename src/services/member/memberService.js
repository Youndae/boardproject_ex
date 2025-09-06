//TODO: import repositories
import { MemberRepository } from "@repositories/memberRepository.js"
import { AuthRepository } from "@repositories/authRepository.js"
import { logger } from "@config/loggerConfig.js"
import CustomError from "@errors/customError.js"
import { ResponseStatus } from "@constants/responseStatus.js"
import bcrypt from "bcrypt"
import { sequelize } from "@models/index.js"
import { getResizeProfileName, deleteImageFile } from "@utils/fileUtils.js";

export async function registerService ( userId, userPw, email, username, nickname = null, profileImage = null ) {
	const transaction = await sequelize.transaction();
	try {
		const member = await MemberRepository.findMemberByUserId(userId);
		if(member)
			throw new CustomError(ResponseStatus.BAD_REQUEST);
		const hashedPw = await bcrypt.hash(userPw, 10);

		if(profileImage)
			profileImage = getResizeProfileName(profileImage);
		
		await MemberRepository.createMember(userId, hashedPw, email, username, nickname, profileImage);
		await AuthRepository.createMemberAuth(userId, 'ROLE_MEMBER');

		await transaction.commit();
	}catch(error) {
		await transaction.rollback();

		if(profileImage)
			deleteImageFile(profileImage, 'profile');

		logger.error('Failed to register service.')
		throw new CustomError(ResponseStatus.INTERNAL_SERVER_ERROR);
	}
}

export async function checkIdService (userId) {
	try {
		return Boolean(await MemberRepository.findMemberByUserId(userId));
	}catch(error) {
		logger.error('Failed to check id service.')
		throw new CustomError(ResponseStatus.INTERNAL_SERVER_ERROR);
	}
}

export async function checkNicknameService (userId = null, nickname) {
	try {
		const member = await MemberRepository.findMemberByNickname(nickname);
		
		if(member) {
			if(userId) { // 동일한 nickname이 존재하지만 사용자의 닉네임일 때는 false를 반환해 Not Exist인 것처럼 처리
				return member.userId !== userId;
			}
	
			return true;
		}

		return false;
	}catch(error) {
		logger.error('Failed to check nickname service.')
		throw new CustomError(ResponseStatus.INTERNAL_SERVER_ERROR);
	}
}

export async function patchProfileService (userId, nickname = null, profileImage = null, deleteProfile = null) {
	const transaction = await sequelize.transaction();
	try {
		if(profileImage)
			profileImage = getResizeProfileName(profileImage);

		await MemberRepository.patchMemberProfile(userId, nickname, profileImage);

		if(deleteProfile)
			deleteImageFile(deleteProfile, 'profile');

		await transaction.commit();
	}catch(error) {
		await transaction.rollback();

		if(profileImage)
			deleteImageFile(profileImage, 'profile');

		logger.error('Failed to patch profile service.')
		throw new CustomError(ResponseStatus.INTERNAL_SERVER_ERROR);
	}
}

export async function getProfileService (userId) {
	try {
		const member = await MemberRepository.getMemberProfile(userId);
		if(!member)
			throw new CustomError(ResponseStatus.BAD_REQUEST);
		
		return member;
	}catch (error) {
		logger.error('Failed to get profile service.')
		throw new CustomError(ResponseStatus.INTERNAL_SERVER_ERROR);
	}
}