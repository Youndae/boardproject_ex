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
	const { id, page } = req.query;
	try {
		const result = await getCommentListService({boardId: id, page: page});

		res.success(result);
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
	const { id, page } = req.query;
	try {
		const result = await getCommentListService({imageId: id, page: page});

		res.success(result);
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
		const boardId = req.params.targetBoardId;
		const content = req.body.content;


		await postCommentService({boardId, content}, req.user.id);

		res.created();
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
		const imageId = req.params.targetBoardId;
		const content = req.body.content;

		await postCommentService({imageId, content}, req.user.id);

		res.created();
	}catch(error) {
		logger.error('postImageBoardComment error: ', error);

		next(error);
	}
}

/**
 * 
 * @param {
 * 	params: {
 * 		id: Integer,
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
		const id = req.params.id;
		await deleteCommentService(id, req.user.id);

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
export async function postCommentReply(req, res, next) {
	try {
		const id = req.params.id;

		await postReplyCommentService(id, req.body, req.user.id);

		res.created();
	}catch(error) {
		logger.error('postBoardReplyComment error: ', error);

		next(error);
	}
}