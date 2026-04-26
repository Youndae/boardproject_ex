import path from 'path';
import fs from 'fs';
import CustomError from '#errors/customError.js';
import { ResponseStatus } from '#constants/responseStatus.js';

const profilePath = process.env.PROFILE_FILE_PATH;
const boardPath = process.env.BOARD_FILE_PATH;

export const getImageBoardDisplayService = async (imageName) => {
	return getDisplayPathAndContentType(imageName, boardPath);
}

export const getProfileImageDisplayService = async (imageName) => {
	return getDisplayPathAndContentType(imageName, profilePath);
}

const getDisplayPathAndContentType = async (imageName, imagePath) => {
	const filePath = path.join(imagePath, imageName);

	await fs.promises.access(filePath, fs.constants.F_OK)
		.catch(() => {
			throw new CustomError(ResponseStatus.NOT_FOUND)
		});

	// 현재는 어떤 이미지 파일이건 jpg로 저장되기 때문에 image/jpeg로 고정.
	const contentType = 'image/jpeg';

	return {
		path: filePath,
		contentType: contentType
	}
}