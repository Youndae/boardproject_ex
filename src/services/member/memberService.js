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

export async function registerService ( userId, userPw, userName, nickName = null, email, profileThumbnail = null ) {
	const transaction = await sequelize.transaction();
	try {
		const member = await MemberRepository.findMemberByUserId(userId);
		if(member)
			throw new CustomError(ResponseStatus.BAD_REQUEST);
		const hashedPw = await bcrypt.hash(userPw, 10);

		let dbProfileThumbnail = null;
		if(profileThumbnail)
			dbProfileThumbnail = `${ImageConstants.PROFILE_PREFIX}${getResizeProfileName(profileThumbnail)}`;

		await MemberRepository.createMember(userId, hashedPw, userName, nickName, email, dbProfileThumbnail, { transaction });
		await AuthRepository.createMemberAuth(userId, 'ROLE_MEMBER', { transaction });

		await transaction.commit();
	}catch(error) {
		await transaction.rollback();

		console.error('registerService error : ', error);

		if(error instanceof CustomError && error.status === ResponseStatus.BAD_REQUEST.CODE){
			logger.error('Member already exists.');
			throw error;
		}

		if(profileThumbnail)
			deleteImageFile(profileThumbnail, ImageConstants.PROFILE_TYPE);
			
		logger.error('Failed to register service.');
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

export async function checkNicknameService (userId = null, nickName) {
	try {
		const member = await MemberRepository.findMemberByNickname(nickName);
		
		if(member) {
			if(userId) { // 동일한 nickName이 존재하지만 사용자의 닉네임일 때는 false를 반환해 Not Exist인 것처럼 처리
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

export async function patchProfileService (userId, nickName, profileThumbnail = null, deleteProfile = null) {
	const transaction = await sequelize.transaction();
	try {
		let dbProfileThumbnail = null;
		if(profileThumbnail)
			dbProfileThumbnail = `${ImageConstants.PROFILE_PREFIX}${getResizeProfileName(profileThumbnail)}`;

		if(!profileThumbnail && !deleteProfile)
			dbProfileThumbnail = undefined;

		await MemberRepository.patchMemberProfile(userId, nickName, dbProfileThumbnail, { transaction });

		if(deleteProfile){
			const deleteFilename = deleteProfile.replace(ImageConstants.PROFILE_PREFIX, '');
			deleteImageFile(deleteFilename, ImageConstants.PROFILE_TYPE);
		}
			
		await transaction.commit();
	}catch(error) {
		await transaction.rollback();

		if(profileThumbnail)
			deleteImageFile(profileThumbnail, ImageConstants.PROFILE_TYPE);

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

		if(error instanceof CustomError)
			throw error;

		throw new CustomError(ResponseStatus.INTERNAL_SERVER_ERROR);
	}
}