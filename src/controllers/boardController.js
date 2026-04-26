import {
	getBoardListService,
	getBoardDetailService,
	postBoardService,
	patchBoardDetailDataService,
	patchBoardService,
	deleteBoardService,
	getReplyDetailService,
	postBoardReplyService
} from '#services/board/boardService.js';
import logger from '#config/loggerConfig.js';
import CustomError from '#errors/customError.js';
import { ResponseStatusCode, ResponseStatus } from '#constants/responseStatus.js';

/**
 * 
 * @param {
 * 	query: {
 * 		keyword: String?,
 * 		searchType: String?,
 * 		pageNum: Integer? = 1
 * 	}
 * } req 
 * @param {*} res 
 * @param {*} next 
 * 
 * @returns {
 * 	status: 200,
 * 	data: {
 * 		content: [
 * 			{
 * 				boardNo: 1,
 * 				boardTitle: String,
 * 				userId: String,
 * 				boardDate: Date,
 * 				boardIndent: Integer,
 * 			}
 * 		],
 *		totalPages: Integer,
 * 		isEmpty: boolean,
 * 		currentPage: Integer,
 * 	}
 * }
 */
export async function getBoardList(req, res, next) {
	try {
		const boardList = await getBoardListService(req.query);

		res.success(boardList);
	} catch (error) {
		logger.error('getBoardList error: ', error);

		next(error);
	}
}

/**
 * 
 * @param {
 * 	params: {
 * 		boardNo: Integer
 * 	}
 * } req 
 * @param {*} res 
 * @param {*} next 
 * 
 * @returns {
 *  status: 200,
 *  data: {
 * 		content: {
 * 			boardNo: Integer,
 * 			boardTitle: String,
 * 			boardContent: String,
 * 			userId: String
 * 			boardDate: Date,
 * 		}
 * 	}
 * }
 */
export async function getBoardDetail(req, res, next) {
	try {
		const { id } = req.params;

		const board = await getBoardDetailService(id);

		res.success(board);
	} catch (error) {
		logger.error('getBoardDetail error: ', error);

		next(error);
	}
}

/**
 * 
 * @param {
 * 	body: {
 * 		boardTitle: String,
 * 		boardContent: String,
 * 	}
 * } req 
 * @param {*} res 
 * @param {*} next 
 * 
 * @returns {
 * 	status: 201,
 * 	data: {
 * 		content: Integer
 * 	}
 * }
 */
export async function postBoard(req, res, next) {
	try {
		const userId = req.user.id;

		if(userId === undefined)
			throw new CustomError(ResponseStatus.FORBIDDEN);

		const saveBoardNo = await postBoardService(userId, req.body);

		res.created(saveBoardNo);
	} catch (error) {
		logger.error('postBoard error: ', error);

		next(error);
	}
}

/**
 * 
 * @param {
 * 	params: {
 * 		boardNo: Integer
 * 	}
 * } req 
 * @param {*} res 
 * @param {*} next 
 * 
 * @returns {
 * 	status: 200,
 * 	data: {
 * 		content: {
 * 			boardNo: Integer,
 * 			boardTitle: String,
 * 			boardContent: String,
 * 		},
 * 		userStatus: {
 * 			loggedIn: boolean,
 * 			uid: String
 * 		}
 * 	}
 * }
 */
export async function patchBoardDetailData(req, res, next) {
	try {
		const { id } = req.params;
		const userId = req.user.id;

		if(userId === undefined)
			throw new CustomError(ResponseStatus.FORBIDDEN);

		const board = await patchBoardDetailDataService(userId, id);

		res.success(board);
	} catch (error) {
		logger.error('patchBoardDetailData error: ', error);

		next(error);
	}
}

/**
 * 
 * @param {
 * 	params: {
 * 		boardNo: Integer
 * 	}
 * 	body: {
 * 		boardTitle: String,
 * 		boardContent: String,
 * 	}
 * } req 
 * @param {*} res 
 * @param {*} next 
 * 
 * @returns {
 * 	status: 200,
 * 	data: {
 * 		boardNo: Integer
 * 	}
 * }
 */
export async function patchBoard(req, res, next) {
	try {
		const { id } = req.params;
		const userId = req.user.id;

		if(userId === undefined)
			throw new CustomError(ResponseStatus.FORBIDDEN);

		const patchBoardNo = await patchBoardService(userId, id, req.body);

		res.success(patchBoardNo);
	} catch (error) {
		logger.error('patchBoard error: ', error);

		next(error);
	}
}

/**
 * 
 * @param {
 * 	params: {
 * 		boardNo: Integer
 * 	}
 * } req 
 * @param {*} res 
 * @param {*} next 
 * 
 * @returns {
 * 	status: 204,
 * }
 */
export async function deleteBoard(req, res, next) {
	try {
		const { id } = req.params;
		const userId = req.user.id;

		if(userId === undefined)
			throw new CustomError(ResponseStatus.FORBIDDEN);

		await deleteBoardService(userId, id);

		res.status(ResponseStatusCode.NO_CONTENT).json({});
	} catch (error) {
		logger.error('deleteBoard error: ', error);

		next(error);
	}
}

/**
 * 
 * @param {
 * 	params: {
 * 		boardNo: Integer
 * 	}
 * } req 
 * @param {*} res 
 * @param {*} next 
 * 
 * @returns {
 * 	status: 200,
 * 	data: {
 * 		content: {
 * 			boardGroupNo: Integer,
 * 			boardUpperNo: String,
 * 			boardIndent: Integer,
 * 		},
 * 		userStatus: {
 * 			loggedIn: boolean,
 * 			uid: String
 * 		}
 * 	}
 * }
 */
export async function getReplyDetail(req, res, next) {
	try {
		const { id } = req.params;
		await getReplyDetailService(id);
		res.success();
	} catch (error) {
		logger.error('getReplyDetail error: ', error);

		next(error);
	}
}

/**
 * 
 * @param {
 * 	body: {
 * 		boardTitle: String,
 * 		boardContent: String,
 * 		boardGroupNo: Integer,
 * 		boardIndent: Integer,
 * 		boardUpperNo: String,
 * }
 * } req 
 * @param {*} res 
 * @param {*} next 
 * 
 * @returns {
 * 	status: 201,
 * 	data: {
 * 		boardNo: Integer
 * 	}
 * }
 */
export async function postBoardReply(req, res, next) {
	try {
		const userId = req.user.id;
		const targetBoardId = req.params.id;

		if(userId === undefined)
			throw new CustomError(ResponseStatus.FORBIDDEN);

		const postBoardReplyNo = await postBoardReplyService(userId, targetBoardId, req.body);

		res.created(postBoardReplyNo);
	} catch (error) {
		logger.error('postBoardReply error: ', error);

		next(error);
	}
}