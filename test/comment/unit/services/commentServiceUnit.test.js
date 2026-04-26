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

const DEFAULT_MEMBER = {
	id: 1,
	userId: 'tester',
	password: 'tester1234',
	username: 'testerName',
	nickname: 'testerNickName',
	email: 'tester@tester.com',
	profile: 'testerProfile.jpg',
	provider: 'local',
}
const WRONG_USER_ID = 'tester2';
const SAVE_COMMENT_LIST = [];

describe('commentService unit test', () => {
	beforeAll(async () => {
		for(let i = 1; i <= 20; i++) {
			SAVE_COMMENT_LIST.push({
				id: i,
				boardId: i,
				imageId: i,
				userId: DEFAULT_MEMBER.id,
				content: `testCommentContent${i}`,
				createdAt: new Date(),
				groupNo: i,
				indent: 0,
				upperNo: `${i}`,
			});
		}
	});

	describe('getCommentListService', () => {
		it('boardId, imageId 모두 존재하는 경우', async () => {
			try {
				await getCommentListService({ boardId: 1, imageId: 1 });
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
				await getCommentListService({ boardId: 1 });
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

			await postCommentService({ boardId: 1, content: 'testCommentContent' }, DEFAULT_MEMBER.id);

			expect(CommentRepository.postComment)
				.toHaveBeenCalledWith(1, null, DEFAULT_MEMBER.id, 'testCommentContent', { transaction: mockTransaction });
			expect(mockTransaction.commit).toHaveBeenCalled();
			expect(mockTransaction.rollback).not.toHaveBeenCalled();
		});

		it('boardId, imageId 모두 존재하는 경우', async () => {
			const postCommentSpy = jest.spyOn(CommentRepository, 'postComment');
			const mockTransaction = {
				commit: jest.fn(),
				rollback: jest.fn(),
			}
			jest.spyOn(sequelize, 'transaction').mockResolvedValue(mockTransaction);
			try {
				await postCommentService({ boardId: 1, imageId: 1, content: 'testCommentContent' });
			}catch(error) {
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatusCode.BAD_REQUEST);
				expect(error.message).toBe(ResponseStatus.BAD_REQUEST.MESSAGE);
				expect(postCommentSpy).not.toHaveBeenCalled();
				expect(mockTransaction.commit).not.toHaveBeenCalled();
				expect(mockTransaction.rollback).not.toHaveBeenCalled();
			}
		});

		it('boardId, imageId 모두 존재하지 않는 경우', async () => {
			const postCommentSpy = jest.spyOn(CommentRepository, 'postComment');
			const mockTransaction = {
				commit: jest.fn(),
				rollback: jest.fn(),
			}
			jest.spyOn(sequelize, 'transaction').mockResolvedValue(mockTransaction);
			try {
				await postCommentService({ content: 'testCommentContent' });
			}catch(error) {
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatusCode.BAD_REQUEST);
				expect(error.message).toBe(ResponseStatus.BAD_REQUEST.MESSAGE);
				expect(postCommentSpy).not.toHaveBeenCalled();
				expect(mockTransaction.commit).not.toHaveBeenCalled();
				expect(mockTransaction.rollback).not.toHaveBeenCalled();
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
				await postCommentService({ boardId: 1, content: 'testCommentContent' });
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
			jest.spyOn(CommentRepository, 'checkCommentWriter').mockResolvedValue({ userId: DEFAULT_MEMBER.id });
			jest.spyOn(CommentRepository, 'deleteComment').mockResolvedValue(1);
			await deleteCommentService(1, DEFAULT_MEMBER.id);
		});

		it('작성자가 아닌 경우', async () => {
			jest.spyOn(CommentRepository, 'checkCommentWriter').mockResolvedValue(WRONG_USER_ID);
			jest.spyOn(CommentRepository, 'deleteComment');
			try {
				await deleteCommentService(1, DEFAULT_MEMBER.id);
			}catch(error) {
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatusCode.FORBIDDEN);
				expect(error.message).toBe(ResponseStatus.FORBIDDEN.MESSAGE);
			}
		});

		it('데이터가 없는 경우', async () => {
			jest.spyOn(CommentRepository, 'checkCommentWriter').mockResolvedValue(null);
			const deleteCommentSpy = jest.spyOn(CommentRepository, 'deleteComment');

			try {
				await deleteCommentService(1, DEFAULT_MEMBER.id);
			}catch(error) {
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatusCode.BAD_REQUEST);
				expect(error.message).toBe(ResponseStatus.BAD_REQUEST.MESSAGE);
				expect(deleteCommentSpy).not.toHaveBeenCalled();
			}
		})
	});

	describe('postReplyCommentService', () => {
		const contentFixture = 'testCommentContent';
		const targetComment = {
			id: 1,
			boardId: 1,
			imageId: null,
			userId: DEFAULT_MEMBER.id,
			content: `testCommentContent1`,
			createdAt: new Date(),
			groupNo: 1,
			indent: 0,
			upperNo: `1`,
		}
		it('정상 처리', async () => {
			const mockTransaction = {
				commit: jest.fn(),
				rollback: jest.fn(),
			}
			jest.spyOn(sequelize, 'transaction').mockResolvedValue(mockTransaction);
			jest.spyOn(CommentRepository, 'findById').mockResolvedValue(targetComment);
			jest.spyOn(CommentRepository, 'postReplyComment').mockResolvedValue(1);

			await postReplyCommentService(1, { content: contentFixture }, DEFAULT_MEMBER.id);
			expect(CommentRepository.postReplyComment)
				.toHaveBeenCalledWith(
					targetComment.boardId,
					null,
					contentFixture,
					targetComment.groupNo,
					targetComment.indent + 1,
					targetComment.upperNo,
					DEFAULT_MEMBER.id,
					{ transaction: mockTransaction }
				);
			expect(mockTransaction.commit).toHaveBeenCalled();
			expect(mockTransaction.rollback).not.toHaveBeenCalled();
		});

		it('원댓글 데이터가 없는 경우', async () => {
			const mockTransaction = {
				commit: jest.fn(),
				rollback: jest.fn(),
			}
			jest.spyOn(sequelize, 'transaction').mockResolvedValue(mockTransaction);
			jest.spyOn(CommentRepository, 'findById').mockResolvedValue(null);
			const postReplyCommentSpy = jest.spyOn(CommentRepository, 'postReplyComment');

			try {
				await postReplyCommentService(0, { content: contentFixture }, DEFAULT_MEMBER.id);
			}catch(error) {
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatusCode.BAD_REQUEST);
				expect(error.message).toBe(ResponseStatus.BAD_REQUEST.MESSAGE);
				expect(postReplyCommentSpy).not.toHaveBeenCalled();
				expect(mockTransaction.commit).not.toHaveBeenCalled();
				expect(mockTransaction.rollback).toHaveBeenCalled();
			}
		});

		it('처리시 오류 발생', async () => {
			const mockTransaction = {
				commit: jest.fn(),
				rollback: jest.fn(),
			}
			jest.spyOn(sequelize, 'transaction').mockResolvedValue(mockTransaction);
			jest.spyOn(CommentRepository, 'findById').mockResolvedValue(targetComment);
			jest.spyOn(CommentRepository, 'postReplyComment').mockRejectedValue(new Error('오류 발생'));
			try {
				await postReplyCommentService(1, { content: contentFixture }, DEFAULT_MEMBER.id);
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