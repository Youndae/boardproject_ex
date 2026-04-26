import { ResponseStatus, ResponseStatusCode } from '#constants/responseStatus.js';
import { sequelize, Comment, Member, Auth, Board, ImageBoard } from '#models/index.js';
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
		profile: 'testerProfile.jpg',
		provider: 'local',
	},
	{
		id: 2,
		userId: 'tester2',
		password: 'tester1234',
		username: 'testerName2',
		nickname: 'testerNickName2',
		email: 'tester2@tester.com',
		profile: 'testerProfile2.jpg',
		provider: 'local',
	}
]

const DEFAULT_USER_ID = SAVE_MEMBER[0].userId;
const WRONG_USER_ID = SAVE_MEMBER[1].userId;
const COMMENT_TYPE_TOTAL_ELEMENTS = 30;
const COMMENT_AMOUNT = 20;

describe('commentRoutes integration test', () => {
	beforeAll(async () => {
		await initRedis();
		await sequelize.authenticate();
		await sequelize.sync({ force: true });

		for(const member of SAVE_MEMBER) {
			await Member.create(member);

			await Auth.create({
				userId: member.id,
				auth: 'ROLE_MEMBER',
			});
		}

		await Board.create({
			id: 1,
			userId: SAVE_MEMBER[0].id,
			title: `testTitle1`,
			content: `testContent1`,
			groupNo: 1,
			upperNo: `1`,
			indent: 1,
		});

		await ImageBoard.create({
			id: 1,
			userId: SAVE_MEMBER[0].id,
			title: `testTitle1`,
			content: `testContent1`,
			createdAt: new Date(),
		});
	});

	afterAll(async () => {
		await Board.destroy({ where: {} });
		await ImageBoard.destroy({ where: {} });
		await Auth.destroy({ where: {} });
		await Member.destroy({ where: {} });
		await sequelize.close();
		await closeRedis();
	});

	beforeEach(async () => {
		for(let i = 1; i <= COMMENT_TYPE_TOTAL_ELEMENTS; i++) {
			await Comment.create({
				id: i,
				boardId: 1,
				imageId: null,
				userId: SAVE_MEMBER[0].id,
				content: `testCommentContent${i}`,
				createdAt: new Date(),
				groupNo: i,
				indent: 0,
				upperNo: `${i}`,
			});

			const imageCommentNo = i + COMMENT_TYPE_TOTAL_ELEMENTS;

			await Comment.create({
				id: imageCommentNo,
				boardId: null,
				imageId: 1,
				userId: SAVE_MEMBER[0].id,
				content: `testCommentContent${imageCommentNo}`,
				createdAt: new Date(),
				groupNo: imageCommentNo,
				indent: 0,
				upperNo: `${imageCommentNo}`,
			});
		}
	});

	afterEach(async () => {
		await Comment.destroy({
			where: {},
			force: true
		});
	});

	describe('GET /board', () => {
		it('정상 처리.', async () => {
			const response = await request(app)
								.get('/api/comment/board')
								.query({
									id: 1,
									page: 1,
								});

			expect(response.status).toBe(ResponseStatusCode.OK);
			expect(response.body.content.items.length).toBe(COMMENT_AMOUNT);
			expect(response.body.content.isEmpty).toBe(false);
			expect(response.body.content.totalPages).toBe(Math.ceil(COMMENT_TYPE_TOTAL_ELEMENTS / COMMENT_AMOUNT));
			expect(response.body.content.currentPage).toBe(1);

			response.body.content.items.forEach((item) => {
				expect(item.id).toBeLessThanOrEqual(COMMENT_TYPE_TOTAL_ELEMENTS);
				expect(item.writer).toBe(SAVE_MEMBER[0].nickname);
				expect(item.writerId).toBe(SAVE_MEMBER[0].userId);
				expect(item.createdAt).toBeDefined();
				expect(item.content).toBeDefined();
				expect(item.groupNo).toBeUndefined();
				expect(item.indent).toBeDefined();
				expect(item.upperNo).toBeUndefined();
				expect(item.boardId).toBeUndefined();
				expect(item.imageId).toBeUndefined();
			});
		});

		it('정상 처리. 로그인한 경우', async () => {
			const { accessToken, refreshToken, ino } = await createTestToken(DEFAULT_USER_ID);
			const response = await request(app)
								.get('/api/comment/board')
								.query({
									id: 1,
									page: 1,
								})
								.set('Cookie', [
									`Authorization=${accessToken}`,
									`Authorization_Refresh=${refreshToken}`,
									`Authorization_ino=${ino}`,
								]);

			expect(response.status).toBe(ResponseStatusCode.OK);
			expect(response.body.content.items.length).toBe(COMMENT_AMOUNT);
			expect(response.body.content.isEmpty).toBe(false);
			expect(response.body.content.totalPages).toBe(Math.ceil(COMMENT_TYPE_TOTAL_ELEMENTS / COMMENT_AMOUNT));
			expect(response.body.content.currentPage).toBe(1);

			response.body.content.items.forEach((item) => {
				expect(item.id).toBeLessThanOrEqual(COMMENT_TYPE_TOTAL_ELEMENTS);
				expect(item.writer).toBe(SAVE_MEMBER[0].nickname);
				expect(item.writerId).toBe(SAVE_MEMBER[0].userId);
				expect(item.createdAt).toBeDefined();
				expect(item.content).toBeDefined();
				expect(item.groupNo).toBeUndefined();
				expect(item.indent).toBeDefined();
				expect(item.upperNo).toBeUndefined();
				expect(item.boardId).toBeUndefined();
				expect(item.imageId).toBeUndefined();
			});
		});

		it('정상 처리. 데이터가 없는 경우.', async () => {
			const response = await request(app)
								.get('/api/comment/board')
								.query({
									id: 999999,
									page: 1,
								});

			expect(response.status).toBe(ResponseStatusCode.OK);
			expect(response.body.content.items.length).toBe(0);
			expect(response.body.content.isEmpty).toBe(true);
			expect(response.body.content.totalPages).toBe(0);
			expect(response.body.content.currentPage).toBe(1);
		});
	});

	describe('GET /image', () => {
		it('정상 처리.', async () => {
			const response = await request(app)
								.get('/api/comment/image-board')
								.query({
									id: 1,
									page: 1,
								});

			expect(response.status).toBe(ResponseStatusCode.OK);
			expect(response.body.content.items.length).toBe(COMMENT_AMOUNT);
			expect(response.body.content.isEmpty).toBe(false);
			expect(response.body.content.totalPages).toBe(Math.ceil(COMMENT_TYPE_TOTAL_ELEMENTS / COMMENT_AMOUNT));
			expect(response.body.content.currentPage).toBe(1);

			response.body.content.items.forEach((item) => {
				expect(item.id).toBeGreaterThanOrEqual(COMMENT_TYPE_TOTAL_ELEMENTS);
				expect(item.writer).toBe(SAVE_MEMBER[0].nickname);
				expect(item.writerId).toBe(SAVE_MEMBER[0].userId);
				expect(item.createdAt).toBeDefined();
				expect(item.content).toBeDefined();
				expect(item.groupNo).toBeUndefined();
				expect(item.indent).toBeDefined();
				expect(item.upperNo).toBeUndefined();
				expect(item.boardId).toBeUndefined();
				expect(item.imageId).toBeUndefined();
			});
		});

		it('정상 처리. 데이터가 없는 경우.', async () => {
			const response = await request(app)
				.get('/api/comment/image-board')
				.query({
					id: 999999,
					page: 1,
				});

			expect(response.status).toBe(ResponseStatusCode.OK);
			expect(response.body.content.items.length).toBe(0);
			expect(response.body.content.isEmpty).toBe(true);
			expect(response.body.content.totalPages).toBe(0);
			expect(response.body.content.currentPage).toBe(1);
		});
	});

	describe('POST /board/:targetBoardId', () => {
		it('정상 처리.', async () => {
			await Comment.destroy({ where: {}, force: true });
			const { accessToken, refreshToken, ino } = await createTestToken(DEFAULT_USER_ID);
			const response = await request(app)
								.post('/api/comment/board/1')
								.send({
									content: 'testCommentContent',
								})
								.set('Cookie', [
									`Authorization=${accessToken}`,
									`Authorization_Refresh=${refreshToken}`,
									`Authorization_ino=${ino}`,
								]);

			expect(response.status).toBe(ResponseStatusCode.CREATED);
			
			const saveComment = await Comment.findAll({ where: {} });

			expect(saveComment.length).toBe(1);
			const saveCommentData = saveComment[0];

			expect(saveCommentData.boardId).toBe(1);
			expect(saveCommentData.imageId).toBeNull();
			expect(saveCommentData.userId).toBe(SAVE_MEMBER[0].id);
			expect(saveCommentData.content).toBe('testCommentContent');
			expect(saveCommentData.groupNo).toBe(saveCommentData.id);
			expect(saveCommentData.indent).toBe(0);
			expect(saveCommentData.upperNo).toBe(`${saveCommentData.id}`);
		});

		it('비회원 접근', async () => {
			const response = await request(app)
								.post('/api/comment/board/1')
								.send({
									content: 'testCommentContent',
								});

			expect(response.status).toBe(ResponseStatusCode.FORBIDDEN);
			expect(response.body.message).toBe(ResponseStatus.FORBIDDEN.MESSAGE);
		});

		it('댓글 내용이 없는 경우', async () => {
			const { accessToken, refreshToken, ino } = await createTestToken(DEFAULT_USER_ID);
			const response = await request(app)
								.post('/api/comment/board/1')
								.send({
									content: '',
								})
								.set('Cookie', [
									`Authorization=${accessToken}`,
									`Authorization_Refresh=${refreshToken}`,
									`Authorization_ino=${ino}`,
								]);

			expect(response.status).toBe(ResponseStatusCode.BAD_REQUEST);
			expect(response.body.message).toBe(ResponseStatus.BAD_REQUEST.MESSAGE);
		});

		it('댓글 내용이 너무 긴 경우', async () => {
			const { accessToken, refreshToken, ino } = await createTestToken(DEFAULT_USER_ID);
			const response = await request(app)
								.post('/api/comment/board/1')
								.send({
									content: 'testCommentContent'.repeat(1000),
								})
								.set('Cookie', [
									`Authorization=${accessToken}`,
									`Authorization_Refresh=${refreshToken}`,
									`Authorization_ino=${ino}`,
								]);

			expect(response.status).toBe(ResponseStatusCode.BAD_REQUEST);
			expect(response.body.message).toBe(ResponseStatus.BAD_REQUEST.MESSAGE);
		});
	});

	describe('POST /image-board/:targetBoardId', () => {
		it('정상 처리.', async () => {
			await Comment.destroy({ where: {}, force: true });
			const { accessToken, refreshToken, ino } = await createTestToken(DEFAULT_USER_ID);
			const response = await request(app)
								.post('/api/comment/image-board/1')
								.send({
									content: 'testCommentContent',
								})
								.set('Cookie', [
									`Authorization=${accessToken}`,
									`Authorization_Refresh=${refreshToken}`,
									`Authorization_ino=${ino}`,
								]);

			expect(response.status).toBe(ResponseStatusCode.CREATED);

			const saveComment = await Comment.findAll({ where: {} });

			expect(saveComment.length).toBe(1);
			const saveCommentData = saveComment[0];

			expect(saveCommentData.boardId).toBeNull();
			expect(saveCommentData.imageId).toBe(1);
			expect(saveCommentData.userId).toBe(SAVE_MEMBER[0].id);
			expect(saveCommentData.content).toBe('testCommentContent');
			expect(saveCommentData.groupNo).toBe(saveCommentData.id);
			expect(saveCommentData.indent).toBe(0);
			expect(saveCommentData.upperNo).toBe(`${saveCommentData.id}`);
		});

		it('비회원 접근', async () => {
			const response = await request(app)
								.post('/api/comment/image-board/1')
								.send({
									content: 'testCommentContent',
								});

			expect(response.status).toBe(ResponseStatusCode.FORBIDDEN);
			expect(response.body.message).toBe(ResponseStatus.FORBIDDEN.MESSAGE);
		});

		it('댓글 내용이 없는 경우', async () => {
			const { accessToken, refreshToken, ino } = await createTestToken(DEFAULT_USER_ID);
			const response = await request(app)
								.post('/api/comment/image-board/1')
								.send({
									content: '',
								})
								.set('Cookie', [
									`Authorization=${accessToken}`,
									`Authorization_Refresh=${refreshToken}`,
									`Authorization_ino=${ino}`,
								]);

			expect(response.status).toBe(ResponseStatusCode.BAD_REQUEST);
			expect(response.body.message).toBe(ResponseStatus.BAD_REQUEST.MESSAGE);
		});

		it('댓글 내용이 너무 긴 경우', async () => {
			const { accessToken, refreshToken, ino } = await createTestToken(DEFAULT_USER_ID);
			const response = await request(app)
								.post('/api/comment/image-board/1')
								.send({
									content: 'testCommentContent'.repeat(1000),
								})
								.set('Cookie', [
									`Authorization=${accessToken}`,
									`Authorization_Refresh=${refreshToken}`,
									`Authorization_ino=${ino}`,
								]);

			expect(response.status).toBe(ResponseStatusCode.BAD_REQUEST);
			expect(response.body.message).toBe(ResponseStatus.BAD_REQUEST.MESSAGE);
		});
	});

	describe('DELETE /:id', () => {
		it('정상 처리.', async () => {
			const { accessToken, refreshToken, ino } = await createTestToken(DEFAULT_USER_ID);
			const response = await request(app)
								.delete('/api/comment/1')
								.set('Cookie', [
									`Authorization=${accessToken}`,
									`Authorization_Refresh=${refreshToken}`,
									`Authorization_ino=${ino}`,
								]);

			expect(response.status).toBe(ResponseStatusCode.NO_CONTENT);
			expect(response.body).toEqual({});

			const saveComment = await Comment.findOne({ where: { id: 1 } });
			expect(saveComment).toBeNull();
		});

		it('비회원 접근', async () => {
			const response = await request(app)
								.delete('/api/comment/1');

			expect(response.status).toBe(ResponseStatusCode.FORBIDDEN);
			expect(response.body.message).toBe(ResponseStatus.FORBIDDEN.MESSAGE);
		});

		it('작성자가 아닌 경우', async () => {
			const { accessToken, refreshToken, ino } = await createTestToken(WRONG_USER_ID);
			const response = await request(app)
								.delete('/api/comment/1')
								.set('Cookie', [
									`Authorization=${accessToken}`,
									`Authorization_Refresh=${refreshToken}`,
									`Authorization_ino=${ino}`,
								]);

			expect(response.status).toBe(ResponseStatusCode.FORBIDDEN);
			expect(response.body.message).toBe(ResponseStatus.FORBIDDEN.MESSAGE);

			const saveComment = await Comment.findOne({ where: { id: 1 } });
			expect(saveComment).not.toBeNull();
		});

		it('데이터가 없는 경우', async () => {
			const { accessToken, refreshToken, ino } = await createTestToken(DEFAULT_USER_ID);
			const response = await request(app)
								.delete('/api/comment/99999')
								.set('Cookie', [
									`Authorization=${accessToken}`,
									`Authorization_Refresh=${refreshToken}`,
									`Authorization_ino=${ino}`,
								]);

			expect(response.status).toBe(ResponseStatusCode.BAD_REQUEST);
			expect(response.body.message).toBe(ResponseStatus.BAD_REQUEST.MESSAGE);
		});
	});

	describe('POST /:id/reply', () => {
		it('정상 처리.', async () => {
			const { accessToken, refreshToken, ino } = await createTestToken(DEFAULT_USER_ID);
			const response = await request(app)
								.post('/api/comment/1/reply')
								.send({
									content: 'testCommentContent',
								})
								.set('Cookie', [
									`Authorization=${accessToken}`,
									`Authorization_Refresh=${refreshToken}`,
									`Authorization_ino=${ino}`,
								]);

			expect(response.status).toBe(ResponseStatusCode.CREATED);
			
			const saveComment = await Comment.findAll({ order: [['id', 'DESC']], limit: 1 });

			expect(saveComment.length).toBe(1);
			const saveCommentData = saveComment[0];

			expect(saveCommentData.boardId).toBe(1);
			expect(saveCommentData.imageId).toBeNull();
			expect(saveCommentData.userId).toBe(SAVE_MEMBER[0].id);
			expect(saveCommentData.content).toBe('testCommentContent');
			expect(saveCommentData.groupNo).toBe(1);
			expect(saveCommentData.indent).toBe(1);
			expect(saveCommentData.upperNo).toBe(`1,${saveCommentData.id}`);
		});

		it('비회원 접근', async () => {
			const response = await request(app)
								.post('/api/comment/1/reply')
								.send({
									content: 'testCommentContent',
								});

			expect(response.status).toBe(ResponseStatusCode.FORBIDDEN);
			expect(response.body.message).toBe(ResponseStatus.FORBIDDEN.MESSAGE);
		});

		it('댓글 내용이 없는 경우', async () => {
			const { accessToken, refreshToken, ino } = await createTestToken(DEFAULT_USER_ID);
			const response = await request(app)
								.post('/api/comment/1/reply')
								.send({
									content: '',
								})
								.set('Cookie', [
									`Authorization=${accessToken}`,
									`Authorization_Refresh=${refreshToken}`,
									`Authorization_ino=${ino}`,
								]);

			expect(response.status).toBe(ResponseStatusCode.BAD_REQUEST);
			expect(response.body.message).toBe(ResponseStatus.BAD_REQUEST.MESSAGE);
		});

		it('댓글 내용이 너무 긴 경우', async () => {
			const { accessToken, refreshToken, ino } = await createTestToken(DEFAULT_USER_ID);
			const response = await request(app)
								.post('/api/comment/1/reply')
								.send({
									content: 'testCommentContent'.repeat(1000),
								})
								.set('Cookie', [
									`Authorization=${accessToken}`,
									`Authorization_Refresh=${refreshToken}`,
									`Authorization_ino=${ino}`,
								]);

			expect(response.status).toBe(ResponseStatusCode.BAD_REQUEST);
			expect(response.body.message).toBe(ResponseStatus.BAD_REQUEST.MESSAGE);
		});
	});
});