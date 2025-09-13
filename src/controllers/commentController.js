import {
	getCommentListService,
	postCommentService,
	deleteCommentService,
	postReplyCommentService
} from "#services/comment/commentService.js";
import logger from "#config/loggerConfig.js";
import CustomError from "#errors/customError.js";
import { ResponseStatus, ResponseStatusCode } from "#constants/responseStatus.js";

/**
 * 
 * @param {
 * 	query: {
 * 		boardNo: Integer,
 * 		pageNum: Integer?
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
 * 				commentNo: Integer,
 * 				userId: String,
 * 				commentDate: Date,
 * 				commentContent: String,
 * 				commentGroupNo: Integer,
 * 				commentIndent: Integer,
 * 				commentUpperNo: String,
 * 			}
 * 		],
 * 		empty: boolean,
 * 		totalElements: Integer,
 * 		userStatus: {
 * 			loggedIn: boolean,
 * 			uid: String
 * 		}
 * 	}
 * }
 */
export async function getBoardCommentList(req, res, next) {
	try {
		const commentList = await getCommentListService(req.query);

		res.status(ResponseStatusCode.OK)
			.json({
				content: commentList.content,
				empty: commentList.empty,
				totalElements: commentList.totalElements,
				userStatus: {
					loggedIn: req.userId !== undefined,
					uid: req.userId
				}
			})
	}catch(error) {
		logger.error('getBoardCommentList error: ', error);

		next(error);
	}
}

/**
 * 
 * @param {
* 	query: {
* 		imageNo: Integer,
* 		pageNum: Integer?
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
* 				commentNo: Integer,
* 				userId: String,
* 				commentDate: Date,
* 				commentContent: String,
* 				commentGroupNo: Integer,
* 				commentIndent: Integer,
* 				commentUpperNo: String,
* 			}
* 		],
* 		empty: boolean,
* 		totalElements: Integer,
* 		userStatus: {
* 			loggedIn: boolean,
* 			uid: String
* 		}
* 	}
* }
*/
export async function getImageBoardCommentList(req, res, next) {
	try {
		const commentList = await getCommentListService(req.query);

		res.status(ResponseStatusCode.OK)
			.json({
				content: commentList.content,
				empty: commentList.empty,
				totalElements: commentList.totalElements,
				userStatus: {
					loggedIn: req.userId !== undefined,
					uid: req.userId
				}
			})
	}catch(error) {
		logger.error('getImageBoardCommentList error: ', error);

		next(error);
	}
}

/**
 * 
 * @param {
 * 	body: {
 * 		commentContent: String,
 * 	},
 * params: {
 * 		boardNo: Integer,
 * }
 * } req 
 * @param {*} res 
 * @param {*} next 
 * 
 * @returns {
 * 	status: 201,
 * }
 */
export async function postBoardComment(req, res, next) {
	try {
		const boardNo = req.params.boardNo;
		const commentContent = req.body.commentContent;

		const comment = await postCommentService({boardNo, commentContent}, req.userId);

		res.status(ResponseStatusCode.CREATED)
			.json(comment);
	}catch(error) {
		logger.error('postBoardComment error: ', error);

		next(error);
	}
}

/**
 * 
 * @param {
* 	body: {
* 		commentContent: String,
* 	},
* params: {
* 		imageNo: Integer,
* }
* } req 
* @param {*} res 
* @param {*} next 
* 
* @returns {
* 	status: 201,
* }
*/
export async function postImageBoardComment(req, res, next) {
	try {
		const imageNo = req.params.imageNo;
		const commentContent = req.body.commentContent;

		const comment = await postCommentService({imageNo, commentContent}, req.userId);

		res.status(ResponseStatusCode.CREATED)
			.json(comment);
	}catch(error) {
		logger.error('postImageBoardComment error: ', error);

		next(error);
	}
}

/**
 * 
 * @param {
 * 	params: {
 * 		commentNo: Integer,
 * }
 * } req 
 * @param {*} res 
 * @param {*} next 
 * 
 * @returns {
 * 	status: 204,
 * }
 */
export async function deleteComment(req, res, next) {
	try {
		const commentNo = req.params.commentNo;
		await deleteCommentService(commentNo, req.userId);

		res.status(ResponseStatusCode.NO_CONTENT)
			.json({});
	}catch(error) {
		logger.error('deleteComment error: ', error);

		next(error);
	}
}

/**
 * 
 * @param {
 * 	body: {
 * 		commentContent: String,
 * 		commentGroupNo: Integer,
 * 		commentIndent: Integer,
 * 		commentUpperNo: String,
 * 	},
 * params: {
 * 		boardNo: Integer,
 * }
 * } req 
 * @param {*} res 
 * @param {*} next 
 * 
 * @returns {
 * 	status: 201,
 * }
*/
export async function postBoardReplyComment(req, res, next) {
	try {
		const boardNo = req.params.boardNo;

		const comment = await postReplyCommentService({boardNo}, req.body, req.userId);

		res.status(ResponseStatusCode.CREATED)
			.json(comment);
	}catch(error) {
		logger.error('postBoardReplyComment error: ', error);

		next(error);
	}
}

/**
 * 
 * @param {
 * 	body: {
 * 		commentContent: String,
 * 		commentGroupNo: Integer,
 * 		commentIndent: Integer,
 * 		commentUpperNo: String,
 * },
 * params: {
 * 		imageNo: Integer,
 * }
 * } req 
 * @param {*} res 
 * @param {*} next 
 * 
 * @returns {
 * 	status: 201,
 * }
*/
export async function postImageBoardReplyComment(req, res, next) {
	try {
		const imageNo = req.params.imageNo;

		const comment = await postReplyCommentService({imageNo}, req.body, req.userId);

		res.status(ResponseStatusCode.CREATED)
			.json(comment);
	}catch(error) {
		logger.error('postImageBoardReplyComment error: ', error);

		next(error);
	}
}