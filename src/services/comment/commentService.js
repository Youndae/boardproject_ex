import { CommentRepository } from "#repositories/commentRepository.js";
import logger from "#config/loggerConfig.js";
import CustomError from "#errors/customError.js";
import { ResponseStatus } from "#constants/responseStatus.js";
import { sequelize } from "#models/index.js";

export async function getCommentListService({boardNo, imageNo, pageNum = 1}) {
	await checkCommentBoardStatus(boardNo, imageNo);

	try {
		const commentList = await CommentRepository.getCommentListPageable({ boardNo, imageNo, pageNum });

		return {
			content: commentList.rows,
			empty: commentList.count === 0,
			totalElements: commentList.count,
		};
	}catch (error) {
		logger.error('Failed to get comment list service.', error);
		throw new CustomError(ResponseStatus.INTERNAL_SERVER_ERROR);
	}
}

export async function postCommentService({ boardNo = null, imageNo = null, commentContent }, userId) {
	await checkCommentBoardStatus(boardNo, imageNo);

	const transaction = await sequelize.transaction();
	try {
		const comment = await CommentRepository.postComment(boardNo, imageNo, userId, commentContent, { transaction });

		await transaction.commit();

		return comment;
	}catch (error) {
		logger.error('Failed to post comment service.', error);
		await transaction.rollback();

		throw new CustomError(ResponseStatus.INTERNAL_SERVER_ERROR);
	}
}

export async function deleteCommentService(commentNo, userId) {
	try {
		if(await checkCommentWriter(commentNo, userId)) {
			await CommentRepository.deleteComment(commentNo);
		}
	}catch (error) {
		logger.error('Failed to delete comment service.', error);

		if(error instanceof CustomError)
			throw error;

		throw new CustomError(ResponseStatus.INTERNAL_SERVER_ERROR);
	}
}

export async function postReplyCommentService(
	{ 
		boardNo = null, 
		imageNo = null, 
		commentContent, 
		commentGroupNo, 
		commentIndent, 
		commentUpperNo 
	}, userId) {
	const transaction = await sequelize.transaction();
	try {
		await CommentRepository.postReplyComment(
			boardNo, 
			imageNo, 
			commentContent, 
			commentGroupNo, 
			commentIndent, 
			commentUpperNo, 
			userId, 
			{ transaction }
		);

		await transaction.commit();
	}catch (error) {
		logger.error('Failed to post reply comment service.', error);
		await transaction.rollback();

		throw new CustomError(ResponseStatus.INTERNAL_SERVER_ERROR);
	}
}

async function checkCommentWriter(commentNo, userId) {
	const comment = await CommentRepository.checkCommentWriter(commentNo, userId);

	if(comment.userId !== userId) {
		logger.error('User is not the author of the comment, commentNo: ', { commentNo });
		throw new CustomError(ResponseStatus.FORBIDDEN);
	}

	return true;
}

async function checkCommentBoardStatus(boardNo, imageNo) {
	if((!boardNo && !imageNo) || (boardNo && imageNo)) {
		logger.error('boardNo and imageNo must be provided together');
		throw new CustomError(ResponseStatus.BAD_REQUEST);
	}

	return true;
}