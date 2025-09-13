import { jest } from '@jest/globals';
import { CommentRepository } from '#repositories/commentRepository.js';
import CustomError from '#errors/customError.js';
import { ResponseStatus, ResponseStatusCode } from '#constants/responseStatus.js';
import {
	getCommentListService,
	postCommentService,
	deleteCommentService,
	postReplyCommentService,
} from '#services/comment/commentService.js';
import { sequelize } from '#models/index.js';

const DEFAULT_USER_ID = 'tester';
const WRONG_USER_ID = 'tester2';
const SAVE_COMMENT_LIST = [];

describe('commentService unit test', () => {
	beforeAll(async () => {
		for(let i = 1; i <= 20; i++) {
			SAVE_COMMENT_LIST.push({
				commentNo: i,
				boardNo: i,
				imageNo: i,
				userId: DEFAULT_USER_ID,
				commentContent: `testCommentContent${i}`,
				commentDate: new Date(),
				commentGroupNo: i,
				commentIndent: 1,
				commentUpperNo: `${i}`,
			});
		}
	});

	describe('getCommentListService', () => {
		it('정상 조회', async () => {
			jest.spyOn(CommentRepository, 'getCommentListPageable').mockResolvedValue({ rows: SAVE_COMMENT_LIST, count: 20 });

			const result = await getCommentListService({ boardNo: 1 });

			expect(result.content.length).toBe(20);
			expect(result.empty).toBe(false);
			expect(result.totalElements).toBe(20);
		});

		it('데이터가 없는 경우', async () => {
			jest.spyOn(CommentRepository, 'getCommentListPageable').mockResolvedValue({ rows: [], count: 0 });

			const result = await getCommentListService({ boardNo: 1 });

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
		it('정상 처리', async () => {
			const mockTransaction = {
				commit: jest.fn(),
				rollback: jest.fn(),
			}
			jest.spyOn(sequelize, 'transaction').mockResolvedValue(mockTransaction);
			jest.spyOn(CommentRepository, 'postComment').mockResolvedValue(1);
			const result = await postCommentService({ boardNo: 1, commentContent: 'testCommentContent' }, DEFAULT_USER_ID);
			expect(result).toBe(1);
			expect(CommentRepository.postComment)
				.toHaveBeenCalledWith(1, null, DEFAULT_USER_ID, 'testCommentContent', { transaction: mockTransaction });
			expect(mockTransaction.commit).toHaveBeenCalled();
			expect(mockTransaction.rollback).not.toHaveBeenCalled();
		});

		it('boardNo, imageNo 모두 존재하는 경우', async () => {
			try {
				await postCommentService({ boardNo: 1, imageNo: 1, commentContent: 'testCommentContent' });
			}catch(error) {
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatusCode.BAD_REQUEST);
				expect(error.message).toBe(ResponseStatus.BAD_REQUEST.MESSAGE);
			}
		});

		it('boardNo, imageNo 모두 존재하지 않는 경우', async () => {
			try {
				await postCommentService({ commentContent: 'testCommentContent' });
			}catch(error) {
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatusCode.BAD_REQUEST);
				expect(error.message).toBe(ResponseStatus.BAD_REQUEST.MESSAGE);
			}
		});

		it('처리시 오류 발생', async () => {
			const mockTransaction = {
				commit: jest.fn(),
				rollback: jest.fn(),
			}
			jest.spyOn(sequelize, 'transaction').mockResolvedValue(mockTransaction);
			jest.spyOn(CommentRepository, 'postComment').mockRejectedValue(new Error('오류 발생'));
			try {
				await postCommentService({ boardNo: 1, commentContent: 'testCommentContent' });
			}catch(error) {
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatusCode.INTERNAL_SERVER_ERROR);
				expect(error.message).toBe(ResponseStatus.INTERNAL_SERVER_ERROR.MESSAGE);
			}
			expect(mockTransaction.commit).not.toHaveBeenCalled();
			expect(mockTransaction.rollback).toHaveBeenCalled();
		});
	});

	describe('deleteCommentService', () => {
		it('정상 처리', async () => {
			jest.spyOn(CommentRepository, 'checkCommentWriter').mockResolvedValue({ userId: DEFAULT_USER_ID });
			jest.spyOn(CommentRepository, 'deleteComment').mockResolvedValue(1);
			await deleteCommentService(1, DEFAULT_USER_ID);
		});

		it('작성자가 아닌 경우', async () => {
			jest.spyOn(CommentRepository, 'checkCommentWriter').mockResolvedValue(WRONG_USER_ID);
			jest.spyOn(CommentRepository, 'deleteComment');
			try {
				await deleteCommentService(1, DEFAULT_USER_ID);
			}catch(error) {
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatusCode.FORBIDDEN);
				expect(error.message).toBe(ResponseStatus.FORBIDDEN.MESSAGE);
			}
		});
	});

	describe('postReplyCommentService', () => {
		it('정상 처리', async () => {
			const mockTransaction = {
				commit: jest.fn(),
				rollback: jest.fn(),
			}
			jest.spyOn(sequelize, 'transaction').mockResolvedValue(mockTransaction);
			jest.spyOn(CommentRepository, 'postReplyComment').mockResolvedValue(1);
			await postReplyCommentService({ boardNo: 1, commentContent: 'testCommentContent', commentGroupNo: 1, commentIndent: 1, commentUpperNo: '1' }, DEFAULT_USER_ID);
			expect(CommentRepository.postReplyComment)
				.toHaveBeenCalledWith(1, null, 'testCommentContent', 1, 1, '1', DEFAULT_USER_ID, { transaction: mockTransaction });
			expect(mockTransaction.commit).toHaveBeenCalled();
			expect(mockTransaction.rollback).not.toHaveBeenCalled();
		});

		it('처리시 오류 발생', async () => {
			const mockTransaction = {
				commit: jest.fn(),
				rollback: jest.fn(),
			}
			jest.spyOn(sequelize, 'transaction').mockResolvedValue(mockTransaction);
			jest.spyOn(CommentRepository, 'postReplyComment').mockRejectedValue(new Error('오류 발생'));
			try {
				await postReplyCommentService({ boardNo: 1, commentContent: 'testCommentContent', commentGroupNo: 1, commentIndent: 1, commentUpperNo: '1' }, DEFAULT_USER_ID);
			}catch(error) {
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatusCode.INTERNAL_SERVER_ERROR);
				expect(error.message).toBe(ResponseStatus.INTERNAL_SERVER_ERROR.MESSAGE);
			}
			expect(mockTransaction.commit).not.toHaveBeenCalled();
			expect(mockTransaction.rollback).toHaveBeenCalled();
		});
	});
});