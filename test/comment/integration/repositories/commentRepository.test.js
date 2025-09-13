import { CommentRepository } from '#repositories/commentRepository.js';
import { sequelize, Comment, Member, Auth, Board, ImageBoard } from '#models/index.js';
import CustomError from '#errors/customError.js';
import { ResponseStatus } from '#constants/responseStatus.js';

const SAVE_MEMBER = {
	userId: 'tester',
	userPw: 'tester1234',
	userName: 'testerName',
	nickName: 'testerNickName',
	email: 'tester@tester.com',
	profileThumbnail: 'testerProfileThumbnail.jpg',
	provider: 'local',
}

const DEFAULT_USER_ID = 'tester';

const SAVE_BOARD = {
	boardNo: 1,
	boardTitle: 'testTitle',
	boardContent: 'testContent',
	boardDate: new Date(),
	userId: DEFAULT_USER_ID,
	boardGroupNo: 1,
	boardUpperNo: '1',
	boardIndent: 1,
}

const SAVE_IMAGE_BOARD = {
	imageNo: 1,
	imageTitle: 'testTitle',
	imageContent: 'testContent',
	imageDate: new Date(),
	userId: DEFAULT_USER_ID,
}

const COMMENT_FIXTURE_LENGTH = 30;
const COMMENT_AMOUNT = 20;

