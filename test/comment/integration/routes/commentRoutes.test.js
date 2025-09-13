import { ResponseStatus, ResponseStatusCode } from '#constants/responseStatus.js';
import { sequelize, Comment, Member, Auth, Board, ImageBoard } from '#models/index.js';
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
			await Member.create({
				userId: member.userId,
				userPw: member.userPw,
				userName: member.userName,
				nickName: member.nickName,
				email: member.email,
			});

			await Auth.create({
				userId: member.userId,
				auth: 'ROLE_MEMBER',
			});
		}

		await Board.create({
			boardNo: 1,
			userId: DEFAULT_USER_ID,
			boardTitle: `testTitle1`,
			boardContent: `testContent1`,
			boardGroupNo: 1,
			boardUpperNo: `1`,
			boardIndent: 1,
		});

		await ImageBoard.create({
			imageNo: 1,
			userId: DEFAULT_USER_ID,
			imageTitle: `testTitle1`,
			imageContent: `testContent1`,
			imageDate: new Date(),
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
				commentNo: i,
				boardNo: 1,
				imageNo: null,
				userId: DEFAULT_USER_ID,
				commentContent: `testCommentContent${i}`,
				commentDate: new Date(),
				commentGroupNo: i,
				commentIndent: 1,
				commentUpperNo: `${i}`,
			});

			const imageCommentNo = i + COMMENT_TYPE_TOTAL_ELEMENTS;

			await Comment.create({
				commentNo: imageCommentNo,
				boardNo: null,
				imageNo: 1,
				userId: DEFAULT_USER_ID,
				commentContent: `testCommentContent${imageCommentNo}`,
				commentDate: new Date(),
				commentGroupNo: imageCommentNo,
				commentIndent: 1,
				commentUpperNo: `${imageCommentNo}`,
			});
		}
	});

	afterEach(async () => {
		await Comment.destroy({ where: {} });
	});

	describe('GET /board', () => {
		it('정상 처리.', async () => {
			const response = await request(app)
								.get('/comment/board')
								.query({
									boardNo: 1,
								});

			expect(response.status).toBe(ResponseStatusCode.OK);
			expect(response.body.content.length).toBe(COMMENT_AMOUNT);
			expect(response.body.empty).toBe(false);
			expect(response.body.totalElements).toBe(COMMENT_TYPE_TOTAL_ELEMENTS);
			expect(response.body.userStatus.loggedIn).toBe(false);
			expect(response.body.userStatus.uid).toBeUndefined();

			response.body.content.forEach((item) => {
				expect(item.commentNo).toBeLessThanOrEqual(COMMENT_TYPE_TOTAL_ELEMENTS);
				expect(item.userId).toBe(DEFAULT_USER_ID);
				expect(item.commentDate).toBeDefined();
				expect(item.commentContent).toBeDefined();
				expect(item.commentGroupNo).toBeDefined();
				expect(item.commentIndent).toBeDefined();
				expect(item.commentUpperNo).toBeDefined();
				expect(item.boardNo).toBeUndefined();
				expect(item.imageNo).toBeUndefined();
			});
		});

		it('정상 처리. 로그인한 경우', async () => {
			const { accessToken, refreshToken, ino } = await createTestToken(DEFAULT_USER_ID);
			const response = await request(app)
								.get('/comment/board')
								.query({
									boardNo: 1,
								})
								.set('Cookie', [
									`Authorization=${accessToken}`,
									`Authorization_Refresh=${refreshToken}`,
									`Authorization_ino=${ino}`,
								]);

			expect(response.status).toBe(ResponseStatusCode.OK);
			expect(response.body.content.length).toBe(COMMENT_AMOUNT);
			expect(response.body.empty).toBe(false);
			expect(response.body.totalElements).toBe(COMMENT_TYPE_TOTAL_ELEMENTS);
			expect(response.body.userStatus.loggedIn).toBe(true);
			expect(response.body.userStatus.uid).toBe(DEFAULT_USER_ID);
		});

		it('정상 처리. 데이터가 없는 경우.', async () => {
			const response = await request(app)
								.get('/comment/board')
								.query({
									boardNo: 0,
								});

			expect(response.status).toBe(ResponseStatusCode.OK);
			expect(response.body.content.length).toBe(0);
			expect(response.body.empty).toBe(true);
			expect(response.body.totalElements).toBe(0);
			expect(response.body.userStatus.loggedIn).toBe(false);
			expect(response.body.userStatus.uid).toBeUndefined();
		});
	});

	describe('GET /image', () => {
		it('정상 처리.', async () => {
			const response = await request(app)
								.get('/comment/image')
								.query({
									imageNo: 1,
								});

			expect(response.status).toBe(ResponseStatusCode.OK);
			expect(response.body.content.length).toBe(COMMENT_AMOUNT);
			expect(response.body.empty).toBe(false);
			expect(response.body.totalElements).toBe(COMMENT_TYPE_TOTAL_ELEMENTS);
			expect(response.body.userStatus.loggedIn).toBe(false);
			expect(response.body.userStatus.uid).toBeUndefined();

			response.body.content.forEach((item) => {
				expect(item.commentNo).toBeGreaterThan(COMMENT_TYPE_TOTAL_ELEMENTS);
				expect(item.userId).toBe(DEFAULT_USER_ID);
				expect(item.commentDate).toBeDefined();
				expect(item.commentContent).toBeDefined();
			});
		});
	});

	describe('POST /board/:boardNo', () => {
		it('정상 처리.', async () => {
			await Comment.destroy({ where: {} });
			const { accessToken, refreshToken, ino } = await createTestToken(DEFAULT_USER_ID);
			const response = await request(app)
								.post('/comment/board/1')
								.send({
									commentContent: 'testCommentContent',
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

			expect(saveCommentData.boardNo).toBe(1);
			expect(saveCommentData.imageNo).toBeNull();
			expect(saveCommentData.userId).toBe(DEFAULT_USER_ID);
			expect(saveCommentData.commentContent).toBe('testCommentContent');
			expect(saveCommentData.commentGroupNo).toBe(saveCommentData.commentNo);
			expect(saveCommentData.commentIndent).toBe(1);
			expect(saveCommentData.commentUpperNo).toBe(`${saveCommentData.commentNo}`);
		});

		it('비회원 접근', async () => {
			const response = await request(app)
								.post('/comment/board/1')
								.send({
									commentContent: 'testCommentContent',
								});

			expect(response.status).toBe(ResponseStatusCode.FORBIDDEN);
			expect(response.body.message).toBe(ResponseStatus.FORBIDDEN.MESSAGE);
		});

		it('댓글 내용이 없는 경우', async () => {
			const { accessToken, refreshToken, ino } = await createTestToken(DEFAULT_USER_ID);
			const response = await request(app)
								.post('/comment/board/1')
								.send({
									commentContent: '',
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
								.post('/comment/board/1')
								.send({
									commentContent: 'testCommentContent'.repeat(1000),
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

	describe('POST /image/:imageNo', () => {
		it('정상 처리.', async () => {
			await Comment.destroy({ where: {} });
			const { accessToken, refreshToken, ino } = await createTestToken(DEFAULT_USER_ID);
			const response = await request(app)
								.post('/comment/image/1')
								.send({
									commentContent: 'testCommentContent',
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

			expect(saveCommentData.boardNo).toBeNull();
			expect(saveCommentData.imageNo).toBe(1);
			expect(saveCommentData.userId).toBe(DEFAULT_USER_ID);
			expect(saveCommentData.commentContent).toBe('testCommentContent');
			expect(saveCommentData.commentGroupNo).toBe(saveCommentData.commentNo);
			expect(saveCommentData.commentIndent).toBe(1);
			expect(saveCommentData.commentUpperNo).toBe(`${saveCommentData.commentNo}`);
		});

		it('비회원 접근', async () => {
			const response = await request(app)
								.post('/comment/image/1')
								.send({
									commentContent: 'testCommentContent',
								});

			expect(response.status).toBe(ResponseStatusCode.FORBIDDEN);
			expect(response.body.message).toBe(ResponseStatus.FORBIDDEN.MESSAGE);
		});

		it('댓글 내용이 없는 경우', async () => {
			const { accessToken, refreshToken, ino } = await createTestToken(DEFAULT_USER_ID);
			const response = await request(app)
								.post('/comment/image/1')
								.send({
									commentContent: '',
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
								.post('/comment/image/1')
								.send({
									commentContent: 'testCommentContent'.repeat(1000),
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

	describe('DELETE /:commentNo', () => {
		it('정상 처리.', async () => {
			const { accessToken, refreshToken, ino } = await createTestToken(DEFAULT_USER_ID);
			const response = await request(app)
								.delete('/comment/1')
								.set('Cookie', [
									`Authorization=${accessToken}`,
									`Authorization_Refresh=${refreshToken}`,
									`Authorization_ino=${ino}`,
								]);

			expect(response.status).toBe(ResponseStatusCode.NO_CONTENT);
			expect(response.body).toEqual({});

			const saveComment = await Comment.findOne({ where: { commentNo: 1 } });
			expect(saveComment).toBeNull();
		});

		it('비회원 접근', async () => {
			const response = await request(app)
								.delete('/comment/1');

			expect(response.status).toBe(ResponseStatusCode.FORBIDDEN);
			expect(response.body.message).toBe(ResponseStatus.FORBIDDEN.MESSAGE);
		});

		it('작성자가 아닌 경우', async () => {
			const { accessToken, refreshToken, ino } = await createTestToken(WRONG_USER_ID);
			const response = await request(app)
								.delete('/comment/1')
								.set('Cookie', [
									`Authorization=${accessToken}`,
									`Authorization_Refresh=${refreshToken}`,
									`Authorization_ino=${ino}`,
								]);

			expect(response.status).toBe(ResponseStatusCode.FORBIDDEN);
			expect(response.body.message).toBe(ResponseStatus.FORBIDDEN.MESSAGE);

			const saveComment = await Comment.findOne({ where: { commentNo: 1 } });
			expect(saveComment).not.toBeNull();
		});

		it('데이터가 없는 경우', async () => {
			const { accessToken, refreshToken, ino } = await createTestToken(DEFAULT_USER_ID);
			const response = await request(app)
								.delete('/comment/0')
								.set('Cookie', [
									`Authorization=${accessToken}`,
									`Authorization_Refresh=${refreshToken}`,
									`Authorization_ino=${ino}`,
								]);

			expect(response.status).toBe(ResponseStatusCode.NOT_FOUND);
			expect(response.body.message).toBe(ResponseStatus.NOT_FOUND.MESSAGE);
		});
	});

	describe('POST /board/:boardNo/reply', () => {
		it('정상 처리.', async () => {
			const { accessToken, refreshToken, ino } = await createTestToken(DEFAULT_USER_ID);
			const response = await request(app)
								.post('/comment/board/1/reply')
								.send({
									commentContent: 'testCommentContent',
									commentGroupNo: 1,
									commentIndent: 1,
									commentUpperNo: `1`,
								})
								.set('Cookie', [
									`Authorization=${accessToken}`,
									`Authorization_Refresh=${refreshToken}`,
									`Authorization_ino=${ino}`,
								]);

			expect(response.status).toBe(ResponseStatusCode.CREATED);
			
			const saveComment = await Comment.findAll({ order: [['commentNo', 'DESC']], limit: 1 });

			expect(saveComment.length).toBe(1);
			const saveCommentData = saveComment[0];

			expect(saveCommentData.boardNo).toBe(1);
			expect(saveCommentData.imageNo).toBeNull();
			expect(saveCommentData.userId).toBe(DEFAULT_USER_ID);
			expect(saveCommentData.commentContent).toBe('testCommentContent');
			expect(saveCommentData.commentGroupNo).toBe(1);
			expect(saveCommentData.commentIndent).toBe(2);
			expect(saveCommentData.commentUpperNo).toBe(`1,${saveCommentData.commentNo}`);
		});

		it('비회원 접근', async () => {
			const response = await request(app)
								.post('/comment/board/1/reply')
								.send({
									commentContent: 'testCommentContent',
									commentGroupNo: 1,
									commentIndent: 1,
									commentUpperNo: `1`,
								});

			expect(response.status).toBe(ResponseStatusCode.FORBIDDEN);
			expect(response.body.message).toBe(ResponseStatus.FORBIDDEN.MESSAGE);
		});

		it('댓글 내용이 없는 경우', async () => {
			const { accessToken, refreshToken, ino } = await createTestToken(DEFAULT_USER_ID);
			const response = await request(app)
								.post('/comment/board/1/reply')
								.send({
									commentContent: '',
									commentGroupNo: 1,
									commentIndent: 1,
									commentUpperNo: `1`,
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
								.post('/comment/board/1/reply')
								.send({
									commentContent: 'testCommentContent'.repeat(1000),
									commentGroupNo: 1,
									commentIndent: 1,
									commentUpperNo: `1`,
								})
								.set('Cookie', [
									`Authorization=${accessToken}`,
									`Authorization_Refresh=${refreshToken}`,
									`Authorization_ino=${ino}`,
								]);

			expect(response.status).toBe(ResponseStatusCode.BAD_REQUEST);
			expect(response.body.message).toBe(ResponseStatus.BAD_REQUEST.MESSAGE);
		});

		it('댓글 그룹 번호가 없는 경우', async () => {
			const { accessToken, refreshToken, ino } = await createTestToken(DEFAULT_USER_ID);
			const response = await request(app)
								.post('/comment/board/1/reply')
								.send({
									commentContent: 'testCommentContent',
									commentIndent: 1,
									commentUpperNo: `1`,
								})
								.set('Cookie', [
									`Authorization=${accessToken}`,
									`Authorization_Refresh=${refreshToken}`,
									`Authorization_ino=${ino}`,
								]);

			expect(response.status).toBe(ResponseStatusCode.BAD_REQUEST);
			expect(response.body.message).toBe(ResponseStatus.BAD_REQUEST.MESSAGE);
		});

		it('댓글 그룹 번호가 문자열인 경우', async () => {
			const { accessToken, refreshToken, ino } = await createTestToken(DEFAULT_USER_ID);
			const response = await request(app)
								.post('/comment/board/1/reply')
								.send({
									commentContent: 'testCommentContent',
									commentGroupNo: '1',
									commentIndent: 1,
									commentUpperNo: `1`,
								})
								.set('Cookie', [
									`Authorization=${accessToken}`,
									`Authorization_Refresh=${refreshToken}`,
									`Authorization_ino=${ino}`,
								]);

			expect(response.status).toBe(ResponseStatusCode.BAD_REQUEST);
			expect(response.body.message).toBe(ResponseStatus.BAD_REQUEST.MESSAGE);
		});

		it('댓글 그룹 번호가 음수인 경우', async () => {
			const { accessToken, refreshToken, ino } = await createTestToken(DEFAULT_USER_ID);
			const response = await request(app)
								.post('/comment/board/1/reply')
								.send({
									commentContent: 'testCommentContent',
									commentGroupNo: -1,
									commentIndent: 1,
									commentUpperNo: `1`,
								})
								.set('Cookie', [
									`Authorization=${accessToken}`,
									`Authorization_Refresh=${refreshToken}`,
									`Authorization_ino=${ino}`,
								]);

			expect(response.status).toBe(ResponseStatusCode.BAD_REQUEST);
			expect(response.body.message).toBe(ResponseStatus.BAD_REQUEST.MESSAGE);
		});

		it('댓글 그룹 번호가 0인 경우', async () => {
			const { accessToken, refreshToken, ino } = await createTestToken(DEFAULT_USER_ID);
			const response = await request(app)
								.post('/comment/board/1/reply')
								.send({
									commentContent: 'testCommentContent',
									commentGroupNo: 0,
									commentIndent: 1,
									commentUpperNo: `1`,
								})
								.set('Cookie', [
									`Authorization=${accessToken}`,
									`Authorization_Refresh=${refreshToken}`,
									`Authorization_ino=${ino}`,
								]);

			expect(response.status).toBe(ResponseStatusCode.BAD_REQUEST);
			expect(response.body.message).toBe(ResponseStatus.BAD_REQUEST.MESSAGE);
		});

		it('댓글 indent가 문자열인 경우', async () => {
			const { accessToken, refreshToken, ino } = await createTestToken(DEFAULT_USER_ID);
			const response = await request(app)
								.post('/comment/board/1/reply')
								.send({
									commentContent: 'testCommentContent',
									commentGroupNo: 1,
									commentIndent: '1',
									commentUpperNo: `1`,
								})
								.set('Cookie', [
									`Authorization=${accessToken}`,
									`Authorization_Refresh=${refreshToken}`,
									`Authorization_ino=${ino}`,
								]);

			expect(response.status).toBe(ResponseStatusCode.BAD_REQUEST);
			expect(response.body.message).toBe(ResponseStatus.BAD_REQUEST.MESSAGE);
		});

		it('댓글 indent가 음수인 경우', async () => {
			const { accessToken, refreshToken, ino } = await createTestToken(DEFAULT_USER_ID);
			const response = await request(app)
								.post('/comment/board/1/reply')
								.send({
									commentContent: 'testCommentContent',
									commentGroupNo: 1,
									commentIndent: -1,
									commentUpperNo: `1`,
								})
								.set('Cookie', [
									`Authorization=${accessToken}`,
									`Authorization_Refresh=${refreshToken}`,
									`Authorization_ino=${ino}`,
								]);

			expect(response.status).toBe(ResponseStatusCode.BAD_REQUEST);
			expect(response.body.message).toBe(ResponseStatus.BAD_REQUEST.MESSAGE);
		});

		it('댓글 indent가 0인 경우', async () => {
			const { accessToken, refreshToken, ino } = await createTestToken(DEFAULT_USER_ID);
			const response = await request(app)
								.post('/comment/board/1/reply')
								.send({
									commentContent: 'testCommentContent',
									commentGroupNo: 1,
									commentIndent: 0,
									commentUpperNo: `1`,
								})
								.set('Cookie', [
									`Authorization=${accessToken}`,
									`Authorization_Refresh=${refreshToken}`,
									`Authorization_ino=${ino}`,
								]);

			expect(response.status).toBe(ResponseStatusCode.BAD_REQUEST);
			expect(response.body.message).toBe(ResponseStatus.BAD_REQUEST.MESSAGE);
		});

		it('댓글 upperNo가 비어있는 경우', async () => {
			const { accessToken, refreshToken, ino } = await createTestToken(DEFAULT_USER_ID);
			const response = await request(app)
								.post('/comment/board/1/reply')
								.send({
									commentContent: 'testCommentContent',
									commentGroupNo: 1,
									commentIndent: 1,
									commentUpperNo: '',
								})
								.set('Cookie', [
									`Authorization=${accessToken}`,
									`Authorization_Refresh=${refreshToken}`,
									`Authorization_ino=${ino}`,
								]);

			expect(response.status).toBe(ResponseStatusCode.BAD_REQUEST);
			expect(response.body.message).toBe(ResponseStatus.BAD_REQUEST.MESSAGE);
		});

		it('댓글 upperNo가 문자열이 아닌 경우', async () => {
			const { accessToken, refreshToken, ino } = await createTestToken(DEFAULT_USER_ID);
			const response = await request(app)
								.post('/comment/board/1/reply')
								.send({
									commentContent: 'testCommentContent',
									commentGroupNo: 1,
									commentIndent: 1,
									commentUpperNo: 1,
								})
								.set('Cookie', [
									`Authorization=${accessToken}`,
									`Authorization_Refresh=${refreshToken}`,
									`Authorization_ino=${ino}`,
								]);

			expect(response.status).toBe(ResponseStatusCode.BAD_REQUEST);
			expect(response.body.message).toBe(ResponseStatus.BAD_REQUEST.MESSAGE);
		});

		it('댓글 upperNo가 없는 경우', async () => {
			const { accessToken, refreshToken, ino } = await createTestToken(DEFAULT_USER_ID);
			const response = await request(app)
								.post('/comment/board/1/reply')
								.send({
									commentContent: 'testCommentContent',
									commentGroupNo: 1,
									commentIndent: 1,
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

	describe('POST /image/:imageNo/reply', () => {
		it('정상 처리.', async () => {
			const { accessToken, refreshToken, ino } = await createTestToken(DEFAULT_USER_ID);
			const response = await request(app)
								.post('/comment/image/1/reply')
								.send({
									commentContent: 'testCommentContent',
									commentGroupNo: 1,
									commentIndent: 1,
									commentUpperNo: `1`,
								})
								.set('Cookie', [
									`Authorization=${accessToken}`,
									`Authorization_Refresh=${refreshToken}`,
									`Authorization_ino=${ino}`,
								]);

			expect(response.status).toBe(ResponseStatusCode.CREATED);

			const saveComment = await Comment.findAll({ order: [['commentNo', 'DESC']], limit: 1 });

			expect(saveComment.length).toBe(1);
			const saveCommentData = saveComment[0];

			expect(saveCommentData.boardNo).toBeNull();
			expect(saveCommentData.imageNo).toBe(1);
			expect(saveCommentData.userId).toBe(DEFAULT_USER_ID);
			expect(saveCommentData.commentContent).toBe('testCommentContent');
			expect(saveCommentData.commentGroupNo).toBe(1);
			expect(saveCommentData.commentIndent).toBe(2);
			expect(saveCommentData.commentUpperNo).toBe(`1,${saveCommentData.commentNo}`);
		});

		it('비회원 접근', async () => {
			const response = await request(app)
								.post('/comment/image/1/reply')
								.send({
									commentContent: 'testCommentContent',
									commentGroupNo: 1,
									commentIndent: 1,
									commentUpperNo: `1`,
								});

			expect(response.status).toBe(ResponseStatusCode.FORBIDDEN);
			expect(response.body.message).toBe(ResponseStatus.FORBIDDEN.MESSAGE);
		});

		it('댓글 내용이 없는 경우', async () => {
			const { accessToken, refreshToken, ino } = await createTestToken(DEFAULT_USER_ID);
			const response = await request(app)
								.post('/comment/image/1/reply')
								.send({
									commentContent: '',
									commentGroupNo: 1,
									commentIndent: 1,
									commentUpperNo: `1`,
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
								.post('/comment/image/1/reply')
								.send({
									commentContent: 'testCommentContent'.repeat(1000),
									commentGroupNo: 1,
									commentIndent: 1,
									commentUpperNo: `1`,
								})
								.set('Cookie', [
									`Authorization=${accessToken}`,
									`Authorization_Refresh=${refreshToken}`,
									`Authorization_ino=${ino}`,
								]);

			expect(response.status).toBe(ResponseStatusCode.BAD_REQUEST);
			expect(response.body.message).toBe(ResponseStatus.BAD_REQUEST.MESSAGE);
		});

		it('댓글 그룹 번호가 없는 경우', async () => {
			const { accessToken, refreshToken, ino } = await createTestToken(DEFAULT_USER_ID);
			const response = await request(app)
								.post('/comment/image/1/reply')
								.send({
									commentContent: 'testCommentContent',
									commentIndent: 1,
									commentUpperNo: `1`,
								})
								.set('Cookie', [
									`Authorization=${accessToken}`,
									`Authorization_Refresh=${refreshToken}`,
									`Authorization_ino=${ino}`,
								]);

			expect(response.status).toBe(ResponseStatusCode.BAD_REQUEST);
			expect(response.body.message).toBe(ResponseStatus.BAD_REQUEST.MESSAGE);
		});

		it('댓글 그룹 번호가 문자열인 경우', async () => {
			const { accessToken, refreshToken, ino } = await createTestToken(DEFAULT_USER_ID);
			const response = await request(app)
								.post('/comment/image/1/reply')
								.send({
									commentContent: 'testCommentContent',
									commentGroupNo: '1',
									commentIndent: 1,
									commentUpperNo: `1`,
								})
								.set('Cookie', [
									`Authorization=${accessToken}`,
									`Authorization_Refresh=${refreshToken}`,
									`Authorization_ino=${ino}`,
								]);

			expect(response.status).toBe(ResponseStatusCode.BAD_REQUEST);
			expect(response.body.message).toBe(ResponseStatus.BAD_REQUEST.MESSAGE);
		});

		it('댓글 그룹 번호가 음수인 경우', async () => {
			const { accessToken, refreshToken, ino } = await createTestToken(DEFAULT_USER_ID);
			const response = await request(app)
								.post('/comment/image/1/reply')
								.send({
									commentContent: 'testCommentContent',
									commentGroupNo: -1,
									commentIndent: 1,
									commentUpperNo: `1`,
								})
								.set('Cookie', [
									`Authorization=${accessToken}`,
									`Authorization_Refresh=${refreshToken}`,
									`Authorization_ino=${ino}`,
								]);

			expect(response.status).toBe(ResponseStatusCode.BAD_REQUEST);
			expect(response.body.message).toBe(ResponseStatus.BAD_REQUEST.MESSAGE);
		});

		it('댓글 그룹 번호가 0인 경우', async () => {
			const { accessToken, refreshToken, ino } = await createTestToken(DEFAULT_USER_ID);
			const response = await request(app)
								.post('/comment/image/1/reply')
								.send({
									commentContent: 'testCommentContent',
									commentGroupNo: 0,
									commentIndent: 1,
									commentUpperNo: `1`,
								})
								.set('Cookie', [
									`Authorization=${accessToken}`,
									`Authorization_Refresh=${refreshToken}`,
									`Authorization_ino=${ino}`,
								]);

			expect(response.status).toBe(ResponseStatusCode.BAD_REQUEST);
			expect(response.body.message).toBe(ResponseStatus.BAD_REQUEST.MESSAGE);
		});

		it('댓글 indent가 문자열인 경우', async () => {
			const { accessToken, refreshToken, ino } = await createTestToken(DEFAULT_USER_ID);
			const response = await request(app)
								.post('/comment/image/1/reply')
								.send({
									commentContent: 'testCommentContent',
									commentGroupNo: 1,
									commentIndent: '1',
									commentUpperNo: `1`,
								})
								.set('Cookie', [
									`Authorization=${accessToken}`,
									`Authorization_Refresh=${refreshToken}`,
									`Authorization_ino=${ino}`,
								]);
		});

		it('댓글 indent가 음수인 경우', async () => {
			const { accessToken, refreshToken, ino } = await createTestToken(DEFAULT_USER_ID);
			const response = await request(app)
								.post('/comment/image/1/reply')
								.send({
									commentContent: 'testCommentContent',
									commentGroupNo: 1,
									commentIndent: -1,
									commentUpperNo: `1`,
								})
								.set('Cookie', [
									`Authorization=${accessToken}`,
									`Authorization_Refresh=${refreshToken}`,
									`Authorization_ino=${ino}`,
								]);

			expect(response.status).toBe(ResponseStatusCode.BAD_REQUEST);
			expect(response.body.message).toBe(ResponseStatus.BAD_REQUEST.MESSAGE);
		});

		it('댓글 indent가 0인 경우', async () => {
			const { accessToken, refreshToken, ino } = await createTestToken(DEFAULT_USER_ID);
			const response = await request(app)
								.post('/comment/image/1/reply')
								.send({
									commentContent: 'testCommentContent',
									commentGroupNo: 1,
									commentIndent: 0,
									commentUpperNo: `1`,
								})
								.set('Cookie', [
									`Authorization=${accessToken}`,
									`Authorization_Refresh=${refreshToken}`,
									`Authorization_ino=${ino}`,
								]);

			expect(response.status).toBe(ResponseStatusCode.BAD_REQUEST);
			expect(response.body.message).toBe(ResponseStatus.BAD_REQUEST.MESSAGE);
		});

		it('댓글 upperNo가 비어있는 경우', async () => {
			const { accessToken, refreshToken, ino } = await createTestToken(DEFAULT_USER_ID);
			const response = await request(app)
								.post('/comment/image/1/reply')
								.send({
									commentContent: 'testCommentContent',
									commentGroupNo: 1,
									commentIndent: 1,
									commentUpperNo: '',
								})
								.set('Cookie', [
									`Authorization=${accessToken}`,
									`Authorization_Refresh=${refreshToken}`,
									`Authorization_ino=${ino}`,
								]);

			expect(response.status).toBe(ResponseStatusCode.BAD_REQUEST);
			expect(response.body.message).toBe(ResponseStatus.BAD_REQUEST.MESSAGE);
		});

		it('댓글 upperNo가 문자열이 아닌 경우', async () => {
			const { accessToken, refreshToken, ino } = await createTestToken(DEFAULT_USER_ID);
			const response = await request(app)
								.post('/comment/image/1/reply')
								.send({
									commentContent: 'testCommentContent',
									commentGroupNo: 1,
									commentIndent: 1,
									commentUpperNo: 1,
								})
								.set('Cookie', [
									`Authorization=${accessToken}`,
									`Authorization_Refresh=${refreshToken}`,
									`Authorization_ino=${ino}`,
								]);

			expect(response.status).toBe(ResponseStatusCode.BAD_REQUEST);
			expect(response.body.message).toBe(ResponseStatus.BAD_REQUEST.MESSAGE);
		});

		it('댓글 upperNo가 없는 경우', async () => {
			const { accessToken, refreshToken, ino } = await createTestToken(DEFAULT_USER_ID);
			const response = await request(app)
								.post('/comment/image/1/reply')
								.send({
									commentContent: 'testCommentContent',
									commentGroupNo: 1,
									commentIndent: 1,
									commentUpperNo: '',
								})
		});
	});
});