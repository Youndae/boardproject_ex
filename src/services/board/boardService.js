import { BoardRepository } from '#repositories/boardRepository.js';
import logger from "#config/loggerConfig.js"
import CustomError from "#errors/customError.js"
import { ResponseStatus } from "#constants/responseStatus.js"
import { sequelize } from "#models/index.js"


export async function getBoardListService({keyword, searchType, pageNum = 1}) {
	try {
		const boardList = await BoardRepository.getBoardListPageable({keyword, searchType, pageNum});

		return {
				content: boardList.rows,
				empty: boardList.count === 0,
				totalElements: boardList.count
			}
	}catch (error) {
		logger.error('Failed to get board list service.')

		if(error instanceof CustomError)
			throw error;

		throw new CustomError(ResponseStatus.INTERNAL_SERVER_ERROR);
	}
}


export async function getBoardDetailService(boardNo) {
	try {
		const board = await BoardRepository.getBoardDetail(boardNo);

		return board;
	}catch (error) {
		logger.error('Failed to get board detail service.')

		if(error instanceof CustomError)
			throw error;

		throw new CustomError(ResponseStatus.INTERNAL_SERVER_ERROR);
	}
}


export async function postBoardService(userId, {boardTitle, boardContent}) {
	const transaction = await sequelize.transaction();
	try {
		const boardNo = await BoardRepository.postBoard(userId, {boardTitle, boardContent}, {transaction});

		await transaction.commit();

		return boardNo;
	}catch (error) {
		logger.error('Failed to post board service.')
		await transaction.rollback();

		if(error instanceof CustomError)
			throw error;

		throw new CustomError(ResponseStatus.INTERNAL_SERVER_ERROR);
	}
}


export async function patchBoardDetailDataService(userId, boardNo) {
	try {
		const board = await BoardRepository.getPatchDetailData(boardNo, userId);

		return board;
	}catch (error) {
		logger.error('Failed to get patch detail data service.')

		if(error instanceof CustomError)
			throw error;

		throw new CustomError(ResponseStatus.INTERNAL_SERVER_ERROR);
	}
}


export async function patchBoardService(userId, boardNo, {boardTitle, boardContent}) {
	try {
		const checkResult = await checkWriter(userId, boardNo);

		if(checkResult) {
			await BoardRepository.patchBoard(boardNo, {boardTitle, boardContent});

			return boardNo;
		}
	}catch (error) {
		logger.error('Failed to patch board service.')

		if(error instanceof CustomError)
			throw error;

		throw new CustomError(ResponseStatus.INTERNAL_SERVER_ERROR);
	}
}


export async function deleteBoardService(userId, boardNo) {
	try {
		const checkResult = await checkWriter(userId, boardNo);

		if(checkResult) {
			await BoardRepository.deleteBoard(boardNo);
		}
	}catch (error) {
		logger.error('Failed to delete board service.')

		if(error instanceof CustomError)
			throw error;

		throw new CustomError(ResponseStatus.INTERNAL_SERVER_ERROR);
	}
}


export async function getReplyDetailService(boardNo) {
	try {
		const reply = await BoardRepository.getReplyDetail(boardNo);

		return reply;
	}catch (error) {
		logger.error('Failed to get reply detail service.')

		if(error instanceof CustomError)
			throw error;

		throw new CustomError(ResponseStatus.INTERNAL_SERVER_ERROR);
	}
}

export async function postBoardReplyService(userId, {boardTitle, boardContent, boardGroupNo, boardIndent, boardUpperNo}) {
	const transaction = await sequelize.transaction();
	try {
		const replyNo = await BoardRepository.postBoardReply(
								boardTitle, 
								boardContent, 
								boardGroupNo, 
								boardIndent + 1, 
								boardUpperNo, 
								userId, 
								{transaction}
							);

		await transaction.commit();

		return replyNo;
	}catch (error) {
		logger.error('Failed to post board reply service.')
		await transaction.rollback();

		if(error instanceof CustomError)
			throw error;

		throw new CustomError(ResponseStatus.INTERNAL_SERVER_ERROR);
	}
}

// 기존 데이터 조회 후 작성자 체크
async function checkWriter(userId, boardNo) {
	const originalBoard = await BoardRepository.getBoardDetail(boardNo);

	if(originalBoard.userId !== userId) {
		logger.error('User is not the author of the board, boardNo: ', { boardNo });
		throw new CustomError(ResponseStatus.FORBIDDEN);
	}

	return true;
}