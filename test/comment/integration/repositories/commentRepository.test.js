import { CommentRepository } from '#repositories/commentRepository.js';
import { sequelize, Comment, Member, Auth, Board, ImageBoard } from '#models/index.js';
import CustomError from '#errors/customError.js';
import { ResponseStatus } from '#constants/responseStatus.js';

const SAVE_MEMBER = {
	id: 1,
	userId: 'tester',
	password: 'tester1234',
	username: 'testerName',
	nickname: 'testerNickname',
	email: 'tester@tester.com',
	profile: 'testerProfile.jpg',
	provider: 'local',
}

const DEFAULT_USER_ID = 1;

const SAVE_BOARD = {
	id: 1,
	title: 'testTitle',
	content: 'testContent',
	createdAt: new Date(),
	userId: DEFAULT_USER_ID,
	groupNo: 1,
	upperNo: '1',
	indent: 1,
}

const SAVE_IMAGE_BOARD = {
	id: 1,
	title: 'testTitle',
	content: 'testContent',
	createdAt: new Date(),
	userId: DEFAULT_USER_ID,
}

const COMMENT_FIXTURE_LENGTH = 30;
const COMMENT_AMOUNT = 20;

describe('commentRepository test', () => {
	beforeAll(async () => {
		await sequelize.authenticate();
		await sequelize.sync({ force: true });

		await Member.create({
			id: SAVE_MEMBER.id,
			userId: SAVE_MEMBER.userId,
			password: SAVE_MEMBER.password,
			username: SAVE_MEMBER.username,
			nickname: SAVE_MEMBER.nickname,
			email: SAVE_MEMBER.email,
			profile: SAVE_MEMBER.profile,
			provider: SAVE_MEMBER.provider,
		});

		await Auth.create({
			userId: DEFAULT_USER_ID,
			auth: 'ROLE_MEMBER',
		});

		await Board.create({
			id: SAVE_BOARD.id,
			title: SAVE_BOARD.title,
			content: SAVE_BOARD.content,
			createdAt: SAVE_BOARD.createdAt,
			userId: DEFAULT_USER_ID,
			groupNo: SAVE_BOARD.groupNo,
			upperNo: SAVE_BOARD.upperNo,
			indent: SAVE_BOARD.indent,
		});

		await ImageBoard.create({
			id: SAVE_IMAGE_BOARD.id,
			title: SAVE_IMAGE_BOARD.title,
			content: SAVE_IMAGE_BOARD.content,
			createdAt: SAVE_IMAGE_BOARD.createdAt,
			userId: SAVE_IMAGE_BOARD.userId,
		});
	});

	afterAll(async () => {
		await ImageBoard.destroy({ where: {} });
		await Board.destroy({ where: {} });
		await Auth.destroy({ where: {} });
		await Member.destroy({ where: {} });
		await sequelize.close();
	});

	beforeEach(async () => {
		for(let i = 1; i <= COMMENT_FIXTURE_LENGTH; i++) {
			await Comment.create({
				id: i,
				boardId: SAVE_BOARD.id,
				imageId: null,
				userId: DEFAULT_USER_ID,
				content: `testBoardContent${i}`,
				createdAt: new Date(),
				groupNo: i,
				indent: 1,
				upperNo: `${i}`,
			});

			await Comment.create({
				id: i + COMMENT_FIXTURE_LENGTH,
				boardId: null,
				imageId: SAVE_IMAGE_BOARD.id,
				userId: DEFAULT_USER_ID,
				content: `testImageBoardContent${i + COMMENT_FIXTURE_LENGTH}`,
				createdAt: new Date(),
				groupNo: i + COMMENT_FIXTURE_LENGTH,
				indent: 1,
				upperNo: `${i + COMMENT_FIXTURE_LENGTH}`,
			});
		}
	})

	afterEach(async () => {
		await Comment.destroy({
			where: {},
			force: true
		});
	});

	describe('getCommentListPageable', () => {
		it('Board 기준 정상 조회', async () => {
			const commentList = await CommentRepository.getCommentListPageable({ boardId: SAVE_BOARD.id, page: 1 });

			expect(commentList).toBeDefined();
			expect(commentList.items.length).toBe(COMMENT_AMOUNT);
			expect(commentList.totalPages).toBe(Math.ceil(COMMENT_FIXTURE_LENGTH / COMMENT_AMOUNT));

			commentList.items.forEach((comment) => {
				expect(comment.id).toBeLessThanOrEqual(COMMENT_FIXTURE_LENGTH);
				expect(comment.writer).toBe(SAVE_MEMBER.nickname);
				expect(comment.writerId).toBe(SAVE_MEMBER.userId);
				expect(comment.content).toBe(`testBoardContent${comment.id}`);
				expect(comment.groupNo).toBeUndefined();
				expect(comment.indent).toBe(1);
				expect(comment.upperNo).toBeUndefined();
				expect(comment.deletedAt).toBeNull();
			});
		});

		it('ImageBoard 기준 정상 조회', async () => {
			const commentList = await CommentRepository.getCommentListPageable({ imageId: SAVE_IMAGE_BOARD.id, page: 1 });

			expect(commentList).toBeDefined();
			expect(commentList.items.length).toBe(COMMENT_AMOUNT);
			expect(commentList.totalPages).toBe(Math.ceil(COMMENT_FIXTURE_LENGTH / COMMENT_AMOUNT));
			commentList.items.forEach((comment) => {
				expect(comment.id).toBeGreaterThan(COMMENT_FIXTURE_LENGTH);
				expect(comment.writer).toBe(SAVE_MEMBER.nickname);
				expect(comment.writerId).toBe(SAVE_MEMBER.userId);
				expect(comment.content).toBe(`testImageBoardContent${comment.id}`);
				expect(comment.groupNo).toBeUndefined();
				expect(comment.indent).toBe(1);
				expect(comment.upperNo).toBeUndefined();
				expect(comment.deletedAt).toBeNull();
			});
		});

		it('데이터가 없는 경우', async () => {
			await Comment.destroy({ where: {} });
			const commentList = await CommentRepository.getCommentListPageable({ boardId: SAVE_BOARD.id, page: 1 });

			expect(commentList).toBeDefined();
			expect(commentList.items.length).toBe(0);
			expect(commentList.totalPages).toBe(0);
		});

		it('계층형 구조', async () => {
			const startCommentNo = COMMENT_FIXTURE_LENGTH * 2 + 1;
			const baseCommentGroupNo = COMMENT_FIXTURE_LENGTH * 2;
			await Comment.create({
				id: startCommentNo,
				boardId: null,
				imageId: SAVE_IMAGE_BOARD.id,
				userId: DEFAULT_USER_ID,
				content: `testImageBoardContent${startCommentNo}`,
				createdAt: new Date(),
				groupNo: baseCommentGroupNo,
				indent: 2,
				upperNo: `${baseCommentGroupNo},${startCommentNo}`,
			})

			await Comment.create({
				id: startCommentNo + 1,
				boardId: null,
				imageId: SAVE_IMAGE_BOARD.id,
				userId: DEFAULT_USER_ID,
				content: `testImageBoardContent${startCommentNo + 1}`,
				createdAt: new Date(),
				groupNo: baseCommentGroupNo,
				indent: 2,
				upperNo: `${baseCommentGroupNo},${startCommentNo + 1}`,
			})

			await Comment.create({
				id: startCommentNo + 2,
				boardId: null,
				imageId: SAVE_IMAGE_BOARD.id,
				userId: DEFAULT_USER_ID,
				content: `testImageBoardContent${startCommentNo + 2}`,
				createdAt: new Date(),
				groupNo: baseCommentGroupNo,
				indent: 3,
				upperNo: `${baseCommentGroupNo},${startCommentNo},${startCommentNo + 2}`,
			})
			

			const commentList = await CommentRepository.getCommentListPageable({ imageId: SAVE_IMAGE_BOARD.id, page: 1 });

			expect(commentList).toBeDefined();
			expect(commentList.items.length).toBe(COMMENT_AMOUNT);
			expect(commentList.totalPages).toBe(Math.ceil(COMMENT_FIXTURE_LENGTH / COMMENT_AMOUNT));
			expect(commentList.items[0].id).toBe(startCommentNo - 1);
			expect(commentList.items[1].id).toBe(startCommentNo);
			expect(commentList.items[2].id).toBe(startCommentNo + 2);
			expect(commentList.items[3].id).toBe(startCommentNo + 1);
			expect(commentList.items[4].id).toBe(startCommentNo - 2);
		})
	});

	describe('postComment', () => {
		it('Board 기준 정상 처리', async () => {
			const comment = await CommentRepository.postComment(
				SAVE_BOARD.id,
				null, 
				DEFAULT_USER_ID, 
				'testPostBoardComment', 
			);

			expect(comment).toBeDefined();
			
			const saveComment = await Comment.findOne({ where: { id: comment.id } });
			expect(saveComment).toBeDefined();
			expect(saveComment.id).toBe(comment.id);
			expect(saveComment.boardId).toBe(SAVE_BOARD.id);
			expect(saveComment.imageId).toBeNull();
			expect(saveComment.userId).toBe(DEFAULT_USER_ID);
			expect(saveComment.content).toBe('testPostBoardComment');
			expect(saveComment.groupNo).toBe(comment.id);
			expect(saveComment.indent).toBe(1);
			expect(saveComment.upperNo).toBe(`${comment.id}`);
		});

		it('ImageBoard 기준 정상 처리', async () => {
			const comment = await CommentRepository.postComment(
				null, 
				SAVE_IMAGE_BOARD.id,
				DEFAULT_USER_ID, 
				'testPostImageBoardComment', 
			);

			expect(comment).toBeDefined();
			
			const saveComment = await Comment.findOne({ where: { id: comment.id } });
			expect(saveComment).toBeDefined();
			expect(saveComment.id).toBe(comment.id);
			expect(saveComment.boardId).toBeNull();
			expect(saveComment.imageId).toBe(SAVE_IMAGE_BOARD.id);
			expect(saveComment.userId).toBe(DEFAULT_USER_ID);
			expect(saveComment.content).toBe('testPostImageBoardComment');
			expect(saveComment.groupNo).toBe(comment.id);
			expect(saveComment.indent).toBe(1);
			expect(saveComment.upperNo).toBe(`${comment.id}`);
		});
	});

	describe('deleteComment', () => {
		it('정상 처리', async () => {
			await CommentRepository.deleteComment(1);

			const comment = await Comment.findOne({ where: { id: 1 } });
			expect(comment).toBeNull();
		});
	});

	describe('postReplyComment', () => {
		it('정상 처리', async () => {
			const comment = await CommentRepository.postReplyComment(
				SAVE_BOARD.id,
				null, 
				'testPostReplyBoardComment', 
				COMMENT_FIXTURE_LENGTH,
				1,
				`${COMMENT_FIXTURE_LENGTH}`,
				DEFAULT_USER_ID,
			);

			expect(comment).toBeDefined();

			const saveComment = await Comment.findOne({ where: { id: comment.id } });

			expect(saveComment).toBeDefined();
			expect(saveComment.id).toBe(comment.id);
			expect(saveComment.boardId).toBe(SAVE_BOARD.id);
			expect(saveComment.imageId).toBeNull();
			expect(saveComment.userId).toBe(DEFAULT_USER_ID);
			expect(saveComment.content).toBe('testPostReplyBoardComment');
			expect(saveComment.groupNo).toBe(COMMENT_FIXTURE_LENGTH);
			expect(saveComment.indent).toBe(1);
			expect(saveComment.upperNo).toBe(`${COMMENT_FIXTURE_LENGTH},${comment.id}`);
		});
	});

	describe('checkCommentWriter', () => {
		it('정상 처리', async () => {
			const result = await CommentRepository.checkCommentWriter(1, DEFAULT_USER_ID);

			expect(result).toBeDefined();
			expect(result.userId).toBe(DEFAULT_USER_ID);
		});

		it('데이터가 없는 경우', async () => {
			try {
				await CommentRepository.checkCommentWriter(0, DEFAULT_USER_ID);
			}catch(error) {
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatus.NOT_FOUND.CODE);
				expect(error.message).toBe(ResponseStatus.NOT_FOUND.MESSAGE);
			}
		});
	});
})