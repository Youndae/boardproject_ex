import { ImageBoardRepository } from "#repositories/imageBoardRepository.js";
import logger from "#config/loggerConfig.js";
import CustomError from "#errors/customError.js";
import { ResponseStatus } from "#constants/responseStatus.js";
import { sequelize } from "#models/index.js";
import {
	deleteBoardImageFromFiles,
	deleteBoardImageFromNames,
} from "#utils/fileUtils.js";

export async function getImageBoardListService({keyword, searchType, page = 1}) {
	try {
		return await ImageBoardRepository.getImageBoardListPageable({keyword, searchType, page});
	}catch (error) {
		logger.error('Failed to get image board list service.', {error});

		if(error instanceof CustomError)
			throw error;

		throw new CustomError(ResponseStatus.INTERNAL_SERVER_ERROR);
	}
}

export async function getImageBoardDetailService(id) {
	try {
		const imageBoard = await ImageBoardRepository.getImageBoardDetail(id);

		if(!imageBoard) {
			logger.error('Image board detail data not found, imageNo: ', { id });
			throw new CustomError(ResponseStatus.BAD_REQUEST);
		}

		return imageBoard;
	}catch (error) {
		logger.error('Failed to get image board detail service.', {error});

		if(error instanceof CustomError)
			throw error;

		throw new CustomError(ResponseStatus.INTERNAL_SERVER_ERROR);
	}
}

export async function postImageBoardService(userId, {title, content}, files) {
	const transaction = await sequelize.transaction();
	try {
		const resultId = await ImageBoardRepository.postImageBoard(userId, title, content, files, {transaction});

		await transaction.commit();

		return resultId;
	}catch (error) {
		logger.error('Failed to post image board service.', {error});
		await transaction.rollback();

		if(files) {
			await deleteBoardImageFromFiles(files);
		}

		if(error instanceof CustomError)
			throw error;

		throw new CustomError(ResponseStatus.INTERNAL_SERVER_ERROR);
	}
}

export async function getImageBoardPatchDetailService(id, userId) {
	try {
		await checkWriter(userId, id)
		const imageBoard = await ImageBoardRepository.getImageBoardPatchDetail(id);

		if(!imageBoard) {
			logger.error('Image board patch detail data not found, imageNo: ', { id });
			throw new CustomError(ResponseStatus.NOT_FOUND);
		}

		return imageBoard;
	}catch (error) {
		logger.error('Failed to get image board patch detail service.', {error});

		if(error instanceof CustomError)
			throw error;

		throw new CustomError(ResponseStatus.INTERNAL_SERVER_ERROR);
	}
}

export async function patchImageBoardService(userId, id, {title, content}, files, deleteFiles) {
	const transaction = await sequelize.transaction();
	try {
		await checkWriter(userId, id)
		await ImageBoardRepository.patchImageBoard(id, title, content, files, deleteFiles, {transaction});

		await transaction.commit();

		if(deleteFiles && deleteFiles.length > 0) {
			await deleteBoardImageFromNames(deleteFiles);
		}

		return parseInt(id);
	}catch (error) {
		logger.error('Failed to patch image board service.', {error});
		
		await transaction.rollback();

		if(files) {
			await deleteBoardImageFromFiles(files);
		}

		if(error instanceof CustomError)
			throw error;

		throw new CustomError(ResponseStatus.INTERNAL_SERVER_ERROR);
	}
}

export async function deleteImageBoardService(id, userId) {
	const transaction = await sequelize.transaction();
	try {
		await checkWriter(userId, id)
		const deleteFiles = await ImageBoardRepository.getImageBoardDeleteFiles(id, {transaction});
		await ImageBoardRepository.deleteImageBoard(id, {transaction});

		if(deleteFiles) {
			console.log('deleteFiles', deleteFiles);
			await deleteBoardImageFromNames(deleteFiles);
		}

		await transaction.commit();
	}catch(error) {
		logger.error('Failed to delete image board service.', {error});
		await transaction.rollback();

		if(error instanceof CustomError)
			throw error;

		throw new CustomError(ResponseStatus.INTERNAL_SERVER_ERROR);
	}
}

async function checkWriter(userId, id) {
	const writer = await ImageBoardRepository.getImageBoardWriter(id);

	if(!writer) {
		logger.error('Image board writer data not found', { id });
		throw new CustomError(ResponseStatus.BAD_REQUEST);
	}

	if(writer !== userId) {
		logger.error('User is not the author of the image board', { id, userId });
		throw new CustomError(ResponseStatus.FORBIDDEN);
	}
}