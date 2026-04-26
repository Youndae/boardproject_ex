import { jest } from '@jest/globals';
import CustomError from '#errors/customError.js';
import {ResponseStatus, ResponseStatusCode} from '#constants/responseStatus.js';
import { sequelize, Member, Auth } from '#models/index.js';
import bcrypt from 'bcrypt';
import { ImageConstants } from '#constants/imageConstants.js';
import {memberCheckConstants} from "#constants/memberCheckConstants.js";
import {findSuffixType} from "#constants/mailConstants.js";

const SAVE_MEMBER = {
	id: 1,
	userId: 'tester',
	password: 'tester1234',
	email: 'tester@tester.com',
	username: 'testerName',
	nickname: 'testerNickName',
	profile: 'testerProfileImage.jpg',
}

await jest.unstable_mockModule('#utils/fileUtils.js', () => ({
	deleteImageFile: jest.fn(),
	deleteBoardImageFromFiles: jest.fn(),
	deleteBoardImageFromNames: jest.fn(),
}));

await jest.unstable_mockModule('#utils/fileNameUtils.js', () => ({
	getResizeProfileName: jest.fn(),
}));

const {
	registerService,
	checkIdService,
	checkNicknameService,
	patchProfileService,
	getProfileService,
} = await import('#services/member/memberService.js');

const {
	deleteImageFile,
	deleteBoardImageFromFiles,
	deleteBoardImageFromNames
} = await import('#utils/fileUtils.js');

const { getResizeProfileName } = await import('#utils/fileNameUtils.js');