describe('commentRepository test', () => {
	beforeAll(async () => {
		await sequelize.authenticate();
		await sequelize.sync({ force: true });

		await Member.create({
			userId: DEFAULT_USER_ID,
			userPw: SAVE_MEMBER.userPw,
			userName: SAVE_MEMBER.userName,
			nickName: SAVE_MEMBER.nickName,
			email: SAVE_MEMBER.email,
			profileThumbnail: SAVE_MEMBER.profileThumbnail,
			provider: SAVE_MEMBER.provider,
		});

		await Auth.create({
			userId: DEFAULT_USER_ID,
			auth: 'ROLE_MEMBER',
		});

		await Board.create({
			boardNo: SAVE_BOARD.boardNo,
			boardTitle: SAVE_BOARD.boardTitle,
			boardContent: SAVE_BOARD.boardContent,
			boardDate: SAVE_BOARD.boardDate,
			userId: DEFAULT_USER_ID,
			boardGroupNo: SAVE_BOARD.boardGroupNo,
			boardUpperNo: SAVE_BOARD.boardUpperNo,
			boardIndent: SAVE_BOARD.boardIndent,
		});

		await ImageBoard.create({
			imageNo: SAVE_IMAGE_BOARD.imageNo,
			imageTitle: SAVE_IMAGE_BOARD.imageTitle,
			imageContent: SAVE_IMAGE_BOARD.imageContent,
			imageDate: SAVE_IMAGE_BOARD.imageDate,
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
				commentNo: i,
				boardNo: SAVE_BOARD.boardNo,
				imageNo: null,
				userId: DEFAULT_USER_ID,
				commentContent: `testBoardContent${i}`,
				commentDate: new Date(),
				commentGroupNo: i,
				commentIndent: 1,
				commentUpperNo: `${i}`,
			});

			await Comment.create({
				commentNo: i + COMMENT_FIXTURE_LENGTH,
				boardNo: null,
				imageNo: SAVE_IMAGE_BOARD.imageNo,
				userId: DEFAULT_USER_ID,
				commentContent: `testImageBoardContent${i + COMMENT_FIXTURE_LENGTH}`,
				commentDate: new Date(),
				commentGroupNo: i + COMMENT_FIXTURE_LENGTH,
				commentIndent: 1,
				commentUpperNo: `${i + COMMENT_FIXTURE_LENGTH}`,
			});
		}
	})

	afterEach(async () => {
		await Comment.destroy({ where: {} });
	});

	describe('getCommentListPageable', () => {
		it('Board 기준 정상 조회', async () => {
			const commentList = await CommentRepository.getCommentListPageable({ boardNo: SAVE_BOARD.boardNo, pageNum: 1 });

			expect(commentList).toBeDefined();
			expect(commentList.rows.length).toBe(COMMENT_AMOUNT);
			expect(commentList.count).toBe(COMMENT_FIXTURE_LENGTH);
			commentList.rows.forEach((comment) => {
				expect(comment.commentNo).toBeLessThanOrEqual(COMMENT_FIXTURE_LENGTH);
				expect(comment.userId).toBe(DEFAULT_USER_ID);
				expect(comment.commentContent).toBe(`testBoardContent${comment.commentNo}`);
				expect(comment.commentGroupNo).toBe(comment.commentNo);
				expect(comment.commentIndent).toBe(1);
				expect(comment.commentUpperNo).toBe(`${comment.commentNo}`);
			});
		});

		it('ImageBoard 기준 정상 조회', async () => {
			const commentList = await CommentRepository.getCommentListPageable({ imageNo: SAVE_IMAGE_BOARD.imageNo, pageNum: 1 });

			expect(commentList).toBeDefined();
			expect(commentList.rows.length).toBe(COMMENT_AMOUNT);
			expect(commentList.count).toBe(COMMENT_FIXTURE_LENGTH);
			commentList.rows.forEach((comment) => {
				expect(comment.commentNo).toBeGreaterThan(COMMENT_FIXTURE_LENGTH);
				expect(comment.userId).toBe(DEFAULT_USER_ID);
				expect(comment.commentContent).toBe(`testImageBoardContent${comment.commentNo}`);
				expect(comment.commentGroupNo).toBe(comment.commentNo);
				expect(comment.commentIndent).toBe(1);
				expect(comment.commentUpperNo).toBe(`${comment.commentNo}`);
			});
		});

		it('데이터가 없는 경우', async () => {
			await Comment.destroy({ where: {} });
			const commentList = await CommentRepository.getCommentListPageable({ boardNo: SAVE_BOARD.boardNo, pageNum: 1 });

			expect(commentList).toBeDefined();
			expect(commentList.rows.length).toBe(0);
			expect(commentList.count).toBe(0);
		});

		it('계층형 구조', async () => {
			const startCommentNo = COMMENT_FIXTURE_LENGTH * 2 + 1;
			const baseCommentGroupNo = COMMENT_FIXTURE_LENGTH * 2;
			await Comment.create({
				commentNo: startCommentNo,
				boardNo: null,
				imageNo: SAVE_IMAGE_BOARD.imageNo,
				userId: DEFAULT_USER_ID,
				commentContent: `testImageBoardContent${startCommentNo}`,
				commentDate: new Date(),
				commentGroupNo: baseCommentGroupNo,
				commentIndent: 2,
				commentUpperNo: `${baseCommentGroupNo},${startCommentNo}`,
			})

			await Comment.create({
				commentNo: startCommentNo + 1,
				boardNo: null,
				imageNo: SAVE_IMAGE_BOARD.imageNo,
				userId: DEFAULT_USER_ID,
				commentContent: `testImageBoardContent${startCommentNo + 1}`,
				commentDate: new Date(),
				commentGroupNo: baseCommentGroupNo,
				commentIndent: 2,
				commentUpperNo: `${baseCommentGroupNo},${startCommentNo + 1}`,
			})

			await Comment.create({
				commentNo: startCommentNo + 2,
				boardNo: null,
				imageNo: SAVE_IMAGE_BOARD.imageNo,
				userId: DEFAULT_USER_ID,
				commentContent: `testImageBoardContent${startCommentNo + 2}`,
				commentDate: new Date(),
				commentGroupNo: baseCommentGroupNo,
				commentIndent: 3,
				commentUpperNo: `${baseCommentGroupNo},${startCommentNo},${startCommentNo + 2}`,
			})
			

			const commentList = await CommentRepository.getCommentListPageable({ imageNo: SAVE_IMAGE_BOARD.imageNo, pageNum: 1 });

			expect(commentList).toBeDefined();
			expect(commentList.rows.length).toBe(COMMENT_AMOUNT);
			expect(commentList.count).toBe(COMMENT_FIXTURE_LENGTH + 3);
			expect(commentList.rows[0].commentNo).toBe(startCommentNo - 1);
			expect(commentList.rows[1].commentNo).toBe(startCommentNo);
			expect(commentList.rows[2].commentNo).toBe(startCommentNo + 2);
			expect(commentList.rows[3].commentNo).toBe(startCommentNo + 1);
			expect(commentList.rows[4].commentNo).toBe(startCommentNo - 2);
		})
	});

	describe('postComment', () => {
		it('Board 기준 정상 처리', async () => {
			const comment = await CommentRepository.postComment(
				SAVE_BOARD.boardNo, 
				null, 
				DEFAULT_USER_ID, 
				'testPostBoardComment', 
			);

			expect(comment).toBeDefined();
			
			const saveComment = await Comment.findOne({ where: { commentNo: comment.commentNo } });
			expect(saveComment).toBeDefined();
			expect(saveComment.commentNo).toBe(comment.commentNo);
			expect(saveComment.boardNo).toBe(SAVE_BOARD.boardNo);
			expect(saveComment.imageNo).toBeNull();
			expect(saveComment.userId).toBe(DEFAULT_USER_ID);
			expect(saveComment.commentContent).toBe('testPostBoardComment');
			expect(saveComment.commentGroupNo).toBe(comment.commentNo);
			expect(saveComment.commentIndent).toBe(1);
			expect(saveComment.commentUpperNo).toBe(`${comment.commentNo}`);
		});

		it('ImageBoard 기준 정상 처리', async () => {
			const comment = await CommentRepository.postComment(
				null, 
				SAVE_IMAGE_BOARD.imageNo, 
				DEFAULT_USER_ID, 
				'testPostImageBoardComment', 
			);

			expect(comment).toBeDefined();
			
			const saveComment = await Comment.findOne({ where: { commentNo: comment.commentNo } });
			expect(saveComment).toBeDefined();
			expect(saveComment.commentNo).toBe(comment.commentNo);
			expect(saveComment.boardNo).toBeNull();
			expect(saveComment.imageNo).toBe(SAVE_IMAGE_BOARD.imageNo);
			expect(saveComment.userId).toBe(DEFAULT_USER_ID);
			expect(saveComment.commentContent).toBe('testPostImageBoardComment');
			expect(saveComment.commentGroupNo).toBe(comment.commentNo);
			expect(saveComment.commentIndent).toBe(1);
			expect(saveComment.commentUpperNo).toBe(`${comment.commentNo}`);
		});
	});

	describe('deleteComment', () => {
		it('정상 처리', async () => {
			await CommentRepository.deleteComment(1);

			const comment = await Comment.findOne({ where: { commentNo: 1 } });
			expect(comment).toBeNull();
		});
	});

	describe('postReplyComment', () => {
		it('정상 처리', async () => {
			const comment = await CommentRepository.postReplyComment(
				SAVE_BOARD.boardNo, 
				null, 
				'testPostReplyBoardComment', 
				COMMENT_FIXTURE_LENGTH,
				1,
				`${COMMENT_FIXTURE_LENGTH}`,
				DEFAULT_USER_ID,
			);

			expect(comment).toBeDefined();

			const saveComment = await Comment.findOne({ where: { commentNo: comment.commentNo } });

			expect(saveComment).toBeDefined();
			expect(saveComment.commentNo).toBe(comment.commentNo);
			expect(saveComment.boardNo).toBe(SAVE_BOARD.boardNo);
			expect(saveComment.imageNo).toBeNull();
			expect(saveComment.userId).toBe(DEFAULT_USER_ID);
			expect(saveComment.commentContent).toBe('testPostReplyBoardComment');
			expect(saveComment.commentGroupNo).toBe(COMMENT_FIXTURE_LENGTH);
			expect(saveComment.commentIndent).toBe(1);
			expect(saveComment.commentUpperNo).toBe(`${COMMENT_FIXTURE_LENGTH},${comment.commentNo}`);
		});
	});

	describe('checkCommentWriter', () => {
		it('정상 처리', async () => {
			const result = await CommentRepository.checkCommentWriter(1, DEFAULT_USER_ID);

			expect(result).toBeDefined();
			expect(result.userId).toBe(DEFAULT_USER_ID);
		});

		it('데이터가 없는 경우', async () => {
			const result = await CommentRepository.checkCommentWriter(0, DEFAULT_USER_ID);

			expect(result).toBeNull();
		});
	});
})