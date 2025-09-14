import path from 'path';
import fs from 'fs';
import { ImageConstants } from '#constants/imageConstants.js';
import { getBaseNameAndExt } from '#utils/fileNameUtils.js';
import CustomError from '#errors/customError.js';
import { ResponseStatus } from '#constants/responseStatus.js';

const profilePath = process.env.PROFILE_FILE_PATH;
const boardPath = process.env.BOARD_FILE_PATH;

export const getImageDisplayService = async (imageName) => {
	let imagePrefix = '';
	let imagePath = '';

	if(imageName.startsWith(ImageConstants.PROFILE_PREFIX)){
		imagePrefix = ImageConstants.PROFILE_PREFIX;
		imagePath = profilePath;
	}else if(imageName.startsWith(ImageConstants.BOARD_PREFIX)){
		imagePrefix = ImageConstants.BOARD_PREFIX;
		imagePath = boardPath;
	}else
		throw new CustomError(ResponseStatus.BAD_REQUEST);

	const imageFilename = imageName.replace(imagePrefix, '');
	const filePath = path.join(imagePath, imageFilename);

	await fs.promises.access(filePath, fs.constants.F_OK)
		.catch(() => {
			throw new CustomError(ResponseStatus.NOT_FOUND);
		});

	const { ext } = getBaseNameAndExt(imageFilename);
	let contentType = 'application/octet-stream';
	
	if(ext === '.png')
		contentType = 'image/png';
	else if(ext === '.jpg' || ext === '.jpeg')
		contentType = 'image/jpeg';
	else if(ext === '.gif')
		contentType = 'image/gif';
	else if(ext === '.bmp')
		contentType = 'image/bmp';
	else if(ext === '.webp')
		contentType = 'image/webp';

	return {
		path: filePath,
		contentType: contentType,
	}
}