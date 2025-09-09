import { jest } from '@jest/globals';
import CustomError from '@errors/customError.js';
import { ResponseStatus } from '@constants/responseStatus.js';
import { sequelize, Member, Auth } from '@models/index.js';
import bcrypt from 'bcrypt';

const SAVE_MEMBER = {
	userId: 'tester',
	userPw: 'tester1234',
	email: 'tester@tester.com',
	userName: 'testerName',
	nickName: 'testerNickName',
	profileThumbnail: 'testerProfileImage.jpg',
}

await jest.unstable_mockModule('@utils/fileUtils.js', () => ({
	deleteImageFile: jest.fn(),
}));

await jest.unstable_mockModule('@utils/fileNameUtils.js', () => ({
	getResizeProfileName: jest.fn(),
}));

const {
	registerService,
	checkIdService,
	checkNicknameService,
	patchProfileService,
	getProfileService,
} = await import('@services/member/memberService.js');

const {
	deleteImageFile,
} = await import('@utils/fileUtils.js');

const { getResizeProfileName } = await import('@utils/fileNameUtils.js');

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
			getResizeProfileName.mockReturnValue(SAVE_MEMBER.profileThumbnail);
			await registerService(SAVE_MEMBER.userId, SAVE_MEMBER.userPw, SAVE_MEMBER.userName, SAVE_MEMBER.nickName, SAVE_MEMBER.email, SAVE_MEMBER.profileThumbnail);

			expect(getResizeProfileName).toHaveBeenCalledWith(SAVE_MEMBER.profileThumbnail);
			expect(deleteImageFile).not.toHaveBeenCalled();

			const registeredMember = await Member.findOne({ where: { userId: SAVE_MEMBER.userId } });
			const registeredAuth = await Auth.findAll({ where: { userId: SAVE_MEMBER.userId } });

			const pwValid = await bcrypt.compare(SAVE_MEMBER.userPw, registeredMember.userPw);
			expect(registeredMember).toBeDefined();
			expect(registeredMember.userId).toBe(SAVE_MEMBER.userId);
			expect(pwValid).toBe(true);
			expect(registeredMember.userName).toBe(SAVE_MEMBER.userName);
			expect(registeredMember.nickName).toBe(SAVE_MEMBER.nickName);
			expect(registeredMember.email).toBe(SAVE_MEMBER.email);
			expect(registeredMember.profileThumbnail).toBe(SAVE_MEMBER.profileThumbnail);
			expect(registeredMember.provider).toBe('local');
			expect(registeredAuth).toBeDefined();
			expect(registeredAuth.length).toBe(1);
			expect(registeredAuth[0].userId).toBe(SAVE_MEMBER.userId);
			expect(registeredAuth[0].auth).toBe('ROLE_MEMBER');
		});

		it('회원 가입 정상 처리. 프로필 이미지가 없는 경우', async() => {
			await registerService(SAVE_MEMBER.userId, SAVE_MEMBER.userPw, SAVE_MEMBER.userName, SAVE_MEMBER.nickName, SAVE_MEMBER.email, null);

			expect(getResizeProfileName).not.toHaveBeenCalled();
			expect(deleteImageFile).not.toHaveBeenCalled();

			const registeredMember = await Member.findOne({ where: { userId: SAVE_MEMBER.userId } });
			const registeredAuth = await Auth.findAll({ where: { userId: SAVE_MEMBER.userId } });

			const pwValid = await bcrypt.compare(SAVE_MEMBER.userPw, registeredMember.userPw);
			expect(registeredMember).toBeDefined();
			expect(registeredMember.userId).toBe(SAVE_MEMBER.userId);
			expect(pwValid).toBe(true);
			expect(registeredMember.userName).toBe(SAVE_MEMBER.userName);
			expect(registeredMember.nickName).toBe(SAVE_MEMBER.nickName);
			expect(registeredMember.email).toBe(SAVE_MEMBER.email);
			expect(registeredMember.profileThumbnail).toBeNull();
			expect(registeredMember.provider).toBe('local');
			expect(registeredAuth).toBeDefined();
			expect(registeredAuth.length).toBe(1);
			expect(registeredAuth[0].userId).toBe(SAVE_MEMBER.userId);
			expect(registeredAuth[0].auth).toBe('ROLE_MEMBER');
		});

		it('회원 가입 정상 처리. 닉네임이 없는 경우', async() => {
			getResizeProfileName.mockReturnValue(SAVE_MEMBER.profileThumbnail);
			await registerService(SAVE_MEMBER.userId, SAVE_MEMBER.userPw, SAVE_MEMBER.userName, null, SAVE_MEMBER.email, SAVE_MEMBER.profileThumbnail);

			expect(getResizeProfileName).toHaveBeenCalledWith(SAVE_MEMBER.profileThumbnail);
			expect(deleteImageFile).not.toHaveBeenCalled();

			const registeredMember = await Member.findOne({ where: { userId: SAVE_MEMBER.userId } });
			const registeredAuth = await Auth.findAll({ where: { userId: SAVE_MEMBER.userId } });

			const pwValid = await bcrypt.compare(SAVE_MEMBER.userPw, registeredMember.userPw);
			expect(registeredMember).toBeDefined();
			expect(registeredMember.userId).toBe(SAVE_MEMBER.userId);
			expect(pwValid).toBe(true);
			expect(registeredMember.userName).toBe(SAVE_MEMBER.userName);
			expect(registeredMember.nickName).toBeNull();
			expect(registeredMember.email).toBe(SAVE_MEMBER.email);
			expect(registeredMember.profileThumbnail).toBe(SAVE_MEMBER.profileThumbnail);
			expect(registeredMember.provider).toBe('local');
			expect(registeredAuth).toBeDefined();
			expect(registeredAuth.length).toBe(1);
			expect(registeredAuth[0].userId).toBe(SAVE_MEMBER.userId);
			expect(registeredAuth[0].auth).toBe('ROLE_MEMBER');
		});

		it('회원 가입 정상 처리. 닉네임과 프로필 이미지가 없는 경우', async() => {
			await registerService(SAVE_MEMBER.userId, SAVE_MEMBER.userPw, SAVE_MEMBER.userName, null, SAVE_MEMBER.email, null);

			expect(getResizeProfileName).not.toHaveBeenCalled();
			expect(deleteImageFile).not.toHaveBeenCalled();

			const registeredMember = await Member.findOne({ where: { userId: SAVE_MEMBER.userId } });
			const registeredAuth = await Auth.findAll({ where: { userId: SAVE_MEMBER.userId } });

			const pwValid = await bcrypt.compare(SAVE_MEMBER.userPw, registeredMember.userPw);
			expect(registeredMember).toBeDefined();
			expect(registeredMember.userId).toBe(SAVE_MEMBER.userId);
			expect(pwValid).toBe(true);
			expect(registeredMember.userName).toBe(SAVE_MEMBER.userName);
			expect(registeredMember.nickName).toBeNull();
			expect(registeredMember.email).toBe(SAVE_MEMBER.email);
			expect(registeredMember.profileThumbnail).toBeNull();
			expect(registeredMember.provider).toBe('local');
			expect(registeredAuth).toBeDefined();
			expect(registeredAuth.length).toBe(1);
			expect(registeredAuth[0].userId).toBe(SAVE_MEMBER.userId);
			expect(registeredAuth[0].auth).toBe('ROLE_MEMBER');
		});

		it('회원 가입 실패. 이미 존재하는 아이디', async() => {
			await Member.create({
				userId: SAVE_MEMBER.userId,
				userPw: await bcrypt.hash(SAVE_MEMBER.userPw, 10),
				userName: SAVE_MEMBER.userName,
				nickName: SAVE_MEMBER.nickName,
				email: SAVE_MEMBER.email,
				profileThumbnail: SAVE_MEMBER.profileThumbnail,
				provider: 'local',
			});

			deleteImageFile.mockReturnValue(() => {});

			try {
				await registerService(SAVE_MEMBER.userId, SAVE_MEMBER.userPw, SAVE_MEMBER.email, SAVE_MEMBER.userName, SAVE_MEMBER.nickName, SAVE_MEMBER.profileThumbnail);
			}catch(error) {
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatus.BAD_REQUEST.CODE);
				expect(error.message).toBe(ResponseStatus.BAD_REQUEST.MESSAGE);
				expect(getResizeProfileName).not.toHaveBeenCalled();
				expect(deleteImageFile).not.toHaveBeenCalled();
			}
		});

		it('회원 가입 실패. 이미 존재하는 아이디. 프로필 이미지가 없는 경우', async() => {
			await Member.create({
				userId: SAVE_MEMBER.userId,
				userPw: await bcrypt.hash(SAVE_MEMBER.userPw, 10),
				userName: SAVE_MEMBER.userName,
				nickName: SAVE_MEMBER.nickName,
				email: SAVE_MEMBER.email,
			});

			try {
				await registerService(SAVE_MEMBER.userId, SAVE_MEMBER.userPw, SAVE_MEMBER.email, SAVE_MEMBER.userName, SAVE_MEMBER.nickName, null);
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
			expect(result).toBe(false);
		});

		if('아이디 중복 체크. 중복인 경우', async() => {
			await Member.create({
				userId: SAVE_MEMBER.userId,
				userPw: await bcrypt.hash(SAVE_MEMBER.userPw, 10),
				userName: SAVE_MEMBER.userName,
				nickName: SAVE_MEMBER.nickName,
				email: SAVE_MEMBER.email,
			});

			const result = await checkIdService(SAVE_MEMBER.userId);
			expect(result).toBe(true);
		});
	});

	describe('checkNicknameService', () => {
		it('닉네임 중복 체크. 중복이 아닌 경우.', async() => {
			const result = await checkNicknameService(null, SAVE_MEMBER.nickName);
			expect(result).toBe(false);
		});

		it('닉네임 중복 체크. 중복인 경우.', async() => {
			await Member.create({
				userId: SAVE_MEMBER.userId,
				userPw: await bcrypt.hash(SAVE_MEMBER.userPw, 10),
				userName: SAVE_MEMBER.userName,
				nickName: SAVE_MEMBER.nickName,
				email: SAVE_MEMBER.email,
			});

			const result = await checkNicknameService(null, SAVE_MEMBER.nickName);
			expect(result).toBe(true);
		});

		it('닉네임 중복 체크. 중복이지만 사용자의 닉네임과 동일한 경우', async() => {
			await Member.create({
				userId: SAVE_MEMBER.userId,
				userPw: await bcrypt.hash(SAVE_MEMBER.userPw, 10),
				userName: SAVE_MEMBER.userName,
				nickName: SAVE_MEMBER.nickName,
				email: SAVE_MEMBER.email,
			});

			const result = await checkNicknameService(SAVE_MEMBER.userId, SAVE_MEMBER.nickName);
			expect(result).toBe(false);
		});

		it('닉네임 중복 체크. 중복이지만 사용자의 닉네임과 동일하지 않은 경우', async() => {
			await Member.create({
				userId: SAVE_MEMBER.userId,
				userPw: await bcrypt.hash(SAVE_MEMBER.userPw, 10),
				userName: SAVE_MEMBER.userName,
				nickName: SAVE_MEMBER.nickName,
				email: SAVE_MEMBER.email,
			});

			const result = await checkNicknameService('otherUserId', SAVE_MEMBER.nickName);
			expect(result).toBe(true);
		});
	});

	describe('patchProfileService', () => {
			const patchProfileName = 'patchProfileName.jpg';
			const patchNickname = 'patchNickname';
			const deleteProfile = 'deleteProfile.jpg';
		it('회원 정보 수정. 추가할 프로필 이미지와 닉네임, 삭제할 프로필 이미지명이 있는 경우', async() => {
			getResizeProfileName.mockReturnValue(patchProfileName);
			deleteImageFile.mockReturnValue(() => {});

			await Member.create({
				userId: SAVE_MEMBER.userId,
				userPw: await bcrypt.hash(SAVE_MEMBER.userPw, 10),
				userName: SAVE_MEMBER.userName,
				nickName: SAVE_MEMBER.nickName,
				email: SAVE_MEMBER.email,
				profileThumbnail: SAVE_MEMBER.profileThumbnail,
				provider: 'local',
			});

			await patchProfileService(SAVE_MEMBER.userId, patchNickname, patchProfileName, deleteProfile);

			expect(getResizeProfileName).toHaveBeenCalledWith(patchProfileName);
			expect(deleteImageFile).toHaveBeenCalledWith(deleteProfile, 'profile');

			const member = await Member.findOne({ where: { userId: SAVE_MEMBER.userId } });
			expect(member).toBeDefined();
			expect(member.nickName).toBe(patchNickname);
			expect(member.profileThumbnail).toBe(patchProfileName);
		});

		it('회원 정보 수정. 닉네임과 삭제할 프로필 이미지명만 있는 경우.', async() => {
			deleteImageFile.mockReturnValue(() => {});

			await Member.create({
				userId: SAVE_MEMBER.userId,
				userPw: await bcrypt.hash(SAVE_MEMBER.userPw, 10),
				userName: SAVE_MEMBER.userName,
				nickName: SAVE_MEMBER.nickName,
				email: SAVE_MEMBER.email,
				profileThumbnail: SAVE_MEMBER.profileThumbnail,
				provider: 'local',
			});

			await patchProfileService(SAVE_MEMBER.userId, patchNickname, null, deleteProfile);

			expect(getResizeProfileName).not.toHaveBeenCalled();
			expect(deleteImageFile).toHaveBeenCalledWith(deleteProfile, 'profile');

			const member = await Member.findOne({ where: { userId: SAVE_MEMBER.userId } });
			expect(member).toBeDefined();
			expect(member.nickName).toBe(patchNickname);
			expect(member.profileThumbnail).toBeNull();
		});

		it('회원 정보 수정. 삭제할 프로필 이미지명만 있는 경우', async() => {
			deleteImageFile.mockReturnValue(() => {});
			
			await Member.create({
				userId: SAVE_MEMBER.userId,
				userPw: await bcrypt.hash(SAVE_MEMBER.userPw, 10),
				userName: SAVE_MEMBER.userName,
				nickName: SAVE_MEMBER.nickName,
				email: SAVE_MEMBER.email,
				profileThumbnail: SAVE_MEMBER.profileThumbnail,
				provider: 'local',
			});

			await patchProfileService(SAVE_MEMBER.userId, null, null, deleteProfile);

			expect(getResizeProfileName).not.toHaveBeenCalled();
			expect(deleteImageFile).toHaveBeenCalledWith(deleteProfile, 'profile');

			const member = await Member.findOne({ where: { userId: SAVE_MEMBER.userId } });
			expect(member).toBeDefined();
			expect(member.nickName).toBeNull();
			expect(member.profileThumbnail).toBeNull();
		});

		it('회원 정보 수정. userId와 닉네임만 있는 경우', async() => {
			await Member.create({
				userId: SAVE_MEMBER.userId,
				userPw: await bcrypt.hash(SAVE_MEMBER.userPw, 10),
				userName: SAVE_MEMBER.userName,
				nickName: SAVE_MEMBER.nickName,
				email: SAVE_MEMBER.email,
				profileThumbnail: SAVE_MEMBER.profileThumbnail,
				provider: 'local',
			});

			await patchProfileService(SAVE_MEMBER.userId, SAVE_MEMBER.nickName, null, null);

			expect(getResizeProfileName).not.toHaveBeenCalled();
			expect(deleteImageFile).not.toHaveBeenCalled();

			const member = await Member.findOne({ where: { userId: SAVE_MEMBER.userId } });
			expect(member).toBeDefined();
			expect(member.nickName).toBe(SAVE_MEMBER.nickName);
			expect(member.profileThumbnail).toBe(SAVE_MEMBER.profileThumbnail);
		});
	});

	describe('getProfileService', () => {
		it('회원 정보 조회', async() => {
			await Member.create({
				userId: SAVE_MEMBER.userId,
				userPw: await bcrypt.hash(SAVE_MEMBER.userPw, 10),
				userName: SAVE_MEMBER.userName,
				nickName: SAVE_MEMBER.nickName,
				email: SAVE_MEMBER.email,
				profileThumbnail: SAVE_MEMBER.profileThumbnail,
				provider: 'local',
			});

			const result = await getProfileService(SAVE_MEMBER.userId);
			expect(result).toBeDefined();
			expect(result.nickName).toBe(SAVE_MEMBER.nickName);
			expect(result.profileThumbnail).toBe(SAVE_MEMBER.profileThumbnail);
			expect(result.userId).toBeUndefined();
			expect(result.userPw).toBeUndefined();
			expect(result.userName).toBeUndefined();
			expect(result.email).toBeUndefined();
			expect(result.provider).toBeUndefined();
		});

		it('회원 정보 조회. 사용자 정보가 존재하지 않는 경우', async() => {
			try {
				await getProfileService(SAVE_MEMBER.userId);
			}catch(error) {
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatus.BAD_REQUEST.CODE);
				expect(error.message).toBe(ResponseStatus.BAD_REQUEST.MESSAGE);
			}
		});
	})
});