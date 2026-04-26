import { jest } from '@jest/globals';
import CustomError from '#errors/customError.js';
import { ResponseStatus, ResponseStatusCode } from '#constants/responseStatus.js';
import { sequelize, Member, Auth } from '#models/index.js';
import bcrypt from 'bcrypt';
import request from 'supertest';
import { createTestToken } from '../../../utils/testTokenUtils.js';
import { initRedis, closeRedis } from '#config/redisConfig.js';
import { redisClient } from '#config/redisConfig.js';
import { jwtConfig } from '#config/jwtConfig.js';
import {memberCheckConstants} from "#constants/memberCheckConstants.js";
import {ImageConstants} from "#constants/imageConstants.js";
import {findSuffixType} from "#constants/mailConstants.js";

await jest.unstable_mockModule('#utils/resize.js', () => ({
	  profileResize: jest.fn(),
	  boardResize: jest.fn(),
}));
  
// deleteImageFile 모듈 최소 모킹
await jest.unstable_mockModule('#utils/fileUtils.js',  () => ({
	deleteImageFile: jest.fn(),
	deleteBoardImageFromFiles: jest.fn(),
	deleteBoardImageFromNames: jest.fn(),
}));

const { profileResize, boardResize } = await import('#utils/resize.js');
const { deleteImageFile, deleteBoardImageFromFiles, deleteBoardImageFromNames } = await import('#utils/fileUtils.js');
const app = (await import('#src/app.js')).default;

const SAVE_MEMBER = {
	id: 1,
	userId: 'tester',
	password: 'tester1234!@#$',
	username: 'testerName',
	nickname: 'testerNickName',
	email: 'tester@tester.com',
	profile: 'testerProfileThumbnail.jpg',
	provider: 'local',
}

