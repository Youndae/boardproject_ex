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
import { ImageConstants } from "#constants/imageConstants.js";
import {deleteBoardImageFromFiles, deleteImageFile} from "#utils/fileUtils.js";
import {getImageBoardDisplayService} from "#services/file/imageFileService.js";


export async function getImageBoardList(req, res, next){
	try {
		const result = await getImageBoardListService(req.query);

		res.success(result);
	}catch(error) {
		logger.error('getImageBoardList error.', {error});

		next(error);
	}
}

export async function getImageBoardDetail(req, res, next) {
	try {
		const result = await getImageBoardDetailService(req.params.id);

		res.success(result);
	}catch(error) {
		logger.error('getImageBoardDetail error.', {error});

		next(error);
	}
}

export async function postImageBoard(req, res, next) {
	try {
		if(req.files.length === 0){
			logger.error('postImageBoard error: no file');
			next(new CustomError(ResponseStatus.BAD_REQUEST));
		}

		try {
			await Promise.all(
				req.files.map(file =>
					boardResize(file.filename)
				)
			)
		}catch(error) {
			logger.error('Failed to post imageBoard resize.', {error});

			if(req.files)
				await deleteBoardImageFromFiles(req.files);

			next(new CustomError(ResponseStatus.INTERNAL_SERVER_ERROR));
		}

		const result = await postImageBoardService(req.user.id, req.body, req.files);

		res.created(result);
	}catch(error) {
		logger.error('Failed to post imageBoard.', {error});

		next(error);
	}
}

export async function getImageBoardPatchDetail(req, res, next) {
	try {
		const result = await getImageBoardPatchDetailService(req.params.id, req.user.id);

		res.success(result);
	}catch(error) {
		logger.error('Failed to get imageBoard patch Detail.', {error});

		next(error);
	}
}

export async function patchImageBoard(req, res, next) {
	try {
		if(req.files) {
			try {
				await Promise.all(
					req.files.map(file =>
						boardResize(file.filename)
					)
				)
			}catch(error) {
				logger.error('Failed to patch imageboard resize.', {error});

				await deleteBoardImageFromFiles(req.files);

				next(new CustomError(ResponseStatus.INTERNAL_SERVER_ERROR));
			}
		}

		const result = await patchImageBoardService(
			req.user.id,
			req.params.id,
			req.body, 
			req.files, 
			req.body.deleteFiles
		);

		res.success(result);
	}catch(error) {
		logger.error('patchImageBoard error', {error});

		next(error);
	}
}

export async function deleteImageBoard(req, res, next) {
	try {
		await deleteImageBoardService(req.params.id, req.user.id);

		res.status(ResponseStatusCode.NO_CONTENT).json({});
	}catch(error) {
		logger.error('deleteImageBoard error.', {error});

		next(error);
	}
}

export async function getImageBoardDisplay(req, res, next) {
	const imageName = req.params.imageName;

	try {
		const { path, contentType } = await getImageBoardDisplayService(imageName);

		res.locals.imagePayload = {
			filePath: path,
			contentType,
			errorContext: 'ImageBoard'
		}

		next();
	}catch(error) {
		logger.error('Failed to get imageBoard display.', { imageName, error });
		next(error);
	}
}