import { jest } from '@jest/globals';
import { BoardRepository } from '#repositories/boardRepository.js';
import CustomError from '#errors/customError.js';
import { ResponseStatus } from '#constants/responseStatus.js';
import {
	getBoardListService,
	getBoardDetailService,
	postBoardService,
	patchBoardDetailDataService,
	patchBoardService,
	deleteBoardService,
	getReplyDetailService,
	postBoardReplyService,
} from '#services/board/boardService.js';
import { sequelize } from '#models/index.js';

const SAVE_BOARD_LIST = [];
const BOARD_AMOUNT = 20;
const DEFAULT_MEMBER = {
	id: 1,
	userId: 'tester',
	password: 'tester1234',
	username: 'testerName',
	nickname: 'testerNickName',
	email: 'tester@tester.com',
	profile: 'testerProfileThumbnail.jpg',
	provider: 'local'
}
const WRONG_USER_ID = 2;

describe('boardService unit test', () => {
	beforeAll(async () => {
		for(let i = 1; i <= 20; i++) {
			SAVE_BOARD_LIST.push({
				id: i,
				title: `testTitle${i}`,
				content: `testContent${i}`,
				createdAt: new Date(),
				groupNo: i,
				upperNo: i.toString(),
				indent: 0,
				userId: DEFAULT_MEMBER.id,
			});
		}
	});

	describe('getBoardListService', () => {
		const currentPage = 1;
		it('정상 조회', async () => {
			const mockItems = SAVE_BOARD_LIST.map(board => ({
				id: board.id,
				title: board.title,
				writer: DEFAULT_MEMBER.nickname,
				createdAt: board.createdAt,
				indent: board.indent
			}));
			jest.spyOn(BoardRepository, 'getBoardListPageable').mockResolvedValue({ items: mockItems, totalPages: 1, isEmpty: false, currentPage });

			const result = await getBoardListService({ keyword: '', searchType: '', page: currentPage });

			expect(result.items.length).toBe(BOARD_AMOUNT);
			expect(result.isEmpty).toBe(false);
			expect(result.totalPages).toBe(1);
			expect(result.currentPage).toBe(currentPage);
		});

		it('데이터가 없는 경우', async () => {
			jest.spyOn(BoardRepository, 'getBoardListPageable').mockResolvedValue({
				items: [],
				totalPages: 0,
				isEmpty: true,
				currentPage
			});
			const result = await getBoardListService({ keyword: '', searchType: '', page: currentPage });

			expect(result.items.length).toBe(0);
			expect(result.isEmpty).toBe(true);
			expect(result.totalPages).toBe(0);
			expect(result.currentPage).toBe(currentPage);
		});
	});
	
	describe('getBoardDetailService', () => {
		it('정상 조회', async () => {
			const saveBoard = SAVE_BOARD_LIST[0];
			jest.spyOn(BoardRepository, 'getBoardDetail')
				.mockResolvedValue({
					title: saveBoard.title,
					writer: DEFAULT_MEMBER.nickname,
					writerId: DEFAULT_MEMBER.userId,
					content: saveBoard.content,
					createdAt: saveBoard.createdAt,
				});
			const result = await getBoardDetailService(saveBoard.id);

			expect(result.id).toBeUndefined();
			expect(result.title).toBe(saveBoard.title);
			expect(result.writer).toBe(DEFAULT_MEMBER.nickname);
			expect(result.writerId).toBe(DEFAULT_MEMBER.userId);
			expect(result.content).toBe(saveBoard.content);
			expect(result.createdAt).toBe(saveBoard.createdAt);
		});

		it('데이터가 없는 경우', async () => {
			jest.spyOn(BoardRepository, 'getBoardDetail').mockResolvedValue(null);
			try {
				await getBoardDetailService(0);
			}catch(error) {
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatus.BAD_REQUEST.CODE);
				expect(error.message).toBe(ResponseStatus.BAD_REQUEST.MESSAGE);
			}
		});

		it('조회시 오류 발생', async () => {
			jest.spyOn(BoardRepository, 'getBoardDetail').mockRejectedValue(new Error('오류 발생'));
			try {
				await getBoardDetailService(0);
			}catch(error) {
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatus.INTERNAL_SERVER_ERROR.CODE);
				expect(error.message).toBe(ResponseStatus.INTERNAL_SERVER_ERROR.MESSAGE);
			}
		});
	});

	describe('postBoardService', () => {
		it('정상 저장', async () => {
			const mockTransaction = {
				commit: jest.fn(),
				rollback: jest.fn(),
			}
			jest.spyOn(sequelize, 'transaction').mockResolvedValue(mockTransaction);
			jest.spyOn(BoardRepository, 'postBoard').mockResolvedValue(1);
			const result = await postBoardService(1, { title: 'testTitle', content: 'testContent' });
			expect(BoardRepository.postBoard)
				.toHaveBeenCalledWith(
					'testTitle',
					'testContent',
					DEFAULT_MEMBER.id,
					{ transaction: mockTransaction }
				);
			expect(result).toBe(1);
			expect(mockTransaction.commit).toHaveBeenCalled();
		});

		it('저장시 오류 발생', async () => {
			const mockTransaction = {
				commit: jest.fn(),
				rollback: jest.fn(),
			}
			jest.spyOn(sequelize, 'transaction').mockResolvedValue(mockTransaction);
			jest.spyOn(BoardRepository, 'postBoard').mockRejectedValue(new Error('오류 발생'));
			try {
				await postBoardService(1, { title: 'testTitle', content: 'testContent' });
			}catch(error) {
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatus.INTERNAL_SERVER_ERROR.CODE);
				expect(error.message).toBe(ResponseStatus.INTERNAL_SERVER_ERROR.MESSAGE);
				expect(mockTransaction.commit).not.toHaveBeenCalled();
				expect(mockTransaction.rollback).toHaveBeenCalled();
			}
		});
	});

	describe('patchBoardDetailDataService', () => {
		it('정상 조회', async () => {
			const resultData = {
				id: SAVE_BOARD_LIST[0].id,
				title: SAVE_BOARD_LIST[0].title,
				content: SAVE_BOARD_LIST[0].content,
				userId: SAVE_BOARD_LIST[0].userId,
			}
			jest.spyOn(BoardRepository, 'getPatchDetailData').mockResolvedValue(resultData);
			const result = await patchBoardDetailDataService(DEFAULT_MEMBER.id, 1);

			expect(result).toEqual({
				title: resultData.title,
				content: resultData.content,
			});
		});

		it('데이터가 없는 경우', async () => {
			jest.spyOn(BoardRepository, 'getPatchDetailData').mockResolvedValue(null);
			try {
				await patchBoardDetailDataService(DEFAULT_MEMBER.id, 0);
			}catch(error) {
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatus.BAD_REQUEST.CODE);
				expect(error.message).toBe(ResponseStatus.BAD_REQUEST.MESSAGE);
			}
		});

		it('작성자가 아닌 경우', async () => {
			jest.spyOn(BoardRepository, 'getPatchDetailData').mockRejectedValue(new CustomError(ResponseStatus.FORBIDDEN));
			try {
				await patchBoardDetailDataService(WRONG_USER_ID, 1);
			}catch(error) {
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatus.FORBIDDEN.CODE);
				expect(error.message).toBe(ResponseStatus.FORBIDDEN.MESSAGE);
			}
		});
	});
	
	describe('patchBoardService', () => {
		it('정상 수정', async () => {
			jest.spyOn(BoardRepository, 'getBoardWriter').mockResolvedValue({ userId: DEFAULT_MEMBER.id });
			jest.spyOn(BoardRepository, 'patchBoard');
			const result = await patchBoardService(DEFAULT_MEMBER.id, 1, { title: 'testTitle', content: 'testContent' });

			expect(result).toBe(1);
		});

		it('작성자가 아닌 경우', async () => {
			jest.spyOn(BoardRepository, 'getBoardWriter').mockResolvedValue({ userId: WRONG_USER_ID });
			try {
				await patchBoardService(DEFAULT_MEMBER.id, 1, { title: 'testTitle', content: 'testContent' });
			}catch(error) {
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatus.FORBIDDEN.CODE);
				expect(error.message).toBe(ResponseStatus.FORBIDDEN.MESSAGE);
			}
		});
	});

	describe('deleteBoardService', () => {
		it('정상 삭제', async () => {
			jest.spyOn(BoardRepository, 'getBoardWriter').mockResolvedValue({ userId: DEFAULT_MEMBER.id });
			jest.spyOn(BoardRepository, 'findById').mockResolvedValue(SAVE_BOARD_LIST[0]);
			const deleteByGroupNoSpy = jest.spyOn(BoardRepository, 'deleteByGroupNo');
			const deleteByPathSpy = jest.spyOn(BoardRepository, 'deleteByPath');

			await deleteBoardService(DEFAULT_MEMBER.id, 1);

			expect(deleteByGroupNoSpy).toHaveBeenCalledTimes(1);
			expect(deleteByGroupNoSpy).toHaveBeenCalledWith(1);
			expect(deleteByPathSpy).not.toHaveBeenCalled();
		});

		it('정상 삭제. 중간 계층 삭제인 경우', async () => {
			jest.spyOn(BoardRepository, 'getBoardWriter').mockResolvedValue({ userId: DEFAULT_MEMBER.id });
			jest.spyOn(BoardRepository, 'findById').mockResolvedValue({
				id: 2,
				title: `testTitle1`,
				content: `testContent1`,
				createdAt: new Date(),
				groupNo: 1,
				upperNo: '1,2',
				indent: 1,
				userId: DEFAULT_MEMBER.id,
			});
			const deleteByGroupNoSpy = jest.spyOn(BoardRepository, 'deleteByGroupNo');
			const deleteByPathSpy = jest.spyOn(BoardRepository, 'deleteByPath');

			await deleteBoardService(DEFAULT_MEMBER.id, 2);

			expect(deleteByPathSpy).toHaveBeenCalledTimes(1);
			expect(deleteByPathSpy).toHaveBeenCalledWith(1, '1,2', '1,2,%');
			expect(deleteByGroupNoSpy).not.toHaveBeenCalled();
		});

		it('작성자가 아닌 경우', async () => {
			jest.spyOn(BoardRepository, 'getBoardWriter').mockResolvedValue({ userId: DEFAULT_MEMBER.id });
			jest.spyOn(BoardRepository, 'findById').mockResolvedValue(SAVE_BOARD_LIST[0]);
			const deleteByGroupNoSpy = jest.spyOn(BoardRepository, 'deleteByGroupNo');
			const deleteByPathSpy = jest.spyOn(BoardRepository, 'deleteByPath');

			try {
				await deleteBoardService(WRONG_USER_ID, 1);
			}catch(error) {
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatus.FORBIDDEN.CODE);
				expect(error.message).toBe(ResponseStatus.FORBIDDEN.MESSAGE);
				expect(deleteByGroupNoSpy).not.toHaveBeenCalled();
				expect(deleteByPathSpy).not.toHaveBeenCalled();
			}
		});
	});
	
	describe('getReplyDetailService', () => {
		it('정상 조회', async () => {
			jest.spyOn(BoardRepository, 'getReplyDetail').mockResolvedValue(SAVE_BOARD_LIST[0]);
			await getReplyDetailService(1);
		});

		it('데이터가 없는 경우', async () => {
			jest.spyOn(BoardRepository, 'getReplyDetail').mockResolvedValue(null);

			try {
				await getReplyDetailService(1);
			}catch(error) {
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatus.BAD_REQUEST.CODE);
				expect(error.message).toBe(ResponseStatus.BAD_REQUEST.MESSAGE);
			}
		});

		it('조회 중 오류 발생', async () => {
			jest.spyOn(BoardRepository, 'getReplyDetail').mockRejectedValue(new Error('오류 발생'));

			try {
				await getReplyDetailService(1);
			}catch(error) {
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatus.INTERNAL_SERVER_ERROR.CODE);
				expect(error.message).toBe(ResponseStatus.INTERNAL_SERVER_ERROR.MESSAGE);
			}
		})
	});
	
	describe('postBoardReplyService', () => {
		it('정상 저장', async () => {
			const targetBoardId = 1;
			const postBoardId = 2;
			const postTitle = 'testTitle';
			const postContent = 'testContent';
			const mockTransaction = {
				commit: jest.fn(),
				rollback: jest.fn(),
			}
			jest.spyOn(BoardRepository, 'getReplyDetail').mockResolvedValue(SAVE_BOARD_LIST[0]);
			jest.spyOn(sequelize, 'transaction').mockResolvedValue(mockTransaction);
			jest.spyOn(BoardRepository, 'postBoardReply').mockResolvedValue(postBoardId);

			const result = await postBoardReplyService(
				DEFAULT_MEMBER.id,
				targetBoardId,
				{
					title: postTitle,
					content: postContent
				});

			expect(result).toBe(postBoardId);
			expect(BoardRepository.postBoardReply)
				.toHaveBeenCalledWith(
					postTitle,
					postContent,
					SAVE_BOARD_LIST[0].groupNo,
					SAVE_BOARD_LIST[0].indent + 1,
					SAVE_BOARD_LIST[0].upperNo,
					DEFAULT_MEMBER.id,
					{ transaction: mockTransaction }
				);
			expect(mockTransaction.commit).toHaveBeenCalled();
			expect(mockTransaction.rollback).not.toHaveBeenCalled();
		});

		it('저장시 오류 발생', async () => {
			const mockTransaction = {
				commit: jest.fn(),
				rollback: jest.fn(),
			}
			jest.spyOn(BoardRepository, 'getReplyDetail').mockResolvedValue(SAVE_BOARD_LIST[0]);
			jest.spyOn(sequelize, 'transaction').mockResolvedValue(mockTransaction);
			jest.spyOn(BoardRepository, 'postBoardReply').mockRejectedValue(new Error('오류 발생'));
			try {
				await postBoardReplyService(DEFAULT_MEMBER.id, 1, { title: 'testTitle', content: 'testContent' });
			}catch(error) {
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatus.INTERNAL_SERVER_ERROR.CODE);
				expect(error.message).toBe(ResponseStatus.INTERNAL_SERVER_ERROR.MESSAGE);
				expect(mockTransaction.commit).not.toHaveBeenCalled();
				expect(mockTransaction.rollback).toHaveBeenCalled();
			}
		});
	});
})