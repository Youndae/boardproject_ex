import { Comment } from "#models/index.js";
import logger from "#config/loggerConfig.js";
import { ResponseStatus } from "#constants/responseStatus.js";
import CustomError from "#errors/customError.js";
import { getOffset } from "#utils/paginationUtils.js";

const commentAmount = 20;

export class CommentRepository {


	// CASE WHEN 추가 필요.
	static async getCommentListPageable({ boardId, imageId, page = 1 }) {
		const offset = getOffset(page, commentAmount);
		const where = boardId ? { boardId: boardId } : { imageId: imageId };

		const commentList = await Comment.findAndCountAll({
			attributes: [
				'id',
				'userId', 
				'createdAt',
				'content',
				'groupNo',
				'indent',
				'upperNo'
			],
			where: where,
			limit: commentAmount,
			offset: offset,
			order: [ ['groupNo', 'DESC'], ['upperNo', 'ASC'] ],
		});

		return commentList;
	}

	static async postComment(boardId, imageId, userId, content, options = {}) {
		const comment = await Comment.create({
			boardId: boardId,
			imageId: imageId,
			userId: userId,
			content: content,
			indent: 1,
		}, { transaction: options.transaction });

		await Comment.update({
			groupNo: comment.id,
			upperNo: `${comment.id}`,
		}, { where: { id: comment.id }, transaction: options.transaction });

		return comment;
	}

	static async deleteComment(id) {
		await Comment.destroy({ where: { id: id } });
	}

	static async postReplyComment(
		boardId,
		imageId,
		content,
		groupNo,
		indent,
		upperNo,
		userId,
		options = {}
	) {

		const comment = await Comment.create({
			boardId: boardId,
			imageId: imageId,
			userId: userId,
			content: content,
			groupNo: groupNo,
			indent: indent,
			upperNo: upperNo,
		}, { transaction: options.transaction });

		await Comment.update({
			upperNo: `${upperNo},${comment.id}`,
		}, { where: { id: comment.id }, transaction: options.transaction });

		return comment;
	}

	static async checkCommentWriter(id) {
		const comment = await Comment.findOne({
			attributes: ['userId'],
			where: { id },
		});

		if(!comment) {
			logger.error('Comment writer data not found, id: ', { id });
			throw new CustomError(ResponseStatus.NOT_FOUND);
		}

		return comment;
	}
}