import CustomError from '#errors/customError.js';
import { ResponseStatusCode, ResponseStatus } from '#constants/responseStatus.js';
import { sequelize, Board, Member, Auth } from '#models/index.js';
import request from 'supertest';
import { createTestToken } from '../../../utils/testTokenUtils.js';
import { initRedis, closeRedis } from '#config/redisConfig.js';
import { redisClient } from '#config/redisConfig.js';
import app from '#src/app.js';

const SAVE_MEMBER = [
	{
		userId: 'tester',
		userPw: 'tester1234',
		userName: 'testerName',
		nickName: 'testerNickName',
		email: 'tester@tester.com',
		profileThumbnail: 'testerProfileThumbnail.jpg',
		provider: 'local',
	},
	{
		userId: 'tester2',
		userPw: 'tester1234',
		userName: 'testerName2',
		nickName: 'testerNickName2',
		email: 'tester2@tester.com',
		profileThumbnail: 'testerProfileThumbnail2.jpg',
		provider: 'local',
	}
]

const BOARD_AMOUNT = 20;
const BOARD_TOTAL_ELEMENTS = 30;
const DEFAULT_USER_ID = SAVE_MEMBER[0].userId;
const WRONG_USER_ID = SAVE_MEMBER[1].userId;

describe('boardRoutes integration test', () => {
	beforeAll(async () => {
		await initRedis();
		await sequelize.authenticate();
		await sequelize.sync({ force: true });

		for(const member of SAVE_MEMBER) {
			await Member.create({
				userId: member.userId,
				userPw: member.userPw,
				userName: member.userName,
				nickName: member.nickName,
				email: member.email,
				profileThumbnail: member.profileThumbnail,
				provider: member.provider,
			});

			await Auth.create({
				userId: member.userId,
				auth: 'ROLE_MEMBER',
			});
		}
	});

	afterAll(async () => {
		await Auth.destroy({ where: {} });
		await Member.destroy({ where: {} });
		await sequelize.close();
		await closeRedis();
	});
	
	afterEach(async () => {
		await Board.destroy({ where: {} });
		await redisClient.flushAll();
	});

	beforeEach(async () => {
		for(let i = 1; i <= BOARD_TOTAL_ELEMENTS; i++) {
			await Board.create({
				boardNo: i,
				userId: DEFAULT_USER_ID,
				boardTitle: `testTitle${i}`,
				boardContent: `testContent${i}`,
				boardGroupNo: i,
				boardUpperNo: i.toString(),
				boardIndent: 1,
			});
		}
	});

	describe('GET /', () => {
		it('목록 정상 조회', async () => {
			const res = await request(app)
			.get('/board');
			
			expect(res.status).toBe(ResponseStatusCode.OK);
			expect(res.body.content.length).toBe(BOARD_AMOUNT);
			expect(res.body.empty).toBe(false);
			expect(res.body.totalElements).toBe(BOARD_TOTAL_ELEMENTS);
			expect(res.body.userStatus.loggedIn).toBe(false);
			expect(res.body.userStatus.uid).toBeUndefined();
		});

		it('목록 정상 조회. 로그인한 경우', async () => {
			const { accessToken, refreshToken, ino } = await createTestToken(DEFAULT_USER_ID);
			const res = await request(app)
								.get('/board')
								.set('Cookie', [
									`Authorization=${accessToken}`,
									`Authorization_Refresh=${refreshToken}`,
									`Authorization_ino=${ino}`,
								]);

			expect(res.status).toBe(ResponseStatusCode.OK);
			expect(res.body.content.length).toBe(BOARD_AMOUNT);
			expect(res.body.empty).toBe(false);
			expect(res.body.totalElements).toBe(BOARD_TOTAL_ELEMENTS);
			expect(res.body.userStatus.loggedIn).toBe(true);
			expect(res.body.userStatus.uid).toBe(DEFAULT_USER_ID);
		});

		it('목록 정상 조회. 검색어 적용', async () => {
			const res = await request(app)
								.get('/board')
								.query({
									keyword: 'testTitle11',
									searchType: 't',
								});

			expect(res.status).toBe(ResponseStatusCode.OK);
			expect(res.body.content.length).toBe(1);
			expect(res.body.empty).toBe(false);
			expect(res.body.totalElements).toBe(1);
			expect(res.body.userStatus.loggedIn).toBe(false);
			expect(res.body.userStatus.uid).toBeUndefined();

			const resultData = res.body.content[0];
			expect(resultData.boardNo).toBe(11);
			expect(resultData.boardTitle).toBe('testTitle11');
			expect(resultData.userId).toBe(DEFAULT_USER_ID);
			expect(resultData.boardDate).toBeDefined();
			expect(resultData.boardIndent).toBe(1);
			expect(resultData.boardGroupNo).toBeUndefined();
			expect(resultData.boardUpperNo).toBeUndefined();
		});

		it('검색어 적용. 검색어가 1글자로 짧은 경우', async () => {
			const res = await request(app)
								.get('/board')
								.query({
									keyword: 't',
									searchType: 't',
								});

			expect(res.status).toBe(ResponseStatusCode.BAD_REQUEST);
			expect(res.body.message).toBe(ResponseStatus.BAD_REQUEST.MESSAGE);
		});

		it('검색어 적용. 검색 타입이 잘못 된 경우', async () => {
			const res = await request(app)
								.get('/board')
								.query({
									keyword: 'title',
									searchType: 'abc',
								});

			expect(res.status).toBe(ResponseStatusCode.BAD_REQUEST);
			expect(res.body.message).toBe(ResponseStatus.BAD_REQUEST.MESSAGE);
		});

		it('검색어 적용. 페이지 번호가 잘못 된 경우', async () => {
			const res = await request(app)
								.get('/board')
								.query({
									keyword: 'title',
									searchType: 't',
									pageNum: 'abc',
								});

			expect(res.status).toBe(ResponseStatusCode.BAD_REQUEST);
			expect(res.body.message).toBe(ResponseStatus.BAD_REQUEST.MESSAGE);
		});

		it('데이터가 없는 경우', async () => {
			await Board.destroy({ where: {} });

			const res = await request(app)
								.get('/board');

			expect(res.status).toBe(ResponseStatusCode.OK);
			expect(res.body.content.length).toBe(0);
			expect(res.body.empty).toBe(true);
			expect(res.body.totalElements).toBe(0);
			expect(res.body.userStatus.loggedIn).toBe(false);
			expect(res.body.userStatus.uid).toBeUndefined();
		})
	});

	describe('GET /:boardNo', () => {
		it('정상 조회', async () => {
			const res = await request(app)
								.get('/board/1');

			expect(res.status).toBe(ResponseStatusCode.OK);
			expect(res.body.content.boardNo).toBe(1);
			expect(res.body.content.boardTitle).toBe('testTitle1');
			expect(res.body.content.boardContent).toBe('testContent1');
			expect(res.body.content.userId).toBe(DEFAULT_USER_ID);
			expect(res.body.content.boardDate).toBeDefined();
			expect(res.body.content.boardIndent).toBeUndefined();
			expect(res.body.content.boardGroupNo).toBeUndefined();
			expect(res.body.content.boardUpperNo).toBeUndefined();
			expect(res.body.userStatus.loggedIn).toBe(false);
			expect(res.body.userStatus.uid).toBeUndefined();
		});

		it('정상 조회. 로그인한 경우', async () => {
			const { accessToken, refreshToken, ino } = await createTestToken(DEFAULT_USER_ID);
			const res = await request(app)
								.get('/board/1')
								.set('Cookie', [
									`Authorization=${accessToken}`,
									`Authorization_Refresh=${refreshToken}`,
									`Authorization_ino=${ino}`,
								]);

			expect(res.status).toBe(ResponseStatusCode.OK);
			expect(res.body.content.boardNo).toBe(1);
			expect(res.body.content.boardTitle).toBe('testTitle1');
			expect(res.body.content.boardContent).toBe('testContent1');
			expect(res.body.content.userId).toBe(DEFAULT_USER_ID);
			expect(res.body.content.boardDate).toBeDefined();
			expect(res.body.content.boardIndent).toBeUndefined();
			expect(res.body.content.boardGroupNo).toBeUndefined();
			expect(res.body.content.boardUpperNo).toBeUndefined();
			expect(res.body.userStatus.loggedIn).toBe(true);
			expect(res.body.userStatus.uid).toBe(DEFAULT_USER_ID);
		});

		it('잘못된 아이디 전달로 데이터가 없는 경우', async () => {
			const res = await request(app)
								.get('/board/0');

			expect(res.status).toBe(ResponseStatusCode.NOT_FOUND);
			expect(res.body.message).toBe(ResponseStatus.NOT_FOUND.MESSAGE);
		});
	});
});