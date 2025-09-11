import { MemberRepository } from '#repositories/memberRepository.js';
import { AuthRepository } from '#repositories/authRepository.js';
import CustomError from '#errors/customError.js';
import { ResponseStatus } from '#constants/responseStatus.js';
import { jest } from '@jest/globals';

const SAVE_MEMBER = {
	userId: 'tester',
	userPw: 'tester1234',
	email: 'tester@tester.com',
	username: 'testerName',
	nickname: 'testerNickName',
	profileImage: 'testerProfileImage.jpg',
}

await jest.unstable_mockModule('#utils/fileUtils.js', () => ({
	deleteImageFile: jest.fn(),
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
} = await import('#utils/fileUtils.js');

const { getResizeProfileName } = await import('#utils/fileNameUtils.js');

describe('memberService unit test', () => {
	describe('registerService', () => {
		it('회원가입 정상 처리. 모든 값이 존재하는 경우', async () => {
			jest.spyOn(MemberRepository, 'findMemberByUserId').mockResolvedValue(null);
			getResizeProfileName.mockReturnValue(SAVE_MEMBER.profileImage);
			jest.spyOn(MemberRepository, 'createMember').mockReturnValue(() => {});
			jest.spyOn(AuthRepository, 'createMemberAuth').mockReturnValue(() => {});

			await registerService(SAVE_MEMBER.userId, SAVE_MEMBER.userPw, SAVE_MEMBER.email, SAVE_MEMBER.username, SAVE_MEMBER.nickname, SAVE_MEMBER.profileImage);

			expect(getResizeProfileName).toHaveBeenCalledWith(SAVE_MEMBER.profileImage);
			expect(deleteImageFile).not.toHaveBeenCalled();
		});

		it('회원가입 정상 처리. 닉네임과 프로필 이미지가 없는 경우', async() => {
			jest.spyOn(MemberRepository, 'findMemberByUserId').mockResolvedValue(null);
			jest.spyOn(MemberRepository, 'createMember').mockReturnValue(() => {});
			jest.spyOn(AuthRepository, 'createMemberAuth').mockReturnValue(() => {});

			await registerService(SAVE_MEMBER.userId, SAVE_MEMBER.userPw, SAVE_MEMBER.email, SAVE_MEMBER.username);

			expect(getResizeProfileName).not.toHaveBeenCalled();
			expect(deleteImageFile).not.toHaveBeenCalled();
		});

		it('회원가입 실패. 아이디가 이미 존재하며, 프로필 이미지가 있는 경우', async() => {
			jest.spyOn(MemberRepository, 'findMemberByUserId').mockResolvedValue(SAVE_MEMBER);
			const createMemberSpy = jest.spyOn(MemberRepository, 'createMember').mockReturnValue(() => {});
			const createAuthSpy = jest.spyOn(AuthRepository, 'createMemberAuth').mockReturnValue(() => {});

			try {
				await registerService(SAVE_MEMBER.userId, SAVE_MEMBER.userPw, SAVE_MEMBER.email, SAVE_MEMBER.username, SAVE_MEMBER.nickname, SAVE_MEMBER.profileImage);
			}catch(error) {
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatus.BAD_REQUEST.CODE);
				expect(error.message).toBe(ResponseStatus.BAD_REQUEST.MESSAGE);
				expect(getResizeProfileName).not.toHaveBeenCalled();
				expect(createMemberSpy).not.toHaveBeenCalled();
				expect(createAuthSpy).not.toHaveBeenCalled();
				expect(deleteImageFile).not.toHaveBeenCalled();
			}
			
		});

		it('회원가입 실패. 아이디가 이미 존재하며, 프로필 이미지가 없는 경우', async() => {
			jest.spyOn(MemberRepository, 'findMemberByUserId').mockResolvedValue(SAVE_MEMBER);
			const createMemberSpy = jest.spyOn(MemberRepository, 'createMember').mockReturnValue(() => {});
			const createAuthSpy = jest.spyOn(AuthRepository, 'createMemberAuth').mockReturnValue(() => {});

			try {
				await registerService(SAVE_MEMBER.userId, SAVE_MEMBER.userPw, SAVE_MEMBER.email, SAVE_MEMBER.username, SAVE_MEMBER.nickname);
			}catch (error) {
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatus.BAD_REQUEST.CODE);
				expect(error.message).toBe(ResponseStatus.BAD_REQUEST.MESSAGE);
				expect(getResizeProfileName).not.toHaveBeenCalled();
				expect(createMemberSpy).not.toHaveBeenCalled();
				expect(createAuthSpy).not.toHaveBeenCalled();
				expect(deleteImageFile).not.toHaveBeenCalled();
			}
			
		});
	});

	describe('checkIdService', () => {
		it('아이디가 존재하는 경우', async () => {
			jest.spyOn(MemberRepository, 'findMemberByUserId').mockResolvedValue(SAVE_MEMBER);

			const result = await checkIdService(SAVE_MEMBER.userId);
			expect(result).toBe(true);
		});

		it('아이디가 존재하지 않는 경우', async () => {
			jest.spyOn(MemberRepository, 'findMemberByUserId').mockResolvedValue(null);

			const result = await checkIdService(SAVE_MEMBER.userId);
			expect(result).toBe(false);
		});

		it('아이디 조회 실패', async () => {
			jest.spyOn(MemberRepository, 'findMemberByUserId').mockRejectedValue(new Error('조회 실패'));

			try {
				await checkIdService(SAVE_MEMBER.userId);
			}catch(error) {
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatus.INTERNAL_SERVER_ERROR.CODE);
				expect(error.message).toBe(ResponseStatus.INTERNAL_SERVER_ERROR.MESSAGE);
			}
			
		});
	});

	describe('checkNicknameService', () => {
		it('닉네임이 존재하지 않으며 userId가 없는 경우', async () => {
			jest.spyOn(MemberRepository, 'findMemberByNickname').mockResolvedValue(null);

			const result = await checkNicknameService(null, SAVE_MEMBER.nickname);
			expect(result).toBe(false);
		});

		it('닉네임이 존재하지 않으며 userId가 있는 경우', async () => {
			jest.spyOn(MemberRepository, 'findMemberByNickname').mockResolvedValue(null);

			const result = await checkNicknameService(SAVE_MEMBER.userId, SAVE_MEMBER.nickname);
			expect(result).toBe(false);
		});

		it('닉네임이 존재하며 userId가 없는 경우', async () => {
			jest.spyOn(MemberRepository, 'findMemberByNickname').mockResolvedValue(SAVE_MEMBER);

			const result = await checkNicknameService(null, SAVE_MEMBER.nickname);
			expect(result).toBe(true);
		});

		it('닉네임이 존재하며 userId와 동일한 사용자의 닉네임인 경우', async () => {
			jest.spyOn(MemberRepository, 'findMemberByNickname').mockResolvedValue(SAVE_MEMBER);

			const result = await checkNicknameService(SAVE_MEMBER.userId, SAVE_MEMBER.nickname);
			expect(result).toBe(false);
		});

		it('닉네임이 존재하며 userId와 동일한 사용자의 닉네임이 아닌 경우', async () => {
			jest.spyOn(MemberRepository, 'findMemberByNickname').mockResolvedValue(SAVE_MEMBER);

			const result = await checkNicknameService('otherUserId', SAVE_MEMBER.nickname);
			expect(result).toBe(true);
		});

		it('닉네임 조회 실패', async () => {
			jest.spyOn(MemberRepository, 'findMemberByNickname').mockRejectedValue(new Error('조회 실패'));

			try {
				await checkNicknameService(SAVE_MEMBER.userId, SAVE_MEMBER.nickname);
			}catch(error) {
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatus.INTERNAL_SERVER_ERROR.CODE);
				expect(error.message).toBe(ResponseStatus.INTERNAL_SERVER_ERROR.MESSAGE);
			}
		});
	});

	describe('patchProfileService', () => {
		it('정상 처리. 추가할 프로필 이미지만 있는 경우', async () => {
			jest.spyOn(MemberRepository, 'patchMemberProfile').mockReturnValue(() => {});

			await patchProfileService(SAVE_MEMBER.userId, SAVE_MEMBER.nickname, SAVE_MEMBER.profileImage);

			expect(getResizeProfileName).toHaveBeenCalledWith(SAVE_MEMBER.profileImage);
			expect(deleteImageFile).not.toHaveBeenCalled();
		});

		it('정상 처리. 삭제할 프로필 이미지만 있는 경우', async () => {
			jest.spyOn(MemberRepository, 'patchMemberProfile').mockReturnValue(() => {});
			deleteImageFile.mockReturnValue(() => {});
			await patchProfileService(SAVE_MEMBER.userId, SAVE_MEMBER.nickname, null, 'deleteProfile');

			expect(getResizeProfileName).not.toHaveBeenCalled();
			expect(deleteImageFile).toHaveBeenCalledWith('deleteProfile', 'profile');
		});
		
		it('정상 처리. 추가할 프로필 이미지와 삭제할 프로필 이미지가 있는 경우', async () => {
			jest.spyOn(MemberRepository, 'patchMemberProfile').mockReturnValue(() => {});
			getResizeProfileName.mockReturnValue(SAVE_MEMBER.profileImage);
			deleteImageFile.mockReturnValue(() => {});

			await patchProfileService(SAVE_MEMBER.userId, SAVE_MEMBER.nickname, SAVE_MEMBER.profileImage, 'deleteProfile');

			expect(getResizeProfileName).toHaveBeenCalledWith(SAVE_MEMBER.profileImage);
			expect(deleteImageFile).toHaveBeenCalledWith('deleteProfile', 'profile');
		});

		it('정상 처리. 추가할 프로필 이미지와 삭제할 프로필 이미지가 없는 경우', async () => {
			jest.spyOn(MemberRepository, 'patchMemberProfile').mockReturnValue(() => {});

			await patchProfileService(SAVE_MEMBER.userId, SAVE_MEMBER.nickname, null, null);

			expect(getResizeProfileName).not.toHaveBeenCalled();
			expect(deleteImageFile).not.toHaveBeenCalled();
		});

		it('오류 발생. 추가할 프로필 이미지가 존재하고 오류가 발생한 경우', async() => {
			getResizeProfileName.mockReturnValue(SAVE_MEMBER.profileImage);
			jest.spyOn(MemberRepository, 'patchMemberProfile').mockRejectedValue(new Error('오류 발생'));

			try {
				await patchProfileService(SAVE_MEMBER.userId, SAVE_MEMBER.nickname, SAVE_MEMBER.profileImage, null);
			}catch(error) {
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatus.INTERNAL_SERVER_ERROR.CODE);
				expect(error.message).toBe(ResponseStatus.INTERNAL_SERVER_ERROR.MESSAGE);
				expect(getResizeProfileName).toHaveBeenCalledWith(SAVE_MEMBER.profileImage);
				expect(deleteImageFile).toHaveBeenCalledWith(SAVE_MEMBER.profileImage, 'profile');
			}
		});

		it('오류 발생. 추가할 프로필 이미지가 존재하지 않고 오류가 발생한 경우', async() => {
			jest.spyOn(MemberRepository, 'patchMemberProfile').mockRejectedValue(new Error('오류 발생'));

			try {
				await patchProfileService(SAVE_MEMBER.userId, SAVE_MEMBER.nickname, null, null);
			}catch(error) {
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatus.INTERNAL_SERVER_ERROR.CODE);
				expect(error.message).toBe(ResponseStatus.INTERNAL_SERVER_ERROR.MESSAGE);
				expect(getResizeProfileName).not.toHaveBeenCalled();
				expect(deleteImageFile).not.toHaveBeenCalled();
			}
		});
	});

	describe('getProfileService', () => {
		it('정상 처리', async () => {
			jest.spyOn(MemberRepository, 'getMemberProfile').mockResolvedValue({ nickname: SAVE_MEMBER.nickname, profileThumbnail: SAVE_MEMBER.profileImage });

			const result = await getProfileService(SAVE_MEMBER.userId);
			expect(result).toEqual({ nickname: SAVE_MEMBER.nickname, profileThumbnail: SAVE_MEMBER.profileImage });
		});

		it('사용자 정보가 존재하지 않는 경우', async () => {
			jest.spyOn(MemberRepository, 'getMemberProfile').mockResolvedValue(null);
			
			try {
				await getProfileService(SAVE_MEMBER.userId);
			}catch(error) {
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatus.BAD_REQUEST.CODE);
				expect(error.message).toBe(ResponseStatus.BAD_REQUEST.MESSAGE);
			}
		});

		it('조회시 오류 발생', async () => {
			jest.spyOn(MemberRepository, 'getMemberProfile').mockRejectedValue(new Error('오류 발생'));

			try {
				await getProfileService(SAVE_MEMBER.userId);
			}catch(error) {
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatus.INTERNAL_SERVER_ERROR.CODE);
				expect(error.message).toBe(ResponseStatus.INTERNAL_SERVER_ERROR.MESSAGE);
			}
		});
	});
})