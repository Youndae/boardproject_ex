import path from 'path';
import fs from 'fs';
import {ImageConstants} from "#constants/imageConstants.js";
import {getImageBoardFileNames} from "#utils/fileNameUtils.js";
import logger from '#config/loggerConfig.js';

const profilePath = process.env.PROFILE_FILE_PATH;
const boardPath = process.env.BOARD_FILE_PATH;

export const deleteBoardImageFromNames = async (filenames) => {
	const fileNames = getImageBoardFileNames(filenames);

	await Promise.all(
		fileNames.map(filename =>
			deleteImageFile(filename, ImageConstants.BOARD_TYPE)
		)
	)
}

export const deleteBoardImageFromFiles = async (files) => {
	const filenames = files.map(({ filename }) => filename);
	await deleteBoardImageFromNames(filenames);
}

export const deleteImageFile = async (filename, fileType) => {
	const filePath = fileType === ImageConstants.PROFILE_TYPE ? profilePath : boardPath;
	const fullPath = path.join(filePath, filename);

	if(process.env.NODE_ENV !== 'test'){
		try {
			if(fs.existsSync(fullPath)) {
				fs.unlinkSync(fullPath);
			}
		}catch(error) {
			logger.warn('delete file error.', { error, fullPath });
		}
	}
}