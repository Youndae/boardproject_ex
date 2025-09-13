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
export async function getBoardCommentList(req, res, next) {}

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
export async function getImageBoardCommentList(req, res, next) {}

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
export async function postBoardComment(req, res, next) {}

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
export async function postImageBoardComment(req, res, next) {}

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
export async function deleteComment(req, res, next) {}

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
export async function postBoardReplyComment(req, res, next) {}

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
export async function postImageBoardReplyComment(req, res, next) {}