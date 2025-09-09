import CustomError from '@errors/customError.js';
import { ResponseStatus } from '@constants/responseStatus.js';
import { sequelize, Member, Auth } from '@models/index.js';
import bcrypt from 'bcrypt';
import request from 'supertest';
import app from '../../../../src/app.js';
import { createTestToken } from '../../../utils/testTokenUtils.js';
import { initRedis, closeRedis } from '@config/redisConfig.js';
import { redisClient } from '@config/redisConfig.js';

const SAVE_MEMBER = {
	userId: 'tester',
	userPw: 'tester1234!@#$',
	userName: 'testerName',
	nickName: 'testerNickName',
	email: 'tester@tester.com',
	profileThumbnail: 'testerProfileThumbnail.jpg',
	provider: 'local',
}

describe('memberRoutes Integration Test', () => {
	beforeAll(async () => {
		await initRedis();
		await sequelize.authenticate();
		await sequelize.sync({ force: true });
	});

	afterAll(async () => {
		await closeRedis();
		await sequelize.close();
	});

	afterEach(async () => {
		await Member.destroy({ where: {} });
		await Auth.destroy({ where: {} });
		await redisClient.flushAll();
	})

	describe('POST /join', () => {
		it('회원가입. 모든 값이 존재하는 경우', async () => {
			const res = await request(app)
						.post('/member/join')
						.set('Content-Type', 'multipart/form-data')
						.field('userId', SAVE_MEMBER.userId)
						.field('userPw', SAVE_MEMBER.userPw)
						.field('email', SAVE_MEMBER.email)
						.field('userName', SAVE_MEMBER.userName)
						.field('nickName', SAVE_MEMBER.nickName)
						.attach(
							'profileThumbnail', 
							Buffer.from(SAVE_MEMBER.profileThumbnail), 
							"testerProfileThumbnail.jpg"
						);
			
			expect(res.status).toBe(ResponseStatus.CREATED.CODE);
			
			const member = await Member.findOne({ where: { userId: SAVE_MEMBER.userId } });
			const auth = await Auth.findAll({ where: { userId: SAVE_MEMBER.userId } });

			const pwValid = await bcrypt.compare(SAVE_MEMBER.userPw, member.userPw);

			expect(member).toBeDefined();
			expect(member.userId).toBe(SAVE_MEMBER.userId);
			expect(member.nickName).toBe(SAVE_MEMBER.nickName);
			expect(member.userName).toBe(SAVE_MEMBER.userName);
			expect(member.email).toBe(SAVE_MEMBER.email);
			expect(pwValid).toBe(true);
			expect(member.profileThumbnail).toBeDefined();
			expect(auth).toBeDefined();
			expect(auth.length).toBe(1);
			expect(auth[0].userId).toBe(SAVE_MEMBER.userId);
			expect(auth[0].auth).toEqual('ROLE_MEMBER');
		});

		it('회원 가입. userId가 존재하지 않는 경우', async () => {
			try {
				await request(app)
						.post('/member/join')
						.set('Content-Type', 'multipart/form-data')
						.field('userPw', SAVE_MEMBER.userPw)
						.field('email', SAVE_MEMBER.email)
						.field('userName', SAVE_MEMBER.userName)
						.field('nickName', SAVE_MEMBER.nickName)
						.attach(
							'profileThumbnail', 
							Buffer.from(SAVE_MEMBER.profileThumbnail), 
							"testerProfileThumbnail.jpg"
						);
			}catch(error) {
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatus.BAD_REQUEST.CODE);
				expect(error.message).toBe(ResponseStatus.BAD_REQUEST.MESSAGE);
			}
		});

		it('회원가입. userId가 너무 짧은 경우', async () => {
			try {
				await request(app)
						.post('/member/join')
						.set('Content-Type', 'multipart/form-data')
						.field('userId', 'tes')
						.field('userPw', SAVE_MEMBER.userPw)
						.field('email', SAVE_MEMBER.email)
						.field('userName', SAVE_MEMBER.userName)
						.field('nickName', SAVE_MEMBER.nickName)
						.attach(
							'profileThumbnail', 
							Buffer.from(SAVE_MEMBER.profileThumbnail), 
							"testerProfileThumbnail.jpg"
						);
			}catch(error) {
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatus.BAD_REQUEST.CODE);
				expect(error.message).toBe(ResponseStatus.BAD_REQUEST.MESSAGE);
			}
		});

		it('회원 가입. userPw가 존재하지 않는 경우', async () => {
			try {
				await request(app)
						.post('/member/join')
						.set('Content-Type', 'multipart/form-data')
						.field('userId', SAVE_MEMBER.userId)
						.field('email', SAVE_MEMBER.email)
						.field('userName', SAVE_MEMBER.userName)
						.field('nickName', SAVE_MEMBER.nickName)
						.attach(
							'profileThumbnail', 
							Buffer.from(SAVE_MEMBER.profileThumbnail), 
							"testerProfileThumbnail.jpg"
						);
			}catch(error) {
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatus.BAD_REQUEST.CODE);
				expect(error.message).toBe(ResponseStatus.BAD_REQUEST.MESSAGE);
			}
		});

		it('회원 가입. userPw가 규칙에 맞지 않은 경우', async () => {
			try {
				await request(app)
						.post('/member/join')
						.set('Content-Type', 'multipart/form-data')
						.field('userId', SAVE_MEMBER.userId)
						.field('userPw', 'tester1234')
						.field('email', SAVE_MEMBER.email)
						.field('userName', SAVE_MEMBER.userName)
						.field('nickName', SAVE_MEMBER.nickName)
						.attach(
							'profileThumbnail', 
							Buffer.from(SAVE_MEMBER.profileThumbnail), 
							"testerProfileThumbnail.jpg"
						);
			}catch(error) {
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatus.BAD_REQUEST.CODE);
				expect(error.message).toBe(ResponseStatus.BAD_REQUEST.MESSAGE);
			}
		});

		it('회원 가입. email이 존재하지 않는 경우', async () => {
			try {
				await request(app)
						.post('/member/join')
						.set('Content-Type', 'multipart/form-data')
						.field('userId', SAVE_MEMBER.userId)
						.field('userPw', SAVE_MEMBER.userPw)
						.field('userName', SAVE_MEMBER.userName)
						.field('nickName', SAVE_MEMBER.nickName)
						.attach(
							'profileThumbnail', 
							Buffer.from(SAVE_MEMBER.profileThumbnail), 
							"testerProfileThumbnail.jpg"
						);
			}catch(error) {
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatus.BAD_REQUEST.CODE);
				expect(error.message).toBe(ResponseStatus.BAD_REQUEST.MESSAGE);
			}
		});
		
		it('회원가입. userName이 존재하지 않는 경우', async () => {
			try {
				await request(app)
						.post('/member/join')
						.set('Content-Type', 'multipart/form-data')
						.field('userId', SAVE_MEMBER.userId)
						.field('userPw', SAVE_MEMBER.userPw)
						.field('nickName', SAVE_MEMBER.nickName)
						.field('email', SAVE_MEMBER.email)
						.attach(
							'profileThumbnail', 
							Buffer.from(SAVE_MEMBER.profileThumbnail), 
							"testerProfileThumbnail.jpg"
						);
			}catch(error) {
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatus.BAD_REQUEST.CODE);
				expect(error.message).toBe(ResponseStatus.BAD_REQUEST.MESSAGE);
			}
		});

		it('회원가입. nickName이 존재하지 않는 경우', async () => {
			const res = await request(app)
						.post('/member/join')
						.set('Content-Type', 'multipart/form-data')
						.field('userId', SAVE_MEMBER.userId)
						.field('userPw', SAVE_MEMBER.userPw)
						.field('email', SAVE_MEMBER.email)
						.field('userName', SAVE_MEMBER.userName)
						.attach(
							'profileThumbnail', 
							Buffer.from(SAVE_MEMBER.profileThumbnail), 
							"testerProfileThumbnail.jpg"
						);
			
			expect(res.status).toBe(ResponseStatus.CREATED.CODE);
			
			const member = await Member.findOne({ where: { userId: SAVE_MEMBER.userId } });
			const auth = await Auth.findAll({ where: { userId: SAVE_MEMBER.userId } });

			const pwValid = await bcrypt.compare(SAVE_MEMBER.userPw, member.userPw);

			expect(member).toBeDefined();
			expect(member.userId).toBe(SAVE_MEMBER.userId);
			expect(member.nickName).toBeNull();
			expect(member.userName).toBe(SAVE_MEMBER.userName);
			expect(member.email).toBe(SAVE_MEMBER.email);
			expect(pwValid).toBe(true);
			expect(member.profileThumbnail).toBeDefined();
			expect(auth).toBeDefined();
			expect(auth.length).toBe(1);
			expect(auth[0].userId).toBe(SAVE_MEMBER.userId);
			expect(auth[0].auth).toEqual('ROLE_MEMBER');
		});

		it('회원가입. profileThumbnail이 존재하지 않는 경우', async () => {
			const res = await request(app)
						.post('/member/join')
						.set('Content-Type', 'multipart/form-data')
						.field('userId', SAVE_MEMBER.userId)
						.field('userPw', SAVE_MEMBER.userPw)
						.field('email', SAVE_MEMBER.email)
						.field('userName', SAVE_MEMBER.userName)
						.field('nickName', SAVE_MEMBER.nickName);
			
			expect(res.status).toBe(ResponseStatus.CREATED.CODE);
			
			const member = await Member.findOne({ where: { userId: SAVE_MEMBER.userId } });
			const auth = await Auth.findAll({ where: { userId: SAVE_MEMBER.userId } });

			const pwValid = await bcrypt.compare(SAVE_MEMBER.userPw, member.userPw);
			
			expect(member).toBeDefined();
			expect(member.userId).toBe(SAVE_MEMBER.userId);
			expect(member.nickName).toBe(SAVE_MEMBER.nickName);
			expect(member.userName).toBe(SAVE_MEMBER.userName);
			expect(member.email).toBe(SAVE_MEMBER.email);
			expect(pwValid).toBe(true);
			expect(member.profileThumbnail).toBeNull();
			expect(auth).toBeDefined();
			expect(auth.length).toBe(1);
			expect(auth[0].userId).toBe(SAVE_MEMBER.userId);
			expect(auth[0].auth).toEqual('ROLE_MEMBER');
		});

		it('회원 가입. nickName, profileThumbnail이 존재하지 않는 경우', async () => {
			const res = await request(app)
						.post('/member/join')
						.set('Content-Type', 'multipart/form-data')
						.field('userId', SAVE_MEMBER.userId)
						.field('userPw', SAVE_MEMBER.userPw)
						.field('email', SAVE_MEMBER.email)
						.field('userName', SAVE_MEMBER.userName);
			
			expect(res.status).toBe(ResponseStatus.CREATED.CODE);
			
			const member = await Member.findOne({ where: { userId: SAVE_MEMBER.userId } });
			const auth = await Auth.findAll({ where: { userId: SAVE_MEMBER.userId } });

			const pwValid = await bcrypt.compare(SAVE_MEMBER.userPw, member.userPw);

			expect(member).toBeDefined();
			expect(member.userId).toBe(SAVE_MEMBER.userId);
			expect(member.nickName).toBeNull();
			expect(member.userName).toBe(SAVE_MEMBER.userName);
			expect(member.email).toBe(SAVE_MEMBER.email);
			expect(pwValid).toBe(true);
			expect(member.profileThumbnail).toBeNull();
			expect(auth).toBeDefined();
			expect(auth.length).toBe(1);
			expect(auth[0].userId).toBe(SAVE_MEMBER.userId);
			expect(auth[0].auth).toEqual('ROLE_MEMBER');
		})

		it('로그인한 회원이 회원가입을 시도하는 경우', async () => {
			const { accessToken, refreshToken, ino } = await createTestToken(SAVE_MEMBER.userId);

			try {
				await request(app)
						.post('/member/join')
						.set('Cookie', [
							`Authorization=${accessToken}`,
							`Authorization_Refresh=${refreshToken}`,
							`Authorization_ino=${ino}`,
						])
						.field('userId', SAVE_MEMBER.userId)
						.field('userPw', SAVE_MEMBER.userPw)
						.field('email', SAVE_MEMBER.email)
						.field('username', SAVE_MEMBER.userName)
						.field('nickname', SAVE_MEMBER.nickName)
						.attach(
							'profileThumbnail', 
							Buffer.from(SAVE_MEMBER.profileThumbnail), 
							"testerProfileThumbnail.jpg"
						);
			}catch(error) {
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatus.FORBIDDEN.CODE);
				expect(error.message).toBe(ResponseStatus.FORBIDDEN.MESSAGE);
			}
		});

		it('회원 가입. 이미 존재하는 사용자 아이디로 회원가입을 시도하는 경우', async () => {
			await Member.create({
				userId: SAVE_MEMBER.userId,
				userPw: await bcrypt.hash(SAVE_MEMBER.userPw, 10),
				userName: SAVE_MEMBER.userName,
				nickName: SAVE_MEMBER.nickName,
				email: SAVE_MEMBER.email,
				profileThumbnail: SAVE_MEMBER.profileThumbnail,
			});

			try {
				await request(app)
						.post('/member/join')
						.set('Content-Type', 'multipart/form-data')
						.field('userId', SAVE_MEMBER.userId)
						.field('userPw', SAVE_MEMBER.userPw)
						.field('email', SAVE_MEMBER.email)
						.field('userName', SAVE_MEMBER.userName)
						.field('nickName', SAVE_MEMBER.nickName)
						.attach(
							'profileThumbnail', 
							Buffer.from(SAVE_MEMBER.profileThumbnail), 
							"testerProfileThumbnail.jpg"
						);
			}catch(error) {
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatus.BAD_REQUEST.CODE);
				expect(error.message).toBe(ResponseStatus.BAD_REQUEST.MESSAGE);
			}
		});
	});

	describe('GET /check-id', () => {
		it('아이디 중복 체크. 중복이 아닌 경우', async () => {

		});

		it('아이디 중복 체크. 중복인 경우', async () => {

		});

		it('아이디 중복 체크. 아이디가 너무 짧은 경우', async () => {

		});

		it('아이디 중복 체크. 로그인한 회원이 요청한 경우', async () => {

		});
	});

	describe('GET /check-nickname', () => {
		it('닉네임 중복 체크. 중복이 아닌 경우', async () => {

		});

		it('닉네임 중복 체크. 중복인 경우', async () => {

		});

		it('닉네임 중복 체크. 닉네임이 너무 짧은 경우', async () => {

		});

		it('닉네임 중복 체크. 로그인한 회원이 자신의 닉네임과 동일한 닉네임으로 요청한 경우', async () => {

		});

		it('닉네임 중복 체크. 로그인한 회원의 요청. 다른 사용자가 사용중인 경우', async () => {

		});

		it('닉네임 중복 체크. 로그인한 회원의 요청, 중복이 아닌 경우', async () => {

		});
	});

	describe('POST /login', () => {
		it('로그인 요청.', async () => {

		});

		it('로그인 요청. 일치하는 정보가 없는 경우', async () => {

		});

		it('로그인 요청. 이미 로그인한 회원이 요청한 경우', async () => {

		});
	});

	describe('POST /logout', () => {
		it('로그아웃 요청.', async () => {

		});

		it('로그아웃 요청. 비회원이 요청한 경우', async () => {

		});
	});

	describe('PATCH /profile', () => {
		it('정보 수정 요청. 닉네임과 프로필 이미지를 추가하는 경우', async () => {

		});

		it('정보 수정 요청, 닉네임과 프로필 이미지')
	})
})