describe('memberRoutes Integration Test', () => {
	beforeAll(async () => {
		await initRedis();
		await sequelize.authenticate();
		await sequelize.sync({ force: true });
	});

	afterAll(async () => {
		await Auth.destroy({ where: {} });
		await Member.destroy({ where: {} });
		await sequelize.close();
		await closeRedis();
	});

	afterEach(async () => {
		await Member.destroy({ where: {} });
		await Auth.destroy({ where: {} });
		await redisClient.flushAll();
	})

	describe('GET /status', () => {
		it('로그인 상태 조회 요청.', async () => {
			await Member.create(SAVE_MEMBER);

			await Auth.create({
				userId: SAVE_MEMBER.id,
				auth: 'ROLE_MEMBER',
			});

			const { accessToken, refreshToken, ino } = await createTestToken(SAVE_MEMBER.userId);
			
			const res = await request(app)
						.get('/api/member/status')
						.set('Cookie', [
							`Authorization=${accessToken}`,
							`Authorization_Refresh=${refreshToken}`,
							`Authorization_ino=${ino}`,
						]);

			expect(res.status).toBe(ResponseStatusCode.OK);
			expect(res.body.content.userId).toBe(SAVE_MEMBER.userId);
			expect(res.body.content.role).toBe('ROLE_MEMBER');
		});

		it('로그인 상태 조회 요청. 비회원이 요청한 경우', async () => {
			try {
				await request(app).get('/api/member/status');
			}catch(error) {
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatus.FORBIDDEN.CODE);
				expect(error.message).toBe(ResponseStatus.FORBIDDEN.MESSAGE);
			}
		});
	});

	describe('POST /join', () => {
		it('회원가입. 모든 값이 존재하는 경우', async () => {
			const res = await request(app)
						.post('/api/member/join')
						.set('Content-Type', 'multipart/form-data')
						.field('userId', SAVE_MEMBER.userId)
						.field('password', SAVE_MEMBER.password)
						.field('username', SAVE_MEMBER.username)
						.field('nickname', SAVE_MEMBER.nickname)
						.field('email', SAVE_MEMBER.email)
						.attach(
							'profile',
							Buffer.from('fake'), 
							"testerProfileThumbnail.jpg"
						);
			
			expect(res.status).toBe(ResponseStatus.CREATED.CODE);
			expect(profileResize).toHaveBeenCalled();
			expect(deleteImageFile).not.toHaveBeenCalled();
			
			const member = await Member.findOne({ where: { userId: SAVE_MEMBER.userId } });
			const auth = await Auth.findAll({ where: { userId: member.id } });

			const pwValid = await bcrypt.compare(SAVE_MEMBER.password, member.password);

			expect(member).toBeDefined();
			expect(member.id).toBeDefined();
			expect(member.userId).toBe(SAVE_MEMBER.userId);
			expect(member.nickname).toBe(SAVE_MEMBER.nickname);
			expect(member.username).toBe(SAVE_MEMBER.username);
			expect(member.email).toBe(SAVE_MEMBER.email);
			expect(pwValid).toBe(true);
			expect(member.profile).toBeDefined();
			expect(member.profile.endsWith('_300.jpg')).toBe(true);
			expect(auth).toBeDefined();
			expect(auth.length).toBe(1);
			expect(auth[0].userId).toBe(member.id);
			expect(auth[0].auth).toEqual('ROLE_MEMBER');
		});

		it('회원 가입. userId가 존재하지 않는 경우', async () => {
			try {
				await request(app)
						.post('/api/member/join')
						.set('Content-Type', 'multipart/form-data')
						.field('password', SAVE_MEMBER.password)
						.field('email', SAVE_MEMBER.email)
						.field('username', SAVE_MEMBER.username)
						.field('nickname', SAVE_MEMBER.nickname)
						.attach(
							'profile',
							Buffer.from('fake'),
							"testerProfileThumbnail.jpg"
						);
			}catch(error) {
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatus.BAD_REQUEST.CODE);
				expect(error.message).toBe(ResponseStatus.BAD_REQUEST.MESSAGE);
				expect(profileResize).not.toHaveBeenCalled();
				expect(deleteImageFile).toHaveBeenCalledTimes(1);
			}
		});

		it('회원가입. userId가 너무 짧은 경우', async () => {
			try {
				await request(app)
						.post('/api/member/join')
						.set('Content-Type', 'multipart/form-data')
						.field('userId', 'tes')
						.field('password', SAVE_MEMBER.password)
						.field('email', SAVE_MEMBER.email)
						.field('username', SAVE_MEMBER.username)
						.field('nickname', SAVE_MEMBER.nickname)
						.attach(
							'profile',
							Buffer.from('fake'),
							"testerProfileThumbnail.jpg"
						);
			}catch(error) {
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatus.BAD_REQUEST.CODE);
				expect(error.message).toBe(ResponseStatus.BAD_REQUEST.MESSAGE);
				expect(profileResize).not.toHaveBeenCalled();
				expect(deleteImageFile).toHaveBeenCalledTimes(1);
			}
		});

		it('회원 가입. password가 존재하지 않는 경우', async () => {
			try {
				await request(app)
						.post('/api/member/join')
						.set('Content-Type', 'multipart/form-data')
						.field('userId', SAVE_MEMBER.userId)
						.field('email', SAVE_MEMBER.email)
						.field('username', SAVE_MEMBER.username)
						.field('nickname', SAVE_MEMBER.nickname)
						.attach(
							'profile',
							Buffer.from('fake'),
							"testerProfileThumbnail.jpg"
						);
			}catch(error) {
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatus.BAD_REQUEST.CODE);
				expect(error.message).toBe(ResponseStatus.BAD_REQUEST.MESSAGE);
				expect(profileResize).not.toHaveBeenCalled();
				expect(deleteImageFile).toHaveBeenCalledTimes(1);
			}
		});

		it('회원 가입. password가 규칙에 맞지 않은 경우', async () => {
			try {
				await request(app)
						.post('/api/member/join')
						.set('Content-Type', 'multipart/form-data')
						.field('userId', SAVE_MEMBER.userId)
						.field('password', 'tester1234')
						.field('email', SAVE_MEMBER.email)
						.field('username', SAVE_MEMBER.username)
						.field('nickname', SAVE_MEMBER.nickname)
						.attach(
							'profile',
							Buffer.from('fake'),
							"testerProfileThumbnail.jpg"
						);
			}catch(error) {
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatus.BAD_REQUEST.CODE);
				expect(error.message).toBe(ResponseStatus.BAD_REQUEST.MESSAGE);
				expect(profileResize).not.toHaveBeenCalled();
				expect(deleteImageFile).toHaveBeenCalledTimes(1);
			}
		});

		it('회원 가입. email이 존재하지 않는 경우', async () => {
			try {
				await request(app)
						.post('/api/member/join')
						.set('Content-Type', 'multipart/form-data')
						.field('userId', SAVE_MEMBER.userId)
						.field('password', SAVE_MEMBER.password)
						.field('userName', SAVE_MEMBER.username)
						.field('nickname', SAVE_MEMBER.nickname)
						.attach(
							'profile',
							Buffer.from('fake'),
							"testerProfileThumbnail.jpg"
						);
			}catch(error) {
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatus.BAD_REQUEST.CODE);
				expect(error.message).toBe(ResponseStatus.BAD_REQUEST.MESSAGE);
				expect(profileResize).not.toHaveBeenCalled();
				expect(deleteImageFile).toHaveBeenCalledTimes(1);
			}
		});
		
		it('회원가입. username이 존재하지 않는 경우', async () => {
			try {
				await request(app)
						.post('/api/member/join')
						.set('Content-Type', 'multipart/form-data')
						.field('userId', SAVE_MEMBER.userId)
						.field('password', SAVE_MEMBER.password)
						.field('nickname', SAVE_MEMBER.nickname)
						.field('email', SAVE_MEMBER.email)
						.attach(
							'profile',
							Buffer.from('fake'),
							"testerProfileThumbnail.jpg"
						);
			}catch(error) {
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatus.BAD_REQUEST.CODE);
				expect(error.message).toBe(ResponseStatus.BAD_REQUEST.MESSAGE);
				expect(profileResize).not.toHaveBeenCalled();
				expect(deleteImageFile).toHaveBeenCalledTimes(1);
			}
		});

		it('회원가입. nickname이 존재하지 않는 경우', async () => {
			try {

				await request(app)
							.post('/api/member/join')
							.set('Content-Type', 'multipart/form-data')
							.field('userId', SAVE_MEMBER.userId)
							.field('password', SAVE_MEMBER.password)
							.field('email', SAVE_MEMBER.email)
							.field('username', SAVE_MEMBER.username)
							.attach(
								'profile',
								Buffer.from('fake'),
								"testerProfileThumbnail.jpg"
							);
			}catch(error) {
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatus.BAD_REQUEST.CODE);
				expect(error.message).toBe(ResponseStatus.BAD_REQUEST.MESSAGE);
				expect(profileResize).not.toHaveBeenCalled();
				expect(deleteImageFile).toHaveBeenCalledTimes(1);
			}
		});

		it('회원가입. profile이 존재하지 않는 경우', async () => {
			const res = await request(app)
						.post('/api/member/join')
						.set('Content-Type', 'multipart/form-data')
						.field('userId', SAVE_MEMBER.userId)
						.field('password', SAVE_MEMBER.password)
						.field('email', SAVE_MEMBER.email)
						.field('username', SAVE_MEMBER.username)
						.field('nickname', SAVE_MEMBER.nickname);
			
			expect(res.status).toBe(ResponseStatus.CREATED.CODE);
			
			const member = await Member.findOne({ where: { userId: SAVE_MEMBER.userId } });
			const auth = await Auth.findAll({ where: { userId: member.id } });

			const pwValid = await bcrypt.compare(SAVE_MEMBER.password, member.password);
			
			expect(profileResize).not.toHaveBeenCalled();
			expect(deleteImageFile).not.toHaveBeenCalled();
			
			expect(member).toBeDefined();
			expect(member.userId).toBe(SAVE_MEMBER.userId);
			expect(member.nickname).toBe(SAVE_MEMBER.nickname);
			expect(member.username).toBe(SAVE_MEMBER.username);
			expect(member.email).toBe(SAVE_MEMBER.email);
			expect(pwValid).toBe(true);
			expect(member.profile).toBeNull();
			expect(auth).toBeDefined();
			expect(auth.length).toBe(1);
			expect(auth[0].userId).toBe(member.id);
			expect(auth[0].auth).toEqual('ROLE_MEMBER');
		});

		it('로그인한 회원이 회원가입을 시도하는 경우', async () => {
			await Member.create(SAVE_MEMBER);
			await Auth.create({
				userId: SAVE_MEMBER.id,
				auth: 'ROLE_MEMBER',
			});

			const { accessToken, refreshToken, ino } = await createTestToken(SAVE_MEMBER.userId);

			try {
				await request(app)
						.post('/api/member/join')
						.set('Cookie', [
							`Authorization=${accessToken}`,
							`Authorization_Refresh=${refreshToken}`,
							`Authorization_ino=${ino}`,
						])
						.field('userId', SAVE_MEMBER.userId)
						.field('password', SAVE_MEMBER.password)
						.field('email', SAVE_MEMBER.email)
						.field('username', SAVE_MEMBER.username)
						.field('nickname', SAVE_MEMBER.nickname)
						.attach(
							'profile',
							Buffer.from('fake'),
							"testerProfileThumbnail.jpg"
						);
			}catch(error) {
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatus.FORBIDDEN.CODE);
				expect(error.message).toBe(ResponseStatus.FORBIDDEN.MESSAGE);
				expect(profileResize).not.toHaveBeenCalled();
				expect(deleteImageFile).not.toHaveBeenCalled();
			}
		});

		it('회원 가입. 이미 존재하는 사용자 아이디로 회원가입을 시도하는 경우', async () => {
			await Member.create(SAVE_MEMBER);

			await Auth.create({
				userId: SAVE_MEMBER.id,
				auth: 'ROLE_MEMBER',
			});

			try {
				await request(app)
						.post('/api/member/join')
						.set('Content-Type', 'multipart/form-data')
						.field('userId', SAVE_MEMBER.userId)
						.field('password', SAVE_MEMBER.password)
						.field('email', SAVE_MEMBER.email)
						.field('username', SAVE_MEMBER.username)
						.field('nickname', SAVE_MEMBER.nickname)
						.attach(
							'profile',
							Buffer.from('fake'),
							"testerProfileThumbnail.jpg"
						);
			}catch(error) {
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatus.BAD_REQUEST.CODE);
				expect(error.message).toBe(ResponseStatus.BAD_REQUEST.MESSAGE);
				expect(profileResize).not.toHaveBeenCalled();
				expect(deleteImageFile).toHaveBeenCalledTimes(1);
			}
		});
	});

	describe('GET /check-id/:userId', () => {
		it('아이디 중복 체크. 중복이 아닌 경우', async () => {
			const res = await request(app)
								.get('/api/member/check-id/tester');

			expect(res.status).toBe(ResponseStatusCode.OK);
			expect(res.body.message).toBe(memberCheckConstants.VALID);
		});

		it('아이디 중복 체크. 중복인 경우', async () => {
			await Member.create(SAVE_MEMBER);

			await Auth.create({
				userId: SAVE_MEMBER.id,
				auth: 'ROLE_MEMBER',
			});

			const res = await request(app)
								.get(`/api/member/check-id/${SAVE_MEMBER.userId}`);

			expect(res.status).toBe(ResponseStatusCode.CONFLICT);
		});

		it('아이디 중복 체크. 아이디가 너무 짧은 경우', async () => {
			const res = await request(app)
								.get('/api/member/check-id/tes');

			expect(res.status).toBe(ResponseStatusCode.BAD_REQUEST);
		});

		it('아이디 중복 체크. 로그인한 회원이 요청한 경우', async () => {
			await Member.create(SAVE_MEMBER);

			await Auth.create({
				userId: SAVE_MEMBER.id,
				auth: 'ROLE_MEMBER',
			});

			const { accessToken, refreshToken, ino } = await createTestToken(SAVE_MEMBER.userId);

			try {
				await request(app)
						.get('/api/member/check-id/tester999')
						.set('Cookie', [
							`Authorization=${accessToken}`,
							`Authorization_Refresh=${refreshToken}`,
							`Authorization_ino=${ino}`,
						]);
			}catch(error) {
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatus.FORBIDDEN.CODE);
				expect(error.message).toBe(ResponseStatus.FORBIDDEN.MESSAGE);
			}
		});
	});

	describe('GET /check-nickname/:nickname', () => {
		it('닉네임 중복 체크. 중복이 아닌 경우', async () => {
			const res = await request(app)
								.get(`/api/member/check-nickname/${SAVE_MEMBER.nickname}`);

			expect(res.status).toBe(ResponseStatusCode.OK);
			expect(res.body.message).toBe(memberCheckConstants.VALID);
		});

		it('닉네임 중복 체크. 중복인 경우', async () => {
			await Member.create(SAVE_MEMBER);

			await Auth.create({
				userId: SAVE_MEMBER.id,
				auth: 'ROLE_MEMBER',
			});

			try {
				await request(app)
					.get(`/api/member/check-nickname/${SAVE_MEMBER.nickname}`);
			}catch(error) {
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatus.CONFLICT.CODE);
				expect(error.message).toBe(ResponseStatus.CONFLICT.MESSAGE);
			}
		});

		it('닉네임 중복 체크. 닉네임이 너무 짧은 경우', async () => {
			try {
				await request(app)
					.get('/api/member/check-nickname/t');
			}catch(error) {
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatus.BAD_REQUEST.CODE);
				expect(error.message).toBe(ResponseStatus.BAD_REQUEST.MESSAGE);
			}
		});

		it('닉네임 중복 체크. 로그인한 회원이 자신의 닉네임과 동일한 닉네임으로 요청한 경우', async () => {
			await Member.create(SAVE_MEMBER);

			await Auth.create({
				userId: SAVE_MEMBER.id,
				auth: 'ROLE_MEMBER',
			});

			const { accessToken, refreshToken, ino } = await createTestToken(SAVE_MEMBER.userId);

			const res = await request(app)
						.get(`/api/member/check-nickname/${SAVE_MEMBER.nickname}`)
						.set('Cookie', [
							`Authorization=${accessToken}`,
							`Authorization_Refresh=${refreshToken}`,
							`Authorization_ino=${ino}`,
						]);

			expect(res.status).toBe(ResponseStatusCode.OK);
			expect(res.body.message).toBe(memberCheckConstants.VALID);
		});

		it('닉네임 중복 체크. 로그인한 회원의 요청. 다른 사용자가 사용중인 경우', async () => {
			await Member.create({
				id: 2,
				userId: 'otherUserId',
				password: 'password123',
				username: 'othername',
				nickname: 'otherNickname',
				email: SAVE_MEMBER.email,
			});

			await Auth.create({
				userId: 2,
				auth: 'ROLE_MEMBER',
			});

			await Member.create(SAVE_MEMBER);

			await Auth.create({
				userId: SAVE_MEMBER.id,
				auth: 'ROLE_MEMBER',
			});

			const { accessToken, refreshToken, ino } = await createTestToken(SAVE_MEMBER.userId);

			try {
				await request(app)
					.get('/api/member/check-nickname/otherNickname')
					.set('Cookie', [
						`Authorization=${accessToken}`,
						`Authorization_Refresh=${refreshToken}`,
						`Authorization_ino=${ino}`,
					]);
			}catch(error){
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatus.CONFLICT.CODE);
				expect(error.message).toBe(ResponseStatus.CONFLICT.MESSAGE);
			}
		});

		it('닉네임 중복 체크. 로그인한 회원의 요청, 중복이 아닌 경우', async () => {
			await Member.create(SAVE_MEMBER);

			await Auth.create({
				userId: SAVE_MEMBER.id,
				auth: 'ROLE_MEMBER',
			});

			const { accessToken, refreshToken, ino } = await createTestToken(SAVE_MEMBER.userId);

			const res = await request(app)
						.get('/api/member/check-nickname/nickname')
						.set('Cookie', [
							`Authorization=${accessToken}`,
							`Authorization_Refresh=${refreshToken}`,
							`Authorization_ino=${ino}`,
						]);

			expect(res.status).toBe(ResponseStatusCode.OK);
			expect(res.body.message).toBe(memberCheckConstants.VALID);
		});
	});

	describe('POST /login', () => {
		beforeEach(async () => {
			await Member.create({
				id: 1,
				userId: SAVE_MEMBER.userId,
				password: await bcrypt.hash(SAVE_MEMBER.password, 10),
				username: SAVE_MEMBER.username,
				nickname: SAVE_MEMBER.nicknae,
				email: SAVE_MEMBER.email,
			});

			await Auth.create({
				userId: SAVE_MEMBER.id,
				auth: 'ROLE_MEMBER',
			});
		});
		it('로그인 요청.', async () => {
			const res = await request(app)
						.post('/api/member/login')
						.send({
							userId: SAVE_MEMBER.userId,
							password: SAVE_MEMBER.password,
						});
			
			expect(res.status).toBe(ResponseStatusCode.OK);
			expect(res.body.id).toBe(SAVE_MEMBER.userId);
			expect(res.headers['set-cookie']).toBeDefined();
			expect(res.headers['set-cookie'].length).toBe(3);
			const cookies = res.headers['set-cookie'];
			checkSecurityFromCookies(cookies);
		});

		it('로그인 요청. 아이디가 일치하지 않는 경우', async () => {
			try {
				await request(app)
					.post('/api/member/login')
					.send({
						userId: 'nonexistent',
						password: SAVE_MEMBER.password,
					});
			}catch(error) {
				expect(error.status).toBe(ResponseStatusCode.FORBIDDEN);
				expect(error.message).toBe(ResponseStatus.FORBIDDEN.MESSAGE);
			}
		});

		it('로그인 요청. 비밀번호가 일치하지 않는 경우', async () => {
			try {
				await request(app)
					.post('/api/member/login')
					.send({
						userId: SAVE_MEMBER.userId,
						password: 'nonexistent12!!@',
					});
			}catch(error) {
				expect(error.status).toBe(ResponseStatusCode.FORBIDDEN);
				expect(error.message).toBe(ResponseStatus.FORBIDDEN.MESSAGE);
			}
		});

		it('로그인 요청. 이미 로그인한 회원이 요청한 경우', async () => {
			const { accessToken, refreshToken, ino } = await createTestToken(SAVE_MEMBER.userId);

			try {
				await request(app)
					.post('/api/member/login')
					.set('Cookie', [
						`Authorization=${accessToken}`,
						`Authorization_Refresh=${refreshToken}`,
						`Authorization_ino=${ino}`,
					])
					.send({
						userId: SAVE_MEMBER.userId,
						password: SAVE_MEMBER.password,
					});
			}catch(error) {
				expect(error.status).toBe(ResponseStatusCode.FORBIDDEN);
				expect(error.message).toBe(ResponseStatus.FORBIDDEN.MESSAGE);
			}
		});
	});

	describe('POST /logout', () => {
		beforeEach(async () => {
			await Member.create(SAVE_MEMBER);

			await Auth.create({
				userId: SAVE_MEMBER.id,
				auth: 'ROLE_MEMBER',
			});
		});

		it('로그아웃 요청.', async () => {
			const { accessToken, refreshToken, ino } = await createTestToken(SAVE_MEMBER.userId);
			const res = await request(app)
						.post('/api/member/logout')
						.set('Cookie', [
							`Authorization=${accessToken}`,
							`Authorization_Refresh=${refreshToken}`,
							`Authorization_ino=${ino}`,
						]);

			expect(res.status).toBe(ResponseStatusCode.OK);
			expect(res.headers['set-cookie']).toBeDefined();
			expect(res.headers['set-cookie'].length).toBe(3);
			const cookies = res.headers['set-cookie'];
			checkClearCookieExpires(cookies);
		});

		it('로그아웃 요청. 비회원이 요청한 경우', async () => {
			try {
				await request(app)
					.post('/api/member/logout');
			}catch(error) {
				expect(error.status).toBe(ResponseStatusCode.FORBIDDEN);
				expect(error.message).toBe(ResponseStatus.FORBIDDEN.MESSAGE);
			}
		});
	});

	describe('PATCH /profile', () => {
		beforeEach(async () => {
			await Member.create(SAVE_MEMBER);

			await Auth.create({
				userId: SAVE_MEMBER.id,
				auth: 'ROLE_MEMBER',
			});
		});
		const patchData = {
			nickname: 'newNickname',
			email: 'newMail@newMail.com'
		}
		it('정보 수정 요청. 닉네임과 프로필 이미지를 추가하는 경우', async () => {
			const originalThumbnail = (await Member.findOne({ where: { id: SAVE_MEMBER.id } })).profile;
			const { accessToken, refreshToken, ino } = await createTestToken(SAVE_MEMBER.userId);
			const res = await request(app)
						.patch('/api/member/profile')
						.set('Cookie', [
							`Authorization=${accessToken}`,
							`Authorization_Refresh=${refreshToken}`,
							`Authorization_ino=${ino}`,
						])
						.field('nickname', patchData.nickname)
						.field('email', patchData.email)
						.field('deleteProfile', originalThumbnail)
						.attach('profile', Buffer.from('fake'), 'newProfileThumbnail.jpg');

			const patchMember = await Member.findOne({ where: { id: SAVE_MEMBER.id } });

			expect(res.status).toBe(ResponseStatusCode.OK);
			expect(patchMember.nickname).toBe(patchData.nickname);
			expect(patchMember.email).toBe(patchData.email);
			expect(patchMember.profile).not.toBe(originalThumbnail);

			expect(profileResize).toHaveBeenCalled();
			expect(deleteImageFile).toHaveBeenCalledWith(originalThumbnail, ImageConstants.PROFILE_TYPE);
		});

		it('정보 수정 요청. 프로필 삭제는 하지 않고 닉네임, 이메일만 수정하는 경우', async () => {
			const originalThumbnail = (await Member.findOne({ where: { id: SAVE_MEMBER.id } })).profile;
			const { accessToken, refreshToken, ino } = await createTestToken(SAVE_MEMBER.userId);
			const res = await request(app)
						.patch('/api/member/profile')
						.set('Cookie', [
							`Authorization=${accessToken}`,
							`Authorization_Refresh=${refreshToken}`,
							`Authorization_ino=${ino}`,
						])
						.field('nickname', patchData.nickname)
						.field('email', patchData.email);

			const patchMember = await Member.findOne({ where: { id: SAVE_MEMBER.id } });

			expect(res.status).toBe(ResponseStatusCode.OK);
			expect(patchMember.nickname).toBe(patchData.nickname);
			expect(patchMember.email).toBe(patchData.email);
			expect(patchMember.profile).toBe(originalThumbnail);

			expect(profileResize).not.toHaveBeenCalled();
			expect(deleteImageFile).not.toHaveBeenCalled();
		});

		it('정보 수정 요청. 프로필 추가를 하지 않고 삭제만 하는 경우', async () => {
			const originalThumbnail = (await Member.findOne({ where: { id: SAVE_MEMBER.id } })).profile;
			const { accessToken, refreshToken, ino } = await createTestToken(SAVE_MEMBER.userId);
			const res = await request(app)
						.patch('/api/member/profile')
						.set('Cookie', [
							`Authorization=${accessToken}`,
							`Authorization_Refresh=${refreshToken}`,
							`Authorization_ino=${ino}`,
						])
						.field('nickname', patchData.nickname)
						.field('email', patchData.email)
						.field('deleteProfile', originalThumbnail);

			const patchMember = await Member.findOne({ where: { id: SAVE_MEMBER.id } });

			expect(res.status).toBe(ResponseStatusCode.OK);
			expect(patchMember.nickname).toBe(patchData.nickname);
			expect(patchMember.email).toBe(patchData.email);
			expect(patchMember.profile).toBe(null);

			expect(profileResize).not.toHaveBeenCalled();
			expect(deleteImageFile).toHaveBeenCalledWith(originalThumbnail, ImageConstants.PROFILE_TYPE);
		});
	});

	describe('GET /profile', () => {
		beforeEach(async () => {
			await Member.create(SAVE_MEMBER);

			await Auth.create({
				userId: SAVE_MEMBER.id,
				auth: 'ROLE_MEMBER',
			});
		});

		it('회원 정보 조회 요청.', async () => {
			const { accessToken, refreshToken, ino } = await createTestToken(SAVE_MEMBER.userId);
			const res = await request(app)
						.get('/api/member/profile')
						.set('Cookie', [
							`Authorization=${accessToken}`,
							`Authorization_Refresh=${refreshToken}`,
							`Authorization_ino=${ino}`,
						]);

			const splitMail = SAVE_MEMBER.email.split('@');
			const suffix = splitMail[1].substring(0, splitMail[1].indexOf('.'));
			const type = findSuffixType(suffix);

			expect(res.status).toBe(ResponseStatusCode.OK);
			expect(res.body.content.nickname).toBe(SAVE_MEMBER.nickname);
			expect(res.body.content.mailPrefix).toBe(splitMail[0]);
			expect(res.body.content.mailSuffix).toBe(splitMail[1]);
			expect(res.body.content.mailType).toBe(type);
			expect(res.body.content.profile).toBe(SAVE_MEMBER.profile);
		});
	})
})

const checkClearCookieExpires = (cookies) => {
	const cookieNames = [jwtConfig.accessHeader, jwtConfig.refreshHeader, jwtConfig.inoHeader];
	cookieNames.forEach(cookieName => {
		const cookie = cookies.find(cookie => cookie.startsWith(`${cookieName}=`));
		expect(cookie).toBeDefined();
		expect(cookie).toMatch(/Expires=Thu, 01 Jan 1970 00:00:00 GMT/);
	});	
}

const checkSecurityFromCookies = (cookies) => {
	const cookieNames = [jwtConfig.accessHeader, jwtConfig.refreshHeader, jwtConfig.inoHeader];
	cookieNames.forEach(cookieName => {
		const cookie = cookies.find(cookie => cookie.startsWith(`${cookieName}=`));
		expect(cookie).toBeDefined();
		expect(cookie).toMatch(/HttpOnly/);
		expect(cookie).toMatch(/Secure/);
		expect(cookie).toMatch(/SameSite=Strict/);
	});
}