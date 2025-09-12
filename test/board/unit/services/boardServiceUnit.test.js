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
const DEFAULT_USER_ID = 'tester';
const WRONG_USER_ID = 'tester2';

describe('boardService unit test', () => {
	beforeAll(async () => {
		for(let i = 1; i <= 20; i++) {
			SAVE_BOARD_LIST.push({
				boardNo: i,
				boardTitle: `testTitle${i}`,
				boardContent: `testContent${i}`,
				boardDate: new Date(),
				boardGroupNo: i,
				boardUpperNo: i.toString(),
				boardIndent: 1,
				userId: DEFAULT_USER_ID,
			});
		}
	});

	describe('getBoardListService', () => {
		it('정상 조회', async () => {
			jest.spyOn(BoardRepository, 'getBoardListPageable').mockResolvedValue({ rows: SAVE_BOARD_LIST, count: 20 });

			const result = await getBoardListService({ keyword: '', searchType: '', pageNum: 1 });

			expect(result.content.length).toBe(BOARD_AMOUNT);
			expect(result.empty).toBe(false);
			expect(result.totalElements).toBe(SAVE_BOARD_LIST.length);
		});

		it('데이터가 없는 경우', async () => {
			jest.spyOn(BoardRepository, 'getBoardListPageable').mockResolvedValue({
				rows: [],
				count: 0,
			});
			const result = await getBoardListService({ keyword: '', searchType: '', pageNum: 1 });

			expect(result.content.length).toBe(0);
			expect(result.empty).toBe(true);
			expect(result.totalElements).toBe(0);
		});
	});
	
	describe('getBoardDetailService', () => {
		it('정상 조회', async () => {
			const saveBoard = SAVE_BOARD_LIST[0];
			jest.spyOn(BoardRepository, 'getBoardDetail')
				.mockResolvedValue({
					boardNo: saveBoard.boardNo,
					boardTitle: saveBoard.boardTitle,
					boardContent: saveBoard.boardContent,
					userId: saveBoard.userId,
					boardDate: saveBoard.boardDate,
				});
			const result = await getBoardDetailService(saveBoard.boardNo);

			expect(result.boardNo).toBe(saveBoard.boardNo);
			expect(result.boardTitle).toBe(saveBoard.boardTitle);
			expect(result.boardContent).toBe(saveBoard.boardContent);
			expect(result.userId).toBe(saveBoard.userId);
			expect(result.boardDate).toBe(saveBoard.boardDate);
		});

		it('데이터가 없는 경우', async () => {
			jest.spyOn(BoardRepository, 'getBoardDetail').mockRejectedValue(new CustomError(ResponseStatus.NOT_FOUND));
			try {
				await getBoardDetailService(0);
			}catch(error) {
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatus.NOT_FOUND.CODE);
				expect(error.message).toBe(ResponseStatus.NOT_FOUND.MESSAGE);
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
			const result = await postBoardService('tester', { boardTitle: 'testTitle', boardContent: 'testContent' });
			expect(BoardRepository.postBoard)
				.toHaveBeenCalledWith(
					'testTitle',
					'testContent',
					'tester', 
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
				await postBoardService('tester', { boardTitle: 'testTitle', boardContent: 'testContent' });
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
				boardNo: SAVE_BOARD_LIST[0].boardNo,
				boardTitle: SAVE_BOARD_LIST[0].boardTitle,
				boardContent: SAVE_BOARD_LIST[0].boardContent,
				userId: SAVE_BOARD_LIST[0].userId,
			}
			jest.spyOn(BoardRepository, 'getPatchDetailData').mockResolvedValue(resultData);
			const result = await patchBoardDetailDataService(DEFAULT_USER_ID, 1);
			expect(result).toEqual(resultData);
		});

		it('데이터가 없는 경우', async () => {
			jest.spyOn(BoardRepository, 'getPatchDetailData').mockRejectedValue(new CustomError(ResponseStatus.NOT_FOUND));
			try {
				await patchBoardDetailDataService(DEFAULT_USER_ID, 0);
			}catch(error) {
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatus.NOT_FOUND.CODE);
				expect(error.message).toBe(ResponseStatus.NOT_FOUND.MESSAGE);
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
			jest.spyOn(BoardRepository, 'getBoardDetail').mockResolvedValue({
				boardNo: SAVE_BOARD_LIST[0].boardNo,
				boardTitle: SAVE_BOARD_LIST[0].boardTitle,
				boardContent: SAVE_BOARD_LIST[0].boardContent,
				userId: SAVE_BOARD_LIST[0].userId,
				boardDate: SAVE_BOARD_LIST[0].boardDate,
			});
			jest.spyOn(BoardRepository, 'patchBoard').mockResolvedValue(1);
			const result = await patchBoardService(DEFAULT_USER_ID, 1, { boardTitle: 'testTitle', boardContent: 'testContent' });
			expect(result).toBe(1);
		});

		it('작성자가 아닌 경우', async () => {
			jest.spyOn(BoardRepository, 'getBoardDetail').mockResolvedValue({
				boardNo: SAVE_BOARD_LIST[0].boardNo,
				boardTitle: SAVE_BOARD_LIST[0].boardTitle,
				boardContent: SAVE_BOARD_LIST[0].boardContent,
				userId: WRONG_USER_ID,
				boardDate: SAVE_BOARD_LIST[0].boardDate,
			});
			try {
				await patchBoardService(DEFAULT_USER_ID, 1, { boardTitle: 'testTitle', boardContent: 'testContent' });
			}catch(error) {
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatus.FORBIDDEN.CODE);
				expect(error.message).toBe(ResponseStatus.FORBIDDEN.MESSAGE);
			}
		});
	});

	describe('deleteBoardService', () => {
		it('정상 삭제', async () => {
			jest.spyOn(BoardRepository, 'getBoardDetail').mockResolvedValue({
				boardNo: SAVE_BOARD_LIST[0].boardNo,
				boardTitle: SAVE_BOARD_LIST[0].boardTitle,
				boardContent: SAVE_BOARD_LIST[0].boardContent,
				userId: SAVE_BOARD_LIST[0].userId,
				boardDate: SAVE_BOARD_LIST[0].boardDate,
			});
			jest.spyOn(BoardRepository, 'deleteBoard').mockResolvedValue(1);
			await deleteBoardService(DEFAULT_USER_ID, 1);
		});

		it('작성자가 아닌 경우', async () => {
			jest.spyOn(BoardRepository, 'getBoardDetail').mockResolvedValue({
				boardNo: SAVE_BOARD_LIST[0].boardNo,
				boardTitle: SAVE_BOARD_LIST[0].boardTitle,
				boardContent: SAVE_BOARD_LIST[0].boardContent,
				userId: WRONG_USER_ID,
				boardDate: SAVE_BOARD_LIST[0].boardDate,
			});
			try {
				await deleteBoardService(DEFAULT_USER_ID, 1);
			}catch(error) {
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatus.FORBIDDEN.CODE);
				expect(error.message).toBe(ResponseStatus.FORBIDDEN.MESSAGE);
			}
		});
	});
	
	describe('getReplyDetailService', () => {
		it('정상 조회', async () => {
			jest.spyOn(BoardRepository, 'getReplyDetail').mockResolvedValue(SAVE_BOARD_LIST[0]);
			const result = await getReplyDetailService(1);
			expect(result).toEqual(SAVE_BOARD_LIST[0]);
		});
	});
	
	describe('postBoardReplyService', () => {
		it('정상 저장', async () => {
			const mockTransaction = {
				commit: jest.fn(),
				rollback: jest.fn(),
			}
			jest.spyOn(sequelize, 'transaction').mockResolvedValue(mockTransaction);
			jest.spyOn(BoardRepository, 'postBoardReply').mockResolvedValue(1);
			const result = await postBoardReplyService(DEFAULT_USER_ID, { boardTitle: 'testTitle', boardContent: 'testContent', boardGroupNo: 1, boardIndent: 1, boardUpperNo: '1' });
			expect(result).toBe(1);
			expect(BoardRepository.postBoardReply)
				.toHaveBeenCalledWith(
					'testTitle', 
					'testContent', 
					1, 
					2, '1', DEFAULT_USER_ID, { transaction: mockTransaction }
				);
			expect(mockTransaction.commit).toHaveBeenCalled();
			expect(mockTransaction.rollback).not.toHaveBeenCalled();
		});

		it('저장시 오류 발생', async () => {
			const mockTransaction = {
				commit: jest.fn(),
				rollback: jest.fn(),
			}
			jest.spyOn(sequelize, 'transaction').mockResolvedValue(mockTransaction);
			jest.spyOn(BoardRepository, 'postBoardReply').mockRejectedValue(new Error('오류 발생'));
			try {
				await postBoardReplyService(DEFAULT_USER_ID, { boardTitle: 'testTitle', boardContent: 'testContent', boardGroupNo: 1, boardIndent: 1, boardUpperNo: '1' });
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