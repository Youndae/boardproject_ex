import path from 'path';
import fs from 'fs';

const profilePath = process.env.PROFILE_FILE_PATH;
const boardPath = process.env.BOARD_FILE_PATH;


export const getResizeProfileName = (filename) => `${filename}`;

export const deleteImageFile = (filename, fileType) => {
	const filePath = fileType === 'profile' ? profilePath : boardPath;
	console.error('deleteImageFile log!!!!!!!!!!!!!!!!!!!!');

	if(process.env.NODE_ENV !== 'test')
		fs.unlinkSync(path.join(filePath, filename));
}

