import { MemberRepository } from '#repositories/memberRepository.js';
import { sequelize, Member, Auth } from '#models/index.js';
import bcrypt from 'bcrypt';
import CustomError from '#errors/customError.js';
import { ResponseStatus } from '#constants/responseStatus.js';

const SAVE_MEMBER = {
	id: 1,
	userId: 'tester',
	password: 'tester1234',
	username: 'testerName',
	nickname: 'testerNickName',
	email: 'tester@tester.com',
	profile: 'testerProfileThumbnail.jpg',
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
			id: SAVE_MEMBER.id,
			userId: SAVE_MEMBER.userId,
			password: await bcrypt.hash(SAVE_MEMBER.password, 10),
			username: SAVE_MEMBER.username,
			nickname: SAVE_MEMBER.nickname,
			email: SAVE_MEMBER.email,
			profile: SAVE_MEMBER.profile,
			provider: SAVE_MEMBER.provider,
		});

		await Auth.create({
			userId: SAVE_MEMBER.id,
			auth: 'ROLE_MEMBER',
		});

		await Member.create({
			id: 2,
			userId: 'noAuthUser',
			password: await bcrypt.hash('noAuthUser1234', 10),
			username: 'noAuthUserName',
			nickname: 'noAuthNickName',
			email: 'noAuthUser@noAuthUser.com',
			profile: 'noAuthUserProfileThumbnail.jpg',
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

			const pwValid = await bcrypt.compare(SAVE_MEMBER.password, member.password);

			expect(member).toBeDefined();
			expect(member.id).toBe(SAVE_MEMBER.id);
			expect(member.userId).toBe(SAVE_MEMBER.userId);
			expect(pwValid).toBe(true);
			expect(member.username).toBe(SAVE_MEMBER.username);
			expect(member.nickname).toBe(SAVE_MEMBER.nickname);
			expect(member.email).toBe(SAVE_MEMBER.email);
			expect(member.profile).toBe(SAVE_MEMBER.profile);
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
			expect(userWithRoles.id).toBeUndefined();
			expect(userWithRoles.password).toBeUndefined();
			expect(userWithRoles.username).toBeUndefined();
			expect(userWithRoles.nickname).toBeUndefined();
			expect(userWithRoles.email).toBeUndefined();
			expect(userWithRoles.profile).toBeUndefined();
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

			const pwValid = await bcrypt.compare(userPw, member.password);

			expect(member).toBeDefined();
			expect(member.userId).toBe('newOAuthUser');
			expect(member.provider).toBe('local');
			expect(member.email).toBe('newOAuthUser@newOAuthUser.com');
			expect(member.username).toBe('newOAuthUserName');
			expect(pwValid).toBe(true);
			expect(member.nickname).toBeUndefined();
			expect(member.profile).toBeUndefined();
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

			const pwValid = await bcrypt.compare(userPw, member.password);

			expect(member).toBeDefined();
			expect(member.userId).toBe('newMember');
			expect(member.provider).toBe('local');
			expect(member.email).toBe('newMember@newMember.com');
			expect(member.username).toBe('newMemberUserName');
			expect(pwValid).toBe(true);
			expect(member.nickname).toBe('newMemberNickName');
			expect(member.profile).toBe('newMemberProfileThumbnail.jpg');
		})
	});

	describe('findMemberByNickname', () => {
		it('정상 조회', async () => {
			const member = await MemberRepository.findMemberByNickname(SAVE_MEMBER.nickname);

			expect(member).toBeDefined();
			expect(member.userId).toBe(SAVE_MEMBER.userId);
			expect(member.nickname).toBeUndefined();
			expect(member.password).toBeUndefined();
			expect(member.username).toBeUndefined();
			expect(member.email).toBeUndefined();
			expect(member.profile).toBeUndefined();
			expect(member.provider).toBeUndefined();
		})
	});

	describe('patchMemberProfile', () => {
		it('정상 수정', async () => {
			await MemberRepository.patchMemberProfile(SAVE_MEMBER.userId, 'newNickName', 'newProfileThumbnail.jpg');

			const member = await MemberRepository.findMemberByUserId(SAVE_MEMBER.userId);

			expect(member).toBeDefined();
			expect(member.nickname).toBe('newNickName');
			expect(member.profile).toBe('newProfileThumbnail.jpg');
		})
	});

	describe('getMemberProfile', () => {
		it('정상 조회', async () => {
			const member = await MemberRepository.getMemberProfile(SAVE_MEMBER.userId);

			expect(member).toBeDefined();
			expect(member.nickname).toBe(SAVE_MEMBER.nickname);
			expect(member.profile).toBe(SAVE_MEMBER.profile);
			expect(member.userId).toBeUndefined();
			expect(member.password).toBeUndefined();
			expect(member.username).toBeUndefined();
			expect(member.email).toBeUndefined();
			expect(member.provider).toBeUndefined();
		});

		it('사용자 없음', async () => {
			const member = await MemberRepository.getMemberProfile('nonexistent');

			expect(member).toBeNull();
		});
	});
})