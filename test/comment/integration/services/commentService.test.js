import { jest } from '@jest/globals';
import CustomError from '#errors/customError.js';
import { CommentRepository } from '#repositories/commentRepository.js';
import { ResponseStatus, ResponseStatusCode } from '#constants/responseStatus.js';
import { sequelize, Comment, Member, Auth, Board, ImageBoard } from '#models/index.js';
import {
	getCommentListService,
	postCommentService,
	deleteCommentService,
	postReplyCommentService,
} from '#services/comment/commentService.js';

const COMMENT_AMOUNT = 20;
const COMMENT_TOTAL_ELEMENTS = 30;
const DEFAULT_USER_ID = 'tester';
const WRONG_USER_ID = 'tester2';

describe('commentService integration test', () => {
	beforeAll(async () => {
		await sequelize.authenticate();
		await sequelize.sync({ force: true });

		await Member.create({
			userId: DEFAULT_USER_ID,
			userPw: 'tester1234',
			userName: 'testerName',
			nickName: 'testerNickName',
			email: 'tester@tester.com',
			profileThumbnail: 'testerProfileThumbnail.jpg',
			provider: 'local',
		});

		await Auth.create({
			userId: DEFAULT_USER_ID,
			auth: 'ROLE_MEMBER',
		});

		await Board.create({
			boardNo: 1,
			userId: DEFAULT_USER_ID,
			boardTitle: 'testTitle',
			boardContent: 'testContent',
			boardGroupNo: 1,
			boardUpperNo: '1',
			boardIndent: 1,
		});

		await ImageBoard.create({
			imageNo: 1,
			userId: DEFAULT_USER_ID,
			imageTitle: 'testTitle',
			imageContent: 'testContent',
		});
	});

	afterAll(async () => {
		await Member.destroy({ where: {} });
		await Auth.destroy({ where: {} });
		await Board.destroy({ where: {} });
		await ImageBoard.destroy({ where: {} });
		await sequelize.close();
	});
	
	beforeEach(async () => {
		for(let i = 1; i <= COMMENT_TOTAL_ELEMENTS; i++) {
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

			const imageCommentNo = i + COMMENT_TOTAL_ELEMENTS;

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

	describe('getCommentListService', () => {
		it('정상 조회. Board 기준', async () => {
			const result = await getCommentListService({ boardNo: 1 });

			expect(result).toBeDefined();
			expect(result.content.length).toBe(COMMENT_AMOUNT);
			expect(result.empty).toBe(false);
			expect(result.totalElements).toBe(COMMENT_TOTAL_ELEMENTS);

			result.content.forEach((comment) => {
				expect(comment.commentNo).toBeLessThanOrEqual(COMMENT_TOTAL_ELEMENTS);
				expect(comment.userId).toBeDefined();
				expect(comment.commentDate).toBeDefined();
				expect(comment.commentContent).toBeDefined();
				expect(comment.commentGroupNo).toBeDefined();
				expect(comment.commentIndent).toBeDefined();
				expect(comment.commentUpperNo).toBeDefined();
				expect(comment.boardNo).toBeUndefined();
				expect(comment.imageNo).toBeUndefined();
			});
		});

		it('정상 조회. ImageBoard 기준', async () => {
			const result = await getCommentListService({ imageNo: 1 });

			expect(result).toBeDefined();
			expect(result.content.length).toBe(COMMENT_AMOUNT);
			expect(result.empty).toBe(false);
			expect(result.totalElements).toBe(COMMENT_TOTAL_ELEMENTS);

			result.content.forEach((comment) => {
				expect(comment.commentNo).toBeGreaterThan(COMMENT_TOTAL_ELEMENTS);
				expect(comment.userId).toBeDefined();
				expect(comment.commentContent).toBeDefined();
				expect(comment.commentGroupNo).toBeDefined();
				expect(comment.commentIndent).toBeDefined();
				expect(comment.commentUpperNo).toBeDefined();
				expect(comment.boardNo).toBeUndefined();
				expect(comment.imageNo).toBeUndefined();
			});
		});

		it('데이터가 없는 경우', async () => {
			await Comment.destroy({ where: {} });
			const result = await getCommentListService({ boardNo: 1 });

			expect(result).toBeDefined();
			expect(result.content.length).toBe(0);
			expect(result.empty).toBe(true);
			expect(result.totalElements).toBe(0);
		});

		it('boardNo, imageNo 모두 존재하는 경우', async () => {
			try {
				await getCommentListService({ boardNo: 1, imageNo: 1 });
			}catch(error) {
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatusCode.BAD_REQUEST);
				expect(error.message).toBe(ResponseStatus.BAD_REQUEST.MESSAGE);
			}
		});

		it('boardNo, imageNo 모두 존재하지 않는 경우', async () => {
			try {
				await getCommentListService({ });
			}catch(error) {
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatusCode.BAD_REQUEST);
				expect(error.message).toBe(ResponseStatus.BAD_REQUEST.MESSAGE);
			}
		});

		it('조회시 오류 발생', async () => {
			jest.spyOn(CommentRepository, 'getCommentListPageable').mockRejectedValue(new Error('오류 발생'));
			try {
				await getCommentListService({ boardNo: 1 });
			}catch(error) {
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatusCode.INTERNAL_SERVER_ERROR);
				expect(error.message).toBe(ResponseStatus.INTERNAL_SERVER_ERROR.MESSAGE);
			}
		});
	});

	describe('postCommentService', () => {
		it('정상 처리. Board 기준', async () => {
			const result = await postCommentService({ boardNo: 1, commentContent: 'testCommentContent' }, DEFAULT_USER_ID);

			expect(result).toBeDefined();
			expect(result.commentNo).toBeDefined();
			
			const saveComment = await Comment.findOne({ where: { commentNo: result.commentNo } });
			expect(saveComment).toBeDefined();
			expect(saveComment.commentNo).toBe(result.commentNo);
			expect(saveComment.boardNo).toBe(1);
			expect(saveComment.imageNo).toBeNull();
			expect(saveComment.userId).toBe(DEFAULT_USER_ID);
			expect(saveComment.commentContent).toBe('testCommentContent');
			expect(saveComment.commentGroupNo).toBe(result.commentNo);
			expect(saveComment.commentIndent).toBe(1);
			expect(saveComment.commentUpperNo).toBe(`${result.commentNo}`);
		});

		it('정상 처리. ImageBoard 기준', async () => {
			const result = await postCommentService({ imageNo: 1, commentContent: 'testCommentContent' }, DEFAULT_USER_ID);
			expect(result).toBeDefined();
			expect(result.commentNo).toBeDefined();

			const saveComment = await Comment.findOne({ where: { commentNo: result.commentNo } });
			expect(saveComment).toBeDefined();
			expect(saveComment.commentNo).toBe(result.commentNo);
			expect(saveComment.boardNo).toBeNull();
			expect(saveComment.imageNo).toBe(1);
			expect(saveComment.userId).toBe(DEFAULT_USER_ID);
			expect(saveComment.commentContent).toBe('testCommentContent');
			expect(saveComment.commentGroupNo).toBe(result.commentNo);
			expect(saveComment.commentIndent).toBe(1);
			expect(saveComment.commentUpperNo).toBe(`${result.commentNo}`);
		});

		it('처리시 오류 발생', async () => {
			jest.spyOn(CommentRepository, 'postComment').mockRejectedValue(new Error('오류 발생'));
			try {
				await postCommentService({ boardNo: 1, commentContent: 'testCommentContent' }, DEFAULT_USER_ID);
			}catch(error) {
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatusCode.INTERNAL_SERVER_ERROR);
				expect(error.message).toBe(ResponseStatus.INTERNAL_SERVER_ERROR.MESSAGE);
			}
		});

		it('boardNo, imageNo 모두 존재하는 경우', async () => {
			jest.spyOn(CommentRepository, 'postComment');
			try {
				await postCommentService({ boardNo: 1, imageNo: 1, commentContent: 'testCommentContent' }, DEFAULT_USER_ID);
			}catch(error) {
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatusCode.BAD_REQUEST);
				expect(error.message).toBe(ResponseStatus.BAD_REQUEST.MESSAGE);
				expect(CommentRepository.postComment).not.toHaveBeenCalled();
			}
		});

		it('boardNo, imageNo 모두 존재하지 않는 경우', async () => {
			jest.spyOn(CommentRepository, 'postComment');
			try {
				await postCommentService({ commentContent: 'testCommentContent' }, DEFAULT_USER_ID);
			}catch(error) {
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatusCode.BAD_REQUEST);
				expect(error.message).toBe(ResponseStatus.BAD_REQUEST.MESSAGE);
				expect(CommentRepository.postComment).not.toHaveBeenCalled();
			}
		});
	});

	describe('deleteCommentService', () => {
		it('정상 처리', async () => {
			await deleteCommentService(1, DEFAULT_USER_ID);

			const saveComment = await Comment.findOne({ where: { commentNo: 1 } });
			expect(saveComment).toBeNull();
		});

		it('작성자가 아닌 경우', async () => {
			jest.spyOn(CommentRepository, 'deleteComment');
			try {
				await deleteCommentService(1, WRONG_USER_ID);
			}catch(error) {
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatusCode.FORBIDDEN);
				expect(error.message).toBe(ResponseStatus.FORBIDDEN.MESSAGE);
				expect(CommentRepository.deleteComment).not.toHaveBeenCalled();
			}
		});

		it('오류 발생', async () => {
			jest.spyOn(CommentRepository, 'deleteComment').mockRejectedValue(new Error('오류 발생'));
			try {
				await deleteCommentService(1, DEFAULT_USER_ID);
			}catch(error) {
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatusCode.INTERNAL_SERVER_ERROR);
				expect(error.message).toBe(ResponseStatus.INTERNAL_SERVER_ERROR.MESSAGE);
			}

			const saveComment = await Comment.findOne({ where: { commentNo: 1 } });
			expect(saveComment).toBeDefined();
		});
	});

	describe('postReplyCommentService', () => {
		it('정상 처리. Board 기준', async () => {
			await postReplyCommentService({ boardNo: 1, }, { commentContent: 'testReplyCommentContent', commentGroupNo: 1, commentIndent: 1, commentUpperNo: '1' }, DEFAULT_USER_ID);

			const saveComment = await Comment.findOne({ order: [['commentNo', 'DESC']], limit: 1 });
			expect(saveComment).toBeDefined();
			expect(saveComment.boardNo).toBe(1);
			expect(saveComment.imageNo).toBeNull();
			expect(saveComment.userId).toBe(DEFAULT_USER_ID);
			expect(saveComment.commentContent).toBe('testReplyCommentContent');
			expect(saveComment.commentGroupNo).toBe(1);
			expect(saveComment.commentIndent).toBe(2);
			expect(saveComment.commentUpperNo).toBe(`1,${saveComment.commentNo}`);
		});

		it('정상 처리. ImageBoard 기준', async () => {
			await postReplyCommentService({ imageNo: 1, }, { commentContent: 'testReplyCommentContent', commentGroupNo: 1, commentIndent: 1, commentUpperNo: '1' }, DEFAULT_USER_ID);

			const saveComment = await Comment.findOne({ order: [['commentNo', 'DESC']], limit: 1 });
			expect(saveComment).toBeDefined();
			expect(saveComment.imageNo).toBe(1);
			expect(saveComment.userId).toBe(DEFAULT_USER_ID);
			expect(saveComment.commentContent).toBe('testReplyCommentContent');
			expect(saveComment.commentGroupNo).toBe(1);
			expect(saveComment.commentIndent).toBe(2);
			expect(saveComment.commentUpperNo).toBe(`1,${saveComment.commentNo}`);
		});

		it('처리시 오류 발생', async () => {
			const mockTransaction = {
				commit: jest.fn(),
				rollback: jest.fn(),
			}
			jest.spyOn(sequelize, 'transaction').mockResolvedValue(mockTransaction);
			jest.spyOn(CommentRepository, 'postReplyComment').mockRejectedValue(new Error('오류 발생'));
			try {
				await postReplyCommentService({ boardNo: 1, }, { commentContent: 'testReplyCommentContent', commentGroupNo: 1, commentIndent: 1, commentUpperNo: '1' }, DEFAULT_USER_ID);
			}catch(error) {
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatusCode.INTERNAL_SERVER_ERROR);
				expect(error.message).toBe(ResponseStatus.INTERNAL_SERVER_ERROR.MESSAGE);
				expect(mockTransaction.commit).not.toHaveBeenCalled();
				expect(mockTransaction.rollback).toHaveBeenCalled();
			}
		});
	});
});