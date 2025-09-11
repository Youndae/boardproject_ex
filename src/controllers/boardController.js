//TODO: service import

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
 * 				nickname: String,
 * 				boardDate: Date,
 * 				boardIndent: Integer,
 * 			}
 * 		],
 * 		empty: boolean,
 * 		first: Integer,
 * 		last: Integer,
 * 		number: Integer,
 * 		totalPages: Integer,
 * 		userStatus: {
 * 			loggedIn: boolean,
 * 			uid: String
 * 		}
 * 	}
 * }
 */
export async function getBoardList(req, res, next) {}

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
 * 			nickname: String
 * 			boardDate: Date,
 * 		},
 * 		userStatus: {
 * 			loggedIn: boolean,
 * 			uid: String
 * 		}
 * 	}
 * 
 * }
 */
export async function getBoardDetail(req, res, next) {}

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
 * 		boardNo: Integer
 * 	}
 * }
 */
export async function postBoard(req, res, next) {}

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
export async function patchBoardDetailData(req, res, next) {}

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
export async function patchBoard(req, res, next) {}

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
export async function deleteBoard(req, res, next) {}

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
export async function getReplyDetail(req, res, next) {}

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
export async function postBoardReply(req, res, next) {}