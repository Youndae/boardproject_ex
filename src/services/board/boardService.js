import { BoardRepository } from '#repositories/boardRepository.js';
import logger from "#config/loggerConfig.js"
import CustomError from "#errors/customError.js"
import { ResponseStatus } from "#constants/responseStatus.js"
import { sequelize } from "#models/index.js"


export async function getBoardListService({keyword, searchType, page = 1}) {
	try {
		return await BoardRepository.getBoardListPageable({keyword, searchType, page});
	}catch (error) {
		logger.error('Failed to get board list service.');

		if(error instanceof CustomError)
			throw error;

		throw new CustomError(ResponseStatus.INTERNAL_SERVER_ERROR);
	}
}


export async function getBoardDetailService(id) {
	try {
		const result = await BoardRepository.getBoardDetail(id);

		console.log('boardDetailService  result : ', result);

		if(!result) {
			logger.warn('Board detail data not found.', {id});
			throw new CustomError(ResponseStatus.BAD_REQUEST);
		}

		return result;
	}catch (error) {
		logger.error('Failed to get board detail service.')

		if(error instanceof CustomError)
			throw error;

		throw new CustomError(ResponseStatus.INTERNAL_SERVER_ERROR);
	}
}


export async function postBoardService(userId, {title, content}) {
	const transaction = await sequelize.transaction();
	try {
		const boardNo = await BoardRepository.postBoard(title, content, userId, {transaction});

		await transaction.commit();

		return boardNo;
	}catch (error) {
		logger.error('Failed to post board service.', error);
		await transaction.rollback();

		if(error instanceof CustomError)
			throw error;

		throw new CustomError(ResponseStatus.INTERNAL_SERVER_ERROR);
	}
}


export async function patchBoardDetailDataService(userId, id) {
	try {
		const board = await BoardRepository.getPatchDetailData(id);

		if(!board) {
			logger.error('Patch board detail data not found.', { id });
			throw new CustomError(ResponseStatus.BAD_REQUEST);
		}

		if(board.userId === userId) {
			logger.error('User is not the author of the board.', { id, userId });
			throw new CustomError(ResponseStatus.FORBIDDEN);
		}

		return {
			title: board.title,
			content: board.content,
		};
	}catch (error) {
		logger.error('Failed to get patch detail data service.', error);

		throw new CustomError(ResponseStatus.INTERNAL_SERVER_ERROR);
	}
}


export async function patchBoardService(userId, id, {title, content}) {
	try {
		await checkWriter(userId, id);

		await BoardRepository.patchBoard(id, title, content);

		return parseInt(id);
	}catch (error) {
		logger.error('Failed to patch board service.', error);

		if(error instanceof CustomError)
			throw error;

		throw new CustomError(ResponseStatus.INTERNAL_SERVER_ERROR);
	}
}


export async function deleteBoardService(userId, id) {
	try {
		await checkWriter(userId, id);

		await BoardRepository.deleteBoard(id);
	}catch (error) {
		logger.error('Failed to delete board service.', error);

		if(error instanceof CustomError)
			throw error;

		throw new CustomError(ResponseStatus.INTERNAL_SERVER_ERROR);
	}
}


export async function getReplyDetailService(id) {
	try {
		const board = await BoardRepository.getReplyDetail(id);

		if(!board) {
			logger.error('Reply detail data not found.', { id });
			throw new CustomError(ResponseStatus.BAD_REQUEST);
		}
	}catch (error) {
		logger.error('Failed to get reply detail service.', error);

		if(error instanceof CustomError)
			throw error;

		throw new CustomError(ResponseStatus.INTERNAL_SERVER_ERROR);
	}
}

export async function postBoardReplyService(userId, id, {title, content}) {
	const transaction = await sequelize.transaction();
	try {
		const targetBoard = await BoardRepository.getReplyDetail(id);

		const replyNo = await BoardRepository.postBoardReply(
								title,
								content,
								targetBoard.groupNo,
								targetBoard.indent + 1,
								targetBoard.upperNo,
								userId, 
								{transaction}
							);

		await transaction.commit();

		return replyNo;
	}catch (error) {
		logger.error('Failed to post board reply service.', error);
		await transaction.rollback();

		if(error instanceof CustomError)
			throw error;

		throw new CustomError(ResponseStatus.INTERNAL_SERVER_ERROR);
	}
}

// 기존 데이터 조회 후 작성자 체크
async function checkWriter(userId, id) {
	const board = await BoardRepository.getBoardWriter(id);

	if(!board) {
		logger.warn('CheckWriter getBoardWriter not found.', {id});
		throw new CustomError(ResponseStatus.BAD_REQUEST);
	}

	if(board.userId !== userId) {
		logger.error('User is not the author of the board.', {id, userId});
		throw new CustomError(ResponseStatus.FORBIDDEN);
	}
}