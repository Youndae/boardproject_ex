import { ImageBoardRepository } from "#repositories/imageBoardRepository.js";
import logger from "#config/loggerConfig.js";
import CustomError from "#errors/customError.js";
import { ResponseStatus } from "#constants/responseStatus.js";
import { sequelize } from "#models/index.js";
import { deleteImageFile } from "#utils/fileUtils.js";
import dayjs from "dayjs";
import { ImageConstants } from "#constants/imageConstants.js";

export async function getImageBoardListService({keyword, searchType, pageNum = 1}) {
	try {
		const imageBoardList = await ImageBoardRepository.getImageBoardListPageable({keyword, searchType, pageNum});

		return {
			content: imageBoardList.content,
			empty: imageBoardList.totalElements === 0,
			totalElements: imageBoardList.totalElements,
		};
	}catch (error) {
		logger.error('Failed to get image board list service.', error);

		if(error instanceof CustomError)
			throw error;

		throw new CustomError(ResponseStatus.INTERNAL_SERVER_ERROR);
	}
}

export async function getImageBoardDetailService(imageNo) {
	try {
		const imageBoard = await ImageBoardRepository.getImageBoardDetail(imageNo);

		return {
			imageNo: imageBoard.imageNo,
			imageTitle: imageBoard.imageTitle,
			imageContent: imageBoard.imageContent,
			userId: imageBoard.userId,
			imageDate: dayjs(imageBoard.imageDate).format('YYYY-MM-DD'),
			imageData: imageBoard.imageDatas,
		};
	}catch (error) {
		logger.error('Failed to get image board detail service.', error);

		if(error instanceof CustomError)
			throw error;

		throw new CustomError(ResponseStatus.INTERNAL_SERVER_ERROR);
	}
}

export async function postImageBoardService(userId, {imageTitle, imageContent}, files) {
	const transaction = await sequelize.transaction();
	try {
		const imageNo = await ImageBoardRepository.postImageBoard(userId, imageTitle, imageContent, files, {transaction});

		await transaction.commit();

		return imageNo;
	}catch (error) {
		logger.error('Failed to post image board service.', error);
		await transaction.rollback();

		if(files) {
			files.forEach(file => {
				deleteImageFile(file.filename, ImageConstants.BOARD_TYPE);
			});
		}

		if(error instanceof CustomError)
			throw error;

		throw new CustomError(ResponseStatus.INTERNAL_SERVER_ERROR);
	}
}

export async function getImageBoardPatchDetailService(imageNo, userId) {
	try {
		if(await checkWriter(userId, imageNo)) {
			const imageBoard = await ImageBoardRepository.getImageBoardPatchDetail(imageNo);

			return imageBoard;
		}
	}catch (error) {
		logger.error('Failed to get image board patch detail service.', error);

		if(error instanceof CustomError)
			throw error;

		throw new CustomError(ResponseStatus.INTERNAL_SERVER_ERROR);
	}
}

export async function patchImageBoardService(userId, imageNo, {imageTitle, imageContent}, files, deleteFiles) {
	const transaction = await sequelize.transaction();
	try {
		if(await checkWriter(userId, imageNo)) {
			const patchImageNo = await ImageBoardRepository.patchImageBoard(imageNo, imageTitle, imageContent, files, deleteFiles, {transaction});

			await transaction.commit();

			if(deleteFiles) {
				deleteFiles.forEach(file => {
					deleteImageFile(file.replace(ImageConstants.BOARD_PREFIX, ''), ImageConstants.BOARD_TYPE);
				});
			}

			return patchImageNo;
		}
	}catch (error) {
		logger.error('Failed to patch image board service.', error);
		console.error('patchImageBoardService error : ', error);
		await transaction.rollback();

		if(files) {
			files.forEach(file => {
				deleteImageFile(file.filename, ImageConstants.BOARD_TYPE);
			});
		}

		if(error instanceof CustomError)
			throw error;

		throw new CustomError(ResponseStatus.INTERNAL_SERVER_ERROR);
	}
}

export async function deleteImageBoardService(imageNo, userId) {
	try {
		if(await checkWriter(userId, imageNo)) {
			const deleteFiles = await ImageBoardRepository.getImageBoardDeleteFiles(imageNo);
			await ImageBoardRepository.deleteImageBoard(imageNo);

			if(deleteFiles) {
				deleteFiles.forEach(file => {
					deleteImageFile(file.imageName.replace(ImageConstants.BOARD_PREFIX, ''), ImageConstants.BOARD_TYPE);
				});
			}

			return imageNo;
		}
	}catch(error) {
		logger.error('Failed to delete image board service.', error);
		console.error('deleteImageBoardService error : ', error);

		if(error instanceof CustomError)
			throw error;

		throw new CustomError(ResponseStatus.INTERNAL_SERVER_ERROR);
	}
}

async function checkWriter(userId, imageNo) {
	const writer = await ImageBoardRepository.getImageBoardWriter(imageNo);

	if(writer !== userId) {
		logger.error('User is not the author of the image board, imageNo: ', { imageNo });
		throw new CustomError(ResponseStatus.FORBIDDEN);
	}
	
	return true;
}