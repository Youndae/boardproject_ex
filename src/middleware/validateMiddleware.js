import CustomError from "#errors/customError.js"
import { ResponseStatus } from "#constants/responseStatus.js"
import {deleteBoardImageFromFiles, deleteImageFile} from "#utils/fileUtils.js";
import {ImageConstants} from "#constants/imageConstants.js";


export const validate = (schema, property = 'body') => (req, res, next) => {
	try {
		schema.parse(req[property]);
		next();
	}catch(error) {
		next(new CustomError(ResponseStatus.BAD_REQUEST));
	}
}

export const memberValidate = (schema, property = 'body') => async (req, res, next) => {
	try {
		schema.parse(req[property]);
		next();
	}catch(error) {
		if(req.file) {
			await deleteImageFile(req.file.filename, ImageConstants.PROFILE_TYPE);
		}

		console.log('member validate error!!!!!!!!!!!!!!!!!!');
		next(new CustomError(ResponseStatus.BAD_REQUEST));
	}
}

export const imageBoardValidate = (schema, property = 'body') => async (req, res, next) => {
	try {
		schema.parse(req[property]);
		next();
	}catch(error) {
		if(req.files) {
			await deleteBoardImageFromFiles(req.files);
		}

		next(new CustomError(ResponseStatus.BAD_REQUEST));
	}
}