import { CommentRepository } from "#repositories/commentRepository.js";
import logger from "#config/loggerConfig.js";
import CustomError from "#errors/customError.js";
import { ResponseStatus } from "#constants/responseStatus.js";
import { sequelize } from "#models/index.js";

export async function getCommentListService({boardId, imageId, pageNum = 1}) {
	checkCommentBoardStatus(boardId, imageId);

	try {
		const commentList = await CommentRepository.getCommentListPageable({ boardId, imageId, pageNum });

		const items = commentList.items.map(toCommentResponse);

		return {
			...commentList,
			items,
		};
	}catch (error) {
		logger.error('Failed to get comment list service.', error);

		if(error instanceof CustomError)
			throw error;

		throw new CustomError(ResponseStatus.INTERNAL_SERVER_ERROR);
	}
}

export async function postCommentService(boardId = null, imageId = null, { content }, userId) {
	checkCommentBoardStatus(boardId, imageId);

	const transaction = await sequelize.transaction();
	try {
		await CommentRepository.postComment(boardId, imageId, userId, content, { transaction });

		await transaction.commit();
	}catch (error) {
		logger.error('Failed to post comment service.', error);
		await transaction.rollback();

		if(error instanceof CustomError)
			throw error;

		throw new CustomError(ResponseStatus.INTERNAL_SERVER_ERROR);
	}
}

export async function deleteCommentService(id, userId) {
	await checkCommentWriter(id, userId)
	try {
		await CommentRepository.deleteComment(id);
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
	},
	{ id },
	{
		content,
	},
	userId) {
	const transaction = await sequelize.transaction();
	try {

		const targetComment = await CommentRepository.findById(id)

		await CommentRepository.postReplyComment(
			boardNo, 
			imageNo, 
			content,
			targetComment.groupNo,
			targetComment.indent + 1,
			targetComment.upperNo,
			userId, 
			{ transaction }
		);

		await transaction.commit();
	}catch (error) {
		logger.error('Failed to post reply comment service.', error);

		await transaction.rollback();

		if(error instanceof CustomError)
			throw error

		throw new CustomError(ResponseStatus.INTERNAL_SERVER_ERROR);
	}
}

async function checkCommentWriter(id, userId) {
	const comment = await CommentRepository.checkCommentWriter(id);

	if(!comment) {
		logger.error('Comment writer data not found.', { id });
		throw new CustomError(ResponseStatus.BAD_REQUEST);
	}

	if(comment.userId !== userId) {
		logger.error('User is not the author of the comment.', { id, userId });
		throw new CustomError(ResponseStatus.FORBIDDEN);
	}
}

function checkCommentBoardStatus(boardNo, imageNo) {
	if((!boardNo && !imageNo) || (boardNo && imageNo)) {
		logger.error('boardNo and imageNo must be provided together');
		throw new CustomError(ResponseStatus.BAD_REQUEST);
	}

	return true;
}

const toCommentResponse = (row) => {
	const isDeleted = !!row.deletedAt;

	return {
		id: row.id,
		writer: isDeleted ? "" : row.nickname,
		writerId: isDeleted ? "" : row.userId,
		createdAt: row.createdAt.toISOString().slice(0, 10),
		content: isDeleted ? "삭제된 댓글입니다." : row.content,
		indent: row.indent,
		isDeleted
	}
}