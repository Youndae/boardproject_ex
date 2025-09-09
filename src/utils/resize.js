import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { getBaseNameAndExt } from './fileNameUtils.js';

const profilePath = process.env.PROFILE_FILE_PATH;
const boardPath = process.env.BOARD_FILE_PATH;

export const profileResize = async (filename) => {
	await resizeImage(filename, [300], profilePath, { deleteOriginal: true });
}

export const boardResize = async (filename) => {
	await resizeImage(filename, [300, 600], boardPath, { deleteOriginal: false });
}

const resizeImage = async(filename, sizes, uploadPath, options = {}) => {
	if(process.env.NODE_ENV === 'test') {
		console.log('test mode. skip resize');
		return;
	}
	
	const { baseName, ext } = getBaseNameAndExt(filename);
	const inputPath = path.join(uploadPath, filename);

	try {
		await Promise.all(
			sizes.map(size => {
				const outputPath = path.join(uploadPath, `${baseName}_${size}${ext}`);
				return sharp(inputPath) // 파일을 읽어서 이미지 데이터(buffer)를 메모리에 올려둠
					.resize(size, size, { fit: 'inside' }) // 가로 세로 옵션.
					.toFile(outputPath); // 리사이징 된 데이터를 디스크에 저장.
			})
		);

		if(options.deleteOriginal){
			console.error('deleteOriginal : ', inputPath);
			fs.unlinkSync(inputPath);
		}
	} catch (error) {
		console.error(error);
		throw error;
	}

	
}