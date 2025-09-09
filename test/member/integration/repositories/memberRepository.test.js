import { MemberRepository } from '@repositories/memberRepository.js';
import { sequelize, Member, Auth } from '@models/index.js';
import bcrypt from 'bcrypt';
import CustomError from '@errors/customError.js';
import { ResponseStatus } from '@constants/responseStatus.js';

const SAVE_MEMBER = {
	userId: 'tester',
	userPw: 'tester1234',
	userName: 'testerName',
	nickName: 'testerNickName',
	email: 'tester@tester.com',
	profileThumbnail: 'testerProfileThumbnail.jpg',
	provider: 'local',
}

describe('memberRepository test', () => {
	beforeAll(async () => {
		await sequelize.authenticate();
		await sequelize.sync({ force: true });
	});	

	afterAll(async () => {
		await sequelize.close();
	});

	beforeEach(async () => {
		await Member.create({
			userId: SAVE_MEMBER.userId,
			userPw: await bcrypt.hash(SAVE_MEMBER.userPw, 10),
			userName: SAVE_MEMBER.userName,
			nickName: SAVE_MEMBER.nickName,
			email: SAVE_MEMBER.email,
			profileThumbnail: SAVE_MEMBER.profileThumbnail,
			provider: SAVE_MEMBER.provider,
		});

		await Auth.create({
			userId: SAVE_MEMBER.userId,
			auth: 'ROLE_MEMBER',
		});

		await Member.create({
			userId: 'noAuthUser',
			userPw: await bcrypt.hash('noAuthUser1234', 10),
			userName: 'noAuthUserName',
			nickName: 'noAuthNickName',
			email: 'noAuthUser@noAuthUser.com',
			profileThumbnail: 'noAuthUserProfileThumbnail.jpg',
			provider: 'local',
		})
	});

	afterEach(async () => {
		await Member.destroy({ where: {} });
		await Auth.destroy({ where: {} });
	})

	describe('findMemberByUserId', () => {
		it('정상 조회', async () => {
			const member = await MemberRepository.findMemberByUserId(SAVE_MEMBER.userId);
			console.log('member : ', member);
			const pwValid = await bcrypt.compare(SAVE_MEMBER.userPw, member.userPw);

			expect(member).toBeDefined();
			expect(member.userId).toBe(SAVE_MEMBER.userId);
			expect(pwValid).toBe(true);
			expect(member.userName).toBe(SAVE_MEMBER.userName);
			expect(member.nickName).toBe(SAVE_MEMBER.nickName);
			expect(member.email).toBe(SAVE_MEMBER.email);
			expect(member.profileThumbnail).toBe(SAVE_MEMBER.profileThumbnail);
			expect(member.provider).toBe(SAVE_MEMBER.provider);
		})
	});

	describe('findUserIdWithRoles', () => {
		it('정상 조회', async () => {
			const userWithRoles = await MemberRepository.findUserIdWithRoles(SAVE_MEMBER.userId);

			expect(userWithRoles).toBeDefined();
			expect(userWithRoles.userId).toBe(SAVE_MEMBER.userId);
			expect(userWithRoles.roles).toStrictEqual(['ROLE_MEMBER']); // 배열, 객체 내용 비교는 toStrictEqual 사용.
			expect(userWithRoles.roles.length).toBe(1);
			// userId 외 데이터는 존재하지 않음.
			expect(userWithRoles.userPw).toBeUndefined();
			expect(userWithRoles.userName).toBeUndefined();
			expect(userWithRoles.nickName).toBeUndefined();
			expect(userWithRoles.email).toBeUndefined();
			expect(userWithRoles.profileThumbnail).toBeUndefined();
			expect(userWithRoles.provider).toBeUndefined();
		})

		it('사용자 없음', async () => {
			try {
				await MemberRepository.findUserIdWithRoles('nonexistent')
			}catch (error) {
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatus.BAD_REQUEST.CODE);
				expect(error.message).toBe(ResponseStatus.BAD_REQUEST.MESSAGE);
			}
		});

		it('사용자의 Auth 정보가 없음', async () => {
			try {
				await MemberRepository.findUserIdWithRoles('noAuthUser')
			}catch (error) {
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatus.INTERNAL_SERVER_ERROR.CODE);
				expect(error.message).toBe(ResponseStatus.INTERNAL_SERVER_ERROR.MESSAGE);
			}
		});
	});

	describe('findOAuthMember', () => {
		it('정상 조회', async () => {
			const member = await MemberRepository.findOAuthMember('local', SAVE_MEMBER.userId);

			expect(member).toBeDefined();
			expect(member.userId).toBe(SAVE_MEMBER.userId);
			expect(member.provider).toBe('local');
		});

		it('사용자 없음', async () => {
			const member = await MemberRepository.findOAuthMember('local', 'nonexistent');

			expect(member).toBeNull();
		});
	});

	describe('createOAuthMember', () => {
		it('정상 생성', async () => {
			const userPw = 'newOAuthUser1234';
			const member = await MemberRepository.createOAuthMember(
				'newOAuthUser',
				'newOAuthUser@newOAuthUser.com',
				'newOAuthUserName',
				'local',
				await bcrypt.hash(userPw, 10)
			);

			const pwValid = await bcrypt.compare(userPw, member.userPw);

			expect(member).toBeDefined();
			expect(member.userId).toBe('newOAuthUser');
			expect(member.provider).toBe('local');
			expect(member.email).toBe('newOAuthUser@newOAuthUser.com');
			expect(member.userName).toBe('newOAuthUserName');
			expect(pwValid).toBe(true);
			expect(member.nickName).toBeUndefined();
			expect(member.profileThumbnail).toBeUndefined();
		})
	});

	describe('createMember', () => {
		it('정상 생성', async () => {
			const userPw = 'newMember1234';
			const member = await MemberRepository.createMember(
				'newMember',
				await bcrypt.hash(userPw, 10),
				'newMemberUserName',
				'newMemberNickName',
				'newMember@newMember.com',
				'newMemberProfileThumbnail.jpg'
			);

			const pwValid = await bcrypt.compare(userPw, member.userPw);

			expect(member).toBeDefined();
			expect(member.userId).toBe('newMember');
			expect(member.provider).toBe('local');
			expect(member.email).toBe('newMember@newMember.com');
			expect(member.userName).toBe('newMemberUserName');
			expect(pwValid).toBe(true);
			expect(member.nickName).toBe('newMemberNickName');
			expect(member.profileThumbnail).toBe('newMemberProfileThumbnail.jpg');
		})
	});

	describe('findMemberByNickname', () => {
		it('정상 조회', async () => {
			const member = await MemberRepository.findMemberByNickname(SAVE_MEMBER.nickName);

			expect(member).toBeDefined();
			expect(member.userId).toBe(SAVE_MEMBER.userId);
			expect(member.nickName).toBeUndefined();
			expect(member.userPw).toBeUndefined();
			expect(member.userName).toBeUndefined();
			expect(member.email).toBeUndefined();
			expect(member.profileThumbnail).toBeUndefined();
			expect(member.provider).toBeUndefined();
		})
	});

	describe('patchMemberProfile', () => {
		it('정상 수정', async () => {
			await MemberRepository.patchMemberProfile(SAVE_MEMBER.userId, 'newNickName', 'newProfileThumbnail.jpg');

			const member = await MemberRepository.findMemberByUserId(SAVE_MEMBER.userId);

			expect(member).toBeDefined();
			expect(member.nickName).toBe('newNickName');
			expect(member.profileThumbnail).toBe('newProfileThumbnail.jpg');
		})
	});

	describe('getMemberProfile', () => {
		it('정상 조회', async () => {
			const member = await MemberRepository.getMemberProfile(SAVE_MEMBER.userId);

			expect(member).toBeDefined();
			expect(member.nickName).toBe(SAVE_MEMBER.nickName);
			expect(member.profileThumbnail).toBe(SAVE_MEMBER.profileThumbnail);
			expect(member.userId).toBeUndefined();
			expect(member.userPw).toBeUndefined();
			expect(member.userName).toBeUndefined();
			expect(member.email).toBeUndefined();
			expect(member.provider).toBeUndefined();
		});

		it('사용자 없음', async () => {
			const member = await MemberRepository.getMemberProfile('nonexistent');

			expect(member).toBeNull();
		});
	});
})