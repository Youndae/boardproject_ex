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
		id: 1,
		userId: 'tester',
		password: 'tester1234',
		username: 'testerName',
		nickname: 'testerNickName',
		email: 'tester@tester.com',
		profile: 'testerProfileThumbnail.jpg',
		provider: 'local',
	},
	{
		id: 2,
		userId: 'tester2',
		password: 'tester1234',
		username: 'testerName2',
		nickname: 'testerNickName2',
		email: 'tester2@tester.com',
		profile: 'testerProfileThumbnail2.jpg',
		provider: 'local',
	}
]

const BOARD_AMOUNT = 20;
const BOARD_TOTAL_ELEMENTS = 30;
const DEFAULT_USER_ID = SAVE_MEMBER[0].id;
const WRONG_USER_ID = SAVE_MEMBER[1].id;

describe('boardRoutes integration test', () => {
	beforeAll(async () => {
		await initRedis();
		await sequelize.authenticate();
		await sequelize.sync({ force: true });

		for(const member of SAVE_MEMBER) {
			await Member.create({
				userId: member.userId,
				password: member.password,
				username: member.username,
				nickname: member.nickname,
				email: member.email,
				profile: member.profile,
				provider: member.provider,
			});

			await Auth.create({
				userId: member.id,
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
				id: i,
				userId: DEFAULT_USER_ID,
				title: `testTitle${i}`,
				content: `testContent${i}`,
				groupNo: i,
				upperNo: i.toString(),
				indent: 0,
			});
		}
	});

	describe('GET /', () => {
		it('목록 정상 조회', async () => {
			const res = await request(app)
			.get('/api/board');
			
			expect(res.status).toBe(ResponseStatusCode.OK);
			expect(res.body.code).toBe(ResponseStatusCode.OK);
			expect(res.body.message).toBe(ResponseStatus.OK.MESSAGE);
			expect(res.body.content.items.length).toBe(BOARD_AMOUNT);
			expect(res.body.content.isEmpty).toBe(false);
			expect(res.body.content.totalPages).toBe(Math.ceil(BOARD_TOTAL_ELEMENTS / BOARD_AMOUNT));
			expect(res.body.content.currentPage).toBe(1);
			expect(res.body.timestamp).toBeDefined();
		});

		it('목록 정상 조회. 검색어 적용', async () => {
			const res = await request(app)
								.get('/api/board')
								.query({
									keyword: 'testTitle11',
									searchType: 't',
								});

			expect(res.status).toBe(ResponseStatusCode.OK);
			expect(res.body.code).toBe(ResponseStatusCode.OK);
			expect(res.body.message).toBe(ResponseStatus.OK.MESSAGE);
			expect(res.body.content.items.length).toBe(1);
			expect(res.body.content.isEmpty).toBe(false);
			expect(res.body.content.totalPages).toBe(1);
			expect(res.body.content.currentPage).toBe(1);
			expect(res.body.timestamp).toBeDefined();

			const resultData = res.body.content.items[0];
			expect(resultData.id).toBe(11);
			expect(resultData.title).toBe('testTitle11');
			expect(resultData.writer).toBe(SAVE_MEMBER[0].nickname);
			expect(resultData.createdAt).toBeDefined();
			expect(resultData.indent).toBe(0);
		});

		it('검색어 적용. 검색어가 1글자로 짧은 경우', async () => {
			const res = await request(app)
								.get('/api/board')
								.query({
									keyword: 't',
									searchType: 't',
								});

			expect(res.status).toBe(ResponseStatusCode.BAD_REQUEST);
			expect(res.body.message).toBe(ResponseStatus.BAD_REQUEST.MESSAGE);
		});

		it('검색어 적용. 검색 타입이 잘못 된 경우', async () => {
			const res = await request(app)
								.get('/api/board')
								.query({
									keyword: 'title',
									searchType: 'abc',
								});

			expect(res.status).toBe(ResponseStatusCode.BAD_REQUEST);
			expect(res.body.message).toBe(ResponseStatus.BAD_REQUEST.MESSAGE);
		});

		it('검색어 적용. 페이지 번호가 잘못 된 경우', async () => {
			const res = await request(app)
								.get('/api/board')
								.query({
									keyword: 'title',
									searchType: 't',
									page: 'abc',
								});

			expect(res.status).toBe(ResponseStatusCode.BAD_REQUEST);
			expect(res.body.message).toBe(ResponseStatus.BAD_REQUEST.MESSAGE);
		});

		it('데이터가 없는 경우', async () => {
			await Board.destroy({ where: {} });

			const res = await request(app)
								.get('/api/board');

			expect(res.status).toBe(ResponseStatusCode.OK);
			expect(res.body.content.items.length).toBe(0);
			expect(res.body.content.isEmpty).toBe(true);
			expect(res.body.content.totalPages).toBe(0);
			expect(res.body.content.currentPage).toBe(1);
		})
	});

	describe('GET /:boardNo', () => {
		it('정상 조회', async () => {
			const res = await request(app)
								.get('/api/board/1');

			expect(res.status).toBe(ResponseStatusCode.OK);
			expect(res.body.message).toBe(ResponseStatus.OK.MESSAGE);
			expect(res.body.content.id).toBeUndefined();
			expect(res.body.content.title).toBe('testTitle1');
			expect(res.body.content.content).toBe('testContent1');
			expect(res.body.content.writer).toBe(SAVE_MEMBER[0].nickname);
			expect(res.body.content.writerId).toBe(SAVE_MEMBER[0].userId);
			expect(res.body.content.createdAt).toBeDefined();
			expect(res.body.content.boardIndent).toBeUndefined();
			expect(res.body.content.boardGroupNo).toBeUndefined();
			expect(res.body.content.boardUpperNo).toBeUndefined();
			expect(res.body.timestamp).toBeDefined();
		});

		it('잘못된 아이디 전달로 데이터가 없는 경우', async () => {
			const res = await request(app)
								.get('/api/board/0');

			expect(res.status).toBe(ResponseStatusCode.BAD_REQUEST);
			expect(res.body.message).toBe(ResponseStatus.BAD_REQUEST.MESSAGE);
		});
	});

	describe('POST /', () => {
		it('정상 저장', async () => {
			await Board.destroy({ where: {} });
			const { accessToken, refreshToken, ino } = await createTestToken(SAVE_MEMBER[0].userId);
			const res = await request(app)
								.post('/api/board')
								.set('Cookie', [
									`Authorization=${accessToken}`,
									`Authorization_Refresh=${refreshToken}`,
									`Authorization_ino=${ino}`,
								])
								.send({
									title: 'testPostTitle',
									content: 'testPostContent',
								});

			expect(res.status).toBe(ResponseStatusCode.CREATED);
			expect(res.body.content).toBeDefined();

			const saveId = res.body.content;

			const saveBoard = await Board.findOne({ where: { id: saveId } });
			expect(saveBoard.title).toBe('testPostTitle');
			expect(saveBoard.content).toBe('testPostContent');
			expect(saveBoard.userId).toBe(DEFAULT_USER_ID);
			expect(saveBoard.createdAt).toBeDefined();
			expect(saveBoard.indent).toBe(0);
			expect(saveBoard.groupNo).toBe(saveId);
			expect(saveBoard.upperNo).toBe(saveId.toString());
		});

		it('비회원 접근', async () => {
			const res = await request(app)
								.post('/api/board')
								.send({
									title: 'testPostTitle',
									content: 'testPostContent',
								});
								
			expect(res.status).toBe(ResponseStatusCode.FORBIDDEN);
			expect(res.body.message).toBe(ResponseStatus.FORBIDDEN.MESSAGE);
		});

		it('제목이 비어있는 경우', async () => {
			const { accessToken, refreshToken, ino } = await createTestToken(SAVE_MEMBER[0].userId);
			const res = await request(app)
								.post('/api/board')
								.set('Cookie', [
									`Authorization=${accessToken}`,
									`Authorization_Refresh=${refreshToken}`,
									`Authorization_ino=${ino}`,
								])
								.send({
									title: '',
									content: 'testPostContent',
								});

			console.log('res', res.body);
								
			expect(res.status).toBe(ResponseStatusCode.BAD_REQUEST);
			expect(res.body.message).toBe(ResponseStatus.BAD_REQUEST.MESSAGE);
		});

		it('제목이 너무 긴 경우', async () => {
			const { accessToken, refreshToken, ino } = await createTestToken(SAVE_MEMBER[0].userId);
			const res = await request(app)
								.post('/api/board')
								.set('Cookie', [
									`Authorization=${accessToken}`,
									`Authorization_Refresh=${refreshToken}`,
									`Authorization_ino=${ino}`,
								])
								.send({
									title: 'testPostTitle'.repeat(100),
									content: 'testPostContent',
								});

			expect(res.status).toBe(ResponseStatusCode.BAD_REQUEST);
			expect(res.body.message).toBe(ResponseStatus.BAD_REQUEST.MESSAGE);
		});

		it('내용이 비어있는 경우', async () => {
			const { accessToken, refreshToken, ino } = await createTestToken(SAVE_MEMBER[0].userId);
			const res = await request(app)
								.post('/api/board')
								.set('Cookie', [
									`Authorization=${accessToken}`,
									`Authorization_Refresh=${refreshToken}`,
									`Authorization_ino=${ino}`,
								])
								.send({
									title: 'testPostTitle',
									content: '',
								});

			expect(res.status).toBe(ResponseStatusCode.BAD_REQUEST);
			expect(res.body.message).toBe(ResponseStatus.BAD_REQUEST.MESSAGE);
		});

		it('내용이 너무 긴 경우', async () => {
			const { accessToken, refreshToken, ino } = await createTestToken(SAVE_MEMBER[0].userId);
			const res = await request(app)
								.post('/api/board')
								.set('Cookie', [
									`Authorization=${accessToken}`,
									`Authorization_Refresh=${refreshToken}`,
									`Authorization_ino=${ino}`,
								])
								.send({
									boardTitle: 'testPostTitle',
									boardContent: 'testPostContent'.repeat(1000),
								});

			expect(res.status).toBe(ResponseStatusCode.BAD_REQUEST);
			expect(res.body.message).toBe(ResponseStatus.BAD_REQUEST.MESSAGE);
		});
	});

	describe('GET /patch/:id', () => {
		it('정상 조회', async () => {
			const { accessToken, refreshToken, ino } = await createTestToken(SAVE_MEMBER[0].userId);
			const res = await request(app)
								.get('/api/board/patch/1')
								.set('Cookie', [
									`Authorization=${accessToken}`,
									`Authorization_Refresh=${refreshToken}`,
									`Authorization_ino=${ino}`,
								]);

			expect(res.status).toBe(ResponseStatusCode.OK);
			expect(res.body.code).toBe(ResponseStatus.OK.CODE);
			expect(res.body.message).toBe(ResponseStatus.OK.MESSAGE);
			expect(res.body.content.id).toBeUndefined();
			expect(res.body.content.title).toBe('testTitle1');
			expect(res.body.content.content).toBe('testContent1');
			expect(res.body.content.userId).toBeUndefined();
			expect(res.body.content.createdAt).toBeUndefined();
			expect(res.body.content.indent).toBeUndefined();
			expect(res.body.content.groupNo).toBeUndefined();
			expect(res.body.content.upperNo).toBeUndefined();
		});

		it('비회원 접근', async () => {
			const res = await request(app)
								.get('/api/board/patch/1');
								
			expect(res.status).toBe(ResponseStatusCode.FORBIDDEN);
			expect(res.body.message).toBe(ResponseStatus.FORBIDDEN.MESSAGE);
		});

		it('데이터가 없는 경우', async () => {
			const { accessToken, refreshToken, ino } = await createTestToken(SAVE_MEMBER[0].userId);
			const res = await request(app)
								.get('/api/board/patch/0')
								.set('Cookie', [
									`Authorization=${accessToken}`,
									`Authorization_Refresh=${refreshToken}`,
									`Authorization_ino=${ino}`,
								]);
								
			expect(res.status).toBe(ResponseStatusCode.BAD_REQUEST);
			expect(res.body.message).toBe(ResponseStatus.BAD_REQUEST.MESSAGE);
		});

		it('작성자가 아닌 경우', async () => {
			const { accessToken, refreshToken, ino } = await createTestToken(SAVE_MEMBER[1].userId);
			const res = await request(app)
								.get('/api/board/patch/1')
								.set('Cookie', [
									`Authorization=${accessToken}`,
									`Authorization_Refresh=${refreshToken}`,
									`Authorization_ino=${ino}`,
								]);

			expect(res.status).toBe(ResponseStatusCode.FORBIDDEN);
			expect(res.body.message).toBe(ResponseStatus.FORBIDDEN.MESSAGE);
		});
	});

	describe('PATCH /:boardNo', () => {
		it('정상 수정', async () => {
			const { accessToken, refreshToken, ino } = await createTestToken(SAVE_MEMBER[0].userId);
			const res = await request(app)
								.patch('/api/board/1')
								.set('Cookie', [
									`Authorization=${accessToken}`,
									`Authorization_Refresh=${refreshToken}`,
									`Authorization_ino=${ino}`,
								])
								.send({
									title: 'testUpdateTitle',
									content: 'testUpdateContent',
								});

			const patchId = 1;

			expect(res.status).toBe(ResponseStatusCode.OK);
			expect(res.body.code).toBe(ResponseStatus.OK.CODE);
			expect(res.body.message).toBe(ResponseStatus.OK.MESSAGE);
			expect(res.body.content).toBe(patchId);



			const updateBoard = await Board.findOne({ where: { id: patchId } });
			expect(updateBoard.title).toBe('testUpdateTitle');
			expect(updateBoard.content).toBe('testUpdateContent');
			expect(updateBoard.userId).toBe(SAVE_MEMBER[0].id);
			expect(updateBoard.createdAt).toBeDefined();
			expect(updateBoard.indent).toBe(0);
			expect(updateBoard.groupNo).toBe(1);
			expect(updateBoard.upperNo).toBe('1');
		});

		it('비회원 접근', async () => {
			const res = await request(app)
								.patch('/api/board/1')
								.send({
									title: 'testUpdateTitle',
									content: 'testUpdateContent',
								});

			expect(res.status).toBe(ResponseStatusCode.FORBIDDEN);
			expect(res.body.message).toBe(ResponseStatus.FORBIDDEN.MESSAGE);
		});

		it('제목이 비어있는 경우', async () => {
			const { accessToken, refreshToken, ino } = await createTestToken(SAVE_MEMBER[0].userId);
			const res = await request(app)
								.patch('/api/board/1')
								.set('Cookie', [
									`Authorization=${accessToken}`,
									`Authorization_Refresh=${refreshToken}`,
									`Authorization_ino=${ino}`,
								])
								.send({
									title: '',
									content: 'testUpdateContent',
								});

			expect(res.status).toBe(ResponseStatusCode.BAD_REQUEST);
			expect(res.body.message).toBe(ResponseStatus.BAD_REQUEST.MESSAGE);
		});

		it('제목이 너무 긴 경우', async () => {
			const { accessToken, refreshToken, ino } = await createTestToken(SAVE_MEMBER[0].userId);
			const res = await request(app)
								.patch('/api/board/1')
								.set('Cookie', [
									`Authorization=${accessToken}`,
									`Authorization_Refresh=${refreshToken}`,
									`Authorization_ino=${ino}`,
								])
								.send({
									title: 'testUpdateTitle'.repeat(100),
									content: 'testUpdateContent',
								});

			expect(res.status).toBe(ResponseStatusCode.BAD_REQUEST);
			expect(res.body.message).toBe(ResponseStatus.BAD_REQUEST.MESSAGE);
		});

		it('내용이 비어있는 경우', async () => {
			const { accessToken, refreshToken, ino } = await createTestToken(SAVE_MEMBER[0].userId);
			const res = await request(app)
								.patch('/api/board/1')
								.set('Cookie', [
									`Authorization=${accessToken}`,
									`Authorization_Refresh=${refreshToken}`,
									`Authorization_ino=${ino}`,
								])
								.send({
									title: 'testUpdateTitle',
									content: '',
								});

			expect(res.status).toBe(ResponseStatusCode.BAD_REQUEST);
			expect(res.body.message).toBe(ResponseStatus.BAD_REQUEST.MESSAGE);
		});

		it('내용이 너무 긴 경우', async () => {
			const { accessToken, refreshToken, ino } = await createTestToken(SAVE_MEMBER[0].userId);
			const res = await request(app)
								.patch('/api/board/1')
								.set('Cookie', [
									`Authorization=${accessToken}`,
									`Authorization_Refresh=${refreshToken}`,
									`Authorization_ino=${ino}`,
								])
								.send({
									title: 'testUpdateTitle',
									content: 'testUpdateContent'.repeat(1000),
								});

			expect(res.status).toBe(ResponseStatusCode.BAD_REQUEST);
			expect(res.body.message).toBe(ResponseStatus.BAD_REQUEST.MESSAGE);
		});

		it('작성자가 아닌 경우', async () => {
			const { accessToken, refreshToken, ino } = await createTestToken(SAVE_MEMBER[1].userId);
			const res = await request(app)
								.patch('/api/board/1')
								.set('Cookie', [
									`Authorization=${accessToken}`,
									`Authorization_Refresh=${refreshToken}`,
									`Authorization_ino=${ino}`,
								])
								.send({
									title: 'testUpdateTitle',
									content: 'testUpdateContent',
								});

			expect(res.status).toBe(ResponseStatusCode.FORBIDDEN);
			expect(res.body.message).toBe(ResponseStatus.FORBIDDEN.MESSAGE);
		});

		it('데이터가 없는 경우', async () => {
			const { accessToken, refreshToken, ino } = await createTestToken(SAVE_MEMBER[0].userId);
			const res = await request(app)
								.patch('/api/board/0')
								.set('Cookie', [
									`Authorization=${accessToken}`,
									`Authorization_Refresh=${refreshToken}`,
									`Authorization_ino=${ino}`,
								])
								.send({
									title: 'testUpdateTitle',
									content: 'testUpdateContent',
								});

			expect(res.status).toBe(ResponseStatusCode.BAD_REQUEST);
			expect(res.body.message).toBe(ResponseStatus.BAD_REQUEST.MESSAGE);
		});
	});

	describe('DELETE /:boardNo', () => {
		it('정상 삭제', async () => {
			const { accessToken, refreshToken, ino } = await createTestToken(SAVE_MEMBER[0].userId);
			const res = await request(app)
								.delete('/api/board/1')
								.set('Cookie', [
									`Authorization=${accessToken}`,
									`Authorization_Refresh=${refreshToken}`,
									`Authorization_ino=${ino}`,
								]);

			expect(res.status).toBe(ResponseStatusCode.NO_CONTENT);

			const deleteBoard = await Board.findOne({ where: { id: 1 } });
			expect(deleteBoard).toBeNull();
		});

		it('비회원 접근', async () => {
			const res = await request(app)
								.delete('/api/board/1');
								
			expect(res.status).toBe(ResponseStatusCode.FORBIDDEN);
			expect(res.body.message).toBe(ResponseStatus.FORBIDDEN.MESSAGE);
		});

		it('작성자가 아닌 경우', async () => {
			const { accessToken, refreshToken, ino } = await createTestToken(SAVE_MEMBER[1].userId);
			const res = await request(app)
								.delete('/api/board/1')
								.set('Cookie', [
									`Authorization=${accessToken}`,
									`Authorization_Refresh=${refreshToken}`,
									`Authorization_ino=${ino}`,
								]);

			expect(res.status).toBe(ResponseStatusCode.FORBIDDEN);
			expect(res.body.message).toBe(ResponseStatus.FORBIDDEN.MESSAGE);
		});

		it('데이터가 없는 경우', async () => {
			const { accessToken, refreshToken, ino } = await createTestToken(SAVE_MEMBER[0].userId);
			const res = await request(app)
								.delete('/api/board/0')
								.set('Cookie', [
									`Authorization=${accessToken}`,
									`Authorization_Refresh=${refreshToken}`,
									`Authorization_ino=${ino}`,
								]);

			expect(res.status).toBe(ResponseStatusCode.BAD_REQUEST);
			expect(res.body.message).toBe(ResponseStatus.BAD_REQUEST.MESSAGE);
		});
	});

	describe('GET /reply/:id', () => {
		it('정상 조회', async () => {
			const { accessToken, refreshToken, ino } = await createTestToken(SAVE_MEMBER[0].userId);
			const res = await request(app)
								.get('/api/board/reply/1')
								.set('Cookie', [
									`Authorization=${accessToken}`,
									`Authorization_Refresh=${refreshToken}`,
									`Authorization_ino=${ino}`,
								]);

			expect(res.status).toBe(ResponseStatusCode.OK);
			expect(res.body.code).toBe(ResponseStatus.OK.CODE);
			expect(res.body.message).toBe(ResponseStatus.OK.MESSAGE);
		});

		it('비회원 접근', async () => {
			const res = await request(app)
								.get('/api/board/reply/1');
								
			expect(res.status).toBe(ResponseStatusCode.FORBIDDEN);
			expect(res.body.message).toBe(ResponseStatus.FORBIDDEN.MESSAGE);
		});

		it('데이터가 없는 경우', async () => {
			const { accessToken, refreshToken, ino } = await createTestToken(SAVE_MEMBER[0].userId);
			const res = await request(app)
								.get('/api/board/reply/0')
								.set('Cookie', [
									`Authorization=${accessToken}`,
									`Authorization_Refresh=${refreshToken}`,
									`Authorization_ino=${ino}`,
								]);

			expect(res.status).toBe(ResponseStatusCode.BAD_REQUEST);
			expect(res.body.message).toBe(ResponseStatus.BAD_REQUEST.MESSAGE);
		});
	});

	describe('POST /reply/:id', () => {
		it('정상 저장', async () => {
			const { accessToken, refreshToken, ino } = await createTestToken(SAVE_MEMBER[0].userId);
			const res = await request(app)
								.post('/api/board/reply/1')
								.set('Cookie', [
									`Authorization=${accessToken}`,
									`Authorization_Refresh=${refreshToken}`,
									`Authorization_ino=${ino}`,
								])
								.send({
									title: 'testReplyTitle',
									content: 'testReplyContent',
								});

			expect(res.status).toBe(ResponseStatusCode.CREATED);
			expect(res.body.code).toBe(ResponseStatus.CREATED.CODE);
			expect(res.body.message).toBe(ResponseStatus.CREATED.MESSAGE);
			expect(res.body.content).toBeDefined();

			const saveId = res.body.content;

			const saveReply = await Board.findOne({ where: { id: saveId } });
			expect(saveReply.title).toBe('testReplyTitle');
			expect(saveReply.content).toBe('testReplyContent');
			expect(saveReply.userId).toBe(SAVE_MEMBER[0].id);
			expect(saveReply.createdAt).toBeDefined();
			expect(saveReply.indent).toBe(1);
			expect(saveReply.groupNo).toBe(1);
			expect(saveReply.upperNo).toBe(`1,${saveId}`);
		});

		it('비회원 접근', async () => {
			const res = await request(app)
								.post('/api/board/reply/1')
								.send({
									title: 'testReplyTitle',
									content: 'testReplyContent',
								});

			expect(res.status).toBe(ResponseStatusCode.FORBIDDEN);
			expect(res.body.message).toBe(ResponseStatus.FORBIDDEN.MESSAGE);
		});

		it('제목이 비어있는 경우', async () => {
			const { accessToken, refreshToken, ino } = await createTestToken(SAVE_MEMBER[0].userId);
			const res = await request(app)
								.post('/api/board/reply/1')
								.set('Cookie', [
									`Authorization=${accessToken}`,
									`Authorization_Refresh=${refreshToken}`,
									`Authorization_ino=${ino}`,
								])
								.send({
									title: '',
									content: 'testReplyContent',
								});

			expect(res.status).toBe(ResponseStatusCode.BAD_REQUEST);
			expect(res.body.message).toBe(ResponseStatus.BAD_REQUEST.MESSAGE);
		});

		it('제목이 너무 긴 경우', async () => {
			const { accessToken, refreshToken, ino } = await createTestToken(SAVE_MEMBER[0].userId);
			const res = await request(app)
								.post('/api/board/reply/1')
								.set('Cookie', [
									`Authorization=${accessToken}`,
									`Authorization_Refresh=${refreshToken}`,
									`Authorization_ino=${ino}`,
								])
								.send({
									title: 'testReplyTitle'.repeat(100),
									content: 'testReplyContent',
								});

			expect(res.status).toBe(ResponseStatusCode.BAD_REQUEST);
			expect(res.body.message).toBe(ResponseStatus.BAD_REQUEST.MESSAGE);
		});

		it('내용이 비어있는 경우', async () => {
			const { accessToken, refreshToken, ino } = await createTestToken(SAVE_MEMBER[0].userId);
			const res = await request(app)
								.post('/api/board/reply/1')
								.set('Cookie', [
									`Authorization=${accessToken}`,
									`Authorization_Refresh=${refreshToken}`,
									`Authorization_ino=${ino}`,
								])
								.send({
									title: 'testReplyTitle',
									content: '',
								});

			expect(res.status).toBe(ResponseStatusCode.BAD_REQUEST);
			expect(res.body.message).toBe(ResponseStatus.BAD_REQUEST.MESSAGE);
		});

		it('내용이 너무 긴 경우', async () => {
			const { accessToken, refreshToken, ino } = await createTestToken(SAVE_MEMBER[0].userId);
			const res = await request(app)
								.post('/api/board/reply/1')
								.set('Cookie', [
									`Authorization=${accessToken}`,
									`Authorization_Refresh=${refreshToken}`,
									`Authorization_ino=${ino}`,
								])
								.send({
									title: 'testReplyTitle',
									content: 'testReplyContent'.repeat(1000),
								});

			expect(res.status).toBe(ResponseStatusCode.BAD_REQUEST);
			expect(res.body.message).toBe(ResponseStatus.BAD_REQUEST.MESSAGE);
		});
	});
});