describe('memberService integration test', () => {
	beforeAll(async () => {
		await sequelize.authenticate();
		await sequelize.sync({ force: true });
	});
	
	afterAll(async () => {
		await sequelize.close();
	})

	afterEach(async () => {
		await Member.destroy({ where: {} });
		await Auth.destroy({ where: {} });
	})

	describe('registerService', () => {
		it('회원 가입 정상 처리. 모든 값이 존재하는 경우', async () => {
			getResizeProfileName.mockReturnValue(SAVE_MEMBER.profile);
			await registerService(
				{
					userId: SAVE_MEMBER.userId,
					password: SAVE_MEMBER.password,
					username: SAVE_MEMBER.username,
					nickname: SAVE_MEMBER.nickname,
					email: SAVE_MEMBER.email
				},
				SAVE_MEMBER.profile
			);

			expect(getResizeProfileName).toHaveBeenCalledWith(SAVE_MEMBER.profile);
			expect(deleteImageFile).not.toHaveBeenCalled();

			const registeredMember = await Member.findOne({ where: { userId: SAVE_MEMBER.userId } });
			const registeredAuth = await Auth.findAll({ where: { userId: registeredMember.id } });

			const pwValid = await bcrypt.compare(SAVE_MEMBER.password, registeredMember.password);
			expect(registeredMember).toBeDefined();
			expect(registeredMember.userId).toBe(SAVE_MEMBER.userId);
			expect(pwValid).toBe(true);
			expect(registeredMember.username).toBe(SAVE_MEMBER.username);
			expect(registeredMember.nickname).toBe(SAVE_MEMBER.nickname);
			expect(registeredMember.email).toBe(SAVE_MEMBER.email);
			expect(registeredMember.profile).toBe(SAVE_MEMBER.profile);
			expect(registeredMember.provider).toBe('local');
			expect(registeredAuth).toBeDefined();
			expect(registeredAuth.length).toBe(1);
			expect(registeredAuth[0].userId).toBe(registeredMember.id);
			expect(registeredAuth[0].auth).toBe('ROLE_MEMBER');
		});

		it('회원 가입 정상 처리. 프로필 이미지가 없는 경우', async() => {
			await registerService({
				userId: SAVE_MEMBER.userId,
				password: SAVE_MEMBER.password,
				username: SAVE_MEMBER.username,
				nickname: SAVE_MEMBER.nickname,
				email: SAVE_MEMBER.email
			});

			expect(getResizeProfileName).not.toHaveBeenCalled();
			expect(deleteImageFile).not.toHaveBeenCalled();

			const registeredMember = await Member.findOne({ where: { userId: SAVE_MEMBER.userId } });
			const registeredAuth = await Auth.findAll({ where: { userId: registeredMember.id } });

			const pwValid = await bcrypt.compare(SAVE_MEMBER.password, registeredMember.password);
			expect(registeredMember).toBeDefined();
			expect(registeredMember.userId).toBe(SAVE_MEMBER.userId);
			expect(pwValid).toBe(true);
			expect(registeredMember.username).toBe(SAVE_MEMBER.username);
			expect(registeredMember.nickname).toBe(SAVE_MEMBER.nickname);
			expect(registeredMember.email).toBe(SAVE_MEMBER.email);
			expect(registeredMember.profile).toBeNull();
			expect(registeredMember.provider).toBe('local');
			expect(registeredAuth).toBeDefined();
			expect(registeredAuth.length).toBe(1);
			expect(registeredAuth[0].userId).toBe(registeredMember.id);
			expect(registeredAuth[0].auth).toBe('ROLE_MEMBER');
		});

		it('회원 가입 실패. 이미 존재하는 아이디', async() => {
			await Member.create(SAVE_MEMBER);

			deleteImageFile.mockReturnValue(() => {});

			try {
				await registerService(
					{
						userId: SAVE_MEMBER.userId,
						password: 'test1234!',
						username: 'tester2name',
						nickname: 'tester2nickname',
						email: 'tester2@tester2.com'
					}
				);
			}catch(error) {
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatus.BAD_REQUEST.CODE);
				expect(error.message).toBe(ResponseStatus.BAD_REQUEST.MESSAGE);
				expect(getResizeProfileName).not.toHaveBeenCalled();
				expect(deleteImageFile).not.toHaveBeenCalled();
			}
		});
	});

	describe('checkIdService', () => {
		it('아이디 중복 체크. 중복이 아닌 경우', async() => {
			const result = await checkIdService(SAVE_MEMBER.userId);
			expect(result).toBe(memberCheckConstants.VALID);
		});

		if('아이디 중복 체크. 중복인 경우', async() => {
			await Member.create(SAVE_MEMBER);

			try{
				await checkIdService(SAVE_MEMBER.userId);
			}catch(error) {
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatus.CONFLICT.CODE);
				expect(error.message).toBe(ResponseStatus.CONFLICT.MESSAGE);
			}
		});
	});

	describe('checkNicknameService', () => {
		it('닉네임 중복 체크. 중복이 아닌 경우.', async() => {
			const result = await checkNicknameService(null, SAVE_MEMBER.nickname);
			expect(result).toBe(memberCheckConstants.VALID);
		});

		it('닉네임 중복 체크. 중복인 경우.', async() => {
			await Member.create(SAVE_MEMBER);

			try{
				await checkNicknameService(null, SAVE_MEMBER.nickname);
			}catch(error) {
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatus.CONFLICT.CODE);
				expect(error.message).toBe(ResponseStatus.CONFLICT.MESSAGE);
			}
		});

		it('닉네임 중복 체크. 중복이지만 사용자의 닉네임과 동일한 경우', async() => {
			await Member.create(SAVE_MEMBER);

			const result = await checkNicknameService(SAVE_MEMBER.userId, SAVE_MEMBER.nickname);
			expect(result).toBe(memberCheckConstants.VALID);
		});

		it('닉네임 중복 체크. 중복이지만 사용자의 닉네임과 동일하지 않은 경우', async() => {
			await Member.create(SAVE_MEMBER);

			try {
				await checkNicknameService('otherUserId', SAVE_MEMBER.nickname);
			}catch(error) {
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatus.CONFLICT.CODE);
				expect(error.message).toBe(ResponseStatus.CONFLICT.MESSAGE);
			}
		});
	});

	describe('patchProfileService', () => {
		const patchData = {
			patchNickname: 'patchNickname',
			patchEmail: 'patchEmail@mail.com',
			patchProfile: 'patchProfile.jpg',
			deleteProfile: 'deleteProfile.jpg'
		}
		it('회원 정보 수정. 추가할 프로필 이미지와 닉네임, 삭제할 프로필 이미지명이 있는 경우', async() => {
			getResizeProfileName.mockReturnValue(patchData.patchProfile);
			deleteImageFile.mockReturnValue(() => {});

			await Member.create({
				id: SAVE_MEMBER.id,
				userId: SAVE_MEMBER.userId,
				password: await bcrypt.hash(SAVE_MEMBER.password, 10),
				username: SAVE_MEMBER.username,
				nickname: SAVE_MEMBER.nickname,
				email: SAVE_MEMBER.email,
				profile: SAVE_MEMBER.profile,
				provider: 'local',
			});

			await patchProfileService(SAVE_MEMBER.id, patchData.patchNickname, patchData.patchEmail, patchData.patchProfile, patchData.deleteProfile);

			expect(getResizeProfileName).toHaveBeenCalledWith(patchData.patchProfile);
			expect(deleteImageFile).toHaveBeenCalledWith(patchData.deleteProfile, ImageConstants.PROFILE_TYPE);

			const member = await Member.findOne({ where: { id: SAVE_MEMBER.id } });
			expect(member).toBeDefined();
			expect(member.nickname).toBe(patchData.patchNickname);
			expect(member.email).toBe(patchData.patchEmail);
			expect(member.profile).toBe(patchData.patchProfile);
		});

		it('회원 정보 수정. 이미지 수정 없이 삭제할 이미지명만 있는 경우.', async() => {
			deleteImageFile.mockReturnValue(() => {});

			await Member.create({
				id: SAVE_MEMBER.id,
				userId: SAVE_MEMBER.userId,
				password: await bcrypt.hash(SAVE_MEMBER.password, 10),
				username: SAVE_MEMBER.username,
				nickname: SAVE_MEMBER.nickname,
				email: SAVE_MEMBER.email,
				profile: SAVE_MEMBER.profile,
				provider: 'local',
			});

			await patchProfileService(SAVE_MEMBER.id, patchData.patchNickname, patchData.patchEmail, null, patchData.deleteProfile);

			expect(getResizeProfileName).not.toHaveBeenCalled();
			expect(deleteImageFile).toHaveBeenCalledWith(patchData.deleteProfile, 'profile');

			const member = await Member.findOne({ where: { id: SAVE_MEMBER.id } });
			expect(member).toBeDefined();
			expect(member.nickname).toBe(patchData.patchNickname);
			expect(member.email).toBe(patchData.patchEmail);
			expect(member.profile).toBeNull();
		});

		it('회원 정보 수정. 파일 수정은 하지 않는 경우', async() => {
			await Member.create({
				id: SAVE_MEMBER.id,
				userId: SAVE_MEMBER.userId,
				password: await bcrypt.hash(SAVE_MEMBER.password, 10),
				username: SAVE_MEMBER.username,
				nickname: SAVE_MEMBER.nickname,
				email: SAVE_MEMBER.email,
				profile: SAVE_MEMBER.profile,
				provider: 'local',
			});

			await patchProfileService(SAVE_MEMBER.id, patchData.patchNickname, patchData.patchEmail, null, null);

			expect(getResizeProfileName).not.toHaveBeenCalled();
			expect(deleteImageFile).not.toHaveBeenCalled();

			const member = await Member.findOne({ where: { id: SAVE_MEMBER.id } });
			expect(member).toBeDefined();
			expect(member.nickname).toBe(patchData.patchNickname);
			expect(member.email).toBe(patchData.patchEmail)
			expect(member.profile).toBe(SAVE_MEMBER.profile);
		});
	});

	describe('getProfileService', () => {
		it('회원 정보 조회', async() => {
			await Member.create({
				id: SAVE_MEMBER.id,
				userId: SAVE_MEMBER.userId,
				password: await bcrypt.hash(SAVE_MEMBER.password, 10),
				username: SAVE_MEMBER.username,
				nickname: SAVE_MEMBER.nickname,
				email: SAVE_MEMBER.email,
				profile: SAVE_MEMBER.profile,
				provider: 'local',
			});

			const splitMail = SAVE_MEMBER.email.split('@');
			const suffix = splitMail[1].substring(0, splitMail[1].indexOf('.'));
			const type = findSuffixType(suffix);

			const result = await getProfileService(SAVE_MEMBER.id);
			expect(result).toBeDefined();
			expect(result.nickname).toBe(SAVE_MEMBER.nickname);
			expect(result.mailPrefix).toBe(splitMail[0]);
			expect(result.mailSuffix).toBe(splitMail[1]);
			expect(result.mailType).toBe(type);
			expect(result.profile).toBe(SAVE_MEMBER.profile);
			expect(result.userId).toBeUndefined();
			expect(result.userPw).toBeUndefined();
			expect(result.userName).toBeUndefined();
			expect(result.email).toBeUndefined();
			expect(result.provider).toBeUndefined();
		});

		it('회원 정보 조회. 사용자 정보가 존재하지 않는 경우', async() => {
			try {
				await getProfileService(SAVE_MEMBER.id);
			}catch(error) {
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatus.BAD_REQUEST.CODE);
				expect(error.message).toBe(ResponseStatus.BAD_REQUEST.MESSAGE);
			}
		});
	})
});