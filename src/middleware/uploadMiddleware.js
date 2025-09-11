import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import CustomError from '#errors/customError.js';
import { ResponseStatusCode } from '#constants/responseStatus.js';

const profilePath = process.env.PROFILE_FILE_PATH;
const boardPath = process.env.BOARD_FILE_PATH;

if (process.env.NODE_ENV !== 'test') {
	[profilePath, boardPath].forEach((dir) => {
		fs.mkdirSync(dir, { recursive: true });
	});
}

const createFilename = (file) => {
	const ext = path.extname(file.originalname);

	const allowedExt = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
	if(!allowedExt.includes(ext))
		throw new CustomError(
			ResponseStatusCode.BAD_REQUEST, '허용되지 않은 확장자 입니다.'
		);

	return `${Date.now()}${uuidv4()}${ext}`;
};

const imageFileFilter = (req, file, cb) => {
	if(file.mimetype.startsWith('image/'))
		cb(null, true);
	else
		cb(new CustomError(ResponseStatusCode.BAD_REQUEST, '이미지 파일만 업로드 가능합니다.'), false);
};

// test 전용 memoryStorage + filename 주입
const createMemoryStorageByTest = () => {
	const storage = multer.memoryStorage();

	return {
		_handleFile(req, file, cb) {
			storage._handleFile(req, file, (err, info) => {
				if(err) 
					return cb(err);
				info.filename = createFilename(file);
				cb(null, info);
			});
		},
		_removeFile: storage._removeFile,
	}
}

const createStorage = (destination) => {
	if(process.env.NODE_ENV === 'test')
		return createMemoryStorageByTest();
	
	return multer.diskStorage({
		destination: (req, file, cb) => cb(null, destination),
		filename: (req, file, cb) => {
			const filename = createFilename(file);
			cb(null, filename);
		},
	});
}

export const profileUpload = multer({
	storage: createStorage(profilePath),
	fileFilter: imageFileFilter,
	limits: { fileSize: 1024 * 1024 * 5 },
})
.single("profileThumbnail");

export const boardUpload = multer({
	storage: createStorage(boardPath),
	fileFilter: imageFileFilter,
	limits: { fileSize: 1024 * 1024 * 5 },
})
.array('boardImages', 5);