import { Comment } from "#models/index.js";
import logger from "#config/loggerConfig.js";
import { ResponseStatus } from "#constants/responseStatus.js";
import CustomError from "#errors/customError.js";
import { getOffset } from "#utils/paginationUtils.js";

const commentAmount = 20;

export class CommentRepository {

	static async getCommentListPageable({ boardNo, imageNo, pageNum = 1 }) {
		const offset = getOffset(pageNum, commentAmount);
		const where = boardNo ? { boardNo: boardNo } : { imageNo: imageNo };

		const commentList = await Comment.findAndCountAll({
			attributes: [
				'commentNo', 
				'userId', 
				'commentDate', 
				'commentContent', 
				'commentGroupNo', 
				'commentIndent', 
				'commentUpperNo'
			],
			where: where,
			limit: commentAmount,
			offset: offset,
			order: [ ['commentGroupNo', 'DESC'], ['commentUpperNo', 'ASC'] ],
		});

		return commentList;
	}

	static async postComment(boardNo, imageNo, userId, commentContent, options = {}) {
		const comment = await Comment.create({
			boardNo: boardNo,
			imageNo: imageNo,
			userId: userId,
			commentContent: commentContent,
			commentIndent: 1,
		}, { transaction: options.transaction });

		await Comment.update({
			commentGroupNo: comment.commentNo,
			commentUpperNo: `${comment.commentNo}`,
		}, { where: { commentNo: comment.commentNo }, transaction: options.transaction });

		return comment;
	}

	static async deleteComment(commentNo) {
		await Comment.destroy({ where: { commentNo: commentNo } });
	}

	static async postReplyComment(
		boardNo,
		imageNo,
		commentContent,
		commentGroupNo,
		commentIndent,
		commentUpperNo,
		userId,
		options = {}
	) {
		const comment = await Comment.create({
			boardNo: boardNo,
			imageNo: imageNo,
			userId: userId,
			commentContent: commentContent,
			commentGroupNo: commentGroupNo,
			commentIndent: commentIndent,
			commentUpperNo: commentUpperNo,
		}, { transaction: options.transaction });

		const updateUpperNo = `${comment.commentUpperNo},${comment.commentNo}`;

		await Comment.update({
			commentUpperNo: updateUpperNo,
		}, { where: { commentNo: comment.commentNo }, transaction: options.transaction });

		return comment;
	}

	static async checkCommentWriter(commentNo, userId) {
		const comment = await Comment.findOne({
			attributes: ['userId'],
			where: { commentNo: commentNo },
		});

		return comment;
	}
}