import {
	getImageBoardListService,
	getImageBoardDetailService,
	postImageBoardService,
	getImageBoardPatchDetailService,
	patchImageBoardService,
	deleteImageBoardService,
	getImageBoardDisplayService
} from "#services/imageBoard/imageBoardService.js";
import { boardResize } from "#utils/resize.js";
import logger from "#config/loggerConfig.js";
import CustomError from "#errors/customError.js";
import { ResponseStatus, ResponseStatusCode } from "#constants/responseStatus.js";

/**
 * 
 * @param {
 * 	query: {
 * 		keyword: String?,
 * 		searchType: String?,
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
 * 				imageNo: Integer,
 * 				imageTitle: String,
 * 				userId: String,
 * 				imageDate: Date,
 * 				imageName: String,
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
export async function getImageBoardList(req, res, next){}

/**
 * 
 * @param {
 * 	params: {
 * 		imageNo: Integer
 * 	}
 * } req 
 * @param {*} res 
 * @param {*} next 
 * 
 * @returns {
 * 	status: 200,
 * 	data: {
 * 		content: {
 * 			imageNo: Integer,
 * 			imageTitle: String,
 * 			imageContent: String,
 * 			userId: String,
 * 			imageDate: Date,
 * 			imageData: [
 * 				{
 * 					imageName: String,
 * 					oldName: String,
 * 					imageStep: Integer
 * 				}
 * 			]
 * 		},
 * 		userStatus: {
 * 			loggedIn: boolean,
 * 			uid: String
 * 		}
 * 	}
 * }
 */
export async function getImageBoardDetail(req, res, next) {}

/**
 * 
 * @param {
 * 	body: {
 * 		imageTitle: String,
 * 		imageContent: String,
 * 	},
 * 	file: {
 * 		image: File ( min: 1, limit: 5, mimetype: image/*)
 * 	}
 * } req 
 * @param {*} res 
 * @param {*} next 
 * 
 * @returns {
 * 	status: 201,
 * 	data: {
 * 		imageNo: Integer
 * 	}
 * }
 */
export async function postImageBoard(req, res, next) {}

/**
 * 
 * @param {
 * 	params: {
 * 		imageNo: Integer
 * 	}
 * } req 
 * @param {*} res 
 * @param {*} next 
 * 
 * @returns {
 * 	status: 200,
 * 	data: {
 * 		imageNo: Integer
 * 		imageTitle: String
 * 		imageContent: String
 * 		imageData: String[] ( imageName )
 * 	}
 * }
 */
export async function getImageBoardPatchDetail(req, res, next) {}

/**
 * 
 * @param {
 * 	params: {
 * 		imageNo: Integer
 * 	},
 * 	body: {
 * 		imageTitle: String,
 * 		imageContent: String,
 * 		file?: File ( min: 1, limit: files + deleteFiles < 5 , mimetype: image/*)
 * 		deleteFiles?: String[] ( imageName )
 * 	}
 * } req 
 * @param {*} res 
 * @param {*} next 
 * 
 * @returns {
 * 	status: 200,
 * 	data: {
 * 		imageNo: Integer
 * 	}
 * }
 */
export async function patchImageBoard(req, res, next) {}

/**
 * 
 * @param {
 * 	params: {
 * 		imageNo: Integer
 * 	}
 * } req 
 * @param {*} res 
 * @param {*} next 
 * 
 * @returns {
 * 	status: 204,
 * }
 */
export async function deleteImageBoard(req, res, next) {}

/**
 * 
 * @param {
 * 	params: {
 * 		imageName: String
 * 	}
 * } req 
 * @param {*} res 
 * @param {*} next 
 * 
 * @returns {
 * 	status: 200,
 * 	data: {
 * 		buffer: Buffer
 * 	}
 * }
 */
export async function getImageBoardDisplay(req, res, next) {}