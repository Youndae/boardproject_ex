import {
	getImageBoardListService,
	getImageBoardDetailService,
	postImageBoardService,
	getImageBoardPatchDetailService,
	patchImageBoardService,
	deleteImageBoardService,
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
export async function getImageBoardList(req, res, next){
	try {
		const imageBoardList = await getImageBoardListService(req.query);

		res.status(ResponseStatusCode.OK)
			.json({
				content: imageBoardList.content,
				empty: imageBoardList.empty,
				totalElements: imageBoardList.totalElements,
				userStatus: {
					loggedIn: req.userId !== undefined,
					uid: req.userId
				}
			})
	}catch(error) {
		logger.error('getImageBoardList error: ', error);

		next(error);
	}
}

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
export async function getImageBoardDetail(req, res, next) {
	try {
		const imageBoardDetail = await getImageBoardDetailService(req.params.imageNo);

		res.status(ResponseStatusCode.OK)
			.json({
				content: imageBoardDetail,
				userStatus: {
					loggedIn: req.userId !== undefined,
					uid: req.userId
				}
			});
	}catch(error) {
		logger.error('getImageBoardDetail error: ', error);

		next(error);
	}
}

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
export async function postImageBoard(req, res, next) {
	try {
		if(!req.file){
			logger.error('postImageBoard error: no file');
			next(new CustomError(ResponseStatus.BAD_REQUEST));
		}

		try {
			req.files.forEach(file => {
				boardResize(file.filename);
			})
		}catch(error) {
			logger.error('postImageBoard error: resize error', error);
			next(new CustomError(ResponseStatus.INTERNAL_SERVER_ERROR));
		}

		const saveImageNo = await postImageBoardService(req.userId, req.body, req.files);

		res.status(ResponseStatusCode.CREATED)
			.json({
				imageNo: saveImageNo
			});
	}catch(error) {
		logger.error('postImageBoard error: ', error);

		next(error);
	}
}

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
export async function getImageBoardPatchDetail(req, res, next) {
	try {
		const imageBoardPatchDetail = await getImageBoardPatchDetailService(req.params.imageNo, req.userId);

		res.status(ResponseStatusCode.OK)
			.json({
				content: imageBoardPatchDetail,
				userStatus: {
					loggedIn: req.userId !== undefined,
					uid: req.userId
				}
			});
	}catch(error) {
		logger.error('getImageBoardPatchDetail error: ', error);

		next(error);
	}
}

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
export async function patchImageBoard(req, res, next) {
	try {
		if(req.files) {
			try {
				req.files.forEach(file => {
					boardResize(file.filename);
				})
			}catch(error) {
				logger.error('patchImageBoard error: resize error', error);
				next(new CustomError(ResponseStatus.INTERNAL_SERVER_ERROR));
			}
		}

		const patchImageNo = await patchImageBoardService(
			req.userId, 
			req.params.imageNo, 
			req.body, 
			req.files, 
			req.body.deleteFiles
		);

		res.status(ResponseStatusCode.OK)
			.json({
				imageNo: patchImageNo
			});
	}catch(error) {
		logger.error('patchImageBoard error: ', error);

		next(error);
	}
}

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
export async function deleteImageBoard(req, res, next) {
	try {
		await deleteImageBoardService(req.params.imageNo, req.userId);

		res.status(ResponseStatusCode.NO_CONTENT).json({});
	}catch(error) {
		logger.error('deleteImageBoard error: ', error);

		next(error);
	}
}

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