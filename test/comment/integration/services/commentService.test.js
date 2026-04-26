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
const COMMENT_AMOUNT = 20;
const COMMENT_TOTAL_ELEMENTS = 30;
const WRONG_USER_ID = 'tester2';

describe('commentService integration test', () => {
	beforeAll(async () => {
		await sequelize.authenticate();
		await sequelize.sync({ force: true });

		await Member.create(DEFAULT_MEMBER);

		await Auth.create({
			userId: DEFAULT_MEMBER.id,
			auth: 'ROLE_MEMBER',
		});

		await Board.create({
			id: 1,
			userId: DEFAULT_MEMBER.id,
			title: 'testTitle',
			content: 'testContent',
			groupNo: 1,
			upperNo: '1',
			indent: 1,
		});

		await ImageBoard.create({
			id: 1,
			userId: DEFAULT_MEMBER.id,
			title: 'testTitle',
			content: 'testContent',
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
				id: i,
				boardId: 1,
				imageId: null,
				userId: DEFAULT_MEMBER.id,
				content: `testCommentContent${i}`,
				createdAt: new Date(),
				groupNo: i,
				indent: 0,
				upperNo: `${i}`,
			});

			const imageCommentNo = i + COMMENT_TOTAL_ELEMENTS;

			await Comment.create({
				id: imageCommentNo,
				boardId: null,
				imageId: 1,
				userId: DEFAULT_MEMBER.id,
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

	describe('getCommentListService', () => {
		it('정상 조회. Board 기준', async () => {
			const result = await getCommentListService({ boardId: 1 });

			expect(result).toBeDefined();
			expect(result.items.length).toBe(COMMENT_AMOUNT);
			expect(result.isEmpty).toBe(false);
			expect(result.totalPages).toBe(Math.ceil(COMMENT_TOTAL_ELEMENTS / COMMENT_AMOUNT));

			result.items.forEach((comment) => {
				expect(comment.id).toBeLessThanOrEqual(COMMENT_TOTAL_ELEMENTS);
				expect(comment.writerId).toBe(DEFAULT_MEMBER.userId);
				expect(comment.writer).toBe(DEFAULT_MEMBER.nickname);
				expect(comment.createdAt).toBeDefined();
				expect(comment.content).toBeDefined();
				expect(comment.groupNo).toBeUndefined();
				expect(comment.indent).toBeDefined();
				expect(comment.upperNo).toBeUndefined();
				expect(comment.boardId).toBeUndefined();
				expect(comment.imageId).toBeUndefined();
				expect(comment.deletedAt).toBeFalsy();
			});
		});

		it('정상 조회. ImageBoard 기준', async () => {
			const result = await getCommentListService({ imageId: 1 });

			expect(result).toBeDefined();
			expect(result.items.length).toBe(COMMENT_AMOUNT);
			expect(result.isEmpty).toBe(false);
			expect(result.totalPages).toBe(Math.ceil(COMMENT_TOTAL_ELEMENTS / COMMENT_AMOUNT));

			result.items.forEach((comment) => {
				expect(comment.id).toBeGreaterThan(COMMENT_TOTAL_ELEMENTS);
				expect(comment.writerId).toBe(DEFAULT_MEMBER.userId);
				expect(comment.writer).toBe(DEFAULT_MEMBER.nickname);
				expect(comment.createdAt).toBeDefined();
				expect(comment.content).toBeDefined();
				expect(comment.indent).toBeDefined();
				expect(comment.deletedAt).toBeFalsy();
				expect(comment.groupNo).toBeUndefined();
				expect(comment.upperNo).toBeUndefined();
				expect(comment.boardId).toBeUndefined();
				expect(comment.imageId).toBeUndefined();
			});
		});

		it('데이터가 없는 경우', async () => {
			await Comment.destroy({ where: {} });
			const result = await getCommentListService({ boardId: 999999 });

			expect(result).toBeDefined();
			expect(result.items.length).toBe(0);
			expect(result.isEmpty).toBe(true);
			expect(result.totalPages).toBe(0);
			expect(result.currentPage).toBe(1);
		});
	});

	describe('postCommentService', () => {
		const contentFixture = "testCommentContent";
		it('정상 처리. Board 기준', async () => {
			await Comment.destroy({ where: {}, force: true });
			await postCommentService({ boardId: 1, content: contentFixture }, DEFAULT_MEMBER.id);

			const saveComment = await Comment.findOne({ where: { boardId: 1 } });
			expect(saveComment).toBeDefined();
			expect(saveComment.id).toBeDefined();
			expect(saveComment.boardId).toBe(1);
			expect(saveComment.imageId).toBeNull();
			expect(saveComment.userId).toBe(DEFAULT_MEMBER.id);
			expect(saveComment.content).toBe(contentFixture);
			expect(saveComment.groupNo).toBe(saveComment.id);
			expect(saveComment.indent).toBe(0);
			expect(saveComment.upperNo).toBe(`${saveComment.id}`);
		});

		it('정상 처리. ImageBoard 기준', async () => {
			await Comment.destroy({ where: {}, force: true });
			await postCommentService({ imageId: 1, content: contentFixture }, DEFAULT_MEMBER.id);

			const saveComment = await Comment.findOne({ where: { imageId: 1 } });
			expect(saveComment).toBeDefined();
			expect(saveComment.id).toBeDefined();
			expect(saveComment.boardId).toBeNull();
			expect(saveComment.imageId).toBe(1);
			expect(saveComment.userId).toBe(DEFAULT_MEMBER.id);
			expect(saveComment.content).toBe(contentFixture);
			expect(saveComment.groupNo).toBe(saveComment.id);
			expect(saveComment.indent).toBe(0);
			expect(saveComment.upperNo).toBe(`${saveComment.id}`);
		});
	});

	describe('deleteCommentService', () => {
		it('정상 처리', async () => {
			await deleteCommentService(1, DEFAULT_MEMBER.id);

			const saveComment = await Comment.findOne({ where: { id: 1 } });
			expect(saveComment).toBeNull();
		});

		it('데이터가 없는 경우', async () => {
			const deleteCommentSpy = jest.spyOn(CommentRepository, 'deleteComment');
			try {
				await deleteCommentService(999999, DEFAULT_MEMBER.id);
			}catch(error) {
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatusCode.BAD_REQUEST);
				expect(error.message).toBe(ResponseStatus.BAD_REQUEST.MESSAGE);
				expect(deleteCommentSpy).not.toHaveBeenCalled();
			}
		})

		it('작성자가 아닌 경우', async () => {
			const deleteCommentSpy = jest.spyOn(CommentRepository, 'deleteComment');
			try {
				await deleteCommentService(1, WRONG_USER_ID);
			}catch(error) {
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatusCode.FORBIDDEN);
				expect(error.message).toBe(ResponseStatus.FORBIDDEN.MESSAGE);
				expect(deleteCommentSpy).not.toHaveBeenCalled();
			}
		});
	});

	describe('postReplyCommentService', () => {
		const contentFixture = 'testReplyCommentContent';
		it('정상 처리', async () => {
			await postReplyCommentService(1, { content: contentFixture }, DEFAULT_MEMBER.id);

			const saveComment = await Comment.findOne({ order: [['id', 'DESC']], limit: 1 });
			expect(saveComment).toBeDefined();
			expect(saveComment.boardId).toBe(1);
			expect(saveComment.imageId).toBeNull();
			expect(saveComment.userId).toBe(DEFAULT_MEMBER.id);
			expect(saveComment.content).toBe(contentFixture);
			expect(saveComment.groupNo).toBe(1);
			expect(saveComment.indent).toBe(1);
			expect(saveComment.upperNo).toBe(`1,${saveComment.id}`);
		});

		it('원본 아이디가 잘못 된 경우', async () => {
			const postReplyCommentSpy = jest.spyOn(CommentRepository, 'postReplyComment');
			try {
				await postReplyCommentService(99999, { content: contentFixture }, DEFAULT_MEMBER.id);
			}catch(error) {
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatusCode.BAD_REQUEST);
				expect(error.message).toBe(ResponseStatus.BAD_REQUEST.MESSAGE);
				expect(postReplyCommentSpy).not.toHaveBeenCalled();
			}
		})
	});
});